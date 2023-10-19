import {
  isRoute,
  type Contract,
  type Middleware,
  type Route,
  type RouteArgs,
  type RouteHandler,
  type Router,
  type MW,
} from "@typesafe-rest/core";
import type { NextApiRequest, NextApiResponse } from "next";

export function createNextRouter<
  T extends Contract,
  ContextCreator extends (req: NextApiRequest) => any,
  Context extends Awaited<ReturnType<ContextCreator>>
>(
  options: { nextjsApiRouteName: string },
  {
    contract,
    router,
    createContext,
  }: { contract: T; router: Router<T, Context>; createContext: ContextCreator },
  middleware?: Middleware<T>
) {
  const flatContract = flattenContract(contract, router, middleware);

  return async (req: NextApiRequest, res: NextApiResponse) => {
    const { [options.nextjsApiRouteName]: _parts, ...query } = req.query;
    const parts = Array.isArray(_parts) ? _parts : _parts ? [_parts] : [];

    const result = flatContract.find(({ path, route }) => {
      return (
        route.method === req.method &&
        path.length === parts.length &&
        path.every((it, idx) => it === parts[idx] || it.startsWith(":"))
      );
    });

    if (!result) {
      res.status(404).end();
      return;
    }

    const { route, handler, mw } = result;

    const processed = runMiddleware(mw, req, res);

    if (!processed) {
      return;
    }

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
        params: getParams(parts, route),
        headers: req.headers,
        query: query,
        body: req.body,
        ctx,
      } as RouteArgs<Route, Context>);

      const resultStatus = result.status;

      route.responses[resultStatus]?.parse(result);

      res.status(resultStatus).json(result.body);
    } catch {
      res.status(500).end();
    }
  };
}

function flattenContract(
  contract: Contract,
  router: Router<any, any>,
  middleware?: Middleware<any>
) {
  const result: {
    path: string[];
    route: Route;
    handler: RouteHandler;
    mw: MW | undefined;
  }[] = [];

  Object.keys(contract).forEach((key) => {
    const contractValue = contract[key];
    const routerValue = router[key];
    const middlewareValue = middleware?.[key];

    if (!contractValue || !routerValue) {
      throw new Error("unexpected");
    }

    if (isRoute(contractValue)) {
      const handler = routerValue;

      if (typeof handler !== "function") {
        throw new Error("unexpected");
      }

      if (middlewareValue && !Array.isArray(middlewareValue)) {
        throw new Error("unexpected");
      }

      result.push({
        path: contractValue.path.split("/").slice(1),
        route: contractValue,
        handler,
        mw: middlewareValue,
      });
    } else {
      if (typeof routerValue !== "object") {
        throw new Error("unexpected");
      }

      if (Array.isArray(middlewareValue)) {
        throw new Error("unexpected");
      }

      result.push(
        ...flattenContract(contractValue, routerValue, middlewareValue)
      );
    }
  });

  return result;
}

function getParams(parts: string[], route: Route) {
  const result: Record<string, string> = {};
  const routePath = route.path.split("/").slice(1);

  parts.forEach((part, idx) => {
    const routePathPart = routePath[idx];

    if (routePathPart?.startsWith(":")) {
      result[routePathPart] = part;
    }
  });

  return result;
}

function runMiddleware(
  mw: MW | undefined,
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (!mw || !mw.length) {
    return true;
  }

  let index = 0;

  const next = () => {
    const current = mw[index];

    if (current) {
      current(req, res, next);
      index += 1;
    }
  };

  next();

  return mw.length === index;
}
