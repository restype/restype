import { useQuery, UseQueryResult } from "@tanstack/react-query";
import type { Contract, Route } from "@typesafe-rest/core";

export function createClient<T extends Contract>(contract: T) {
  return Object.fromEntries(
    Object.entries(contract).map(([key, value]) => {
      return [
        key,
        () =>
          useQuery({
            queryKey: [key],
            queryFn: () => {
              return fetch(value.path).then((res) => res.json());
            },
          }),
      ];
    })
  ) as { [key in keyof T]: () => UseQueryResult<T[key]["responses"]> };
}
