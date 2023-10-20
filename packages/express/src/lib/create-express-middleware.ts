import {
  type Contract,
  type Router,
  type RouteArgs,
  type Route,
  type RouteMethods,
  type Middleware,
  isRoute,
} from "@restype/core";
import type { Express, Request } from "express";

export function createExpressMiddleware<
  T extends Contract,
  ContextCreator extends (req: Request) => any,
  Context extends Awaited<ReturnType<ContextCreator>>
>(
  app: Express,
  {
    contract,
    router,
    createContext,
  }: { contract: T; router: Router<T, Context>; createContext: ContextCreator },
  middleware?: Middleware<T>
) {
  Object.entries(contract).map(([key, value]) => {
    if (!isRoute(value)) {
      const subRouter = router[key];

      if (typeof subRouter !== "object") {
        throw new Error(`${key} in router must be object`);
      }

      return createExpressMiddleware(
        app,
        { contract: value, router: subRouter, createContext },
        middleware
      );
    }

    const route = value;
    const handler = router[key];

    if (typeof handler !== "function") {
      throw new Error(`${key} in router must be function`);
    }

    const routeMethod = route.method.toLowerCase() as RouteMethods;
    const mw = (middleware?.[key] ?? []) as any[];

    app[routeMethod](route.path, ...mw, async (req, res) => {
      try {
        route.headers?.parse(req.headers);

        if (route.method === "GET") {
          route.query?.parse(req.query);
        } else {
          route.body.parse(req.body);
        }
      } catch (e) {
        res.status(400).json(e);
        return;
      }

      try {
        const ctx = await createContext(req);

        const result = await handler({
          params: req.params,
          headers: req.headers,
          query: req.query,
          body: req.body,
          ctx,
        } as RouteArgs<Route, Context>);

        const resultStatus = result.status as number;

        route.responses[resultStatus]?.parse(result);

        res.status(resultStatus).json(result.body);
      } catch (e) {
        // TODO: logger?
        res.sendStatus(500);
      }
    });
  });
}
