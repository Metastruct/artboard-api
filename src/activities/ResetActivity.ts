import { existsSync, writeFileSync } from 'fs';

import BaseActivity from './BaseActivity';
import { WEBSOCKET_EVENTS } from '../types';

export default class ResetActivity extends BaseActivity {
  public rule = '0 0 1,15 * *';

  public async run() {
    const { Game, Web } = this.application.structures;

    const historyPath = `history/hi-${Date.now()}.dat`;
    if (!existsSync(historyPath)) {
      const compressed = JSON.stringify(Game.data);
      writeFileSync(historyPath, compressed);

      await Game.executeWebhook(true);
      await Game.createEmptyImage();
      Web.broadcast(WEBSOCKET_EVENTS.IMAGE_RESET, true);
    }
  }
}
