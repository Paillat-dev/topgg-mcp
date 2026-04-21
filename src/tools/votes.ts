import type { TopggClient } from "../client.js";
import { VoteQueueResponseSchema, VoteResponseSchema } from "../schemas.js";

export async function getVotes(
  client: TopggClient,
  input: { cursor?: string; startDate?: string },
): Promise<string> {
  if (input.cursor === undefined && input.startDate === undefined) {
    throw new Error(
      'Either "cursor" or "startDate" is required. Provide "startDate" for the first page, then pass the returned "cursor" for subsequent pages.',
    );
  }
  const params: Record<string, string> = {};
  if (input.cursor !== undefined) params["cursor"] = input.cursor;
  if (input.startDate !== undefined) params["startDate"] = input.startDate;
  const data = await client.get<unknown>("/projects/@me/votes", params);
  const result = VoteQueueResponseSchema.parse(data);
  return JSON.stringify(result, undefined, 2);
}

export async function checkUserVote(
  client: TopggClient,
  input: { userId: string; source?: "topgg" | "discord" },
): Promise<string> {
  const params: Record<string, string> = {};
  if (input.source !== undefined) params["source"] = input.source;
  const data = await client.get<unknown>(
    `/projects/@me/votes/${encodeURIComponent(input.userId)}`,
    params,
  );
  const result = VoteResponseSchema.parse(data);
  return JSON.stringify(result, undefined, 2);
}
