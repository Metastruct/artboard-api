declare interface IConfig {
  banned?: Record<string, boolean>;
  dimensions: Array<number>;
  host: string;
  timeoutTime: number;
  webhookURL?: string;

  pixelRenderSize: number;

  port?: number;
  writeIPs: string[];
}
