const GameLogic = require('./GameLogic');
const Web = require('./Web');
const Utils = require('./Utils');

module.exports = class Application {
  constructor(config) {
    this.config = config;

    this.Utils = new Utils(this);
    this.Web = new Web(this);
    this.GameLogic = new GameLogic(this);
  }
};
