import { describe, it, expect, vi } from "vitest";
import type { TopggClient } from "../../src/client.js";
import { createAnnouncement } from "../../src/tools/announcements.js";

function makeClient(overrides: Partial<TopggClient>): TopggClient {
  return { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), ...overrides };
}

describe("createAnnouncement", () => {
  it("creates announcement and returns JSON result", async () => {
    const response = {
      title: "Hello",
      content: "World news",
      created_at: "2024-01-01T00:00:00Z",
    };
    const post = vi.fn().mockResolvedValue(response);
    const client = makeClient({ post });
    const result = await createAnnouncement(client, {
      title: "Hello",
      content: "World news",
      category: "new_feature",
    });
    expect(post).toHaveBeenCalledWith("/projects/@me/announcements", {
      title: "Hello",
      content: "World news",
      category: "new_feature",
    });
    expect(JSON.parse(result)).toEqual(response);
  });

  it("propagates API errors", async () => {
    const client = makeClient({ post: vi.fn().mockRejectedValue(new Error("Rate limited")) });
    await expect(
      createAnnouncement(client, { title: "Hello", content: "Test content" }),
    ).rejects.toThrow("Rate limited");
  });

  it("validates title, content, and category before sending", async () => {
    const post = vi.fn();
    const client = makeClient({ post });
    await expect(
      createAnnouncement(client, {
        title: "Hi",
        content: "Too short",
        category: "event",
      }),
    ).rejects.toThrow();
    expect(post).not.toHaveBeenCalled();
  });
});
