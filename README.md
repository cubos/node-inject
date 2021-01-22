# `@cubos/inject`

This module provides a set of functions to do dependency injection in a manner similar to ASP.NET, but agnostic of framework.

# Getting Started

First you need to setup scopes around each request. Use a middleware from your framework to do that.

For [sdkgen](https://sdkgen.github.io/):

```typescript
import { setupScope } from "@cubos/inject";

api.use((ctx, next) => setupScope(next));
```

For [Koa](https://koajs.com/):

```typescript
import { setupScope } from "@cubos/inject";

app.use((ctx, next) => setupScope(next));
```

For [Express](https://expressjs.com/):

```typescript
import { setupScope } from "@cubos/inject";

app.use((req, res, next) => setupScope(next));
```

Then you can begin creating, registering and using your services. See below.

# Reference

## `setupScope(callback)`

The concept of "scope" can vary depending on the framework, but here we call "scope" a ongoing request from the client. Everything a request is received a new scope is created. All operations executed because of this request happens inside the same scope. You can also have nested scopes, if you need that (most likely you don't).

`setupScope` receives a single argument, a callback function. This function will be called immediately and its result will be returned. Any asynchronous task created by this callback will inherit the same scope. This is possible by using [`AsyncLocalStorage`](https://nodejs.org/api/async_hooks.html#async_hooks_class_asynclocalstorage), available since Node 12.17. **Thus this module does NOT work in Node 10**.

You are not required to setup a scope if you are not going to use scoped services or values.

## `registerService(lifetime, class, ...args)` and `registerServiceWithFactory(lifetime, class, factory)`

Registers a new service with the specified lifetime.

- **`"singleton"` lifetime:** A new instance will be created on the first usage and will be kept for reuse. The same instance will be returned always.
- **`"scoped"` lifetime:** A new instance will be created on the first usage inside each scope. A instance created for one scope won't be returned for another. It is safe to store that such as user credentials in such service.
- **`"transient"` lifetime:** A new instance will be created every time. This kind of service must be lightweight.

For example:

```typescript
class LargeCacheService {
  expensiveData = new Map<string, string>();

  constructor() {
    // populate this.expensiveData
  }
}

registerService("singleton", LargeCacheService);
```

```typescript
class FeatureFlagService {
  constructor() {
    // load features from current user
  }

  isEnabled(feature: string): boolean {
    // ...
  }
}

registerService("scoped", FeatureFlagService);
```

If the class constructor need arguments, you can pass them to `registerService`:

```typescript
class CoolIntegrationService {
  constructor(private axiosClient: AxiosInstance, private apiKey: string) {}

  // ...
}

registerService("transient", CoolIntegrationService, axios.create(), env.COOL_API_KEY);
```

If you need some custom construction logic and for some reason the class constructor can't be used for that, you can use `registerServiceWithFactory`. This function will be called only when needed.

```typescript
registerServiceWithFactory("singleton", SomeService, () => SomeService.getInstance());
```

## `use(class)`

This function can be called from anywhere (including from the constructor of a service) to obtain an instance of a service ready to use. The lifetime of the service is handled behind the scenes.

```typescript
class UserInformationService {
  constructor() {
    // populate information of current user
  }
}

class FeatureFlagService {
  dbConnection = use(DatabaseConnectionService);

  constructor() {
    const userId = use(UserInformationService).userId;
  }
}
```

The intended use is to call `use` from your controllers to obtain services and interact with them. Member functions of services can call `use` themselves as well. If the service is scoped, you must be inside a scope to use it.

## `registerValue(name, value)` and `use(name)`

Not everything is a service. Maybe you have a stand alone function or some data you want to share. For this `registerValue` can be used.

```typescript
registerValue("dbConnection", pool);
registerValue("handleError", err => console.error(err));
```

Those values can be later used with `use`:

```typescript
use("dbConnection").query("SELECT 1+2");
use("handleError")(new Error("failed"));
// Or:
use.dbConnection.query("SELECT 1+2");
use.handleError(new Error("failed"));
```

By default the return of `use` is typed as `unknown`, but you can provide a custom typing to improve your experience. You can change to you strict typing by adding the following to your project:

```typescript
// This must be a .d.ts file
import type { ConnectionPool } from "some-package";

module "@cubos/inject" {
  export interface UseTypeMap {
    dbConnection: ConnectionPool;
    handleError(err: Error): void;
  }
}
```

## `registerScopedValue(name, value)`

Similar to `registerValue`, `registerScopedValue` can be used to register values to be consumed with `use`. But they will only be available within the same scope.

# Test Setup

The goal of this library is to make dependency injection during unit tests easy. This is our suggested architecture:

1. Create your service classes and values. They can `use` freely, but they should not register themselves.
2. Create your controllers and routes consuming those services with `use`.
3. Create your application entry point file. This is the only file that won't be tested. It should register all services and start the application server.
4. Create a test setup file. Assuming Jest, you should pass this file as `setupFilesAfterEnv` on jest config. It should have a `beforeAll` that can register some default mock or services/values that all tests can use. Then it must call the following:

       beforeEach(pushInjectionContext);
       afterEach(popInjectionContext);

    This pair of functions are responsible for creating an isolated context for each test.
5. Write your tests. Each test can `registerService` its own mocks as needed, not need to cleanup. After each test `popInjectionContext` will take care of eliminating anything this test registered.
