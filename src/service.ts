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

export function createServiceInstance(service: Service) {
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
