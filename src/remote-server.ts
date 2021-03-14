/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { createServer } from "http";
import type { IncomingMessage, ServerResponse } from "http";

import superjson from "superjson";

import { getGlobalContext } from "./global-context";
import { setupScope } from "./scope-context";
import type { ServiceType } from "./service";
import { useService } from "./service";
import { registerScopedValue } from "./value";

const remoteServiceServers = new Map<number, RemoteServiceServer>();

class RemoteServiceServer {
  private services = new Map<string, ServiceType>();

  private httpServer = createServer((req, res) => {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    setupScope(async () => this.handleRequest(req, res));
  });

  constructor(port: number) {
    this.httpServer.listen(port);
    remoteServiceServers.set(port, this);
  }

  addService<T extends ServiceType>(type: T) {
    if (this.services.has(type.name)) {
      throw new Error(`Service '${type.name}' already exported on this port`);
    }

    this.services.set(type.name, type);
  }

  private async handleRequest(req: IncomingMessage, res: ServerResponse) {
    console.log(req.method, req.url);

    try {
      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      if (req.method !== "POST") {
        res.writeHead(405);
        res.end();
        return;
      }

      const match = /^\/(?<serviceName>\w+)\/(?<memberName>\w+)$/u.exec(req.url ?? "") as {
        groups: {
          serviceName: string;
          memberName: string;
        };
      } | null;

      if (!match) {
        res.writeHead(404);
        res.end();
        return;
      }

      const type = this.services.get(match.groups.serviceName);

      if (!type) {
        res.writeHead(404);
        res.end();
        return;
      }

      const instance = useService(type);
      const func = instance[match.groups.memberName] as Function | undefined;

      if (!func || typeof func !== "function") {
        res.writeHead(404);
        res.end();
        return;
      }

      const bodyParts: Buffer[] = [];

      for await (const part of req) {
        bodyParts.push(part);
      }

      const bodyStr = Buffer.concat(bodyParts).toString();

      const body: {
        a?: any[];
        v?: Record<string, any>;
      } = bodyStr.length > 0 ? superjson.parse(bodyStr) : {};

      for (const [name, value] of Object.entries(body.v ?? {})) {
        registerScopedValue(name, value);
      }

      try {
        const result = await func.apply(instance, body.a ?? []);

        res.writeHead(200);
        res.write(superjson.stringify(result));
        res.end();
      } catch (err) {
        res.writeHead(400);
        res.write(superjson.stringify(err));
        res.end();
      }
    } catch (err) {
      console.error(err);
      res.writeHead(500);
      res.end();
    }
  }
}

export function exposeService<T extends ServiceType>(type: T, port: number) {
  const service = getGlobalContext().getService(type.name);

  if (!service) {
    throw new Error(`Service '${type.name}' is not registered`);
  }

  const server = remoteServiceServers.get(port) ?? new RemoteServiceServer(port);

  server.addService(type);
}
