module.exports = class Utils {
  constructor() {
    this.regexAlpha = /[^a-zA-Z]/g;
    this.regexNumer = /[^0-9]/g;
  }

  sortAlphaNum(element1, element2) {
    var aA = element1.replace(this.regexAlpha, '');
    var bA = element2.replace(this.regexAlpha, '');

    if (aA === bA) {
      var aN = parseInt(element1.replace(this.regexNumer, ''), 10);
      var bN = parseInt(element2.replace(this.regexNumer, ''), 10);

      return aN === bN ? 0 : aN > bN ? 1 : -1;
    } else {
      return aA > bA ? 1 : -1;
    }
  }
};
