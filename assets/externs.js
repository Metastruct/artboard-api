/** @interface */
function WSParsedMessage() {}
/** @type {string} */
WSParsedMessage.prototype.op;
/** @type {*} */
WSParsedMessage.prototype.data;

/** @interface */
function WSMessageEvent() {}
/** @type {string} */
WSMessageEvent.prototype.data;

/** @interface */
function ImageInfoData() {}
/** @type {Array} */
ImageInfoData.prototype.image;
/** @type {Array<Array>} */
ImageInfoData.prototype.palette;
/** @type {string} */
ImageInfoData.prototype.paletteURL;
/** @type {Array} */
ImageInfoData.prototype.steamIDs;

/** @interface */
function ImageInfo() {}
/** @type {Object} */
ImageInfo.prototype.banned;
/** @type {ImageInfoData} */
ImageInfo.prototype.data;
/** @type {Array} */
ImageInfo.prototype.dimensions;
/** @type {number} */
ImageInfo.prototype.timeoutTime;

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

/** @interface */
function ImageUpdate() {}
/** @type {Object} */
ImageUpdate.prototype.diff;
/** @type {string} */
ImageUpdate.prototype.steamId;