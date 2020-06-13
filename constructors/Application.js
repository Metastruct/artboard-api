const GameLogic = require('./GameLogic');
const Utils = require('./Utils');

module.exports = class Application {
  constructor(config) {
    this.config = config;

    this.Utils = new Utils();
    this.GameLogic = new GameLogic(this);
  }
};