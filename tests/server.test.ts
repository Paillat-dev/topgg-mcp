import { describe, it, expect, vi } from "vitest";
import type { TopggClient } from "../src/client.js";
import { resolveClient } from "../src/server.js";

function makeClient(): TopggClient {
  return { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn() };
}

describe("resolveClient", () => {
  it("returns the only client when one is configured, regardless of project param", () => {
    const client = makeClient();
    const clients = new Map([["default", client]]);
    expect(resolveClient(clients, undefined)).toBe(client);
    expect(resolveClient(clients, "default")).toBe(client);
    expect(resolveClient(clients, "anything")).toBe(client);
  });

  it("selects the correct client by name when multiple are configured", () => {
    const a = makeClient();
    const b = makeClient();
    const clients = new Map([
      ["alpha", a],
      ["beta", b],
    ]);
    expect(resolveClient(clients, "alpha")).toBe(a);
    expect(resolveClient(clients, "beta")).toBe(b);
  });

  it("throws when multiple clients are configured and project is omitted", () => {
    const clients = new Map([
      ["alpha", makeClient()],
      ["beta", makeClient()],
    ]);
    expect(() => resolveClient(clients, undefined)).toThrow(
      /specify which one.*project.*Available: alpha, beta/i,
    );
  });

  it("throws with available names when an unknown project is requested", () => {
    const clients = new Map([
      ["alpha", makeClient()],
      ["beta", makeClient()],
    ]);
    expect(() => resolveClient(clients, "gamma")).toThrow(
      /Unknown project "gamma".*Available: alpha, beta/i,
    );
  });
});
