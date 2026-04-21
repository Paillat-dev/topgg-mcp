import { describe, it, expect, vi } from "vitest";
import type { TopggClient } from "../../src/client.js";
import { createAnnouncement } from "../../src/tools/announcements.js";

function makeClient(overrides: Partial<TopggClient>): TopggClient {
  return { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), ...overrides };
}

describe("createAnnouncement", () => {
  it("creates announcement and returns JSON result", async () => {
    const response = { title: "Hello", content: "World", createdAt: "2024-01-01T00:00:00Z" };
    const put = vi.fn().mockResolvedValue(response);
    const client = makeClient({ put });
    const result = await createAnnouncement(client, { title: "Hello", content: "World" });
    expect(put).toHaveBeenCalledWith("/projects/@me/announcements", {
      title: "Hello",
      content: "World",
    });
    expect(JSON.parse(result)).toMatchObject({ title: "Hello", content: "World" });
  });

  it("propagates API errors", async () => {
    const client = makeClient({ put: vi.fn().mockRejectedValue(new Error("Rate limited")) });
    await expect(createAnnouncement(client, { title: "Hi", content: "Test" })).rejects.toThrow(
      "Rate limited",
    );
  });
});
