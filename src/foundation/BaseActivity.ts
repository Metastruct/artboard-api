import Application from '../Application';

export default class BaseActivity {
  public readonly application: Application;
  public readonly rate: number = 5000;
  public readonly runOnInit: boolean = false;
  private interval: NodeJS.Timeout;

  constructor(application: Application) {
    this.application = application;
  }

  public activate() {
    this.interval = setInterval(() => this.run(), this.rate);
    if (this.runOnInit) this.run();
  }

  public run() {}
}
