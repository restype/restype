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
      return;
    }

    const handler = router[key];

    if (typeof handler !== "function") {
      throw new Error("unexpected");
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

      try {
        route.responses[result.status as number].parse(result);
      } catch (e) {
        res.status(500).json(e);
        return;
      }

      res.status(result.status as number).json(result.body);
    });
  });
}
