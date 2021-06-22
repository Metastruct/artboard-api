import { Canvas, NodeCanvasRenderingContext2D } from 'canvas';
import * as dayjs from 'dayjs';
import { createWriteStream, readdirSync, unlinkSync } from 'fs';
import * as gm from 'gm';

import Application from '../Application';
import { BaseStructure } from '../foundation/BaseStructure';
import { FRAME_DATE_FORMAT } from '../utilities';

export default class Renderer extends BaseStructure {
  private readonly canvas: Canvas;
  private readonly ctx: NodeCanvasRenderingContext2D;
  private readonly pixelSize: number;

  constructor(application: Application) {
    super(application, { pixelRenderSize: 'number', dimensions: 'array' });

    this.pixelSize = this.application.config.pixelRenderSize;

    const [width, height] = this.application.config.dimensions;
    this.canvas = new Canvas(width * this.pixelSize, height * this.pixelSize);
    this.ctx = this.canvas.getContext('2d');
  }

  public renderFrame() {
    const { dimensions, image, palette } = this.application.structures.Game,
      [imageWidth] = dimensions;
    const { width, height } = this.canvas;

    this.ctx.clearRect(0, 0, width, height);

    image.forEach((color: number | string, xy: number) => {
      if (color === -1) return;
      const x = xy % imageWidth,
        y = (xy - x) / imageWidth;
      const rgb = palette[color] || [255, 255, 255];
      color = `rgb(${rgb.join(',')})`;

      this.ctx.fillStyle = color;
      this.ctx.fillRect(
        x * this.pixelSize,
        y * this.pixelSize,
        this.pixelSize,
        this.pixelSize
      );
    });

    const date = dayjs().format(FRAME_DATE_FORMAT);
    const stream = this.canvas.createPNGStream();
    stream.on('error', (err) => console.error(err));

    const out = createWriteStream(`assets/frames/frame_${date}.png`);
    out.on('error', (err) => console.error(err));

    return stream.pipe(out);
  }

  public async createGIF() {
    const { width, height } = this.canvas;
    const gif = gm('assets/frames/frame_*.png');
    gif
      .delay(10)
      .dispose('previous')
      .resize(width / 2, height / 2);

    await new Promise((res, rej) => {
      gif.write('assets/static/result.gif', (err) => {
        if (err) rej(err);
        res(true);
      });
    });

    for (const file of readdirSync('assets/frames/'))
      unlinkSync(`assets/frames/${file}`);
  }
}
