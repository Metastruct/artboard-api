const colorsys = require('colorsys');

module.exports = ({ config }) => {
  let palette = [];

  const { colored, gray } = config.paletteSettings;
  const hueNum = 360 / colored;

  for (let i = 1; i <= gray; i++) {
    const { r, g, b } = colorsys.hsv2Rgb(0, 0, 100 / (gray - i));
    palette.push([r, g, b]);
  }

  for (let i = 1; i <= colored * 2; i++) {
    const I = i % colored;
    const isDark = i > colored;

    const { r, g, b } = colorsys.hsv2Rgb(hueNum * I, 100, isDark ? 50 : 100);
    palette.push([r, g, b]);
  }

  return palette;
};
