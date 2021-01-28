import { getGlobalContext } from "./global-context";
import { getCurrentScope } from "./scope-context";
import type { UseTypeMapInternal } from "./use";

export function useValue<NameT extends keyof UseTypeMapInternal>(name: NameT): UseTypeMapInternal[NameT] {
  if (getCurrentScope().hasValue(getGlobalContext().id + name)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return getCurrentScope().getValue(getGlobalContext().id + name) as UseTypeMapInternal[NameT];
  }

  if (getGlobalContext().hasValue(name)) {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    return getGlobalContext().getValue(name) as UseTypeMapInternal[NameT];
  }

  throw new Error(`Value '${name}' is not registered`);
}

export function registerValue<NameT extends keyof UseTypeMapInternal>(name: NameT, value: UseTypeMapInternal[NameT]) {
  if (getGlobalContext().hasValueSkipParent(name)) {
    throw new Error(`Value '${name}' is already registered`);
  }

  getGlobalContext().setValue(name, value);
}

export function registerScopedValue<NameT extends keyof UseTypeMapInternal>(name: NameT, value: UseTypeMapInternal[NameT]) {
  if (getCurrentScope().hasValueSkipParent(getGlobalContext().id + name)) {
    throw new Error(`Value '${name}' is already registered`);
  }

  getCurrentScope().setValue(getGlobalContext().id + name, value);
}
