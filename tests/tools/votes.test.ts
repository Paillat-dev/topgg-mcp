import { describe, it, expect, vi } from "vitest";
import type { TopggClient } from "../../src/client.js";
import { getVotes, checkUserVote } from "../../src/tools/votes.js";

function makeClient(overrides: Partial<TopggClient>): TopggClient {
  return { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), ...overrides };
}

describe("getVotes", () => {
  it("throws when neither cursor nor startDate is provided", async () => {
    const client = makeClient({ get: vi.fn() });
    await expect(getVotes(client, {})).rejects.toThrow(/cursor.*startDate|startDate.*cursor/i);
  });

  it("returns vote queue JSON when startDate is provided", async () => {
    const data = {
      cursor: "next123",
      data: [
        {
          user_id: "u1",
          platform_id: "p1",
          weight: 1,
          created_at: "2026-01-01T00:00:00Z",
          expires_at: "2026-01-01T12:00:00Z",
        },
      ],
    };
    const client = makeClient({ get: vi.fn().mockResolvedValue(data) });
    const result = await getVotes(client, { startDate: "2026-01-01T00:00:00Z" });
    expect(JSON.parse(result)).toMatchObject({ cursor: "next123" });
  });

  it("passes startDate as query param", async () => {
    const get = vi.fn().mockResolvedValue({ cursor: "next", data: [] });
    const client = makeClient({ get });
    await getVotes(client, { startDate: "2026-01-01T00:00:00Z" });
    expect(get).toHaveBeenCalledWith("/projects/@me/votes", {
      startDate: "2026-01-01T00:00:00Z",
    });
  });

  it("passes cursor as query param", async () => {
    const get = vi.fn().mockResolvedValue({ cursor: "next", data: [] });
    const client = makeClient({ get });
    await getVotes(client, { cursor: "abc" });
    expect(get).toHaveBeenCalledWith("/projects/@me/votes", { cursor: "abc" });
  });

  it("only passes cursor when cursor and startDate are both provided", async () => {
    const get = vi.fn().mockResolvedValue({ cursor: "next", data: [] });
    const client = makeClient({ get });
    await getVotes(client, { cursor: "abc", startDate: "2026-01-01T00:00:00Z" });
    expect(get).toHaveBeenCalledWith("/projects/@me/votes", { cursor: "abc" });
  });
});

describe("checkUserVote", () => {
  it("returns vote response JSON", async () => {
    const data = {
      created_at: "2024-01-01T00:00:00Z",
      expires_at: "2024-01-02T00:00:00Z",
      weight: 1,
    };
    const client = makeClient({ get: vi.fn().mockResolvedValue(data) });
    const result = await checkUserVote(client, { userId: "123" });
    expect(JSON.parse(result)).toEqual(data);
  });

  it("encodes userId in path", async () => {
    const get = vi.fn().mockResolvedValue({
      created_at: "2024-01-01T00:00:00Z",
      expires_at: "2024-01-02T00:00:00Z",
      weight: 1,
    });
    const client = makeClient({ get });
    await checkUserVote(client, { userId: "user/123" });
    expect(get).toHaveBeenCalledWith(expect.stringContaining("user%2F123"), expect.anything());
  });

  it("passes source as query param when provided", async () => {
    const get = vi.fn().mockResolvedValue({
      created_at: "2024-01-01T00:00:00Z",
      expires_at: "2024-01-02T00:00:00Z",
      weight: 1,
    });
    const client = makeClient({ get });
    await checkUserVote(client, { userId: "123", source: "discord" });
    expect(get).toHaveBeenCalledWith(expect.any(String), { source: "discord" });
  });
});
