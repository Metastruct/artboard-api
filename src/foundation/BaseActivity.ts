import schedule from 'node-schedule';

import Application from '../Application';

export default class BaseActivity {
  public readonly application: Application;
  public readonly rule: string = '* * * * *';
  private job: schedule.Job;

  constructor(application: Application) {
    this.application = application;
  }

  public activate() {
    this.job = schedule.scheduleJob(this.rule, () => this.run());
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public run() {}
}
