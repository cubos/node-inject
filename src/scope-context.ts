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

const scopeContextAsyncStorage = new AsyncLocalStorage<ScopeContext>();

export function getCurrentScope() {
  return scopeContextAsyncStorage.getStore();
}

export function setupScope<T>(fn: () => T) {
  const scopeContext = new ScopeContext(getCurrentScope());

  return scopeContextAsyncStorage.run(scopeContext, fn);
}
