import { promises } from 'fs';

import Application from '../Application';
import { BaseStructure } from './BaseStructure';
import { hex2Rgb, SAVE_FILENAME, WebSocket } from '../utilities';
import { ImageFile, WEBSOCKET_EVENTS } from '../types';

export default class Game extends BaseStructure {
  public data!: ImageFile;
  public readonly dimensions: number[];
  private timeouts: Record<string, number> = {};
  private readonly banned?: Record<string, boolean>;
  private readonly forcePalette?: string;
  private readonly timeoutTime?: number;
  private readonly webhookURL: string;
  private readonly webhookArchiveURL: string;
  private readonly msgID: string;

  constructor(application: Application, data?: ImageFile) {
    super(application, {
      banned: 'object?',
      forcePalette: 'string?',
      dimensions: 'array',
      host: 'string?',
      timeoutTime: 'number',
      webhookURL: 'string?',
      webhookArchiveURL: 'string?',
    });

    const {
      banned,
      forcePalette,
      dimensions,
      timeoutTime,
      webhookURL,
      webhookArchiveURL,
      msgID,
    } = this.config;
    this.banned = banned || {};
    this.forcePalette = forcePalette;
    this.dimensions = dimensions;
    this.timeoutTime = timeoutTime;
    this.webhookURL = webhookURL;
    this.webhookArchiveURL = webhookArchiveURL;
    this.msgID = msgID;

    this.sendImageData = this.sendImageData.bind(this);
    this.onSocketAddPixel = this.onSocketAddPixel.bind(this);

    if (data) this.data = data;
    else this.createEmptyImage();
  }

  public onSocketAddPixel(socket: WebSocket, { pixels, steamId, x, y, color }) {
    if (!socket.hasWriteAccess) return;

    if (x !== undefined && y !== undefined && color !== undefined) {
      const xy = y * this.dimensions[0] + x;
      pixels = { [xy]: color }
    }

    this.addPixels(pixels, steamId);
  }

  public onImportDone() {
    this.structures.Web.on('connection', this.sendImageData);
    this.structures.Web.on(WEBSOCKET_EVENTS.ADD_PIXEL, this.onSocketAddPixel);
  }

  private addPixels(pixels: Record<number, number>, steamID: string) {
    const timeoutDate = this.timeouts[steamID];
    const isProhibited =
      this.banned[steamID] !== undefined ||
      (timeoutDate && Date.now() - timeoutDate < this.timeoutTime);
    if (isProhibited) return;

    const imageCopy = this.data.image;
    const steamIDsCopy = this.data.steamIDs;

    for (const position in pixels) {
      const color = pixels[position] - 1;
      const xy = parseInt(position);
      if (
        color >= this.data.palette.length ||
        color < -1 ||
        xy < 0 ||
        xy > this.data.image.length
      )
        return;
      steamIDsCopy[xy] = steamID;
      imageCopy[xy] = color;
    }

    this.data.image = imageCopy;
    this.data.steamIDs = steamIDsCopy;
    this.timeouts[steamID] = Date.now();

    this.structures.Web.broadcast(WEBSOCKET_EVENTS.IMAGE_UPDATE, {
      diff: pixels,
      steamId: steamID
    });

    this.structures.Web.broadcast(WEBSOCKET_EVENTS.EXECUTE_TIMEOUT, steamID);
  }

  private async getRandomPalette(): Promise<{
    palette: Array<Array<number>>;
    paletteURL: string;
  }> {
    let slug = this.forcePalette;

    if (!slug) {
      const response = await fetch(
        'https://lospec.com/palette-list/load?colorNumberFilterType=min&colorNumber=5&page=0&tag=&sortingType=newest'
      );
      const json = await response.json();
      slug = json.palettes[0].slug;
    }

    const paletteURL = 'https://lospec.com/palette-list/' + slug;
    const hexResponse = await fetch(paletteURL + '.hex');
    const data = await hexResponse.text();
    const palette = [];

    for (const hex of data.split(/(\r?\n)/g)) {
      try {
        const color = hex2Rgb(hex);
        palette.push(color);
      } catch (err) {}
    }

    return { palette, paletteURL };
  }

  // XXX: i separated it just because it was used twice and i
  // don't like how much space creating the payload can take up.
  private sendImageData(socket?: WebSocket) {
    const { dimensions, data, banned, timeoutTime } = this;
    const payload = {
      dimensions,
      data,
      banned,
      timeoutTime,
    };

    if (socket) socket.sendPayload(WEBSOCKET_EVENTS.IMAGE_DATA, payload);
    else this.structures.Web.broadcast(WEBSOCKET_EVENTS.IMAGE_DATA, payload);
  }

  public async createEmptyImage() {
    const response = await this.getRandomPalette();

    this.data = Object.assign(
      {
        steamIDs: [],
        image: [],
      },
      response
    );

    const space = this.dimensions[0] * this.dimensions[1] - 1;
    for (let i = 1; i <= space; i++) this.data.image.push(-1);

    this.sendImageData();
  }

  public executeWebhook(toArchive = false) {
    if (
      !this.webhookURL ||
      !this.webhookArchiveURL ||
      !this.config.host ||
      !this.msgID
    )
      return false;

    const { image, steamIDs, paletteURL } = this.data;
    const uniqueIDs = new Set(steamIDs.filter(id => id !== null));
    const uniquePixels = image.filter(color => color !== -1);
    const size = this.dimensions[0] * this.dimensions[1];

    let method = 'PATCH';
    let url = `${this.webhookURL}/messages/${this.msgID}`;
    const lastField = {
      name: 'Next Reset:',
      value: `<t:${Math.round(
        this.structures.ActivityContainer.next('ResetActivity').getTime() / 1000
      )}:R>`,
      inline: true,
    };
    let content = `[click here to view it on the website.](${this.config.host})`;

    if (toArchive) {
      method = 'POST';
      url = this.webhookArchiveURL;
      lastField.name = 'Total Participants:';
      lastField.value = String(uniqueIDs.size);
      content = "";
    }

    const payload = {
      username: 'Artboard',
      avatar_url: this.config.host + '/images/icon-avatar.png',
      content,
      embeds: [
        {
          image: { url: 'attachment://image.png' },
          fields: [
            {
              name: 'Palette:',
              value: `[${paletteURL.substring(
                paletteURL.lastIndexOf('/') + 1
              )}](${paletteURL})`,
              inline: true,
            },
            {
              name: 'Coverage:',
              value: `${((uniquePixels.length / size) * 100).toFixed(2)}% (${
                uniquePixels.length
              } pixels)`,
              inline: true,
            },
            lastField,
          ],
        },
      ],
      attachments: [{ id: 0, filename: 'image.png' }],
    };

    const formData = new FormData();
    formData.append('payload_json', JSON.stringify(payload));
    formData.append('files[0]', new Blob([ this.structures.Renderer.renderFrame() ]), 'image.png');

    return fetch(url, {
      method,
      body: formData,
    });
  }

  public async onCleanup() {
    const json = JSON.stringify(this.data);
    await promises.writeFile(SAVE_FILENAME, json);
  }

  public static async create(application: Application) {
    let image: ImageFile;

    try {
      const buf = await promises.readFile(SAVE_FILENAME);
      image = JSON.parse(buf.toString());
    } catch (err) {
      console.log('Image load failed.', err);
    }

    return new Game(application, image);
  }
}
