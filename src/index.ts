/* eslint-disable @typescript-eslint/no-unsafe-return */
import { AsyncLocalStorage } from "async_hooks";

import { GlobalContext } from "./global-context";
import { ScopeContext } from "./scope-context";
import type { ServiceLifetime, ServiceType } from "./service";
import { createServiceInstance } from "./service";

let globalContext = new GlobalContext();

export function pushInjectionContext() {
  globalContext = new GlobalContext(globalContext);
}

export function popInjectionContext() {
  if (!globalContext.parent) {
    throw new Error("Can't pop injection context");
  }

  globalContext = globalContext.parent;
}

const scopeContextAsyncStorage = new AsyncLocalStorage<ScopeContext>();

export function setupScope<T>(fn: () => T) {
  const scopeContext = new ScopeContext(scopeContextAsyncStorage.getStore());

  return scopeContextAsyncStorage.run(scopeContext, fn);
}

export function registerService<T extends ServiceType>(lifetime: ServiceLifetime, type: T, ...ctorArgs: ConstructorParameters<T>) {
  if (globalContext.hasService(type.name)) {
    throw new Error(`Service '${type.name}' is already registered`);
  }

  globalContext.setService(type.name, { type, factory: () => new type(...(ctorArgs as unknown[])), lifetime });
}

function useService<T extends ServiceType>(type: T): InstanceType<T> {
  const service = globalContext.getService(type.name);

  if (!service) {
    throw new Error(`Service '${type.name}' is not registered`);
  }

  switch (service.lifetime) {
    case "transient":
      return createServiceInstance(service) as InstanceType<T>;

    case "scoped": {
      const scopeContext = scopeContextAsyncStorage.getStore();

      if (!scopeContext) {
        throw new Error(`Scoped service '${type.name}' can't be used outside a scope`);
      }

      if (scopeContext.hasServiceInstance(type.name)) {
        return scopeContext.getServiceInstance(type.name) as InstanceType<T>;
      }

      const newInstance = createServiceInstance(service) as InstanceType<T>;

      scopeContext.setServiceInstance(type.name, newInstance);

      return newInstance;
    }

    case "singleton": {
      if (globalContext.hasSingleton(type.name)) {
        return globalContext.getSingleton(type.name) as InstanceType<T>;
      }

      const newInstance = createServiceInstance(service) as InstanceType<T>;

      globalContext.setSingleton(type.name, newInstance);

      return newInstance;
    }

    default:
      throw new Error(`Unknown lifetime "${service.lifetime}"`);
  }
}

function useValue<NameT extends keyof UseValueTypeMapInternal>(name: NameT): UseValueTypeMapInternal[NameT] {
  const scopeContext = scopeContextAsyncStorage.getStore();

  if (scopeContext?.hasValue(name)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return scopeContext.getValue(name) as UseValueTypeMapInternal[NameT];
  }

  if (globalContext.hasValue(name)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return globalContext.getValue(name) as UseValueTypeMapInternal[NameT];
  }

  throw new Error(`Value '${name}' is not registered`);
}

export const use = ((serviceOrValue: ServiceType | string) => {
  return typeof serviceOrValue === "string" ? useValue(serviceOrValue) : useService(serviceOrValue);
}) as {
  <T extends ServiceType>(type: T): InstanceType<T>;
  <NameT extends keyof UseValueTypeMapInternal>(name: NameT): UseValueTypeMapInternal[NameT];
} & UseValueTypeMapInternal;

export function registerValue<NameT extends keyof UseValueTypeMapInternal>(name: NameT, value: UseValueTypeMapInternal[NameT]) {
  if (globalContext.hasValue(name)) {
    throw new Error(`Value '${name}' is already registered`);
  }

  if (!use.hasOwnProperty(name)) {
    Object.defineProperty(use, name, {
      get: () => useValue(name),
    });
  }

  globalContext.setValue(name, value);
}

export function registerScopedValue<NameT extends keyof UseValueTypeMapInternal>(name: NameT, value: UseValueTypeMapInternal[NameT]) {
  const scopeContext = scopeContextAsyncStorage.getStore();

  if (!scopeContext) {
    throw new Error(`Scoped value '${name}' can't be registered outside a scope`);
  }

  if (!use.hasOwnProperty(name)) {
    Object.defineProperty(use, name, {
      get: () => useValue(name),
    });
  }

  scopeContext.setValue(name, value);
}

type UseValueTypeMapInternal = {} extends UseValueTypeMap ? Record<string, unknown> : UseValueTypeMap;

export interface UseValueTypeMap {}
