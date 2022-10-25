import dayjs from 'dayjs';
import { existsSync, writeFileSync } from 'fs';

import BaseActivity from '../foundation/BaseActivity';
import { HISTORY_DATE_FORMAT } from '../utilities';

export default class ResetActivity extends BaseActivity {
  public rule = '* * 1,15 * *';

  public async run() {
    const { Game, Renderer, Web } = this.application.structures;

    const historyPath = `history/hi-${dayjs().format(HISTORY_DATE_FORMAT)}.dat`;
    if (!existsSync(historyPath)) {
      const compressed = JSON.stringify({
        palette: Game.palette,
        image: Game.image,
        steamIDs: Game.steamIDs,
      });
      writeFileSync(historyPath, compressed);

      // await Renderer.createGIF();
      await Game.createEmptyImage();
      Web.broadcast('imageReset');
      // Game.executeWebhook();
    }
  }
}
