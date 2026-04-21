import { ProblemDetailsSchema } from "./schemas.js";

const BASE_URL = "https://top.gg/api/v1";

export class TopggApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly title: string,
    public readonly detail?: string,
  ) {
    super(`Top.gg API error ${status.toString()}: ${title}${detail ? ` — ${detail}` : ""}`);
    this.name = "TopggApiError";
  }
}

type RequestOptions = {
  body?: unknown;
  params?: Record<string, string>;
};

export function createClient(token: string) {
  const headers = {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  async function request<T>(
    method: string,
    path: string,
    options: RequestOptions = {},
  ): Promise<T> {
    let url = `${BASE_URL}${path}`;

    if (options.params !== undefined) {
      const search = new URLSearchParams(options.params);
      url = `${url}?${search.toString()}`;
    }

    const fetchInit: RequestInit = { method, headers };
    if (options.body !== undefined) {
      fetchInit.body = JSON.stringify(options.body);
    }
    const response = await fetch(url, fetchInit);

    if (response.status === 204) {
      return undefined as T;
    }

    const text = await response.text();

    let json: unknown;
    try {
      json = text.length > 0 ? JSON.parse(text) : undefined;
    } catch {
      throw new TopggApiError(
        response.status,
        `Non-JSON response (HTTP ${response.status.toString()})`,
        text.slice(0, 200) || "(empty body)",
      );
    }

    if (response.ok) {
      return json as T;
    }

    const problem = ProblemDetailsSchema.safeParse(json);
    const title = problem.success ? (problem.data.title ?? "Unknown error") : "Unknown error";
    const detail = problem.success ? problem.data.detail : undefined;
    throw new TopggApiError(response.status, title, detail);
  }

  return {
    get: <T>(path: string, params?: Record<string, string>) =>
      request<T>("GET", path, params === undefined ? {} : { params }),
    patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, { body }),
    post: <T>(path: string, body: unknown) => request<T>("POST", path, { body }),
    put: <T>(path: string, body: unknown) => request<T>("PUT", path, { body }),
  };
}

export type TopggClient = ReturnType<typeof createClient>;
