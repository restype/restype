import type { z } from "zod";
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
  Prettify,
  SuccessfulHttpStatusCode,
  ErrorHttpStatusCode,
  WithoutNever,
  RouteQuery,
  RouteHeaders,
  RouteParams,
  RouteBody,
} from "@restype/core";
import { createFetcher } from "./fetcher";

type RouteResponse<T extends Route> = Prettify<
  {
    [keyResponse in keyof T["responses"] & SuccessfulHttpStatusCode]: z.infer<
      T["responses"][keyResponse]
    >;
  }[keyof T["responses"] & SuccessfulHttpStatusCode]
>;

type RouteError<T extends Route> = Prettify<
  {
    [keyResponse in keyof T["responses"] & ErrorHttpStatusCode]: {
      status: keyResponse;
      body: z.infer<T["responses"][keyResponse]>;
    };
  }[keyof T["responses"] & ErrorHttpStatusCode]
>;

type QueryClient<T extends Contract> = {
  [key in keyof T]: T[key] extends GetRoute
    ? {
        useQuery: (
          options: Omit<UseQueryOptions, "queryFn" | "queryKey"> &
            WithoutNever<{
              params: RouteParams<T[key]>;
              query: RouteQuery<T[key]>;
              headers: RouteHeaders<T[key]>;
            }>
        ) => UseQueryResult<RouteResponse<T[key]>, RouteError<T[key]>>;
      }
    : T[key] extends PostRoute | PutRoute | PatchRoute | DeleteRoute
    ? {
        useMutation: (
          options: Omit<UseMutationOptions, "mutationFn">
        ) => UseMutationResult<
          RouteResponse<T[key]>,
          RouteError<T[key]>,
          WithoutNever<{
            body: RouteBody<T[key]>;
            params: RouteParams<T[key]>;
            headers: RouteHeaders<T[key]>;
          }>
        >;
      }
    : T[key] extends Contract
    ? QueryClient<T[key]>
    : never;
};

function createQueries<T extends Contract>(
  contract: T,
  fetcher: ReturnType<typeof createFetcher>
): QueryClient<T> {
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
      } else if (
        route.method === "POST" ||
        route.method === "PUT" ||
        route.method === "PATCH" ||
        route.method === "DELETE"
      ) {
        return [
          key,
          {
            useMutation: (options) => {
              return useMutation({
                mutationFn: (variables) => {
                  const { body, params, headers } = variables as any;

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
      } else {
        return [key, createQueries(route, fetcher)];
      }
    })
  );
}

export function createClient<T extends Contract>(
  contract: T,
  options: { baseUrl?: string; baseHeaders?: Record<string, string> }
): QueryClient<T> {
  const fetcher = createFetcher(options);

  return createQueries(contract, fetcher);
}
