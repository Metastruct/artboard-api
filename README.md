# pixels-web-api
Web API for Artboard (Pixels).

## Configuration
See `config.example.js`.

## Websocket
This software hosts a WebSocket server to communicate with Meta Construct servers and
website clients. There is no OP code that is specially made for pinging to keep the
connection alive, but you can send garbage data to the server instead, because the
server doesn't check if the data is JSON or if the sent OP code exists or not.

### Payloads
Every payload should be in JSON format.

```json
{
  "op": "opCode",           // string, OP code
  "data": "Hello, world!",  // any   , OP code data/argument(s)
}
```

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