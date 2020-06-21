const GameLogic = require('./GameLogic');
const Utils = require('./Utils');
const Web = require('./Web');

module.exports = class Application {
  constructor(config) {
    this.config = config;

    this.Utils = new Utils();
    this.Web = new Web(this);
    this.GameLogic = new GameLogic(this);
  }
};
