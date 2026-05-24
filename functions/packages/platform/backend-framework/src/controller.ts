import type {RequestContext} from "./context";

export class Controller {
  private requestContext?: RequestContext;

  protected get context(): RequestContext {
    if (!this.requestContext) {
      throw new Error("Controller has not been initialized");
    }

    return this.requestContext;
  }

  async initialize(context: RequestContext): Promise<void> {
    this.requestContext = context;
  }

  getPathParameter(key: string): string | undefined {
    return this.context.request.params[key];
  }

  getRequestHeader(key: string): string | undefined {
    return this.context.request.headers[key.toLowerCase()];
  }

  setResponseHeader(key: string, value: string): void {
    this.context.response.headers[key] = value;
  }
}
