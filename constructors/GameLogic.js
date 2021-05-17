const fs = require('fs');
const axios = require('axios');
const colorsys = require('colorsys');
const cleanup = require('node-cleanup');
const FormData = require('form-data');
const moment = require('moment');

module.exports = class GameLogic {
  constructor(app) {
    this.app = app;

    const { paletteSettings } = this.app.config;

    this.image = [];
    this.steamIDs = [];
    this.imageWidth = 640;
    this.imageHeight = 160;
    this.banned = {};
    this.timeouts = {};
    this.timeoutTime = 3000;
    this.paletteSettings = paletteSettings;
    this.checkInterval = setInterval(() => this.dailyCheck(), 10000);

    this.initialize();
  }

  async initialize() {
    this.loadImage();
    this.bindWebsocketEvents();

    cleanup(() => this.saveImage());
  }

  async dailyCheck() {
    const date = moment().format('MM-DD-YY-HH');

    if (!fs.existsSync(`assets/frames/frame_${date}.png`))
      return this.app.Renderer.renderFrame();

    const historyPath = `history/hi-${moment().format('MM-DD-YY')}.dat`;
    const day = new Date().getDate();
    if (
      !fs.existsSync(historyPath) &&
      this.image.length > 0 &&
      (day == 1 || day == 15)
    ) {
      const compressed = JSON.stringify(this.image);
      fs.writeFileSync(historyPath, Buffer.from(compressed));

      await this.app.Renderer.renderGIF();
      this.createImage();
      this.app.Web.broadcast('imageReset');
      this.executeWebhook();
    }
  }

  bindWebsocketEvents() {
    const ws = this.app.Web;

    ws.on('addPixel', ({ x, y, pixels, color, steamId }, _ws, hasWriteAccess) => {
      if (!hasWriteAccess) return;
      if (pixels)
        return this.addPixels(pixels, steamId);
      this.addPixel(x, y, color, steamId);
    });
  }

  isSteamIDAllowed(steamId) {
    const timeout = this.timeouts[steamId];
    if (timeout && Date.now() - timeout < this.timeoutTime) return;
    if (this.banned[steamId]) return;
    return true;
  }

  addPixel(x, y, color, steamId) {
    if (!this.isSteamIDAllowed(steamId)) return;
    if (color >= this.palette.length || color < -2) return;

    const xy = y * this.imageWidth + x;
    this.image[xy] = color;
    this.steamIDs[xy] = steamId;
    this.app.Web.broadcast('addPixel', { xy, color, steamId });
    this.app.Web.broadcast('executeTimeout', steamId);

    this.timeouts[steamId] = Date.now();
  }

  addPixels(pixels, steamId) {
    if (!this.isSteamIDAllowed(steamId)) return;
    let imageCopy = this.image;
    let steamIDsCopy = this.steamIDs;

    for (let xy in pixels) {
      const color = pixels[xy] - 1;
      xy = parseInt(xy);
      if (color >= this.palette.length || color < -2 || xy < 0 || xy > this.image.length)
        return;
      steamIDsCopy[xy] = steamId;
      imageCopy[xy] = color;
    }

    this.timeouts[steamId] = Date.now();
    this.image = imageCopy;
    this.steamIDs = steamIDsCopy;
    this.app.Web.broadcast('imageUpdate', { image: this.image, diff: pixels });
    this.app.Web.broadcast('executeTimeout', steamId);
  }

  async getRandomPalette() {
    const { request } = await axios.get('https://lospec.com/palette-list/random');
    const { data } = await axios(request.res.responseUrl + '.hex');
    let palette = [];

    for (const hex of data.split('\r\n')) {
      try {
        const { r, g, b } = colorsys.hex2Rgb(hex);
        palette.push([r, g, b]);
      } catch (err) {}
    }

    return palette;
  }

  async createImage() {
    console.log('Creating a blank image...');
    this.image = [];
    this.steamIDs = [];
    this.palette = await this.getRandomPalette();

    let space = this.imageWidth * this.imageHeight - 1;
    for (let i = 1; i <= space; i++) {
      this.image.push(-1);
    }
  }

  loadImage() {
    console.log('Loading image...');

    try {
      const buf = fs.readFileSync('save.dat');
      const { image, palette, steamIDs } = JSON.parse(buf);

      this.image = image;
      this.palette = palette;
      this.steamIDs = steamIDs;
    } catch (err) {
      console.log('Image load failed.', err);
    }

    if (this.image.length == 0) this.createImage();
  }

  saveImage() {
    console.log('Saving image...');

    const json = JSON.stringify({
      image: this.image,
      palette: this.palette,
      steamIDs: this.steamIDs
    });
    fs.writeFileSync('save.dat', json);
  }

  executeWebhook() {
    const formData = new FormData();
    formData.append('username', 'Artboard');
    formData.append('avatar_url', 'https://cdn.discordapp.com/attachments/769123705220759572/772548545114800159/avatar.png');
    formData.append('file', fs.createReadStream('assets/static/result.gif'));

    return formData.submit(this.app.config.webhookUrl);
  }
};
