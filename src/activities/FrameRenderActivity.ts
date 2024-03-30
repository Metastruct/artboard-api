import BaseActivity from './BaseActivity';

export default class FrameRenderActivity extends BaseActivity {
  public rule = '*/15 * * * *';

  public async run() {
    const { Game } = this.application.structures;

    Game.executeWebhook();
  }
}
