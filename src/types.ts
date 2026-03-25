export type MokapiRequest = {
  method: string;
  path: string;
  params: Record<string, string>;
  query: Record<string, string | string[]>;
  headers: Record<string, string>;
  body: unknown;
};

export type MokapiResponse = {
  status: number;
  body: unknown;
  headers?: Record<string, string>;
};

export type MokapiServerOpts = {
  files: string[];
  port: number;
  delay: number;
  method: string;
  cors: boolean;
  json: boolean;
  watch: boolean;
};
