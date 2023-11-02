import {
  type Contract,
  type CombinedRouter,
  isRoute,
  isRouterWithContext,
} from "@restype/core";
import { flattenContract, type FlatContract } from "./flatten-contract";

export function flattenCombinedContract<ContextCreator>(
  contract: Contract,
  router: CombinedRouter<any, any, ContextCreator>
) {
  const result: FlatContract<ContextCreator> = [];

  Object.keys(contract).forEach((key) => {
    const contractValue = contract[key];
    const routerValue = router[key];

    if (!contractValue || !routerValue || isRoute(contractValue)) {
      throw new Error("unexpected");
    }

    if (isRouterWithContext(routerValue)) {
      result.push(
        ...flattenContract(
          contractValue,
          routerValue.router,
          routerValue.createContext
        )
      );
    } else {
      result.push(...flattenCombinedContract(contract, routerValue));
    }
  });

  return result;
}
