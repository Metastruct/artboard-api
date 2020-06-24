const GameLogic = require('./GameLogic');
const Web = require('./Web');

module.exports = class Application {
  constructor(config) {
    this.config = config;

    this.Web = new Web(this);
    this.GameLogic = new GameLogic(this);
  }
};
