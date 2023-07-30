import { z } from "zod";
import {
  useQuery,
  UseQueryOptions,
  UseQueryResult,
  useMutation,
  UseMutationOptions,
  UseMutationResult,
} from "@tanstack/react-query";
import type {
  Contract,
  Route,
  GetRoute,
  PostRoute,
  PutRoute,
  PatchRoute,
  DeleteRoute,
  Without,
  Prettify,
  SuccessfulHttpStatusCode,
  ErrorHttpStatusCode,
  WithoutNever,
} from "@typesafe-rest/core";
import { createFetcher } from "./fetcher";

type ClientResponse<T extends Route> = Prettify<
  {
    [keyResponse in keyof T["responses"] & SuccessfulHttpStatusCode]: z.infer<
      T["responses"][keyResponse]
    >;
  }[keyof T["responses"] & SuccessfulHttpStatusCode]
>;

type ClientError<T extends Route> = Prettify<
  {
    [keyResponse in keyof T["responses"] & ErrorHttpStatusCode]: {
      status: keyResponse;
      body: z.infer<T["responses"][keyResponse]>;
    };
  }[keyof T["responses"] & ErrorHttpStatusCode]
>;

type ParseParams<T extends string> =
  T extends `${string}:${infer Param}/${infer Rest}`
    ? { [key in Param]: string } & ParseParams<Rest>
    : T extends `${string}:${infer Param}`
    ? { [key in Param]: string }
    : T extends `${string}/${infer Rest}`
    ? ParseParams<Rest>
    : never;

type Params<T extends string> = ParseParams<T> extends infer U
  ? { [key in keyof U]: U[key] }
  : never;

type Query<T extends GetRoute> = T["query"] extends z.AnyZodObject
  ? z.infer<T["query"]>
  : never;

type Headers<T extends Route> = T["headers"] extends z.AnyZodObject
  ? z.infer<T["headers"]>
  : never;

export function createClient<T extends Contract>(
  contract: T,
  {
    baseUrl,
    baseHeaders,
  }: { baseUrl?: string; baseHeaders?: Record<string, string> }
) {
  const fetcher = createFetcher({ baseUrl, baseHeaders });

  return Object.fromEntries(
    Object.entries(contract).map(([key, route]) => {
      if (route.method === "GET") {
        return [
          key,
          {
            useQuery: (options) => {
              const { params, query, headers } = options as any;

              return useQuery({
                queryKey: [key, params] as readonly unknown[],
                queryFn: () => {
                  return fetcher({
                    route,
                    params,
                    query,
                    headers,
                  });
                },
                ...options,
              });
            },
          },
        ];
      }

      return [
        key,
        {
          useMutation: (options) => {
            const { params, headers } = options as any;

            return useMutation({
              mutationFn: (body) => {
                return fetcher({
                  route,
                  params,
                  headers,
                  body: JSON.stringify(body),
                });
              },
              ...options,
            });
          },
        },
      ];
    })
  ) as {
    [key in keyof T]: T[key] extends GetRoute
      ? {
          useQuery: (
            options: Omit<UseQueryOptions, "queryFn" | "queryKey"> &
              WithoutNever<{
                params: Params<T[key]["path"]>;
                query: Query<T[key]>;
                headers: Headers<T[key]>;
              }>
          ) => UseQueryResult<ClientResponse<T[key]>, ClientError<T[key]>>;
        }
      : T[key] extends PostRoute | PutRoute | PatchRoute | DeleteRoute
      ? {
          useMutation: (
            options: Omit<UseMutationOptions, "mutationFn"> &
              WithoutNever<{
                params: Params<T[key]["path"]>;
                headers: Headers<T[key]>;
              }>
          ) => UseMutationResult<
            ClientResponse<T[key]>,
            ClientError<T[key]>,
            z.infer<T[key]["body"]>
          >;
        }
      : never;
  };
}
