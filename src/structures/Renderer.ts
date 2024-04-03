import { Canvas, CanvasRenderingContext2D } from 'canvas';

import Application from '../Application';
import { BaseStructure } from './BaseStructure';

export default class Renderer extends BaseStructure {
  private readonly canvas: Canvas;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly pixelSize: number;

  constructor(application: Application) {
    super(application, { pixelRenderSize: 'number', dimensions: 'array' });

    this.pixelSize = this.config.pixelRenderSize;

    const [width, height] = this.config.dimensions;
    this.canvas = new Canvas(width * this.pixelSize, height * this.pixelSize);
    this.ctx = this.canvas.getContext('2d');
  }

  public renderFrame() {
    const { dimensions, data } = this.structures.Game,
      [imageWidth] = dimensions;
    const { width, height } = this.canvas;

    this.ctx.clearRect(0, 0, width, height);

    data.image.forEach((color: number | string, xy: number) => {
      if (color === -1) return;
      const x = xy % imageWidth,
        y = (xy - x) / imageWidth;
      const rgb = data.palette[color] || [255, 255, 255];
      color = `rgb(${rgb.join(',')})`;

      this.ctx.fillStyle = color;
      this.ctx.fillRect(
        x * this.pixelSize,
        y * this.pixelSize,
        this.pixelSize,
        this.pixelSize
      );
    });

    // const date = dayjs().format(FRAME_DATE_FORMAT);

    // const out = createWriteStream(`assets/frames/frame_${date}.png`);
    // out.on('error', err => console.error(err));

    return this.canvas.toBuffer();
  }

  // public async createGIF() {
  //   const { width, height } = this.canvas;
  //   const gif = gm('assets/frames/frame_*.png');
  //   gif
  //     .delay(10)
  //     .dispose('previous')
  //     .resize(width / 2, height / 2);

  //   await new Promise((res, rej) => {
  //     gif.write('assets/static/result.gif', err => {
  //       if (err) rej(err);
  //       res(true);
  //     });
  //   });

  //   for (const file of readdirSync('assets/frames/'))
  //     unlinkSync(`assets/frames/${file}`);
  // }

  public static create(application: Application) {
    return new Renderer(application);
  }
}
