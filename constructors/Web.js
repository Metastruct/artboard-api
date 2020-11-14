const ws = require('ws');
const express = require('express');
const http = require('http');
const { resolve } = require('path');
const { EventEmitter } = require('events');

module.exports = class Web extends EventEmitter {
  constructor(app) {
    super();

    this.app = app;
    this.writeIPs = this.app.config.writeIPs;

    this.express = express();
    this.httpServer = http.createServer(this.express);
    this.websocket = new ws.Server({ server: this.httpServer });

    this.express.use(express.static('assets/static/'));
    this.express.get('/', (_req, res) =>
      res.sendFile(resolve(__dirname, '../assets/index.html'))
    );

    this.websocket.on('connection', (ws) => this.onConnection(ws));

    this.httpServer.listen(10010, '0.0.0.0', () =>
      console.log('Server listening on :10010')
    );
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
    let hasWriteAccess = this.writeIPs.indexOf(ws._socket.remoteAddress) >= 0;
    let { image, steamIDs, palette, timeoutTime } = this.app.GameLogic;

    this.send(ws, 'writeAccess', hasWriteAccess);
    this.send(ws, 'imageInfo', {
      image,
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
