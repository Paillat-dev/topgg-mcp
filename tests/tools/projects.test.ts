import { describe, it, expect, vi } from "vitest";
import type { TopggClient } from "../../src/client.js";
import { getProject, updateProject } from "../../src/tools/projects.js";

function makeClient(overrides: Partial<TopggClient>): TopggClient {
  return { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), ...overrides };
}

describe("getProject", () => {
  it("returns all documented project fields", async () => {
    const project = {
      id: "218109768489992192",
      name: "Miki",
      platform: "discord",
      type: "bot",
      headline: "A great bot with tons of features!",
      tags: ["anime", "economy"],
      votes: 1120,
      votes_total: 313_389,
      review_score: 4.38,
      review_count: 62_245,
    };
    const client = makeClient({ get: vi.fn().mockResolvedValue(project) });
    const result = await getProject(client);
    expect(JSON.parse(result)).toEqual(project);
  });
});

describe("updateProject", () => {
  it("maps pageContent to the API page_content field", async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ patch });
    const pageContent = "A".repeat(300);
    await updateProject(client, {
      headline: { en: "A useful bot" },
      pageContent: { en: pageContent },
    });
    expect(patch).toHaveBeenCalledWith("/projects/@me", {
      headline: { en: "A useful bot" },
      page_content: { en: pageContent },
    });
  });

  it("rejects empty updates, unsupported locales, and short content", async () => {
    const patch = vi.fn();
    const client = makeClient({ patch });
    await expect(updateProject(client, {})).rejects.toThrow();
    await expect(
      updateProject(client, { headline: { "en-US": "A useful bot" } }),
    ).rejects.toThrow();
    await expect(updateProject(client, { pageContent: { en: "Too short" } })).rejects.toThrow();
    expect(patch).not.toHaveBeenCalled();
  });
});
