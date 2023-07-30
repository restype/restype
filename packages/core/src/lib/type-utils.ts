export type Prettify<T> = {
  [K in keyof T]: T[K];
} & {};

type ExcludeKeysWithTypeOf<T, V> = {
  [K in keyof T]-?: Exclude<T[K], undefined> extends V ? never : K;
}[keyof T];

export type Without<T, V> = Pick<T, ExcludeKeysWithTypeOf<T, V>>;

export type WithoutNever<T> = Without<T, never>;
