import axios from 'axios';
import { hex2Rgb } from 'colorsys';
import { parseExpression } from 'cron-parser';
import FormData from 'form-data';
import { promises } from 'fs';

import Application from '../Application';
import { BaseStructure } from '../foundation/BaseStructure';
import {
  LOSPEC_RANDOM_ENDPOINT,
  SAVE_FILENAME,
  WebSocket,
  WEBSOCKET_EVENTS,
} from '../utilities';

interface IWebSocketAddPixelEventData {
  x?: number;
  y?: number;
  pixels?: Record<string, number>;
  color?: number;
  steamId: string;
}
export default class Game extends BaseStructure {
  public image?: Array<number>;
  public palette?: Array<Array<number>>;
  public steamIDs?: Array<string>;
  public readonly dimensions: Array<number>;
  private paletteURL?: string;
  private timeouts: Record<string, number> = {};
  private readonly banned?: Record<string, boolean>;
  private readonly timeoutTime?: number;
  private readonly webhookURL: string;
  private readonly webhookArchiveURL: string;
  private readonly msgID: string;

  constructor(application: Application) {
    super(application, {
      banned: 'object?',
      dimensions: 'array',
      host: 'string?',
      timeoutTime: 'number',
      webhookURL: 'string?',
      webhookArchiveURL: 'string?',
    });

    const {
      banned,
      dimensions,
      timeoutTime,
      webhookURL,
      webhookArchiveURL,
      msgID,
    } = this.application.config;
    this.banned = banned || {};
    this.dimensions = dimensions;
    this.timeoutTime = timeoutTime;
    this.webhookURL = webhookURL;
    this.webhookArchiveURL = webhookArchiveURL;
    this.msgID = msgID;

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
    this.application.structures.Web.broadcast(
      WEBSOCKET_EVENTS.EXECUTE_TIMEOUT,
      steamID
    );
  }

  private addPixels(pixels: Record<string, number>, steamID: string) {
    if (!this.isSteamIDAllowedToDraw(steamID)) return;

    const imageCopy = this.image;
    const steamIDsCopy = this.steamIDs;

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
    this.application.structures.Web.broadcast(
      WEBSOCKET_EVENTS.EXECUTE_TIMEOUT,
      steamID
    );
  }

  private async getRandomPalette(): Promise<{
    palette: Array<Array<number>>;
    paletteURL: string;
  }> {
    const { request } = await axios.get(LOSPEC_RANDOM_ENDPOINT);
    const paletteURL = request.res.responseUrl;
    const { data } = await axios(paletteURL + '.hex');
    const palette = [];

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
    const response = await this.getRandomPalette();
    this.palette = response.palette;
    this.paletteURL = response.paletteURL;

    const space = this.dimensions[0] * this.dimensions[1] - 1;
    for (let i = 1; i <= space; i++) {
      this.image.push(-1);
    }

    const {
      dimensions,
      image,
      banned,
      steamIDs,
      palette,
      paletteURL,
      timeoutTime,
    } = this;
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
      const { image, palette, paletteURL, steamIDs } = JSON.parse(
        buf.toString()
      );

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
    const { image, palette, paletteURL, steamIDs } = this;
    const json = JSON.stringify({
      image,
      palette,
      paletteURL,
      steamIDs,
    });
    await promises.writeFile(SAVE_FILENAME, json);
  }

  public executeWebhook(toArchive = false) {
    if (
      !this.webhookURL ||
      !this.webhookArchiveURL ||
      !this.application.config.host ||
      !this.msgID
    )
      return false;

    if (toArchive) {
      const uniqueIDs = [...new Set(this.steamIDs)];
      const uniquePixels = this.image.filter(color => color !== -1);
      const formData = new FormData();
      formData.append(
        'payload_json',
        JSON.stringify({
          username: 'Artboard',
          avatar_url: this.application.config.host + '/icon.png',
          embeds: [
            {
              image: { url: 'attachment://result.png' },
              fields: [
                {
                  name: 'Palette:',
                  value: `[${this.paletteURL.substring(
                    this.paletteURL.lastIndexOf('/') + 1
                  )}](${this.paletteURL})`,
                  inline: true,
                },
                {
                  name: 'Total Pixels Placed:',
                  value: uniquePixels.length,
                  inline: true,
                },
                {
                  name: 'Total Participants:',
                  value: uniqueIDs.length,
                  inline: true,
                },
              ],
            },
          ],
          attachments: [
            {
              id: 0,
              filename: 'result.png',
            },
          ],
        }),
        { contentType: 'application/json' }
      );
      formData.append(
        'files[0]',
        this.application.structures.Renderer.renderFrame(),
        { filename: 'result.png' }
      );

      const formHeaders = formData.getHeaders();

      axios
        .post(`${this.webhookArchiveURL}`, formData, {
          headers: { ...formHeaders },
        })
        .catch(err => console.error(err));
    } else {
      const formData = new FormData();
      formData.append(
        'payload_json',
        JSON.stringify({
          username: 'Artboard',
          avatar_url: this.application.config.host + '/icon.png',
          content: `[click here to view it on the website.](${this.application.config.host})`,
          embeds: [
            {
              image: { url: 'attachment://current.png' },
              fields: [
                {
                  name: 'Palette:',
                  value: `[${this.paletteURL.substring(
                    this.paletteURL.lastIndexOf('/') + 1
                  )}](${this.paletteURL})`,
                  inline: true,
                },
                {
                  name: 'Next Reset:',
                  value: `<t:${Math.round(
                    parseExpression('* * 1,15 * *').next().getTime() / 1000
                  )}:R>`,
                  inline: true,
                },
              ],
            },
          ],
          attachments: [
            {
              id: 0,
              filename: 'current.png',
            },
          ],
        }),
        { contentType: 'application/json' }
      );
      formData.append(
        'files[0]',
        this.application.structures.Renderer.renderFrame(),
        { filename: 'current.png' }
      );

      const formHeaders = formData.getHeaders();

      axios
        .patch(`${this.webhookURL}/messages/${this.msgID}`, formData, {
          headers: { ...formHeaders },
        })
        .catch(err => console.error(err));
    }
  }
}
