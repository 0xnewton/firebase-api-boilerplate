import type {HttpMethod} from "./http";

export type RuntimeContext = {
  serviceName: string;
  stage?: string;
};

export type RequestContext = RuntimeContext & {
  requestId: string;
  authToken?: string;
  claims?: unknown;
  request: {
    method: HttpMethod;
    path: string;
    headers: Record<string, string | undefined>;
    query: Record<string, unknown>;
    params: Record<string, string>;
    body: unknown;
    cookies: Record<string, string>;
  };
  response: {
    statusCode: number;
    headers: Record<string, string>;
    body?: unknown;
  };
};
