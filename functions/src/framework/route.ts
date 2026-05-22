import type {Controller} from "./controller";
import type {RouteDefinition} from "./http";

type RegisteredRoute = RouteDefinition & {
  propertyKey: string;
};

const routeRegistry = new WeakMap<object, RegisteredRoute[]>();

export function Route(definition: RouteDefinition) {
  return (
    target: Controller,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) => {
    const routes = routeRegistry.get(target) ?? [];
    routes.push({
      ...definition,
      propertyKey,
    });
    routeRegistry.set(target, routes);
    return descriptor;
  };
}

export function getRegisteredRoutes(target: object): RegisteredRoute[] {
  return routeRegistry.get(target) ?? [];
}
