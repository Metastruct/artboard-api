import dayjs from 'dayjs';
import { existsSync } from 'fs';

import BaseActivity from '../foundation/BaseActivity';
import { FRAME_DATE_FORMAT } from '../utilities';

export default class FrameRenderActivity extends BaseActivity {
  public rule = '*/15 * * * *';

  public async run() {
    const { Game, Renderer } = this.application.structures;

    Game.executeWebhook();

    // const date = dayjs().format(FRAME_DATE_FORMAT);
    // if (!existsSync(`assets/frames/frame_${date}.png`))
    //  return Renderer.renderFrame();
  }
}
