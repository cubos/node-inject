/* eslint-disable @typescript-eslint/no-shadow */
import { popInjectionContext, pushInjectionContext, registerValue, registerScopedValue, registerService, setupScope, use } from "../src";

describe("env", () => {
  beforeEach(pushInjectionContext);
  afterEach(popInjectionContext);

  it("throws when getting a service that wasn't registered", () => {
    class TestService {}

    expect(() => use(TestService)).toThrowError("Service 'TestService' is not registered");
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

    const instance1 = use(TestService);

    expect(instance1).toBeInstanceOf(TestService);
    expect(constructorCalledTimes).toBe(1);

    const instance2 = use(TestService);

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

    const instance1 = use(TestService);

    expect(instance1).toBeInstanceOf(TestService);
    expect(constructorCalledTimes).toBe(1);

    const instance2 = use(TestService);

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

    expect(() => use(TestService)).toThrowError("Scoped service 'TestService' can't be used outside a scope");

    setupScope(() => {
      expect(constructorCalledTimes).toBe(0);

      const instance1 = use(TestService);
      const instance2 = use(TestService);

      expect(constructorCalledTimes).toBe(1);
      expect(instance1).toBeInstanceOf(TestService);
      expect(instance2).toBeInstanceOf(TestService);
      expect(instance1.id).toBe(instance2.id);
      expect(instance1).toBe(instance2);

      setupScope(() => {
        const instance3 = use(TestService);

        expect(instance1).toBe(instance3);
      });
    });

    setupScope(() => {
      expect(constructorCalledTimes).toBe(1);

      use(TestService);

      expect(constructorCalledTimes).toBe(2);
    });
  });

  it("registers a value", () => {
    const value = Math.random();

    registerValue("foo", value);

    expect(use("foo")).toBe(value);
    expect(use.foo).toBe(value);
  });

  it("registers a scoped value", () => {
    const value1 = Math.random();
    const value2 = Math.random();

    setupScope(() => {
      registerScopedValue("foo", value1);

      expect(use("foo")).toBe(value1);
      expect(use.foo).toBe(value1);
    });

    setupScope(() => {
      registerScopedValue("foo", value2);

      expect(use("foo")).toBe(value2);
      expect(use.foo).toBe(value2);

      setupScope(() => {
        expect(use("foo")).toBe(value2);
        expect(use.foo).toBe(value2);
      });
    });

    expect(() => registerScopedValue("foo", value1)).toThrowError("Scoped value 'foo' can't be registered outside a scope");
  });

  it("can pop global context to release singleton instances", () => {
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
      id1 = use(TestService).id;
    } finally {
      popInjectionContext();
    }

    pushInjectionContext();
    try {
      id2 = use(TestService).id;
    } finally {
      popInjectionContext();
    }

    const id3 = use(TestService).id;

    pushInjectionContext();
    try {
      id4 = use(TestService).id;
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

  it("can push and pop global context to isolate values", () => {
    registerValue("foo", 123);

    expect(use("foo")).toBe(123);
    expect(() => use("bar")).toThrowError("Value 'bar' is not registered");
    expect(() => use.bar).toThrowError("Value 'bar' is not registered");

    pushInjectionContext();
    try {
      registerValue("bar", 456);
      expect(use("foo")).toBe(123);
      expect(use("bar")).toBe(456);
    } finally {
      popInjectionContext();
    }

    expect(() => use("bar")).toThrowError("Value 'bar' is not registered");
    expect(() => use.bar).toThrowError("Value 'bar' is not registered");
  });

  it("must pop once for every push", () => {
    popInjectionContext();
    try {
      expect(() => popInjectionContext()).toThrowError("Can't pop injection context");
    } finally {
      pushInjectionContext();
    }
  });

  it("disallows registering values twice", () => {
    registerValue("foo", 123);
    expect(() => registerValue("foo", 456)).toThrowError("Value 'foo' is already registered");
    expect(use("foo")).toBe(123);
  });

  it("disallows registering services twice", () => {
    class SomeService {}

    registerService("singleton", SomeService);
    expect(() => registerService("scoped", SomeService)).toThrowError("Service 'SomeService' is already registered");
    expect(use(SomeService)).toBeInstanceOf(SomeService);
  });

  it("allows two different services with the same name", () => {
    const service1 = (() => {
      return class Service {
        public id = 1;
      };
    })();

    const service2 = (() => {
      return class Service {
        public id = 2;
      };
    })();

    expect(service1.name).toBe("Service");
    expect(service2.name).toBe("Service");

    registerService("singleton", service1);
    expect(() => registerService("singleton", service2)).toThrowError("Service 'Service' is already registered");
  });

  it("obtains services by name", () => {
    const service1 = (() => {
      return class Service {
        public id = 1;
      };
    })();

    const service2 = (() => {
      return class Service {
        public id = 2;
      };
    })();

    expect(service1.name).toBe("Service");
    expect(service2.name).toBe("Service");

    registerService("singleton", service1);

    const instance1 = use(service1);
    const instance2 = use(service2);

    expect(instance1).toBe(instance2);
    expect(instance1).toBeInstanceOf(service1);
    expect(instance2).toBeInstanceOf(service1);
    expect(instance1.id).toBe(1);
    expect(instance2.id).toBe(1);
  });

  it("detects cyclic dependency on service construction", () => {
    class A {
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        use(B);
      }
    }
    class B {
      constructor() {
        // eslint-disable-next-line @typescript-eslint/no-use-before-define
        use(C);
      }
    }
    class C {
      constructor() {
        use(A);
      }
    }

    registerService("transient", A);
    registerService("transient", B);
    registerService("transient", C);

    expect(() => use(A)).toThrowError("Cyclic service dependency on constructor: 'A' -> 'B' -> 'C' -> 'A'");
  });

  it("allows a service to be registered again inside a inner injection context", () => {
    class A {
      id = 1;
    }

    registerService("transient", A);

    expect(use(A).id).toBe(1);

    pushInjectionContext();
    try {
      registerService(
        "transient",
        class A {
          id = 2;
        },
      );

      expect(use(A).id).toBe(2);
    } finally {
      popInjectionContext();
    }

    expect(use(A).id).toBe(1);
  });

  it("disallows a service to be registered again inside a inner injection context if it has already been used", () => {
    class A {
      id = 1;
    }

    registerService("transient", A);

    expect(use(A).id).toBe(1);

    pushInjectionContext();
    try {
      expect(use(A).id).toBe(1);

      expect(() =>
        registerService(
          "transient",
          class A {
            id = 2;
          },
        ),
      ).toThrowError("Service 'A' is already registered");

      expect(use(A).id).toBe(1);
    } finally {
      popInjectionContext();
    }

    expect(use(A).id).toBe(1);
  });

  it("only create new singleton instance if needed, in case the service it registered again in a inner context", () => {
    class A {
      id = 1;
    }

    registerService("singleton", A);

    const instance = use(A);

    expect(instance.id).toBe(1);

    pushInjectionContext();
    try {
      registerService(
        "singleton",
        class A {
          id = 2;
        },
      );

      const innerInstance = use(A);

      expect(innerInstance.id).toBe(2);
    } finally {
      popInjectionContext();
    }

    pushInjectionContext();
    try {
      const innerInstance = use(A);

      expect(innerInstance.id).toBe(1);
      expect(innerInstance).toBe(instance);
    } finally {
      popInjectionContext();
    }
  });
});
