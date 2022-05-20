import { AsyncLocalStorage } from "async_hooks";

export class ScopeContext {
  constructor(public readonly parent?: ScopeContext) {}

  private readonly serviceInstances = new Map<string, unknown>();

  private readonly values = new Map<string, unknown>();

  getServiceInstance(name: string): unknown {
    return this.serviceInstances.get(name);
  }

  hasServiceInstance(name: string): boolean {
    return this.serviceInstances.has(name);
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

scopeContextAsyncStorage.enterWith(new ScopeContext());

export function getCurrentScope() {
  const scopeContext = scopeContextAsyncStorage.getStore();

  if (!scopeContext) {
    throw new Error("Can't obtain this when not inside a scope. Did you use 'setupScope'?");
  }

  return scopeContext;
}

export function setupScope<T>(fn: () => T) {
  const scopeContext = new ScopeContext(scopeContextAsyncStorage.getStore());

  return scopeContextAsyncStorage.run(scopeContext, fn);
}
