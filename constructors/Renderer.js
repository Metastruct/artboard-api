const canvas = require('canvas');
const { promises, createWriteStream } = require('fs');
const gm = require('gm');
const moment = require('moment');

module.exports = class Renderer {
  constructor(app) {
    this.app = app;
  }

  renderFrame() {
    let { imageWidth, imageHeight, image, palette } = this.app.GameLogic;

    const cnv = new canvas.Canvas(imageWidth * 16, imageHeight * 16);
    const ctx = cnv.getContext('2d');

    ctx.fillStyle = '#FFF';
    ctx.fillRect(0, 0, imageWidth * 16, imageHeight * 16);

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

    const out = createWriteStream(`assets/frames/frame_${fileName}.png`);
    out.on('finish', () => console.log('The PNG file was created.'));

    return stream.pipe(out);
  }

  async renderGIF() {
    let files = (await promises.readdir('assets/frames/')).sort(
      (e1, e2) => this.app.Utils.sortAlphaNum(e1, e2)
    );

    console.log('Creating a GIF...');

    let gif = gm();
    gif.delay(100);

    for (let file of files) {
      if (file.indexOf('frame?') < 0) continue;
      gif.in(`assets/frames/${file}`);
      gif.in(`assets/frames/${file}`);
    }

    await new Promise((res, rej) => {
      gif.write('assets/static/result.gif', (err) => {
        if (err) rej(err);
        res();
      });
    });

    for (let file of files) await promises.unlink(`assets/frames/${file}`);
  }
};
