import { z } from "zod";
import type { TopggClient } from "../client.js";
import { ProjectSchema, UpdateProjectInputSchema } from "../schemas.js";

export async function getProject(client: TopggClient): Promise<string> {
  const data = await client.get<unknown>("/projects/@me");
  const project = ProjectSchema.parse(data);
  return JSON.stringify(project, undefined, 2);
}

export async function updateProject(
  client: TopggClient,
  input: z.infer<typeof UpdateProjectInputSchema>,
): Promise<string> {
  const parsed = UpdateProjectInputSchema.parse(input);
  const body: Record<string, unknown> = {};
  if (parsed.headline !== undefined) body["headline"] = parsed.headline;
  if (parsed.pageContent !== undefined) body["page_content"] = parsed.pageContent;
  await client.patch<undefined>("/projects/@me", body);
  return "Project updated successfully.";
}
