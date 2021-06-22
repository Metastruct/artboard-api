import { ok } from 'assert';

export {
  WebSocket,
  WebSocketServer,
  WEBSOCKET_UNSUPPORTED_PAYLOAD,
} from './websocket';

export const FRAME_DATE_FORMAT = 'MM-DD-YY-HH';
export const HISTORY_DATE_FORMAT = 'MM-DD-YY';
export const REGEX_FILENAME = /\.[^/.]+$/;
export const LOSPEC_RANDOM_ENDPOINT = 'https://lospec.com/palette-list/random';
export const SAVE_FILENAME = 'save.dat';

export function assertConfiguration(
  needed: Record<string, string>,
  given: Record<string, any>
) {
  for (const key in needed) {
    let needType = needed[key];
    const givenType = typeof given[key] as string,
      optional = needType.endsWith('?');

    if (optional)
      if (givenType === 'undefined') continue;
      else needType = needType.slice(0, -1);

    ok(
      needType === 'array' ? Array.isArray(given[key]) : needType === givenType,
      `Invalid type of "${key}": needed "${needType}", instead received "${givenType}".`
    );
  }
}
