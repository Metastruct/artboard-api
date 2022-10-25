import axios from 'axios';
import dayjs from 'dayjs';
import express from 'express';
import { createServer, IncomingMessage, Server } from 'http';
import { resolve } from 'path';
import { Data } from 'ws';
import { parseStringPromise } from 'xml2js';

import Application from '../Application';
import { BaseEventEmitterStructure } from '../foundation/BaseStructure';
import {
  WEBSOCKET_UNSUPPORTED_PAYLOAD,
  WebSocketServer,
  WebSocket,
  FRAME_DATE_FORMAT,
  REMOTE_ADDRESS_PREFIX,
} from '../utilities';

interface ISteamInfo {
  nickname: string;
  avatar: string;
}

export default class Web extends BaseEventEmitterStructure {
  private steamInfoCache: Record<string, ISteamInfo> = {};
  private readonly express: express.Application = express();
  private readonly port: number = 10010;
  private readonly server: Server = createServer(this.express);
  private readonly websocket: WebSocketServer = new WebSocketServer({
    server: this.server,
  });
  private readonly writeIPs: string[];

  constructor(application: Application) {
    super(application, { port: 'number?', writeIPs: 'array' });

    this.writeIPs = this.application.config.writeIPs;
    if (this.application.config.port) this.port = this.application.config.port;

    this.express.use(express.static('assets/static/'));
    this.createRoutes();

    this.websocket.on('connection', (socket, req) =>
      this.handleWebSocketConnection(socket as WebSocket, req)
    );
  }

  private createRoutes() {
    this.express.get('/', (_req, res) =>
      res.sendFile(resolve(__dirname, '../../assets/index.html'))
    );
    this.express.get('/get/:id', (req, res) =>
      this.handleSteamRequest(req, res)
    );
    this.express.get('/latest', (_req, res) =>
      res.sendFile(
        resolve(
          __dirname,
          '../../assets/frames/',
          `frame_${dayjs().format(FRAME_DATE_FORMAT)}.png`
        )
      )
    );
  }

  public onImportDone() {
    this.server.listen(this.port, () =>
      console.log('Server listening on :' + this.port)
    );
  }

  public broadcast(op: string, data: unknown) {
    for (const client of this.websocket.clients) {
      client.sendPayload(op, data);
    }
  }

  private async handleSteamRequest(
    req: express.Request,
    res: express.Response
  ) {
    const id = req.params.id;
    if (this.steamInfoCache[id])
      return res.send(this.steamInfoCache[req.params.id]);

    let { data } = await axios(
      `https://steamcommunity.com/profiles/${id}?xml=1`
    );
    data = await parseStringPromise(data);
    this.steamInfoCache[id] = data = {
      nickname: data.profile.steamID[0],
      avatar: data.profile.avatarMedium[0],
    };
    res.send(data);
  }

  private isLocal(ip: string) {
    const parts = ip.split('.');
    return (
      parts[0] === '10' ||
      (parts[0] === '172' &&
        parseInt(parts[1], 10) >= 16 &&
        parseInt(parts[1], 10) <= 31) ||
      (parts[0] === '192' && parts[1] === '168')
    );
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
    socket.hasWriteAccess =
      this.writeIPs.indexOf(ip) !== -1 || this.isLocal(ip);
    console.log('New connection to WS:', ip);

    socket.sendPayload('writeAccess', socket.hasWriteAccess);
    this.emit('connection', socket);
    socket.on('message', (data: Data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.op && typeof parsed.op === 'string')
          this.emit('m_' + parsed.op, socket, parsed.data);
        else socket.close(WEBSOCKET_UNSUPPORTED_PAYLOAD);
      } catch (err) {
        socket.close(WEBSOCKET_UNSUPPORTED_PAYLOAD);
      }
    });
  }
}
