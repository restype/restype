import { z } from "zod";
import { HttpStatusCode } from "./status-codes";

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

export type Contract = { [key: string]: Route };

export function createContract<const T extends Contract>(contract: T): T {
  return contract;
}
