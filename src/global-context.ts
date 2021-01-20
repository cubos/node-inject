import type { Service } from "./service";

export class GlobalContext {
  constructor(public readonly parent?: GlobalContext) {}

  private readonly services = new Map<string, Service>();

  private readonly singletons = new Map<string, unknown>();

  private readonly values = new Map<string, unknown>();

  getService(name: string): Service | undefined {
    return this.services.get(name) ?? this.parent?.getService(name);
  }

  hasService(name: string): boolean {
    return this.services.has(name) || (this.parent?.hasService(name) ?? false);
  }

  setService(name: string, value: Service) {
    this.services.set(name, value);
  }

  getSingleton(name: string): unknown {
    return this.singletons.has(name) ? this.singletons.get(name) : this.parent?.getSingleton(name);
  }

  hasSingleton(name: string): boolean {
    return this.singletons.has(name) || (this.parent?.hasSingleton(name) ?? false);
  }

  setSingleton(name: string, value: unknown) {
    this.singletons.set(name, value);
  }

  getValue(name: string): unknown {
    return this.values.has(name) ? this.values.get(name) : this.parent?.getValue(name);
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
