/// <reference path="Game.d.ts" />
import axios from 'axios';
import { hex2Rgb } from 'colorsys';
import * as FormData from 'form-data';
import { createReadStream, readFileSync, writeFileSync } from 'fs';

import Application from '../Application';
import { BaseStructure } from '../foundation/BaseStructure';
import { LOSPEC_RANDOM_ENDPOINT, SAVE_FILENAME, WebSocket } from '../utilities';

export default class Game extends BaseStructure {
  public image?: Array<number>;
  public palette?: Array<Array<number>>;
  public readonly dimensions: Array<number>;
  private steamIDs?: Array<string>;
  private timeouts: Record<string, number>;
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
        timeoutTime,
      } = this;
      socket.sendPayload('imageData', {
        dimensions,
        image,
        banned,
        steamIDs,
        palette,
        timeoutTime,
      });
    });

    this.application.structures.Web.on(
      'm_addPixel',
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

  public onCleanup() {
    this.saveImage();
  }

  private isSteamIDAllowedToDraw(steamID: string) {
    const timeout = this.timeouts[steamID];
    if (
      this.banned[steamID] ||
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

    this.application.structures.Web.broadcast('addPixel', {
      xy,
      color,
      steamID,
    });
    this.application.structures.Web.broadcast('executeTimeout', steamID);
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

    this.application.structures.Web.broadcast('imageUpdate', {
      image: this.image,
      diff: pixels,
    });
    this.application.structures.Web.broadcast('executeTimeout', steamID);
  }

  private async getRandomPalette() {
    const { request } = await axios.get(LOSPEC_RANDOM_ENDPOINT);
    const { data } = await axios(request.res.responseUrl + '.hex');
    let palette = [];

    for (const hex of data.split('\r\n')) {
      try {
        const { r, g, b } = hex2Rgb(hex);
        palette.push([r, g, b]);
      } catch (err) {}
    }

    return palette;
  }

  private async createEmptyImage() {
    this.image = [];
    this.steamIDs = [];
    this.palette = await this.getRandomPalette();

    let space = this.dimensions[0] * this.dimensions[1] - 1;
    for (let i = 1; i <= space; i++) {
      this.image.push(-1);
    }

    const { dimensions, image, banned, steamIDs, palette, timeoutTime } = this;
    this.application.structures.Web.broadcast('imageInfo', {
      dimensions,
      image,
      banned,
      steamIDs,
      palette,
      timeoutTime,
    });
  }

  private loadImage() {
    try {
      const buf = readFileSync(SAVE_FILENAME);
      const { image, palette, steamIDs } = JSON.parse(buf.toString());

      this.image = image;
      this.palette = palette;
      this.steamIDs = steamIDs;
    } catch (err) {
      console.log('Image load failed.', err);
    }

    if (!this.image || this.image.length == 0) this.createEmptyImage();
  }

  private saveImage() {
    const { image, palette, steamIDs } = this;
    const json = JSON.stringify({
      image,
      palette,
      steamIDs,
    });
    writeFileSync(SAVE_FILENAME, json);
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
