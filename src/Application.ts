import { readdirSync, watch } from 'fs';

import { REGEX_FILENAME } from './utilities';
import { Config } from './types';
import AppStructures from './structures';

export default class Application {
  public config: Config;
  public structures: AppStructures = {};

  constructor(config: Config | string) {
    if (typeof config === 'string') {
      this.config = require('../' + config.replace(REGEX_FILENAME, ''));

      watch(
        config,
        eventType =>
          eventType === 'change' &&
          (this.config = require('../' + config.replace(REGEX_FILENAME, '')))
      );
    } else this.config = config;

    this.exit = this.exit.bind(this);

    this.importStructures();
  }

  private async importStructures() {
    for (let filename of readdirSync(__dirname + '/structures/')) {
      filename = filename.replace(REGEX_FILENAME, '');

      const structure = (await import('./structures/' + filename)).default;
      if (!structure) continue;

      this.structures[filename] = await structure.create(this);
    }

    Object.values(this.structures).forEach(v => v.onImportDone());

    ['SIGINT', 'SIGTERM', 'beforeExit', 'uncaughtExceptionMonitor'].forEach(
      signal => process.on(signal, this.exit)
    );
  }

  private async exit() {
    console.log('Preparing before shutdown...');
    await Promise.all(Object.values(this.structures).map(v => v.onCleanup()));
    console.log('Shutting down.');
    process.exit(0);
  }
}
