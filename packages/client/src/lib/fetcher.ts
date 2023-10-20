import type { Route } from "@restype/core";

function insertParamsToPath(path: string, params?: any) {
  if (!params) {
    return path;
  }

  return path
    .replace(/:([^/]+)/g, (_, p) => {
      return params[p] ?? "";
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
    credentials,
  }: {
    baseUrl?: string;
    baseHeaders?: Record<string, string>;
    credentials?: RequestCredentials;
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

    const response = await fetch(`${baseUrl}${path}${queryString}`, {
      method: route.method,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        ...baseHeaders,
        ...headers,
      },
      ...(credentials && { credentials }),
      ...(body && { body }),
    });

    if (response.ok) {
      return await response.json();
    }

    let errBody;

    try {
      errBody = await response.json();
    } catch {}

    throw {
      status: response.status,
      body: errBody,
    };
  };
