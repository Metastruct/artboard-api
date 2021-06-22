/// <reference path="Web.d.ts" />
import axios from 'axios';
import * as dayjs from 'dayjs';
import * as express from 'express';
import { createServer, IncomingMessage, Server } from 'http';
import { resolve } from 'path';
import * as ws from 'ws';
import { parseStringPromise } from 'xml2js';

import Application from '../Application';
import { BaseEventEmitterStructure } from '../foundation/BaseStructure';
import {
  WEBSOCKET_UNSUPPORTED_PAYLOAD,
  WebSocketServer,
  WebSocket,
  FRAME_DATE_FORMAT,
} from '../utilities';

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

  public broadcast(op: string, data: any) {
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

  private handleWebSocketConnection(
    socket: WebSocket,
    request: IncomingMessage
  ) {
    socket.hasWriteAccess =
      this.writeIPs.indexOf(request.socket.remoteAddress) !== -1;
    socket.sendPayload('writeAccess', socket.hasWriteAccess);
    socket.emit('connection', socket);
    socket.on('message', (data: ws.Data) => {
      try {
        const parsed = JSON.parse(data.toString());
        if (parsed.op && typeof parsed.op === 'string')
          this.emit('m_' + parsed.op, ws, parsed.data);
        else socket.close(WEBSOCKET_UNSUPPORTED_PAYLOAD);
      } catch (err) {
        socket.close(WEBSOCKET_UNSUPPORTED_PAYLOAD);
      }
    });
  }
}
