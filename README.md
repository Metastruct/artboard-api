# pixels-web-api
Web API for Artboard (fka Pixels).

## Setup

### Configuration
See `config.example.js`. Please make sure that every value that is in the configuration
corresponds to types of the same value in the configuration example.

In case of errors in the types of one of the values in the configuration, the
application will spew out an AssertionError, that provides where exactly was the
error made.

### Running
```bash
# Install dependencies, including developer ones
npm install --save-dev

# Compile TypeScript code
npm run build:ts

# Minify JavaScript with Closure Compiler
npm run build:web

# Start up the application
npm start
```

There's a file named `ecosystem.config.js`, that is specifically made for [PM2](https://pm2.keymetrics.io/)
process. **Before running, do not forget to do the first 3 steps above.**
```bash
pm2 startOrReload ecosystem.config.js
```

## Websocket
This software hosts a WebSocket server to communicate with Meta Construct servers and
website clients.

### Payloads
Every payload should be in JSON format.

```json
{
  "op": "opCode",           // string,  OP code,                  required
  "data": "Hello, world!",  // any,     OP code data/argument(s), optional
}
```

If the client sends a payload, that does not follow the payload example above, the
connection between the client and the server will be closed with code `1007` (unsupported
payload).

### Write access
Clients, whose IP addresses are in configuration property `writeIPs` have write access.
This means that they can edit image data by sending `addPixel` payloads.

### OP codes

#### `addPixel`
This OP code is responsible for modifying the image data when sent to the server and
notifying that the image data was edited by receiving from the server.

##### Example payload
```json
{
  "op": "addPixel",
  "data": {
    "x": 28,
    "y": 33,
    "color": 14,
    "steamId": "76561198086180059"
  }
}
```

##### Sending
This OP code can be sent only by clients, that have write access. If the OP code was
successfully sent, clients should receive `addPixel` OP code in return with the same
arguments as the sent payload.

#### `imageInfo`
This OP code is sent from the server to the clients who just connected. It contains
image and palette data.

##### Example payload
```json
{
  "op": "imageInfo",
  "data": {
    "image": [...],
    "palette": [...]
  }
}
```

#### `writeAccess`
This OP code is sent from the server to the clients who just connected. It contains
boolean, which can be used to determine if the client has write access or not.

##### Example payload
```json
{
  "op": "writeAccess",
  "data": true
}
```
