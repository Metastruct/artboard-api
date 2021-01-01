const fs = require('fs');
const FastIntegerCompression = require('fastintcompression');
const cleanup = require('node-cleanup');
const colorsys = require('colorsys');
const FormData = require('form-data');
const moment = require('moment');

module.exports = class GameLogic {
  constructor(app) {
    this.app = app;

    let { paletteSettings } = this.app.config;

    this.image = [];
    this.steamIDs = [];
    this.imageWidth = 320;
    this.imageHeight = 80;
    this.banned = {
      // Drew nazi symbol and left immediately after being exposed
      '76561198278692738': true
    };
    this.timeouts = {};
    this.timeoutTime = 3000;
    this.paletteSettings = paletteSettings;
    this.checkInterval = setInterval(() => this.dailyCheck(), 10000);

    this.initialize();
  }

  async initialize() {
    this.loadPalette();
    this.loadImage();
    this.bindWebsocketEvents();

    cleanup(() => this.saveImage());
  }

  async dailyCheck() {
    let date = moment().format('MM-DD-YY');

    if (!fs.existsSync(`assets/frames/frame_${date}.png`))
      return this.app.Renderer.renderFrame();

    let historyPath = `history/hi-${date}.dat`;
    let day = new Date().getDate();
    if (
      !fs.existsSync(historyPath) &&
      this.image.length > 0 &&
      (day == 1 || day == 15)
    ) {
      let compressed = FastIntegerCompression.compress(this.image);
      fs.writeFileSync(historyPath, Buffer.from(compressed));

      await this.app.Renderer.renderGIF();
      this.createImage();
      this.app.Web.broadcast('imageReset');
      this.executeWebhook();
    }
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
    if (color >= this.palette.length || color < -2) return;
    if (this.banned[steamId]) return;

    let xy = y * this.imageWidth + x;
    this.image[xy] = color;
    this.steamIDs[xy] = steamId;
    this.app.Web.broadcast('addPixel', { xy, color, steamId });

    this.timeouts[steamId] = Date.now();
  }

  loadPalette() {
    console.log('Loading palette...');

    this.palette = [];

    let { colored, gray } = this.paletteSettings;
    let hueNum = 360 / colored;

    for (let i = 1; i <= gray; i++) {
      let { r, g, b } = colorsys.hsv2Rgb(0, 0, 100 / i);
      this.palette.push([r, g, b]);
    }

    for (let i = 1; i <= colored; i++) {
      let { r, g, b } = colorsys.hsv2Rgb(hueNum * i, 100, 100);
      this.palette.push([r, g, b]);
    }

    console.log('Palette colors in total:', this.palette.length);
  }

  createImage() {
    console.log('Creating a blank image...');
    this.image = [];

    let space = this.imageWidth * this.imageHeight - 1;
    for (let i = 1; i <= space; i++) {
      this.image.push(-1);
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

    if (this.image.length == 0) this.createImage();
  }

  saveImage() {
    console.log('Saving image...');

    let compressed = FastIntegerCompression.compress(this.image);
    fs.writeFileSync('save.dat', Buffer.from(compressed));
  }

  executeWebhook() {
    const formData = new FormData();
    formData.append('username', 'Artboard');
    formData.append('avatar_url', 'https://cdn.discordapp.com/attachments/769123705220759572/772548545114800159/avatar.png');
    formData.append('file', fs.createReadStream('assets/static/result.gif'));

    return formData.submit(this.app.config.webhookUrl);
  }
};
