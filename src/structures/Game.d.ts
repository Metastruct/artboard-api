declare interface IWebSocketAddPixelEventData {
  x?: number;
  y?: number;
  pixels?: Record<string, number>;
  color?: number;
  steamId: string;
}
