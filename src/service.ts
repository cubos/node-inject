/* eslint-disable @typescript-eslint/no-unsafe-return */
import { getGlobalContext } from "./global-context";
import { getCurrentScope } from "./scope-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceType = new (...args: any) => any;
export type ServiceLifetime = "singleton" | "scoped" | "transient";

export interface Service {
  type: ServiceType;
  factory(): unknown;
  lifetime: ServiceLifetime;
}

const serviceConstructionStack: Function[] = [];
const serviceConstructionLookup = new Set<Function>();

function createServiceInstance(service: Service) {
  serviceConstructionStack.push(service.type);

  if (serviceConstructionLookup.has(service.type)) {
    try {
      throw new Error(`Cyclic service dependency on constructor: ${serviceConstructionStack.map(x => `'${x.name}'`).join(" -> ")}`);
    } finally {
      serviceConstructionStack.pop();
    }
  }

  serviceConstructionLookup.add(service.type);

  try {
    return service.factory();
  } finally {
    serviceConstructionStack.pop();
    serviceConstructionLookup.delete(service.type);
  }
}

export function registerService<T extends ServiceType>(lifetime: ServiceLifetime, type: T, ...ctorArgs: ConstructorParameters<T>) {
  if (getGlobalContext().hasServiceSkipParent(type.name)) {
    throw new Error(`Service '${type.name}' is already registered`);
  }

  getGlobalContext().setService(type.name, { type, factory: () => new type(...(ctorArgs as unknown[])), lifetime });
}

export function useService<T extends ServiceType>(type: T): InstanceType<T> {
  const service = getGlobalContext().getService(type.name);

  if (!service) {
    throw new Error(`Service '${type.name}' is not registered`);
  }

  switch (service.lifetime) {
    case "transient":
      return createServiceInstance(service) as InstanceType<T>;

    case "scoped": {
      const scopeContext = getCurrentScope();

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
      if (getGlobalContext().hasSingletonInstanceSkipParent(type.name)) {
        return getGlobalContext().getSingletonInstance(type.name) as InstanceType<T>;
      }

      if (getGlobalContext().hasSingletonInstance(type.name)) {
        const instance = getGlobalContext().getSingletonInstance(type.name);

        if (instance instanceof service.type) {
          return instance as InstanceType<T>;
        }
      }

      const newInstance = createServiceInstance(service) as InstanceType<T>;

      getGlobalContext().setSingletonInstance(type.name, newInstance);

      return newInstance;
    }

    default:
      throw new Error(`Unknown lifetime "${service.lifetime}"`);
  }
}
