import Application from '../Application';

export default class BaseActivity {
  public readonly application: Application;
  public readonly rate: number = 5000;
  public readonly runOnInit: boolean = false;

  constructor(application: Application) {
    this.application = application;
  }

  public activate() {
    if (this.runOnInit) this.run();
  }

  public run() {}
}
