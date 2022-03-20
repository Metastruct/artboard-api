import { readdirSync } from 'fs';

import { REGEX_FILENAME } from './utilities';

export default class Application {
  public structures: Record<string, any> = {};
  public readonly config: IConfig;

  constructor(config: IConfig) {
    this.config = config;
    this.importStructures();
  }

  private async importStructures() {
    for (let filename of readdirSync(__dirname + '/structures/')) {
      filename = filename.replace(REGEX_FILENAME, '');
      this.structures[filename] = new (
        await import('./structures/' + filename)
      ).default(this);
    }

    Object.values(this.structures).forEach(
      (v) => v.onImportDone()
    );

    ['SIGINT', 'SIGTERM'].forEach(
      signal =>
        process.on(signal, () => {
          console.log(signal + ' received! Preparing before shutdown...');
          Object.values(this.structures).forEach(
            (v) => v.onCleanup()
          );
        })
    );
  }
}
