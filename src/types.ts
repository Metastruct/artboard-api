export interface Config {
  banned?: Record<string, boolean>;
  dimensions: Array<number>;
  host: string;
  timeoutTime: number;
  webhookURL?: string;
  webhookArchiveURL?: string;
  msgID?: string;

  pixelRenderSize: number;

  port?: number;
  steamwebAPIkey: string;
  writeIPs: string[];
  forcePalette?: string;
}

export interface SteamUserInfo {
  nickname: string;
  avatar: string;
  date: number;
}

export interface ImageFile {
  image: number[];
  palette: number[][];
  paletteURL: string;
  steamIDs: string[];
}

export enum WEBSOCKET_EVENTS {
  ADD_PIXEL = 'addPixel',
  EXECUTE_TIMEOUT = 'executeTimeout',
  IMAGE_DATA = 'imageData',
  IMAGE_RESET = 'imageReset',
  IMAGE_UPDATE = 'imageUpdate',
  WRITE_ACCESS = 'writeAccess',
}

export interface WebSocketAPIEvents {
  [WEBSOCKET_EVENTS.ADD_PIXEL]: {
    x?: number;
    y?: number;
    pixels?: Record<string, number>;
    color?: number;
    steamId: string;
  };
  [WEBSOCKET_EVENTS.EXECUTE_TIMEOUT]: string;
  [WEBSOCKET_EVENTS.IMAGE_DATA]: {
    banned: Record<string, boolean>;
    data: ImageFile;
    dimensions: number[];
    timeoutTime: number;
  };
  [WEBSOCKET_EVENTS.IMAGE_RESET]: true;
  [WEBSOCKET_EVENTS.IMAGE_UPDATE]: {
    diff: Record<number, number>;
    steamId: string;
  };
  [WEBSOCKET_EVENTS.WRITE_ACCESS]: boolean;
}
