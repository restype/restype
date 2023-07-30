import { z } from "zod";
import type {
  Route,
  Contract,
  RouteHeaders,
  RouteQuery,
  RouteBody,
  RouteParams,
} from "./contract";

type RouteArgs<T extends Route, Context> = {
  ctx: Context;
  query: RouteQuery<T>;
  headers: RouteHeaders<T>;
  params: RouteParams<T>;
  body: RouteBody<T>;
};

type Router<T extends Contract, Context> = {
  [keyRoute in keyof T]: T[keyRoute] extends Route
    ? (args: RouteArgs<T[keyRoute], Context>) => PromiseLike<
        {
          [keyResponse in keyof T[keyRoute]["responses"]]: {
            status: keyResponse;
            body: z.infer<T[keyRoute]["responses"][keyResponse]>;
          };
        }[keyof T[keyRoute]["responses"]]
      >
    : T[keyRoute] extends Contract
    ? Router<T[keyRoute], Context>
    : never;
};

export function createRouter<
  const T extends Contract,
  ContextCreator extends () => any,
  Context = Awaited<ReturnType<ContextCreator>>
>(contract: T, createContext: ContextCreator, router: Router<T, Context>) {
  return { contract, createContext, router };
}
