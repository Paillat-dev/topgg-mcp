import { describe, it, expect, vi } from "vitest";
import type { TopggClient } from "../../src/client.js";
import { registerCommands } from "../../src/tools/commands.js";

function makeClient(overrides: Partial<TopggClient>): TopggClient {
  return { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), ...overrides };
}

describe("registerCommands", () => {
  const sampleCommands = [
    { type: 1, name: "ping", description: "Ping the bot" },
    { type: 1, name: "help", description: "Show help" },
  ];

  it("posts commands and returns count", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ post });
    const result = await registerCommands(client, { commands: sampleCommands });
    expect(post).toHaveBeenCalledWith("/projects/@me/commands", sampleCommands);
    expect(result).toContain("2");
  });

  it("accepts commands with optional fields", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ post });
    const commands = [
      {
        type: 1,
        name: "nsfw",
        description: "NSFW command",
        nsfw: true,
        name_localizations: { fr: "explicite" },
      },
    ];
    await registerCommands(client, { commands });
    expect(post).toHaveBeenCalledWith("/projects/@me/commands", commands);
  });
});
