import dayjs from 'dayjs';
import { existsSync } from 'fs';

import BaseActivity from '../foundation/BaseActivity';
import { FRAME_DATE_FORMAT } from '../utilities';

export default class FrameRenderActivity extends BaseActivity {
  public rule = '0 */2 * * *';

  public async run() {
    const { Renderer } = this.application.structures;

    const date = dayjs().format(FRAME_DATE_FORMAT);
    if (!existsSync(`assets/frames/frame_${date}.png`))
      return Renderer.renderFrame();
  }
}
