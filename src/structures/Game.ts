/// <reference path="Game.d.ts" />
import axios from 'axios';
import { hex2Rgb } from 'colorsys';
import FormData from 'form-data';
import { createReadStream, promises } from 'fs';

import Application from '../Application';
import { BaseStructure } from '../foundation/BaseStructure';
import { LOSPEC_RANDOM_ENDPOINT, SAVE_FILENAME, WebSocket, WEBSOCKET_EVENTS } from '../utilities';

export default class Game extends BaseStructure {
  public image?: Array<number>;
  public palette?: Array<Array<number>>;
  public readonly dimensions: Array<number>;
  private paletteURL?: string;
  private steamIDs?: Array<string>;
  private timeouts: Record<string, number> = {};
  private readonly banned?: Record<string, boolean>;
  private readonly timeoutTime?: number;
  private readonly webhookURL: string;

  constructor(application: Application) {
    super(application, {
      banned: 'object?',
      dimensions: 'array',
      host: 'string?',
      timeoutTime: 'number',
      webhookURL: 'string?',
    });

    const {
      banned,
      dimensions,
      timeoutTime,
      webhookURL,
    } = this.application.config;
    this.banned = banned || {};
    this.dimensions = dimensions;
    this.timeoutTime = timeoutTime;
    this.webhookURL = webhookURL;

    this.loadImage();
  }

  public onImportDone() {
    this.application.structures.Web.on('connection', (socket: WebSocket) => {
      const {
        dimensions,
        image,
        banned,
        steamIDs,
        palette,
        paletteURL,
        timeoutTime,
      } = this;
      socket.sendPayload(WEBSOCKET_EVENTS.IMAGE_DATA, {
        dimensions,
        image,
        banned,
        steamIDs,
        palette,
        paletteURL,
        timeoutTime,
      });
    });

    this.application.structures.Web.on(
      'm_' + WEBSOCKET_EVENTS.ADD_PIXEL,
      (
        socket: WebSocket,
        { pixels, steamId, x, y, color }: IWebSocketAddPixelEventData
      ) => {
        if (!socket.hasWriteAccess) return;
        if (pixels) this.addPixels(pixels, steamId);
        else if (x && y && color) this.addPixel(x, y, color, steamId);
      }
    );
  }

  public async onCleanup() {
    await this.saveImage();
  }

  private isSteamIDAllowedToDraw(steamID: string) {
    const timeout = this.timeouts[steamID];
    if (
      this.banned[steamID] !== undefined ||
      (timeout && Date.now() - timeout < this.timeoutTime)
    )
      return false;
    return true;
  }

  private addPixel(x: number, y: number, color: number, steamID: string) {
    const xy = y * this.dimensions[0] + x;
    if (
      !this.isSteamIDAllowedToDraw(steamID) ||
      color >= this.palette.length ||
      color < -2 ||
      xy < 0 ||
      xy > this.image.length
    )
      return;

    this.image[xy] = color;
    this.steamIDs[xy] = steamID;
    this.timeouts[steamID] = Date.now();

    this.application.structures.Web.broadcast(WEBSOCKET_EVENTS.ADD_PIXEL, {
      xy,
      color,
      steamID,
    });
    this.application.structures.Web.broadcast(WEBSOCKET_EVENTS.EXECUTE_TIMEOUT, steamID);
  }

  private addPixels(pixels: Record<string, number>, steamID: string) {
    if (!this.isSteamIDAllowedToDraw(steamID)) return;

    let imageCopy = this.image;
    let steamIDsCopy = this.steamIDs;

    for (const position in pixels) {
      const color = pixels[position] - 1;
      const xy = parseInt(position);
      if (
        color >= this.palette.length ||
        color < -2 ||
        xy < 0 ||
        xy > this.image.length
      )
        return;
      steamIDsCopy[xy] = steamID;
      imageCopy[xy] = color;
    }

    this.image = imageCopy;
    this.steamIDs = steamIDsCopy;
    this.timeouts[steamID] = Date.now();

    this.application.structures.Web.broadcast(WEBSOCKET_EVENTS.IMAGE_UPDATE, {
      image: this.image,
      diff: pixels,
    });
    this.application.structures.Web.broadcast(WEBSOCKET_EVENTS.EXECUTE_TIMEOUT, steamID);
  }

  private async getRandomPalette(): { palette: Array<Array<number>>, paletteURL: string } {
    const { request } = await axios.get(LOSPEC_RANDOM_ENDPOINT);
    const paletteURL = request.res.responseUrl;
    const { data } = await axios(paletteURL + '.hex');
    let palette = [];

    for (const hex of data.split('\r\n')) {
      try {
        const { r, g, b } = hex2Rgb(hex);
        palette.push([r, g, b]);
      } catch (err) {}
    }

    return { palette, paletteURL };
  }

  private async createEmptyImage() {
    this.image = [];
    this.steamIDs = [];
    const { palette, paletteURL } = await this.getRandomPalette();
    this.palette = palette;
    this.paletteURL = paletteURL;

    let space = this.dimensions[0] * this.dimensions[1] - 1;
    for (let i = 1; i <= space; i++) {
      this.image.push(-1);
    }

    const { dimensions, image, banned, steamIDs, palette, timeoutTime } = this;
    this.application.structures.Web.broadcast(WEBSOCKET_EVENTS.IMAGE_DATA, {
      dimensions,
      image,
      banned,
      steamIDs,
      palette,
      paletteURL,
      timeoutTime,
    });
  }

  private async loadImage() {
    try {
      const buf = await promises.readFile(SAVE_FILENAME);
      const { image, palette, paletteURL, steamIDs } = JSON.parse(buf.toString());

      this.image = image;
      this.palette = palette;
      this.paletteURL = paletteURL;
      this.steamIDs = steamIDs;
    } catch (err) {
      console.log('Image load failed.', err);
    }

    if (!this.image || this.image.length == 0) this.createEmptyImage();
  }

  private async saveImage() {
    const { image, palette, steamIDs } = this;
    const json = JSON.stringify({
      image,
      palette,
      paletteURL,
      steamIDs,
    });
    await promises.writeFile(SAVE_FILENAME, json);
  }

  public executeWebhook() {
    if (!this.webhookURL || !this.application.config.host) return false;

    const formData = new FormData();
    formData.append('username', 'Artboard');
    formData.append('avatar_url', this.application.config.host + '/icon.png');
    formData.append('file', createReadStream('assets/static/result.gif'));

    return formData.submit(this.webhookURL);
  }
}
