import { z } from "zod";

type RouteDefaults = {
  path: string;
  responses: Record<number, z.ZodTypeAny>;
  headers?: z.AnyZodObject;
  meta?: unknown;
};

export type GetRoute = {
  method: "GET";
} & RouteDefaults;

export type PostRoute = {
  method: "POST";
  body: z.AnyZodObject;
} & RouteDefaults;

export type PutRoute = {
  method: "PUT";
  body: z.AnyZodObject;
} & RouteDefaults;

export type DeleteRoute = {
  method: "DELETE";
  body: z.AnyZodObject;
} & RouteDefaults;

export type Route = GetRoute | PostRoute | PutRoute | DeleteRoute;

export type Contract = { [key: string]: Route };

export function createContract<const T extends Contract>(contract: T): T {
  return contract;
}
