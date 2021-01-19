export class ScopeContext {
  constructor(public readonly parent?: ScopeContext) {}

  private readonly serviceInstances = new Map<Function, unknown>();

  private readonly values = new Map<string, unknown>();

  getServiceInstance(constructor: Function): unknown {
    return this.serviceInstances.has(constructor) ? this.serviceInstances.get(constructor) : this.parent?.getServiceInstance(constructor);
  }

  hasServiceInstance(constructor: Function): boolean {
    return this.serviceInstances.has(constructor) || (this.parent?.hasServiceInstance(constructor) ?? false);
  }

  setServiceInstance(constructor: Function, value: unknown) {
    this.serviceInstances.set(constructor, value);
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
