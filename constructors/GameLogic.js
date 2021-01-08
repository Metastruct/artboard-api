const fs = require('fs');
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
    this.banned = {};
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
      let compressed = JSON.stringify(this.image);
      fs.writeFileSync(historyPath, Buffer.from(compressed));

      await this.app.Renderer.renderGIF();
      this.createImage();
      this.app.Web.broadcast('imageReset');
      this.executeWebhook();
    }
  }

  bindWebsocketEvents() {
    let ws = this.app.Web;

    ws.on('addPixel', ({ x, y, pixels, color, steamId }, _ws, hasWriteAccess) => {
      if (!hasWriteAccess) return;
      if (pixels)
        return this.addPixels(pixels, steamId);
      this.addPixel(x, y, color, steamId);
    });
  }

  isSteamIDAllowed(steamId) {
    let timeout = this.timeouts[steamId];
    if (timeout && Date.now() - timeout < this.timeoutTime) return;
    if (this.banned[steamId]) return;
    return true;
  }

  addPixel(x, y, color, steamId) {
    if (!this.isSteamIDAllowed(steamId)) return;
    if (color >= this.palette.length || color < -2) return;

    let xy = y * this.imageWidth + x;
    this.image[xy] = color;
    this.steamIDs[xy] = steamId;
    this.app.Web.broadcast('addPixel', { xy, color, steamId });
    this.app.Web.broadcast('executeTimeout', steamId);

    this.timeouts[steamId] = Date.now();
  }

  addPixels(pixels, steamId) {
    if (!this.isSteamIDAllowed(steamId)) return;
    let copy = this.image;

    for (let xy in pixels) {
      const color = pixels[xy] - 1;
      xy = parseInt(xy);
      if (color >= this.palette.length || color < -2 || xy < 0 || xy > this.image.length)
        return;
      copy[xy] = color;
    }

    this.timeouts[steamId] = Date.now();
    this.image = copy;
    this.app.Web.broadcast('imageUpdate', { image: this.image, diff: pixels });
    this.app.Web.broadcast('executeTimeout', steamId);
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
    this.steamIDs = [];

    let space = this.imageWidth * this.imageHeight - 1;
    for (let i = 1; i <= space; i++) {
      this.image.push(-1);
    }
  }

  loadImage() {
    console.log('Loading image...');

    try {
      let buf = fs.readFileSync('save.dat');

      this.image = JSON.parse(buf);
    } catch (err) {
      console.log('Image load failed.', err);
      this.createImage();
    }

    if (this.image.length == 0) this.createImage();
  }

  saveImage() {
    console.log('Saving image...');

    let compressed = JSON.stringify(this.image);
    fs.writeFileSync('save.dat', compressed);
  }

  executeWebhook() {
    const formData = new FormData();
    formData.append('username', 'Artboard');
    formData.append('avatar_url', 'https://cdn.discordapp.com/attachments/769123705220759572/772548545114800159/avatar.png');
    formData.append('file', fs.createReadStream('assets/static/result.gif'));

    return formData.submit(this.app.config.webhookUrl);
  }
};
