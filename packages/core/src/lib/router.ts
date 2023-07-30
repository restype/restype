import { z } from "zod";
import type {
  Route,
  PostRoute,
  Contract,
  PutRoute,
  DeleteRoute,
  PatchRoute,
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

type RouteArgs<T extends Route, Context> = {
  ctx: Context;
  headers: T["headers"] extends z.AnyZodObject ? z.infer<T["headers"]> : never;
  params: Params<T["path"]>;
  body: T extends PostRoute | PutRoute | PatchRoute | DeleteRoute
    ? z.infer<T["body"]>
    : never;
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
