const GameLogic = require('./GameLogic');
const Web = require('./Web');
const Utils = require('./Utils');
const Renderer = require('./Renderer');

module.exports = class Application {
  constructor(config) {
    this.config = config;

    this.Utils = new Utils();
    this.Web = new Web(this);
    this.GameLogic = new GameLogic(this);
    this.Renderer = new Renderer(this);
  }
};
