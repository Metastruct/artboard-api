import { readdirSync } from 'fs';

import Application from '../Application';
import BaseActivity from '../foundation/BaseActivity';
import { BaseStructure } from '../foundation/BaseStructure';
import { REGEX_FILENAME } from '../utilities';

export default class ActivityContainer extends BaseStructure {
  private activities: BaseActivity[] = [];

  constructor(application: Application) {
    super(application, {});

    this.importActivities();
  }

  public onImportDone() {
    this.activities.forEach((x) => x.activate());
  }

  private async importActivities() {
    for (let filename of readdirSync(__dirname + '/../activities/')) {
      filename = filename.replace(REGEX_FILENAME, '');
      this.activities.push(
        new (await import('../activities/' + filename)).default(
          this.application
        )
      );
    }
  }
}
