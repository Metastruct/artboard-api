/** @interface */
function WSMessage() {}
/** @type {string} */
WSMessage.prototype.op;
/** @type {*} */
WSMessage.prototype.data;

/** @interface */
function ImageInfo() {}
/** @type {Array<Array>} */
ImageInfo.prototype.palette;
/** @type {Array} */
ImageInfo.prototype.image;
/** @type {Array} */
ImageInfo.prototype.steamIDs;
/** @type {Array} */
ImageInfo.prototype.dimensions;

/** @interface */
function AddPixel() {}
/** @type {number} */
AddPixel.prototype.color;
/** @type {number} */
AddPixel.prototype.xy;
/** @type {string} */
AddPixel.prototype.steamId;

/** @interface */
function SteamResponse() {}
/** @type {string} */
SteamResponse.prototype.nickname;
/** @type {string} */
SteamResponse.prototype.avatar;
