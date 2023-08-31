import { z } from "zod";

type RouteDefaults = {
  path: string;
  responses: Record<number, z.ZodTypeAny>;
  headers?: z.AnyZodObject;
  meta?: unknown;
};

export type GetRoute = {
  method: "GET";
  query?: z.AnyZodObject;
} & RouteDefaults;

export type PostRoute = {
  method: "POST";
  body: z.AnyZodObject;
} & RouteDefaults;

export type PutRoute = {
  method: "PUT";
  body: z.AnyZodObject;
} & RouteDefaults;

export type PatchRoute = {
  method: "PATCH";
  body: z.AnyZodObject;
} & RouteDefaults;

export type DeleteRoute = {
  method: "DELETE";
  body: z.AnyZodObject;
} & RouteDefaults;

export type Route = GetRoute | PostRoute | PutRoute | PatchRoute | DeleteRoute;

export type RouteMethods = Route extends { method: infer V }
  ? Lowercase<V & string>
  : never;

export type Contract = { [key: string]: Route | Contract };

export function createContract<const T extends Contract>(contract: T): T {
  return contract;
}

export type RouteQuery<T extends Route> = T extends GetRoute
  ? T["query"] extends z.AnyZodObject
    ? z.infer<T["query"]>
    : never
  : never;

export type RouteHeaders<T extends Route> = T["headers"] extends z.AnyZodObject
  ? z.infer<T["headers"]>
  : never;

export type RouteBody<T extends Route> = T extends
  | PostRoute
  | PutRoute
  | PatchRoute
  | DeleteRoute
  ? z.infer<T["body"]>
  : never;

type ParseParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [key in Param | keyof ParseParams<Rest>]: string }
    : T extends `${string}:${infer Param}`
    ? { [key in Param]: string }
    : {};

export type RouteParams<T extends Route> = ParseParams<
  T["path"]
> extends infer U
  ? keyof U extends never
    ? never
    : U
  : never;
