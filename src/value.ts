import { getGlobalContext } from "./global-context";
import { getCurrentScope } from "./scope-context";
import type { UseTypeMapInternal } from "./use";

export function useValue<NameT extends keyof UseTypeMapInternal>(name: NameT): UseTypeMapInternal[NameT] {
  const scopeContext = getCurrentScope();

  if (scopeContext?.hasValue(name)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return scopeContext.getValue(name) as UseTypeMapInternal[NameT];
  }

  if (getGlobalContext().hasValue(name)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return getGlobalContext().getValue(name) as UseTypeMapInternal[NameT];
  }

  throw new Error(`Value '${name}' is not registered`);
}

export function registerValue<NameT extends keyof UseTypeMapInternal>(name: NameT, value: UseTypeMapInternal[NameT]) {
  if (getGlobalContext().hasValue(name)) {
    throw new Error(`Value '${name}' is already registered`);
  }

  getGlobalContext().setValue(name, value);
}

export function registerScopedValue<NameT extends keyof UseTypeMapInternal>(name: NameT, value: UseTypeMapInternal[NameT]) {
  const scopeContext = getCurrentScope();

  if (!scopeContext) {
    throw new Error(`Scoped value '${name}' can't be registered outside a scope`);
  }

  scopeContext.setValue(name, value);
}
