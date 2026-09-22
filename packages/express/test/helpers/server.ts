import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { before, after } from "node:test";

import { app } from "../express";

const isAddressInfo = (address: string | AddressInfo | null): address is AddressInfo => typeof address === "object" && address !== null;

const state: { server?: Server } = {};

const listen = () =>
  new Promise<Server>((resolve, reject) => {
    const server = app.listen(0, "127.0.0.1", () => resolve(server));
    server.once("error", reject);
  });

const close = (server: Server) =>
  new Promise<void>((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
    // fetch keeps its sockets alive, so close() would never reach idle on its own.
    server.closeAllConnections();
  });

// Port 0 gives every test file its own port, so the runner can keep running the files in parallel.
export const useTestServer = () => {
  before(async () => {
    state.server = await listen();
  });
  after(async () => {
    const { server } = state;
    if (server) {
      await close(server);
    }
  });
};

export const testServerUrl = (path: string) => {
  const address = state.server?.address();
  if (!isAddressInfo(address)) {
    throw new Error(`test server is not listening (requested ${path})`);
  }
  return `http://127.0.0.1:${address.port}${path}`;
};
