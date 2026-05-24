import {faker} from "@faker-js/faker";

import type {
  HttpRequest,
  HttpResponse,
  createHttpRouter,
} from "@app/backend-framework";

export class TestHttpResponse implements HttpResponse {
  statusCode = 0;
  headers: Record<string, string> = {};
  body: unknown;

  status(code: number): HttpResponse {
    this.statusCode = code;
    return this;
  }

  set(headers: Record<string, string>): HttpResponse {
    this.headers = {
      ...this.headers,
      ...headers,
    };
    return this;
  }

  json(body: unknown): void {
    this.body = body;
  }
}

export function createTestHttpRequest(
  overrides: Partial<HttpRequest> = {}
): HttpRequest {
  return {
    method: "GET",
    url: `/${faker.helpers.slugify(faker.word.noun()).toLowerCase()}`,
    headers: {
      "x-request-id": faker.string.uuid(),
    },
    query: {},
    ...overrides,
  };
}

export async function invokeTestRouter(
  router: ReturnType<typeof createHttpRouter>,
  request: HttpRequest
): Promise<TestHttpResponse> {
  const response = new TestHttpResponse();
  await router(request, response);
  return response;
}
