import {
  Controller,
  RequestContext,
  Route,
  ValidationError,
} from "@app/backend-framework";
import type {RouteArgs} from "@app/backend-framework";
import {DemoService} from "@app/demo-service";
import {object, optional, string} from "@app/validation";

const DemoShowcasePayload = object({
  name: string(),
  assetText: optional(string()),
});

type DemoShowcasePayload = ReturnType<typeof DemoShowcasePayload.parse>;

export class DemoController extends Controller {
  private demoService!: DemoService;

  async initialize(context: RequestContext) {
    await super.initialize(context);
    this.demoService = new DemoService(context);
  }

  @Route({
    path: "/demo/showcase",
    method: "POST",
    authenticated: true,
    payloadSchema: DemoShowcasePayload,
  })
  async createShowcase({
    payload,
  }: RouteArgs<DemoShowcasePayload>) {
    if (!payload) {
      throw new ValidationError("Missing demo payload");
    }

    return this.demoService.createShowcase(payload);
  }
}
