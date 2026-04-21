import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type TopggClient, TopggApiError } from "./client.js";
import {
  ProjectSchema,
  UpdateProjectInputSchema,
  RegisterCommandsInputSchema,
  VoteQueueResponseSchema,
  VoteResponseSchema,
  MetricsInputSchema,
  MetricsBatchInputSchema,
  AnnouncementInputSchema,
  AnnouncementResponseSchema,
  ApplicationCommandOptionSchema,
} from "./schemas.js";

function wrapError(error: unknown): string {
  if (error instanceof TopggApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

export function resolveClient(
  clients: Map<string, TopggClient>,
  project: string | undefined,
): TopggClient {
  if (clients.size === 1) {
    const client = clients.values().next().value;
    if (client === undefined) throw new Error("No clients configured.");
    return client;
  }

  if (project === undefined) {
    const names = [...clients.keys()].join(", ");
    throw new Error(
      `Multiple projects configured — specify which one via the "project" parameter. Available: ${names}`,
    );
  }

  const client = clients.get(project);
  if (client === undefined) {
    const names = [...clients.keys()].join(", ");
    throw new Error(`Unknown project "${project}". Available: ${names}`);
  }

  return client;
}

const projectParam = z
  .string()
  .optional()
  .describe(
    'Name of the configured project to target (e.g. "mybot" for TOPGG_TOKEN_MYBOT). ' +
      "Required when multiple tokens are configured; omit when only one is configured.",
  );

export function createServer(clients: Map<string, TopggClient>): McpServer {
  const server = new McpServer({
    name: "topgg-mcp",
    version: "1.0.0",
  });

  // ── get_project ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_project",
    {
      description: "Retrieve the Top.gg project associated with the authenticated token.",
      inputSchema: { project: projectParam },
    },
    async (input) => {
      try {
        const client = resolveClient(clients, input.project);
        const data = await client.get<unknown>("/projects/@me");
        const project = ProjectSchema.parse(data);
        return { content: [{ type: "text", text: JSON.stringify(project, undefined, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: wrapError(error) }], isError: true };
      }
    },
  );

  // ── update_project ───────────────────────────────────────────────────────────
  server.registerTool(
    "update_project",
    {
      description: "Update the headline and/or page content of the current Top.gg project listing.",
      inputSchema: {
        project: projectParam,
        headline: z
          .record(z.string(), z.string())
          .optional()
          .describe('Map of locale codes to headline text (e.g. {"en": "My Bot"})'),
        pageContent: z
          .record(z.string(), z.string())
          .optional()
          .describe('Map of locale codes to page description text (e.g. {"en": "A cool bot"})'),
      },
    },
    async (input) => {
      try {
        const client = resolveClient(clients, input.project);
        const body = UpdateProjectInputSchema.parse(input);
        await client.patch<undefined>("/projects/@me", body);
        return { content: [{ type: "text", text: "Project updated successfully." }] };
      } catch (error) {
        return { content: [{ type: "text", text: wrapError(error) }], isError: true };
      }
    },
  );

  // ── register_commands ────────────────────────────────────────────────────────
  server.registerTool(
    "register_commands",
    {
      description:
        "Replace all registered Discord slash commands for the current Top.gg bot project.",
      inputSchema: {
        project: projectParam,
        commands: z
          .array(
            z.object({
              type: z.number().int().describe("ApplicationCommandType integer."),
              name: z.string(),
              description: z.string(),
              name_localizations: z.record(z.string(), z.string()).optional(),
              description_localizations: z.record(z.string(), z.string()).optional(),
              options: z.array(ApplicationCommandOptionSchema).optional(),
              nsfw: z.boolean().optional(),
            }),
          )
          .describe("Array of slash command definitions."),
      },
    },
    async (input) => {
      try {
        const client = resolveClient(clients, input.project);
        const commands = RegisterCommandsInputSchema.parse(input.commands);
        await client.post<undefined>("/projects/@me/commands", commands);
        return {
          content: [
            {
              type: "text",
              text: `${commands.length.toString()} command(s) registered successfully.`,
            },
          ],
        };
      } catch (error) {
        return { content: [{ type: "text", text: wrapError(error) }], isError: true };
      }
    },
  );

  // ── get_votes ────────────────────────────────────────────────────────────────
  server.registerTool(
    "get_votes",
    {
      description:
        "Fetch a page of vote history for the current Top.gg project. " +
        "For the first page, provide startDate (ISO 8601, max 1 year ago). " +
        "For subsequent pages, pass the cursor returned by the previous response. " +
        "A null cursor in the response means there are no more pages.",
      inputSchema: {
        project: projectParam,
        cursor: z
          .string()
          .optional()
          .describe(
            "Pagination cursor from the previous response. Use this to fetch the next page. " +
              "Mutually exclusive with startDate.",
          ),
        startDate: z.iso
          .datetime()
          .optional()
          .describe(
            "ISO 8601 datetime to start from (e.g. 2026-01-01T00:00:00Z). " +
              "Required for the first page. Must be within the last year. " +
              "Mutually exclusive with cursor.",
          ),
      },
    },
    async (input) => {
      try {
        if (input.cursor === undefined && input.startDate === undefined) {
          return {
            content: [
              {
                type: "text",
                text: 'Either "cursor" or "startDate" is required. Provide "startDate" (ISO 8601, within the last year) for the first page, then pass the returned "cursor" for subsequent pages.',
              },
            ],
            isError: true,
          };
        }
        const client = resolveClient(clients, input.project);
        const params: Record<string, string> = {};
        if (input.cursor !== undefined) params["cursor"] = input.cursor;
        if (input.startDate !== undefined) params["startDate"] = input.startDate;
        const data = await client.get<unknown>("/projects/@me/votes", params);
        const result = VoteQueueResponseSchema.parse(data);
        return { content: [{ type: "text", text: JSON.stringify(result, undefined, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: wrapError(error) }], isError: true };
      }
    },
  );

  // ── check_user_vote ──────────────────────────────────────────────────────────
  server.registerTool(
    "check_user_vote",
    {
      description: "Check the current vote status for a specific user on this Top.gg project.",
      inputSchema: {
        project: projectParam,
        userId: z.string().describe("The user ID to check."),
        source: z
          .enum(["topgg", "discord"])
          .optional()
          .describe("ID namespace. Defaults to Top.gg."),
      },
    },
    async (input) => {
      try {
        const client = resolveClient(clients, input.project);
        const params: Record<string, string> = {};
        if (input.source !== undefined) params["source"] = input.source;
        const data = await client.get<unknown>(
          `/projects/@me/votes/${encodeURIComponent(input.userId)}`,
          params,
        );
        const result = VoteResponseSchema.parse(data);
        return { content: [{ type: "text", text: JSON.stringify(result, undefined, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: wrapError(error) }], isError: true };
      }
    },
  );

  // ── post_metrics ─────────────────────────────────────────────────────────────
  server.registerTool(
    "post_metrics",
    {
      description:
        "Submit a metrics payload for the current Top.gg project. Provide the fields relevant to your project type.",
      inputSchema: {
        project: projectParam,
        server_count: z.number().int().optional().describe("Discord bot: number of servers."),
        shard_count: z.number().int().optional().describe("Discord bot: number of shards."),
        member_count: z.number().int().optional().describe("Discord server: member count."),
        online_count: z.number().int().optional().describe("Discord server: online member count."),
        player_count: z.number().int().optional().describe("Roblox game: player count."),
        players_online: z.number().int().optional().describe("Minecraft: players online."),
        players_max: z.number().int().optional().describe("Minecraft: max player slots."),
        uptime_seconds: z.number().optional().describe("Minecraft: server uptime in seconds."),
        tick_rate: z.number().optional().describe("Minecraft: tick rate."),
        tick_duration_avg: z.number().optional().describe("Minecraft: average tick duration."),
        world_size_x: z.number().optional().describe("Minecraft: world size X."),
        world_size_y: z.number().optional().describe("Minecraft: world size Y."),
      },
    },
    async (input) => {
      try {
        const client = resolveClient(clients, input.project);
        const body = MetricsInputSchema.parse(input);
        await client.post<undefined>("/projects/@me/metrics", body);
        return { content: [{ type: "text", text: "Metrics submitted successfully." }] };
      } catch (error) {
        return { content: [{ type: "text", text: wrapError(error) }], isError: true };
      }
    },
  );

  // ── post_metrics_batch ───────────────────────────────────────────────────────
  server.registerTool(
    "post_metrics_batch",
    {
      description: "Submit up to 100 metrics entries in a single batch request.",
      inputSchema: {
        project: projectParam,
        data: z
          .array(
            z.object({
              metrics: MetricsInputSchema,
              timestamp: z.iso
                .datetime()
                .optional()
                .describe("ISO 8601 collection timestamp (not more than 5 min in the future)."),
            }),
          )
          .min(1)
          .max(100)
          .describe("Array of metrics entries (1–100)."),
      },
    },
    async (input) => {
      try {
        const client = resolveClient(clients, input.project);
        const body = MetricsBatchInputSchema.parse(input);
        await client.post<undefined>("/projects/@me/metrics/batch", body);
        return {
          content: [
            {
              type: "text",
              text: `Batch of ${body.data.length.toString()} metrics entries submitted successfully.`,
            },
          ],
        };
      } catch (error) {
        return { content: [{ type: "text", text: wrapError(error) }], isError: true };
      }
    },
  );

  // ── create_announcement ──────────────────────────────────────────────────────
  server.registerTool(
    "create_announcement",
    {
      description:
        "Create an announcement for the current Top.gg project. Rate-limited to one announcement per 4 hours.",
      inputSchema: {
        project: projectParam,
        title: z.string().describe("Announcement title."),
        content: z.string().describe("Announcement body text."),
      },
    },
    async (input) => {
      try {
        const client = resolveClient(clients, input.project);
        const body = AnnouncementInputSchema.parse(input);
        const data = await client.put<unknown>("/projects/@me/announcements", body);
        const result = AnnouncementResponseSchema.parse(data);
        return { content: [{ type: "text", text: JSON.stringify(result, undefined, 2) }] };
      } catch (error) {
        return { content: [{ type: "text", text: wrapError(error) }], isError: true };
      }
    },
  );

  return server;
}
