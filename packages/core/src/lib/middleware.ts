import type { Contract, Route } from "./contract";

type InnerMiddleware<T extends Contract> = {
  [keyRoute in keyof T]: T[keyRoute] extends Route
    ? ((req: any, res: any, next: () => void) => void)[]
    : T[keyRoute] extends Contract
    ? InnerMiddleware<T[keyRoute]>
    : never;
};

export type Middleware<T extends Contract> = Partial<InnerMiddleware<T>>;

export function createMiddleware<const T extends Contract>(
  contract: T,
  middleware: Middleware<T>
) {
  return { contract, middleware };
}
