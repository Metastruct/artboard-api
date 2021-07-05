import * as dayjs from 'dayjs';
import { existsSync, writeFileSync } from 'fs';

import BaseActivity from '../foundation/BaseActivity';
import { FRAME_DATE_FORMAT, HISTORY_DATE_FORMAT } from '../utilities';

export default class Activity extends BaseActivity {
  public rate = 10000;
  public runOnInit = true;

  public async run() {
    const { Web, Game, Renderer } = this.application.structures;

    const date = dayjs().format(FRAME_DATE_FORMAT);
    const areHoursEven = new Date().getHours() % 2 === 0;
    if (areHoursEven && !existsSync(`assets/frames/frame_${date}.png`))
      return Renderer.renderFrame();

    const historyPath = `history/hi-${dayjs().format(HISTORY_DATE_FORMAT)}.dat`;
    const day = new Date().getDate();
    if (!existsSync(historyPath) && (day === 1 || day === 15)) {
      const compressed = JSON.stringify(Game.image);
      writeFileSync(historyPath, compressed);

      await Renderer.createGIF();
      await Game.createImage();
      Web.broadcast('imageReset');
      Game.executeWebhook();
    }
  }
}
