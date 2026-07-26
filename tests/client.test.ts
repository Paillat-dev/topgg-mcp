import { describe, it, expect, vi, beforeEach } from "vitest";
import { createClient, TopggApiError } from "../src/client.js";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function makeResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {},
): Response {
  const bodyText = body === null || body === undefined ? "" : JSON.stringify(body);
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: new Headers(headers),
    text: async () => bodyText,
  } as Response;
}

describe("createClient", () => {
  const client = createClient("test-token");

  beforeEach(() => {
    mockFetch.mockReset();
  });

  it("sends correct Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { id: "1", name: "Bot" }));
    await client.get("/projects/@me");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://top.gg/api/v1/projects/@me",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer test-token",
        }),
      }),
    );
  });

  it("appends query params correctly", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(200, { cursor: "next", data: [] }));
    await client.get("/projects/@me/votes", { cursor: "abc", startDate: "2024-01-01T00:00:00Z" });
    const url = mockFetch.mock.calls[0]?.[0] as string;
    expect(url).toContain("cursor=abc");
    expect(url).toContain("startDate=");
  });

  it("returns undefined for 204 responses", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(204, null));
    const result = await client.patch("/projects/@me", {});
    expect(result).toBeUndefined();
  });

  it("returns body for 201 responses", async () => {
    const body = {
      title: "Hello",
      content: "World news",
      created_at: "2024-01-01T00:00:00Z",
    };
    mockFetch.mockResolvedValueOnce(makeResponse(201, body));
    const result = await client.post("/projects/@me/announcements", body);
    expect(result).toEqual(body);
  });

  it("throws TopggApiError on 4xx responses", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(404, { title: "Not Found", detail: "Project does not exist." }),
    );
    await expect(client.get("/projects/@me")).rejects.toThrow(TopggApiError);
  });

  it("includes title and detail in TopggApiError message", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(422, { title: "Validation Failed", detail: "Bad payload." }),
    );
    const error = await client.post("/projects/@me/metrics", {}).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TopggApiError);
    expect((error as TopggApiError).message).toContain("Validation Failed");
    expect((error as TopggApiError).message).toContain("Bad payload.");
  });

  it("handles missing problem details gracefully", async () => {
    mockFetch.mockResolvedValueOnce(makeResponse(500, "Internal Server Error"));
    const error = await client.get("/projects/@me").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TopggApiError);
    expect((error as TopggApiError).status).toBe(500);
  });

  it("includes Retry-After context in rate limit errors", async () => {
    mockFetch.mockResolvedValueOnce(
      makeResponse(
        429,
        { title: "Too Many Requests", detail: "Announcement cooldown is active." },
        { "Retry-After": "3600" },
      ),
    );
    const error = await client
      .post("/projects/@me/announcements", {
        title: "Update",
        content: "A new update",
      })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(TopggApiError);
    expect((error as TopggApiError).retryAfterSeconds).toBe(3600);
    expect((error as TopggApiError).message).toContain("Retry after 3600 seconds");
  });
});
