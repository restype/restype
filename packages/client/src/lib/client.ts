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
} from "@typesafe-rest/core";
import { createFetcher } from "./fetcher";

type ClientResponse<T extends Route> = Prettify<
  {
    [keyResponse in keyof T["responses"] & SuccessfulHttpStatusCode]: z.infer<
      T["responses"][keyResponse]
    >;
  }[keyof T["responses"] & SuccessfulHttpStatusCode]
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
              const { params, query } = options as any;

              return useQuery({
                queryKey: [key, params],
                queryFn: () => {
                  return fetcher({
                    route,
                    params,
                    query,
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
            return useMutation({
              mutationFn: (body) => {
                return fetcher({
                  route,
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
            options: Omit<
              UseQueryOptions<unknown, unknown, unknown, any>,
              "queryFn" | "queryKey"
            > &
              Without<
                {
                  params: Params<T[key]["path"]>;
                  query: Query<T[key]>;
                  headers: Headers<T[key]>;
                },
                never
              >
          ) => UseQueryResult<ClientResponse<T[key]>>;
        }
      : T[key] extends PostRoute | PutRoute | PatchRoute | DeleteRoute
      ? {
          useMutation: (
            options: Omit<UseMutationOptions, "mutationFn"> &
              Without<
                { params: Params<T[key]["path"]>; headers: Headers<T[key]> },
                never
              >
          ) => UseMutationResult<
            ClientResponse<T[key]>,
            unknown,
            z.infer<T[key]["body"]>
          >;
        }
      : never;
  };
}
