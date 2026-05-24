import {
  Controller,
  Route,
} from "@app/backend-framework";
import type {RouteArgs} from "@app/backend-framework";
import {DemoService} from "@app/demo-service";
import {nonEmptyString, z} from "@app/validation";

const DemoShowcasePayload = z.object({
  name: nonEmptyString(),
  assetText: z.string().optional(),
});

type DemoShowcasePayload = z.infer<typeof DemoShowcasePayload>;

export class DemoController extends Controller {
  private demoService?: DemoService;

  @Route({
    path: "/demo/showcase",
    method: "POST",
    authenticated: true,
    payloadSchema: DemoShowcasePayload,
  })
  async createShowcase({
    payload,
  }: RouteArgs<DemoShowcasePayload>) {
    return this.service.createShowcase(payload);
  }

  private get service(): DemoService {
    this.demoService ??= new DemoService(this.context);
    return this.demoService;
  }
}
