import { describe, it, expect, vi } from "vitest";
import type { TopggClient } from "../../src/client.js";
import { postMetrics, postMetricsBatch } from "../../src/tools/metrics.js";

function makeClient(overrides: Partial<TopggClient>): TopggClient {
  return { get: vi.fn(), patch: vi.fn(), post: vi.fn(), put: vi.fn(), ...overrides };
}

describe("postMetrics", () => {
  it("posts discord bot metrics and returns success message", async () => {
    const post = vi.fn().mockResolvedValue(undefined);
    const client = makeClient({ post });
    const result = await postMetrics(client, { server_count: 42, shard_count: 2 });
    expect(post).toHaveBeenCalledWith("/projects/@me/metrics", {
      server_count: 42,
      shard_count: 2,
    });
    expect(result).toBe("Metrics submitted successfully.");
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
