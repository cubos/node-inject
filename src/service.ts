/* eslint-disable @typescript-eslint/no-unsafe-return */
import { getGlobalContext } from "./global-context";
import { getCurrentScope } from "./scope-context";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type ServiceType = new (...args: any) => any;
export type ServiceLifetime = "singleton" | "scoped" | "transient";

export interface ServiceSpec {
  type: ServiceType;
  factory(): unknown;
  lifetime: ServiceLifetime;
}

const serviceConstructionStack: Function[] = [];
const serviceConstructionLookup = new Set<Function>();

function createServiceInstance(service: ServiceSpec) {
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

export function registerServiceWithFactory<T extends ServiceType>(lifetime: ServiceLifetime, type: T, factory: () => InstanceType<T>) {
  if (getGlobalContext().hasServiceSkipParent(type.name)) {
    throw new Error(`Service '${type.name}' is already registered`);
  }

  getGlobalContext().setService(type.name, { type, factory, lifetime });
}

export function registerService<T extends ServiceType>(lifetime: ServiceLifetime, type: T, ...ctorArgs: ConstructorParameters<T>) {
  registerServiceWithFactory(lifetime, type, () => new type(...(ctorArgs as unknown[])));
}

export function Service(lifetime: ServiceLifetime, factory?: () => unknown) {
  return <T extends ServiceType>(type: T) => {
    registerServiceWithFactory(lifetime, type, factory ? (factory as () => InstanceType<T>) : () => new type());
    return type;
  };
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

      if (scopeContext.hasServiceInstance(getGlobalContext().id + type.name)) {
        return scopeContext.getServiceInstance(getGlobalContext().id + type.name) as InstanceType<T>;
      }

      const newInstance = createServiceInstance(service) as InstanceType<T>;

      scopeContext.setServiceInstance(getGlobalContext().id + type.name, newInstance);

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
