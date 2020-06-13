const fs = require('fs');
const FastIntegerCompression = require("fastintcompression");

module.exports = class GameLogic {
  constructor(app) {
    this.app = app;
    this.paletteNumbers = {
      colored: 23,
      gray: 9
    };
    this.image = [];
    this.imageWidth = 160;
    this.imageHeight = 80;

    this.loadPalette();
    this.loadImage();

    process.on('beforeExit', () => this.saveImage());
  }
  
  loadPalette() {
    this.palette = [];
    
    let { colored, gray } = this.paletteNumbers,
        { hsvToRgb } = this.app.Utils;
    let hueNum = 360 / colored;

    for (let i = 1; i <= gray; i++) {
      this.palette.push(hsvToRgb(0, 0, 100 / i));
    }

    for (let i = 1; i <= colored; i++) {
      this.palette.push(hsvToRgb(hueNum * i, 100, 100));
    }
  }

  createImage() {
    let space = this.imageWidth * this.imageHeight;
    for (let i = 1; i <= space; i++) {
      this.image[i] = 0;
    }
  }

  loadImage() {
    if (!fs.existsSync('save.dat'))
      return this.createImage();

    console.log('Loading image...');

    try {
      let buf = fs.readFileSync('save.dat');
      
      this.image = FastIntegerCompression.uncompress(buf);
    } catch (err) {
      console.log('Image load failed.', err);
      this.createImage();
    }
  }

  saveImage() {
    fs.writeFileSync(
      'save.dat',
      FastIntegerCompression.compress(this.image)
    );
  }
};