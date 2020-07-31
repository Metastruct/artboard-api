const canvas = require('canvas');
const { promises, createWriteStream } = require('fs');
const gm = require('gm');
const moment = require('moment');
const { promisify } = require('util');

module.exports = class Renderer {
  constructor(app) {
    this.app = app;
  }

  renderFrame() {
    const cnv = new canvas.Canvas(this.width, this.height);
    const ctx = cnv.getContext('2d');

    let { imageWidth, imageHeight, image, palette } = this.app.GameLogic;

    ctx.fillStyle = '#FFF';
    ctx.fillRect(0, 0, imageWidth, imageHeight);

    image.forEach((color, xy) => {
      let x = xy % imageWidth;
      let y = (xy - x) / imageWidth;
      color = `rgb(${palette[color].join(',')})`;

      ctx.fillStyle = color;
      ctx.fillRect(x * 16, y * 16, 16, 16);
    });

    let fileName = moment().format('MM-DD-YY');
    let stream = cnv.createPNGStream();

    console.log(`Creating/overwriting a frame "${fileName}"...`);

    return stream.pipe(
      createWriteStream(`assets/frames/frame_${fileName}.png`)
    );
  }

  async renderGIF() {
    let files = (await promises.readdir('frames')).sort(
      this.app.Utils.sortAlphaNum
    );

    console.log('Creating a GIF...');

    let gif = gm();
    gif.delay(100);

    for (let file of files) {
      if (file.indexOf('frame?') < 0) continue;
      gif.in(`assets/frames/${file}`);
    }

    await promisify(gif.write)('result.gif');

    for (let file of files) await promises.unlink(`assets/frames/${file}`);
  }
};
