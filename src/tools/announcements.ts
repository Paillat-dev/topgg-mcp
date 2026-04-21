import { z } from "zod";
import type { TopggClient } from "../client.js";
import { AnnouncementInputSchema, AnnouncementResponseSchema } from "../schemas.js";

export async function createAnnouncement(
  client: TopggClient,
  input: z.infer<typeof AnnouncementInputSchema>,
): Promise<string> {
  const body = AnnouncementInputSchema.parse(input);
  const data = await client.put<unknown>("/projects/@me/announcements", body);
  const result = AnnouncementResponseSchema.parse(data);
  return JSON.stringify(result, undefined, 2);
}
