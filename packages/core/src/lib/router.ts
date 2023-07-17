import { z } from "zod";
import type {
  Route,
  GetRoute,
  PostRoute,
  Contract,
  PutRoute,
  DeleteRoute,
} from "./contract";

type ParseParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [key in Param]: string } & ParseParams<Rest>
    : T extends `${string}:${infer Param}`
    ? { [key in Param]: string }
    : T extends `${string}/${infer Rest}`
    ? ParseParams<Rest>
    : {};

type Params<T extends string> = ParseParams<T> extends infer U
  ? { [key in keyof U]: U[key] }
  : never;

type CreateRouteArgs<T extends Route, Context> = {
  ctx: Context;
  headers: T["headers"];
} & (T extends GetRoute
  ? { params: Params<T["path"]> }
  : T extends PostRoute | PutRoute | DeleteRoute
  ? { body: z.infer<T["body"]> }
  : never);

export function createRouter<
  const T extends Contract,
  ContextCreator extends () => any,
  Context = Awaited<ReturnType<ContextCreator>>
>(
  contract: T,
  createContext: ContextCreator,
  router: {
    [keyRoute in keyof T]: (
      args: CreateRouteArgs<T[keyRoute], Context>
    ) => PromiseLike<
      {
        [keyResponse in keyof T[keyRoute]["responses"]]: {
          status: keyResponse;
          body: z.infer<T[keyRoute]["responses"][keyResponse]>;
        };
      }[keyof T[keyRoute]["responses"]]
    >;
  }
) {
  return { contract, createContext, router };
}
