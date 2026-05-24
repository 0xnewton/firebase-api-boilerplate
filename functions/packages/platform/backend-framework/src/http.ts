export type HttpMethod =
  | "GET"
  | "POST"
  | "PUT"
  | "PATCH"
  | "DELETE"
  | "OPTIONS";

export type Schema<T> = {
  parse(value: unknown): T;
};

type PayloadRouteArg<Payload> = unknown extends Payload ?
  {payload?: Payload} :
  {payload: Payload};

export type RouteDefinition<
  Payload = unknown,
  PathParams = unknown,
  QueryParams = unknown,
> = {
  path: string;
  method: HttpMethod;
  authenticated?: boolean;
  successStatusCode?: number;
  payloadSchema?: Schema<Payload>;
  pathParamsSchema?: Schema<PathParams>;
  queryParamsSchema?: Schema<QueryParams>;
};

export type RouteArgs<
  Payload = unknown,
  PathParams = unknown,
  QueryParams = unknown,
  Claims = unknown,
> = PayloadRouteArg<Payload> & {
  pathParams?: PathParams;
  queryParams?: QueryParams;
  token?: string;
  claims?: Claims;
};
