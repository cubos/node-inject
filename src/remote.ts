/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-explicit-any */

import axios from "axios";
import axiosRetry from "axios-retry";
import superjson from "superjson";

import type { UseTypeMapInternal } from "./use";
import { useValue } from "./value";

type ServiceType = new (...args: any) => any;

export interface RemoteServiceConfig {
  url: string;
  values?: Array<keyof UseTypeMapInternal>;
}

type PickFunctions<Base> = Pick<
  Base,
  {
    [Key in keyof Base]: Base[Key] extends (...args: any) => any ? Key : never;
  }[keyof Base]
>;

type TransformReturnToPromise<F extends (...args: any) => any> = (...args: Parameters<F>) => Promise<ReturnType<F>>;

type TransformMembers<T> = {
  [Key in keyof T]: T[Key] extends (...args: any) => any ? TransformReturnToPromise<T[Key]> : never;
};

type RemoteServiceInstanceFrom<Base> = TransformMembers<PickFunctions<Base>>;

export function createRemoteServiceClass<T>() {
  const c = class {
    static isRemote = true;

    constructor() {
      throw new Error(`Can't construct instance of remote service '${this.constructor.name}' directly`);
    }
  };

  return (c as unknown) as { isRemote: true } & (new (...args: any) => RemoteServiceInstanceFrom<T>);
}

export function createRemoteServiceInstance<T extends ServiceType & { isRemote: true }>(type: T, config: RemoteServiceConfig) {
  const axiosInstance = axios.create({
    baseURL: config.url,
    headers: {
      "Content-Type": "application/json",
    },
    validateStatus: status => status === 200 || status === 400,
    transformResponse: res => res,
  });

  axiosRetry(axiosInstance, { retries: 3 });

  return new Proxy(
    {},
    {
      get(_target, name) {
        return async (...args: any[]) =>
          new Promise<unknown>((resolve, reject) => {
            const data = superjson.stringify({
              a: args,
              v: Object.fromEntries((config.values ?? []).map(valueName => [valueName, useValue(valueName)])),
            });

            axiosInstance
              .post(`/${type.name}/${name.toString()}`, data)
              .then(response => {
                if (response.status === 200) {
                  resolve(superjson.parse(response.data));
                } else if (response.status === 400) {
                  reject(superjson.parse(response.data));
                } else {
                  reject(new Error(`${type.name}.${name.toString()}() failed with status ${response.status}`));
                }
              })
              .catch(reject);
          });
      },
    },
  ) as InstanceType<T>;
}
