import { z } from "zod";
import type { TopggClient } from "../client.js";
import { RegisterCommandsInputSchema } from "../schemas.js";

export async function registerCommands(
  client: TopggClient,
  input: { commands: z.infer<typeof RegisterCommandsInputSchema> },
): Promise<string> {
  const commands = RegisterCommandsInputSchema.parse(input.commands);
  await client.post<undefined>("/projects/@me/commands", commands);
  return `${commands.length.toString()} command(s) registered successfully.`;
}
