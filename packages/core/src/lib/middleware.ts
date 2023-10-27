import type { Contract, Route } from "./contract";

export type MW = ((req: any, res: any, next: () => void) => void)[];

type InnerMiddleware<T extends Contract> = {
  [keyRoute in keyof T]: T[keyRoute] extends Route
    ? MW
    : T[keyRoute] extends Contract
    ? InnerMiddleware<T[keyRoute]>
    : never;
};

type DeepPartial<T> = T extends MW
  ? T
  : {
      [P in keyof T]?: DeepPartial<T[P]>;
    };

export type Middleware<T extends Contract> = DeepPartial<InnerMiddleware<T>>;

export function createMiddleware<const T extends Contract>(
  contract: T,
  middleware: Middleware<T>
) {
  return { contract, middleware };
}
