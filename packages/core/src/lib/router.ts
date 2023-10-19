import { z } from "zod";
import type {
  Route,
  Contract,
  RouteHeaders,
  RouteQuery,
  RouteBody,
  RouteParams,
} from "./contract";

export type RouteArgs<T extends Route, Context> = {
  ctx: Context;
  query: RouteQuery<T>;
  headers: RouteHeaders<T>;
  params: RouteParams<T>;
  body: RouteBody<T>;
};

export type Router<T extends Contract, Context> = {
  [keyRoute in keyof T]: T[keyRoute] extends Route
    ? (args: RouteArgs<T[keyRoute], Context>) => PromiseLike<
        {
          [keyResponse in keyof T[keyRoute]["responses"] & number]: {
            status: keyResponse;
            body: z.infer<T[keyRoute]["responses"][keyResponse]>;
          };
        }[keyof T[keyRoute]["responses"] & number]
      >
    : T[keyRoute] extends Contract
    ? Router<T[keyRoute], Context>
    : never;
};

export function createRouter<
  const T extends Contract,
  ContextCreator extends (...args: any[]) => any,
  Context = Awaited<ReturnType<ContextCreator>>
>(contract: T, createContext: ContextCreator, router: Router<T, Context>) {
  return { contract, createContext, router };
}

export type RouteHandler<T = Router<any, any>[string]> = T extends Router<
  any,
  any
>
  ? never
  : T;
