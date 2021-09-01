import { createHash } from 'crypto';
import { IncomingMessage } from 'http';
import { Socket } from 'net';
import ws from 'ws';
import { GUID, kWebSocket } from 'ws/lib/constants';
import { format } from 'ws/lib/extension';
import PerMessageDeflate from 'ws/lib/permessage-deflate';

export class WebSocket extends ws {
  public hasWriteAccess = false;

  public sendPayload(op: string, data: any) {
    return this.send(JSON.stringify({ op, data }));
  }
}

export class WebSocketServer extends ws.Server {
  public clients: Set<WebSocket>;

  // override the entire function to use an extended WebSocket class
  // from https://github.com/websockets/ws/blob/master/lib/websocket-server.js#L261
  private completeUpgrade(
    key: String,
    extensions: Record<string, any>,
    req: IncomingMessage,
    socket: Socket,
    head: Buffer,
    cb: Function
  ) {
    if (!socket.readable || !socket.writable) return socket.destroy();

    if (socket[kWebSocket]) {
      throw new Error(
        'server.handleUpgrade() was called more than once with the same ' +
          'socket, possibly due to a misconfiguration'
      );
    }

    const digest = createHash('sha1')
      .update(key + GUID)
      .digest('base64');

    const headers = [
      'HTTP/1.1 101 Switching Protocols',
      'Upgrade: websocket',
      'Connection: Upgrade',
      `Sec-WebSocket-Accept: ${digest}`,
    ];

    const ws: any = new WebSocket(null);
    let protocol: string | string[] = req.headers['sec-websocket-protocol'];

    if (protocol) {
      protocol = protocol.split(',').map((str: string) => str.trim());

      if (this.options.handleProtocols) {
        protocol = this.options.handleProtocols(protocol, req);
      } else {
        protocol = protocol[0];
      }

      if (protocol) {
        headers.push(`Sec-WebSocket-Protocol: ${protocol}`);
        ws._protocol = protocol;
      }
    }

    if (extensions[PerMessageDeflate.extensionName]) {
      const params = extensions[PerMessageDeflate.extensionName].params;
      const value = format({
        [PerMessageDeflate.extensionName]: [params],
      });
      headers.push(`Sec-WebSocket-Extensions: ${value}`);
      ws._extensions = extensions;
    }

    this.emit('headers', headers, req);

    socket.write(headers.concat('\r\n').join('\r\n'));
    socket.removeListener('error', function () {
      this.destroy();
    });

    ws.setSocket(socket, head, this.options.maxPayload);

    if (this.clients) {
      this.clients.add(ws);
      ws.on('close', () => this.clients.delete(ws));
    }

    cb(ws, req);
  }
}

export const WEBSOCKET_UNSUPPORTED_PAYLOAD = 1007;
export enum WEBSOCKET_EVENTS {
  ADD_PIXEL = 'addPixel',
  EXECUTE_TIMEOUT = 'executeTimeout',
  IMAGE_DATA = 'imageData',
  IMAGE_RESET = 'imageReset',
  IMAGE_UPDATE = 'imageUpdate'
}