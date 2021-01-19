import {
  popInjectionContext,
  pushInjectionContext,
  registerValue,
  registerScopedValue,
  registerService,
  setupScope,
  useValue,
  useService,
} from "../src";

describe("env", () => {
  beforeEach(() => {
    pushInjectionContext();
  });

  afterEach(() => {
    popInjectionContext();
  });

  it("throws when getting a service that wasn't registered", () => {
    class TestService {}

    expect(() => useService(TestService)).toThrowError("Service 'TestService' is not registered");
  });

  it("registers a service as singleton", () => {
    let constructorCalledTimes = 0;

    class TestService {
      public id = Math.random();

      constructor() {
        constructorCalledTimes++;
      }
    }

    registerService("singleton", TestService);

    expect(constructorCalledTimes).toBe(0);

    const instance1 = useService(TestService);

    expect(instance1).toBeInstanceOf(TestService);
    expect(constructorCalledTimes).toBe(1);

    const instance2 = useService(TestService);

    expect(instance2).toBeInstanceOf(TestService);
    expect(constructorCalledTimes).toBe(1);

    expect(instance1.id).toBe(instance2.id);
    expect(instance1).toBe(instance2);
  });

  it("registers a service as transient", () => {
    let constructorCalledTimes = 0;

    class TestService {
      public id = Math.random();

      constructor() {
        constructorCalledTimes++;
      }
    }

    registerService("transient", TestService);

    expect(constructorCalledTimes).toBe(0);

    const instance1 = useService(TestService);

    expect(instance1).toBeInstanceOf(TestService);
    expect(constructorCalledTimes).toBe(1);

    const instance2 = useService(TestService);

    expect(instance2).toBeInstanceOf(TestService);
    expect(constructorCalledTimes).toBe(2);

    expect(instance1.id).not.toBe(instance2.id);
    expect(instance1).not.toBe(instance2);
  });

  it("registers a service as scoped", () => {
    let constructorCalledTimes = 0;

    class TestService {
      public id = Math.random();

      constructor() {
        constructorCalledTimes++;
      }
    }

    registerService("scoped", TestService);

    expect(constructorCalledTimes).toBe(0);

    expect(() => useService(TestService)).toThrowError("Scoped service 'TestService' can't be used outside a scope");

    setupScope(() => {
      expect(constructorCalledTimes).toBe(0);

      const instance1 = useService(TestService);
      const instance2 = useService(TestService);

      expect(constructorCalledTimes).toBe(1);
      expect(instance1).toBeInstanceOf(TestService);
      expect(instance2).toBeInstanceOf(TestService);
      expect(instance1.id).toBe(instance2.id);
      expect(instance1).toBe(instance2);

      setupScope(() => {
        const instance3 = useService(TestService);

        expect(instance1).toBe(instance3);
      });
    });

    setupScope(() => {
      expect(constructorCalledTimes).toBe(1);

      useService(TestService);

      expect(constructorCalledTimes).toBe(2);
    });
  });

  it("registers a value", () => {
    const value = Math.random();

    registerValue("foo", value);

    expect(useValue("foo")).toBe(value);
  });

  it("registers a scoped value", () => {
    const value1 = Math.random();
    const value2 = Math.random();

    setupScope(() => {
      registerScopedValue("foo", value1);

      expect(useValue("foo")).toBe(value1);
    });

    setupScope(() => {
      registerScopedValue("foo", value2);

      expect(useValue("foo")).toBe(value2);
    });

    expect(() => registerScopedValue("foo", value1)).toThrowError("Scoped value 'foo' can't be registered outside a scope");
  });

  it("can pop value context to release singleton instances", () => {
    let constructorCalledTimes = 0;

    class TestService {
      public id = Math.random();

      constructor() {
        constructorCalledTimes++;
      }
    }

    registerService("singleton", TestService);

    let id1: number;
    let id2: number;
    let id4: number;

    pushInjectionContext();
    try {
      id1 = useService(TestService).id;
    } finally {
      popInjectionContext();
    }

    pushInjectionContext();
    try {
      id2 = useService(TestService).id;
    } finally {
      popInjectionContext();
    }

    const id3 = useService(TestService).id;

    pushInjectionContext();
    try {
      id4 = useService(TestService).id;
    } finally {
      popInjectionContext();
    }

    expect(id1).not.toBe(id2);
    expect(id1).not.toBe(id3);
    expect(id1).not.toBe(id4);

    expect(id2).not.toBe(id3);
    expect(id2).not.toBe(id4);

    expect(id3).toBe(id4);

    expect(constructorCalledTimes).toBe(3);
  });
});
