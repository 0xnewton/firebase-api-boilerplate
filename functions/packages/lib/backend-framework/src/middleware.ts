import type {RequestContext} from "./context";

export type Middleware = (
  context: RequestContext,
  next: () => Promise<void>
) => Promise<void>;

export function composeMiddlewares(
  middlewares: Middleware[]
): (context: RequestContext) => Promise<void> {
  return async (context: RequestContext) => {
    let index = -1;

    async function dispatch(i: number): Promise<void> {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }

      index = i;
      const middleware = middlewares[i];
      if (!middleware) {
        return;
      }

      await middleware(context, () => dispatch(i + 1));
    }

    await dispatch(0);
  };
}
