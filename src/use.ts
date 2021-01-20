/* eslint-disable @typescript-eslint/no-unsafe-return */
import type { UseTypeMap } from ".";
import type { ServiceType } from "./service";
import { useService } from "./service";
import { useValue } from "./value";

export const use = new Proxy(useValue, {
  apply(_target, _thisArg, [serviceOrValue]) {
    return typeof serviceOrValue === "string" ? useValue(serviceOrValue) : useService(serviceOrValue);
  },
  get(_target, property) {
    return useValue(String(property));
  },
}) as {
  <T extends ServiceType>(type: T): InstanceType<T>;
  <NameT extends keyof UseTypeMapInternal>(name: NameT): UseTypeMapInternal[NameT];
} & UseTypeMapInternal;

export type UseTypeMapInternal<T = UseTypeMap> = {} extends T ? Record<string, unknown> : T;
