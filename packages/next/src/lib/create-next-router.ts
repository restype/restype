import {
  isRoute,
  type Contract,
  type Route,
  type RouteArgs,
  type RouteHandler,
  type Router,
} from "@restype/core";
import type { NextApiRequest, NextApiResponse } from "next";

export function createNextRouter<
  T extends Contract,
  ContextCreator extends (req: NextApiRequest, res: NextApiResponse) => any,
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
  }: { contract: T; router: Router<T, Context>; createContext: ContextCreator }
) {
  const flatContract = flattenContract(contract, router);

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

    const { route, handler } = result;

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
    } catch (err) {
      return res.status(400).json(err);
    }

    try {
      const ctx = await createContext(req, res);

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
    } catch (err) {
      if (options.errorHandler) {
        return options.errorHandler(err, req, res);
      }

      res.status(500).end();
      throw err;
    }
  };
}

function flattenContract(contract: Contract, router: Router<any, any>) {
  const result: {
    path: string[];
    route: Route;
    handler: RouteHandler;
  }[] = [];

  Object.keys(contract).forEach((key) => {
    const contractValue = contract[key];
    const routerValue = router[key];

    if (!contractValue || !routerValue) {
      throw new Error("unexpected");
    }

    if (isRoute(contractValue)) {
      const handler = routerValue;

      if (typeof handler !== "function") {
        throw new Error("unexpected");
      }

      result.push({
        path: contractValue.path.split("/").slice(1),
        route: contractValue,
        handler,
      });
    } else {
      if (typeof routerValue !== "object") {
        throw new Error("unexpected");
      }

      result.push(...flattenContract(contractValue, routerValue));
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
