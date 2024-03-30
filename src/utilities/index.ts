import { ok } from 'assert';

export * from './websocket';

export const REGEX_FILENAME = /\.[^/.]+$/;
export const LOSPEC_RANDOM_ENDPOINT = 'https://lospec.com/palette-list/random';
export const SAVE_FILENAME = 'save.dat';
export const REMOTE_ADDRESS_PREFIX = '::ffff:';
export const STEAM_INFO_MAX_AGE = 30 * 60 * 1000;
export const MIN_COLORS = 5;

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

export function isIPv4AddressBogon(ip: string) {
  const parts = ip.split('.');
  return (
    parts[0] === '10' ||
    (parts[0] === '172' &&
      parseInt(parts[1], 10) >= 16 &&
      parseInt(parts[1], 10) <= 31) ||
    (parts[0] === '192' && parts[1] === '168')
  );
}

export function hex2Rgb(hex: string) {
  if (hex.startsWith('#')) hex = hex.slice(1);

  // #FAF -> #FFAAFF; #FAFB -> #FFAAFFBB
  if (hex.length <= 4) {
    let extendedHex = '';
    for (let i = 0; i < hex.length; i++) extendedHex += hex[i] + hex[i];
    hex = extendedHex;
  }

  if (hex.length === 6 || hex.length === 7) hex += hex[6] || 'FF';

  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(
    hex
  );

  return [
    parseInt(result[1], 16),
    parseInt(result[2], 16),
    parseInt(result[3], 16),
    parseInt(result[4], 16),
  ];
}
