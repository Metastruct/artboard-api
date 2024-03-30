import express from 'express';
import ratelimit from 'express-rate-limit';
import { createServer, IncomingMessage, Server } from 'http';
import { resolve } from 'path';
import { Data } from 'ws';

import Application from '../Application';
import { BaseStructure } from './BaseStructure';
import {
  WEBSOCKET_UNSUPPORTED_PAYLOAD,
  WebSocketServer,
  WebSocket,
  REMOTE_ADDRESS_PREFIX,
  STEAM_INFO_MAX_AGE,
  isIPv4AddressBogon,
} from '../utilities';
import { SteamUserInfo, WEBSOCKET_EVENTS, WebSocketAPIEvents } from '../types';

type WebEvents = WebSocketAPIEvents & { connection: undefined };

export default class Web extends BaseStructure {
  private steamInfoCache: Record<string, SteamUserInfo> = {};
  private readonly express: express.Application = express();
  private readonly port: number = 10010;
  private readonly server: Server = createServer(this.express);
  private readonly steamwebAPIkey: string;
  private readonly websocket: WebSocketServer = new WebSocketServer({
    server: this.server,
  });
  private readonly writeIPs: string[];

  constructor(application: Application) {
    super(application, {
      port: 'number?',
      writeIPs: 'array',
      steamwebAPIkey: 'string',
    });

    this.writeIPs = this.config.writeIPs;
    this.port = this.config.port || this.port;
    this.steamwebAPIkey = this.config.steamwebAPIkey;

    this.handleSteamRequest = this.handleSteamRequest.bind(this);
    this.handleWebSocketConnection = this.handleWebSocketConnection.bind(this);

    this.websocket.on('connection', this.handleWebSocketConnection);

    this.express.set('trust proxy', 1);
    this.express.use(express.static('assets/static/'));
    this.express.get('/', (_req, res) =>
      res.sendFile(resolve(__dirname, '../../assets/index.html'))
    );
    this.express.get('/get/:id', this.handleSteamRequest);
    this.express.get(
      '/latest',

      ratelimit({
        windowMs: 5 * 60 * 1000,
        max: 10,
      }),

      (_req, res) => {
        res.setHeader('Content-Type', 'image/png');
        this.structures.Renderer.renderFrame().pipe(res);
      }
    );
  }

  public onImportDone() {
    this.server.listen(this.port, () =>
      console.log('Server listening on :' + this.port)
    );
  }

  private async handleSteamRequest(
    req: express.Request,
    res: express.Response
  ) {
    const id = req.params.id;
    if (
      this.steamInfoCache[id] &&
      Date.now() - this.steamInfoCache[id].date < STEAM_INFO_MAX_AGE
    )
      return res.send(this.steamInfoCache[req.params.id]);

    try {
      const resp = await fetch(
        `http://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${this.steamwebAPIkey}&steamids=${id}`
      );
      const json = (await resp.json()).response;

      if (json) {
        let steamInfo: SteamUserInfo;

        if (json.players.length === 0) return res.sendStatus(500);

        const user = json.players[0];
        this.steamInfoCache[id] = steamInfo = {
          nickname: user.personaname,
          avatar: user.avatarmedium,
          date: Date.now(),
        };

        return res.send(steamInfo);
      }

      return res.sendStatus(500);
    } catch (err) {
      console.error(err);
    }
  }

  private handleWebSocketConnection(
    socket: WebSocket,
    request: IncomingMessage
  ) {
    const forwarded = request.headers['x-forwarded-for'] as string[] | string;

    // Assuming the IP that we want is the first.
    const ip =
      (Array.isArray(forwarded) ? forwarded[0] : forwarded) ||
      request.socket.remoteAddress.substring(REMOTE_ADDRESS_PREFIX.length);

    console.log('New connection to the WebSocket server:', ip);

    socket.hasWriteAccess =
      this.writeIPs.indexOf(ip) !== -1 || isIPv4AddressBogon(ip);
    socket.sendPayload(WEBSOCKET_EVENTS.WRITE_ACCESS, socket.hasWriteAccess);

    socket.on('message', (data: Data) => {
      try {
        const parsed = JSON.parse(data.toString());

        if (parsed.op && typeof parsed.op === 'string')
          this.emit(parsed.op, socket, parsed.data);
        else socket.close(WEBSOCKET_UNSUPPORTED_PAYLOAD);
      } catch (err) {
        socket.close(WEBSOCKET_UNSUPPORTED_PAYLOAD);
      }
    });

    this.emit('connection', socket);
  }

  public broadcast<Event extends WEBSOCKET_EVENTS>(
    op: Event,
    data: WebSocketAPIEvents[Event]
  ) {
    for (const client of this.websocket.clients) client.sendPayload(op, data);
  }

  public on<Event extends keyof WebEvents>(
    eventName: Event,
    listener: (socket: WebSocket, data: WebEvents[Event]) => void
  ): this {
    return super.on(eventName, listener);
  }

  public off<Event extends keyof WebEvents>(
    eventName: Event,
    listener: (socket: WebSocket, data: WebEvents[Event]) => void
  ): this {
    return super.off(eventName, listener);
  }

  public once<Event extends keyof WebEvents>(
    eventName: Event,
    listener: (socket: WebSocket, data: WebEvents[Event]) => void
  ): this {
    return super.once(eventName, listener);
  }

  public static create(application: Application) {
    return new Web(application);
  }
}
