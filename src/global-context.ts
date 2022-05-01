import { randomBytes } from "crypto";

import type { ServiceSpec } from "./service";

export class GlobalContext {
  id = randomBytes(32).toString("hex");

  constructor(public readonly parent?: GlobalContext) {}

  private readonly services = new Map<string, ServiceSpec>();

  private readonly singletonInstances = new Map<string, unknown>();

  private readonly values = new Map<string, unknown>();

  getService(name: string): ServiceSpec | undefined {
    let service = this.services.get(name);

    if (service) {
      return service;
    }

    service = this.parent?.getService(name);

    if (service) {
      this.services.set(name, service);
    }

    return service;
  }

  hasServiceSkipParent(name: string): boolean {
    return this.services.has(name);
  }

  setService(name: string, value: ServiceSpec) {
    this.services.set(name, value);
  }

  getSingletonInstance(name: string): unknown {
    if (this.singletonInstances.has(name)) {
      return this.singletonInstances.get(name);
    }

    if (this.parent?.hasSingletonInstance(name)) {
      const singletonInstance = this.parent.getSingletonInstance(name);

      if (singletonInstance) {
        this.singletonInstances.set(name, singletonInstance);
      }

      return singletonInstance;
    }

    return undefined;
  }

  hasSingletonInstanceSkipParent(name: string): boolean {
    return this.singletonInstances.has(name);
  }

  hasSingletonInstance(name: string): boolean {
    return this.singletonInstances.has(name) || (this.parent?.hasSingletonInstance(name) ?? false);
  }

  setSingletonInstance(name: string, value: unknown) {
    this.singletonInstances.set(name, value);
  }

  getValue(name: string): unknown {
    if (this.values.has(name)) {
      return this.values.get(name);
    }

    if (this.parent?.hasValue(name)) {
      const value = this.parent.getValue(name);

      if (value) {
        this.values.set(name, value);
      }

      return value;
    }

    return undefined;
  }

  hasValueSkipParent(name: string): boolean {
    return this.values.has(name);
  }

  hasValue(name: string): boolean {
    return this.values.has(name) || (this.parent?.hasValue(name) ?? false);
  }

  setValue(name: string, value: unknown) {
    this.values.set(name, value);
  }
}

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

export function getGlobalContext() {
  return globalContext;
}
