import { readdirSync, watch } from 'fs';

import { REGEX_FILENAME } from './utilities';

interface IConfig {
  banned?: Record<string, boolean>;
  dimensions: Array<number>;
  host: string;
  timeoutTime: number;
  webhookURL?: string;
  webhookArchiveURL?: string;
  msgID?: string;

  pixelRenderSize: number;

  port?: number;
  steamwebAPIkey: string;
  writeIPs: string[];
}

export default class Application {
  public config: IConfig;
  public structures: Record<string, any> = {};

  constructor(config: IConfig | string) {
    if (typeof config === 'string') {
      this.config = require('../' + config.replace(REGEX_FILENAME, ''));
      watch(config, eventType => {
        if (eventType === 'change')
          this.config = require('../' + config.replace(REGEX_FILENAME, ''));
      });
    } else this.config = config;
    this.importStructures();
  }

  private async importStructures() {
    for (let filename of readdirSync(__dirname + '/structures/')) {
      filename = filename.replace(REGEX_FILENAME, '');
      this.structures[filename] = new (
        await import('./structures/' + filename)
      ).default(this);
    }

    Object.values(this.structures).forEach(v => v.onImportDone());

    ['SIGINT', 'SIGTERM', 'beforeExit', 'uncaughtExceptionMonitor'].forEach(
      signal =>
        process.on(signal, async () => {
          console.log(signal + ' received! Preparing before shutdown...');
          await Promise.all(
            Object.values(this.structures).map(v => v.onCleanup())
          );
          console.log('Bye!');
          process.exit(0);
        })
    );
  }
}
