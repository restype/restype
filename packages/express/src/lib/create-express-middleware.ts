import {
  type Contract,
  type Router,
  type RouteArgs,
  type Route,
  type RouteMethods,
  type RouteHandler,
  isRoute,
} from "@restype/core";
import type { Express, Request, Response } from "express";

export function createExpressMiddleware<
  T extends Contract,
  ContextCreator extends (req: Request, res: Response) => any,
  Context extends Awaited<ReturnType<ContextCreator>>
>(
  app: Express,
  {
    contract,
    router,
    createContext,
  }: { contract: T; router: Router<T, Context>; createContext: ContextCreator }
) {
  Object.entries(contract).map(([key, value]) => {
    if (!isRoute(value)) {
      const subRouter = router[key];

      if (typeof subRouter !== "object") {
        throw new Error(`${key} in router must be object`);
      }

      return createExpressMiddleware(app, {
        contract: value,
        router: subRouter as Router<Contract, Context>,
        createContext,
      });
    }

    const route = value;
    const handler = router[key] as RouteHandler;

    if (typeof handler !== "function") {
      throw new Error(`${key} in router must be function`);
    }

    const routeMethod = route.method.toLowerCase() as RouteMethods;

    app[routeMethod](route.path, async (req, res) => {
      let { params } = req;

      try {
        route.headers?.parse(req.headers);

        if (route.params) {
          params = route.params.parse(params);
        }

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
        const ctx = await createContext(req, res);

        const result = await handler({
          params,
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
