// Please read README.md for more information.
module.exports = {
  // GAME STRUCTURE
  dimensions: [640, 160], // ([width, height], also required for Renderer structure)
  timeoutTime: 3000, // (milliseconds)
  banned: {}, // (optional, {steamID_64}: true)
  host: 'http://localhost/', // (optional)
  webhookURL: '', // (optional, Discord webhook API URL address)

  // RENDERER STRUCTURE
  pixelRenderSize: 4,

  // WEB STRUCTURE
  writeIPs: [
    // (IPs identifiable by the server as allowed to edit image data)
    '127.0.0.1',
  ],
};
