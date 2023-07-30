import type { Route } from "@typesafe-rest/core";

function insertParamsToPath(path: string, params?: any) {
  if (!params) {
    return path;
  }

  return path
    .replace(/:([^/]+)/g, (_, p) => {
      return params[p] || "";
    })
    .replace(/\/\//g, "/");
}

function convertToQueryString(queryObject: any) {
  if (!queryObject) {
    return "";
  }

  const queryString = Object.entries(queryObject)
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  return queryString.length ? "?" + queryString : "";
}

export const createFetcher =
  ({
    baseUrl,
    baseHeaders,
  }: {
    baseUrl?: string;
    baseHeaders?: Record<string, string>;
  }) =>
  async ({
    route,
    params,
    query,
    body,
    headers,
  }: {
    route: Route;
    params?: any;
    query?: any;
    body?: string;
    headers?: any;
  }) => {
    const path = insertParamsToPath(route.path, params);
    const queryString = convertToQueryString(query);

    const result = await fetch(`${baseUrl}${path}${queryString}`, {
      method: route.method,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...baseHeaders,
        ...headers,
      },
      body,
    });

    return result.json();
  };
