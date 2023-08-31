import type {
  Contract,
  RouteArgs,
  RouteMethods,
  createRouter,
} from "@typesafe-rest/core";
import type { Express } from "express";

export function createExpressMiddleware<
  T extends Contract,
  ContextCreator extends () => any,
  Context extends Awaited<ReturnType<ContextCreator>>
>(
  {
    contract,
    router,
    createContext,
  }: ReturnType<typeof createRouter<T, ContextCreator>>,
  app: Express
) {
  Object.entries(contract).map(([key, route]) => {
    if (
      route.method !== "GET" &&
      route.method !== "POST" &&
      route.method !== "PUT" &&
      route.method !== "PATCH" &&
      route.method !== "DELETE"
    ) {
      const subRouter = router[key];

      if (typeof subRouter !== "object") {
        throw new Error(`${key} in router must be object`);
      }

      return createExpressMiddleware(
        { contract: route, router: subRouter, createContext },
        app
      );
    }

    const handler = router[key];

    if (typeof handler !== "function") {
      throw new Error(`${key} in router must be function`);
    }

    const routeMethod = route.method.toLowerCase() as RouteMethods;

    app[routeMethod](route.path, async (req, res) => {
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

      const result = await handler({
        params: req.params,
        headers: req.headers,
        query: req.query,
        body: req.body,
        ctx: createContext(),
      } as RouteArgs<typeof route, Context>);

      const resultStatus = result.status as number;

      try {
        route.responses[resultStatus].parse(result);
      } catch (e) {
        res.status(500).json(e);
        return;
      }

      res.status(resultStatus).json(result.body);
    });
  });
}
