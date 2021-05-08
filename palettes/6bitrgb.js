const colorsys = require('colorsys');
const fs = require('fs');

// https://lospec.com/palette-list/6-bit-rgb
module.exports = () => {
  const paletteFile = fs.readFileSync(__dirname + '/6bitrgb.hex');
  let palette = [];

  for (const hex of paletteFile.toString().split('\n')) {
    try {
      const { r, g, b } = colorsys.hex2Rgb(hex);
      palette.push([r, g, b]);
    } catch (err) {}
  }

  return palette;
};
