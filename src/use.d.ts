import type { UseTypeMap } from ".";
import type { ServiceType } from "./service";

export declare const use: {
  <T extends ServiceType>(type: T): InstanceType<T>;
  <NameT extends string>(name: NameT): unknown;
} & UseTypeMapInternal;

export declare type UseTypeMapInternal = {} extends UseTypeMap ? Record<string, unknown> : UseTypeMap;
