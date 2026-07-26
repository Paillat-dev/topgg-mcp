import { describe, it, expect, vi } from "vitest";
import type { TopggClient } from "../../src/client.js";
import { postMetrics, postMetricsBatch } from "../../src/tools/metrics.js";

function makeClient(overrides: Partial<TopggClient>): TopggClient {
  return { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), ...overrides };
}

describe("postMetrics", () => {
  it("patches Discord bot metrics and returns success message", async () => {
    const patch = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ patch });
    const result = await postMetrics(client, { server_count: 42, shard_count: 2 });
    expect(patch).toHaveBeenCalledWith("/projects/@me/metrics", {
      server_count: 42,
      shard_count: 2,
    });
    expect(result).toBe("Metrics submitted successfully.");
  });

  it("rejects empty, mixed-platform, and negative metrics", async () => {
    const patch = vi.fn();
    const client = makeClient({ patch });
    await expect(postMetrics(client, {})).rejects.toThrow();
    await expect(postMetrics(client, { server_count: 1, player_count: 2 })).rejects.toThrow();
    await expect(postMetrics(client, { server_count: -1 })).rejects.toThrow();
    expect(patch).not.toHaveBeenCalled();
  });

  it("rejects online_count above member_count", async () => {
    const patch = vi.fn();
    const client = makeClient({ patch });
    await expect(postMetrics(client, { member_count: 10, online_count: 11 })).rejects.toThrow(
      /online_count/,
    );
    expect(patch).not.toHaveBeenCalled();
  });
});

describe("postMetricsBatch", () => {
  it("posts a batch and returns count in success message", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ post });
    const input = {
      data: [
        { metrics: { server_count: 10 } },
        { metrics: { server_count: 20 }, timestamp: "2024-01-01T00:00:00Z" },
      ],
    };
    const result = await postMetricsBatch(client, input);
    expect(post).toHaveBeenCalledWith("/projects/@me/metrics/batch", input);
    expect(result).toContain("2");
  });

  it("rejects empty data array", async () => {
    const client = makeClient({ post: vi.fn() });
    await expect(postMetricsBatch(client, { data: [] })).rejects.toThrow();
  });
});
