import { AsyncLocalStorage } from "async_hooks";

export class ScopeContext {
  constructor(public readonly parent?: ScopeContext) {}

  private readonly serviceInstances = new Map<string, unknown>();

  private readonly values = new Map<string, unknown>();

  getServiceInstance(name: string): unknown {
    return this.serviceInstances.has(name) ? this.serviceInstances.get(name) : this.parent?.getServiceInstance(name);
  }

  hasServiceInstance(name: string): boolean {
    return this.serviceInstances.has(name) || (this.parent?.hasServiceInstance(name) ?? false);
  }

  setServiceInstance(name: string, value: unknown) {
    this.serviceInstances.set(name, value);
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

const scopeContextAsyncStorage = new AsyncLocalStorage<ScopeContext>();

export function getCurrentScope() {
  return scopeContextAsyncStorage.getStore();
}

export function setupScope<T>(fn: () => T) {
  const scopeContext = new ScopeContext(getCurrentScope());

  return scopeContextAsyncStorage.run(scopeContext, fn);
}
