import { describe, it, expect, vi } from "vitest";
import type { TopggClient } from "../../src/client.js";
import { getProject, updateProject } from "../../src/tools/project.js";

function makeClient(overrides: Partial<TopggClient>): TopggClient {
  return {
    get: vi.fn(),
    patch: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    ...overrides,
  };
}

describe("getProject", () => {
  it("returns parsed project JSON", async () => {
    const data = { id: "123", name: "My Bot" };
    const client = makeClient({ get: vi.fn().mockResolvedValue(data) });
    const result = await getProject(client);
    expect(JSON.parse(result)).toMatchObject({ id: "123", name: "My Bot" });
  });

  it("propagates API errors", async () => {
    const client = makeClient({ get: vi.fn().mockRejectedValue(new Error("Not found")) });
    await expect(getProject(client)).rejects.toThrow("Not found");
  });
});

describe("updateProject", () => {
  it("calls patch with correct body", async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ patch });
    const result = await updateProject(client, { headline: { en: "Hello" } });
    expect(patch).toHaveBeenCalledWith("/projects/@me", { headline: { en: "Hello" } });
    expect(result).toBe("Project updated successfully.");
  });

  it("allows empty input", async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ patch });
    await updateProject(client, {});
    expect(patch).toHaveBeenCalledWith("/projects/@me", {});
  });
});
