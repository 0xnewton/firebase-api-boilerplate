import {faker} from "@faker-js/faker";

import type {RequestContext} from "@app/backend-framework";

export type TestRequestContextOverrides =
  Omit<Partial<RequestContext>, "request" | "response"> & {
    request?: Partial<RequestContext["request"]>;
    response?: Partial<RequestContext["response"]>;
  };

export function createTestRequestContext(
  overrides: TestRequestContextOverrides = {}
): RequestContext {
  const request: RequestContext["request"] = {
    method: "GET",
    path: `/${faker.helpers.slugify(faker.word.noun()).toLowerCase()}`,
    headers: {},
    query: {},
    params: {},
    body: undefined,
    cookies: {},
    ...overrides.request,
  };
  const response: RequestContext["response"] = {
    statusCode: 200,
    headers: {},
    ...overrides.response,
  };

  return {
    serviceName: "test-api",
    stage: "test",
    requestId: faker.string.uuid(),
    ...overrides,
    request,
    response,
  };
}
