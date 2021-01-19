import type { Service } from "./service";

export class GlobalContext {
  constructor(public readonly parent?: GlobalContext) {}

  private readonly services = new Map<Function, Service>();

  private readonly singletons = new Map<Function, unknown>();

  private readonly values = new Map<string, unknown>();

  getService(constructor: Function): Service | undefined {
    return this.services.get(constructor) ?? this.parent?.getService(constructor);
  }

  hasService(constructor: Function): boolean {
    return this.services.has(constructor) || (this.parent?.hasService(constructor) ?? false);
  }

  setService(constructor: Function, value: Service) {
    this.services.set(constructor, value);
  }

  getSingleton(constructor: Function): unknown {
    return this.singletons.has(constructor) ? this.singletons.get(constructor) : this.parent?.getSingleton(constructor);
  }

  hasSingleton(constructor: Function): boolean {
    return this.singletons.has(constructor) || (this.parent?.hasSingleton(constructor) ?? false);
  }

  setSingleton(constructor: Function, value: unknown) {
    this.singletons.set(constructor, value);
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
