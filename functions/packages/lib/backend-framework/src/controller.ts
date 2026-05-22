import type {RequestContext} from "./context";

export class Controller {
  protected context!: RequestContext;

  async initialize(context: RequestContext): Promise<void> {
    this.context = context;
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
