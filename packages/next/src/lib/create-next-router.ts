import {
  isRoute,
  type Contract,
  type Middleware,
  type Route,
  type RouteArgs,
  type RouteHandler,
  type Router,
  type MW,
} from "@restype/core";
import type { NextApiRequest, NextApiResponse } from "next";

export function createNextRouter<
  T extends Contract,
  ContextCreator extends (req: NextApiRequest) => any,
  Context extends Awaited<ReturnType<ContextCreator>>
>(
  options: {
    nextjsApiRouteName: string;
    errorHandler?: (
      error: unknown,
      req: NextApiRequest,
      res: NextApiResponse
    ) => void;
  },
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
      return res.status(404).end();
    }

    const { route, handler, mw } = result;

    await runMiddleware(mw, req, res);

    const { headers, body } = req;
    let params = getParams(parts, route);

    try {
      route.headers?.parse(headers);

      if (route.params) {
        params = route.params.parse(params);
      }

      if (route.method === "GET") {
        route.query?.parse(query);
      } else {
        route.body.parse(body);
      }
    } catch (e) {
      return res.status(400).json(e);
    }

    try {
      const ctx = await createContext(req);

      const result = await handler({
        params,
        headers,
        query,
        body,
        ctx,
      } as RouteArgs<Route, Context>);

      const { status: resultStatus, body: resultBody } = result;

      route.responses[resultStatus]?.parse(resultBody);

      res.status(resultStatus).json(resultBody);
    } catch (e) {
      if (options.errorHandler) {
        return options.errorHandler(e, req, res);
      }

      res.status(500).end();
      throw e;
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
      result[routePathPart.slice(1)] = part;
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
    return Promise.resolve();
  }

  return new Promise<void>((resolve) => {
    let index = 0;

    const next = () => {
      const current = mw[index++];

      if (current) {
        current(req, res, next);
      } else {
        resolve();
      }
    };

    next();
  });
}
