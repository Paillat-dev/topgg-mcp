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

  it("puts commands and returns count", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ put });
    const result = await registerCommands(client, { commands: sampleCommands });
    expect(put).toHaveBeenCalledWith("/projects/@me/commands", sampleCommands);
    expect(result).toContain("2");
  });

  it("accepts the documented command shape with optional type", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ put });
    const commands = [
      {
        name: "nsfw",
        description: "NSFW command",
        nsfw: true,
        name_localizations: { fr: "explicite" },
        default_member_permissions: "0",
        contexts: [0, 1],
      },
    ];
    await registerCommands(client, { commands });
    expect(put).toHaveBeenCalledWith("/projects/@me/commands", commands);
  });

  it("accepts current Discord option fields", async () => {
    const put = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ put });
    const commands = [
      {
        name: "search",
        description: "Search records",
        options: [
          {
            type: 3,
            name: "query",
            description: "Search query",
            min_length: 2,
            max_length: 100,
            autocomplete: true,
          },
        ],
      },
    ];
    await registerCommands(client, { commands });
    expect(put).toHaveBeenCalledWith("/projects/@me/commands", commands);
  });
});
