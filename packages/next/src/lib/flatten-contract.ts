import { Contract, Route, RouteHandler, Router, isRoute } from "@restype/core";

export function flattenContract<ContextCreator>(
  contract: Contract,
  router: Router<any, any>,
  createContext: ContextCreator
) {
  const result: FlatContract<ContextCreator> = [];

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
        createContext,
      });
    } else {
      if (typeof routerValue !== "object") {
        throw new Error("unexpected");
      }

      result.push(
        ...flattenContract(contractValue, routerValue, createContext)
      );
    }
  });

  return result;
}

export type FlatContract<ContextCreator> = {
  path: string[];
  route: Route;
  handler: RouteHandler;
  createContext: ContextCreator;
}[];
