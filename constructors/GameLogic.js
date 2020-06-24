const fs = require('fs');
const FastIntegerCompression = require('fastintcompression');
const cleanup = require('node-cleanup');

module.exports = class GameLogic {
  constructor(app) {
    this.app = app;
    this.paletteSettings = this.app.config.paletteSettings;

    this.image = [];
    this.imageWidth = 160;
    this.imageHeight = 80;
    this.timeouts = {};
    this.timeoutTime = 3000;

    this.loadPalette();
    this.loadImage();
    this.bindWebsocketEvents();

    cleanup(() => this.saveImage());
  }

  bindWebsocketEvents() {
    let ws = this.app.Web;

    ws.on('addPixel', ({ x, y, color, steamId }, _ws, hasWriteAccess) => {
      if (!hasWriteAccess) return;
      this.addPixel(x, y, color, steamId);
    });
  }

  addPixel(x, y, color, steamId) {
    let timeout = this.timeouts[steamId];
    if (timeout && Date.now() - timeout < this.timeoutTime) return;
    if (color > this.palette.length - 1 || color < 0) return;

    this.image[y * this.imageWidth + x] = color;
    this.app.Web.broadcast('addPixel', { x, y, color, steamId });

    this.timeouts[steamId] = Date.now();
  }

  loadPalette() {
    console.log('Loading palette...');

    this.palette = [];

    let { colored, gray } = this.paletteSettings,
      { hsvToRgb } = this.app.Utils;
    let hueNum = 360 / colored;

    for (let i = 1; i <= gray; i++) {
      this.palette.push(hsvToRgb(0, 0, 1 / i));
    }

    for (let i = 1; i <= colored; i++) {
      this.palette.push(hsvToRgb(hueNum * i, 1, 1));
    }

    console.log('Palette colors in total:', this.palette.length);
  }

  createImage() {
    console.log('Creating a blank image...');

    let space = this.imageWidth * this.imageHeight - 1;
    for (let i = 1; i <= space; i++) {
      this.image.push(0);
    }
  }

  loadImage() {
    console.log('Loading image...');

    try {
      let buf = fs.readFileSync('save.dat');

      this.image = FastIntegerCompression.uncompress(buf);
    } catch (err) {
      console.log('Image load failed.', err);
      this.createImage();
    }
  }

  saveImage() {
    console.log('Saving image...');

    let compressed = FastIntegerCompression.compress(this.image);
    fs.writeFileSync('save.dat', Buffer.from(compressed));
  }
};
