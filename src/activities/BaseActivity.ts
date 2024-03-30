import { Job } from 'node-schedule';

import Application from '../Application';

export default class BaseActivity {
  public job: Job;
  public readonly application: Application;
  public readonly rule: string = '* * * * *';
  public readonly runOnActivate = false;

  constructor(application: Application) {
    this.application = application;
    this.run = this.run.bind(this);
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public run() {}
}
