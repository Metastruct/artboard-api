const ws = require('ws');
const express = require('express');
const http = require('http');
const { resolve } = require('path');
const { EventEmitter } = require('events');
const moment = require('moment');
const axios = require('axios');
const { parseStringPromise } = require('xml2js');

module.exports = class Web extends EventEmitter {
  constructor(app) {
    super();

    this.app = app;
    this.writeIPs = this.app.config.writeIPs;
    this.sIDCache = {};

    this.express = express();
    this.httpServer = http.createServer(this.express);
    this.websocket = new ws.Server({ server: this.httpServer });

    this.express.use(express.static('assets/static/'));
    this.express.get('/', (_req, res) =>
      res.sendFile(resolve(__dirname, '../assets/index.html'))
    );
    this.express.get('/get/:id', (req, res) =>
      this.handleSteamRequest(req, res)
    );
    this.express.get('/latest', (_req, res) =>
      res.sendFile(
        resolve(
          __dirname, '../assets/frames/', 
          `frame_${moment().format('MM-DD-YY-HH')}.png`
        )
      )
    );

    this.websocket.on('connection', (ws) => this.onConnection(ws));

    this.httpServer.listen(10010, '0.0.0.0', () =>
      console.log('Server listening on :10010')
    );
  }

  async handleSteamRequest(req, res) {
    const id = req.params.id;

    if (this.sIDCache[id]) return res.send(this.sIDCache[req.params.id]);

    let { data } = await axios(
      `https://steamcommunity.com/profiles/${id}?xml=1`
    );
    data = await parseStringPromise(data);
    data = {
      nickname: data.profile.steamID[0],
      avatar: data.profile.avatarMedium[0],
    };

    this.sIDCache[id] = data;
    res.send(data);
  }

  send(ws, op, data) {
    ws.send(JSON.stringify({ op, data }));
  }

  broadcast(op, data) {
    for (let client of Array.from(this.websocket.clients)) {
      this.send(client, op, data);
    }
  }

  onConnection(ws) {
    const hasWriteAccess = this.writeIPs.indexOf(ws._socket.remoteAddress) >= 0;
    const { image, banned, steamIDs, palette, timeoutTime } = this.app.GameLogic;

    this.send(ws, 'writeAccess', hasWriteAccess);
    this.send(ws, 'imageInfo', {
      image,
      banned,
      steamIDs,
      palette,
      timeoutTime,
    });

    ws.on('message', (str) => {
      try {
        str = JSON.parse(str);
        if (str.op && str.data) this.emit(str.op, str.data, ws, hasWriteAccess);
      } catch (err) {} // eslint-disable-line no-empty
    });
  }
};
