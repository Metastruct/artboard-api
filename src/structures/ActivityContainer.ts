import { readdirSync } from 'fs';
import { scheduleJob } from 'node-schedule';

import Application from '../Application';
import { BaseStructure } from './BaseStructure';
import { REGEX_FILENAME } from '../utilities';
import Activities from '../activities';

export default class ActivityContainer extends BaseStructure {
  private activities: Activities;

  constructor(application: Application, activities: Activities) {
    super(application, {});
    this.activities = activities;
  }

  public onImportDone() {
    for (const name in this.activities) {
      const activity = this.activities[name];
      activity.job = scheduleJob(activity.rule, activity.run);
    }
  }

  public next(activity: keyof Activities) {
    const selected = this.activities[activity];
    if (!selected) throw new Error(`no such activity "${activity}"!`);

    return selected.job.nextInvocation();
  }

  public static async create(application: Application) {
    const activities: Activities = {};

    for (let filename of readdirSync(__dirname + '/../activities/')) {
      filename = filename.replace(REGEX_FILENAME, '');

      const activity = (await import('../activities/' + filename)).default;
      if (!activity) continue;

      activities[filename] = new activity(application);
    }

    return new ActivityContainer(application, activities);
  }
}
