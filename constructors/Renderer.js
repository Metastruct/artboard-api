const canvas = require('canvas');
const { promises, createWriteStream } = require('fs');
const gm = require('gm');
const moment = require('moment');

module.exports = class Renderer {
  constructor(app) {
    this.app = app;

    const { imageWidth, imageHeight } = this.app.GameLogic;
    this.pixelSize = 8;
    this.canvas = new canvas.Canvas(
      imageWidth * this.PixelSize,
      imageHeight * this.PixelSize
    );
    this.ctx = this.canvas.getContext('2d');
  }

  renderFrame() {
    const { imageWidth, image, palette } = this.app.GameLogic;
    const { width, height } = this.canvas;

    this.ctx.clearRect(0, 0, width, height);

    image.forEach((color, xy) => {
      if (color == -1) return;
      const x = xy % imageWidth;
      const y = (xy - x) / imageWidth;
      const rgb = palette[color] || [255, 255, 255];
      color = `rgb(${rgb.join(',')})`;

      this.ctx.fillStyle = color;
      this.ctx.fillRect(
        x * this.PixelSize,
        y * this.PixelSize,
        this.PixelSize,
        this.PixelSize
      );
    });

    const fileName = moment().format('MM-DD-YY-HH');
    const stream = this.canvas.createPNGStream();

    console.log(`Creating/overwriting a frame "${fileName}"...`);

    const out = createWriteStream(`assets/frames/frame_${fileName}.png`);
    out.on('finish', () => console.log('The PNG file was created.'));

    return stream.pipe(out);
  }

  async renderGIF() {
    console.log('Creating a GIF...');

    let gif = gm();
    gif.in('assets/frames/frame_*.png')
      .delay(10)
      .bitdepth(8)
      .colors(192)
      .dither(false)
      .filter('Point')
      .antialias(false);

    await new Promise((res, rej) => {
      gif.write('assets/static/result.gif', (err) => {
        if (err) rej(err);
        res();
      });
    });

    const files = (await promises.readdir('assets/frames/'));
    for (let file of files) await promises.unlink(`assets/frames/${file}`);
  }
};
