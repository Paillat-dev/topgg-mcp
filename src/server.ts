import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { type TopggClient, TopggApiError } from "./client.js";
import {
  HeadlineLocaleMapSchema,
  PageContentLocaleMapSchema,
  SlashCommandSchema,
  MetricsInputSchema,
} from "./schemas.js";
import { getProject, updateProject } from "./tools/projects.js";
import { registerCommands } from "./tools/commands.js";
import { getVotes, checkUserVote } from "./tools/votes.js";
import { postMetrics, postMetricsBatch } from "./tools/metrics.js";
import { createAnnouncement } from "./tools/announcements.js";

function wrapError(error: unknown): string {
  if (error instanceof TopggApiError) return error.message;
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred.";
}

async function runTool(action: () => Promise<string>) {
  try {
    const text = await action();
    return { content: [{ type: "text" as const, text }] };
  } catch (error) {
    return {
      content: [{ type: "text" as const, text: wrapError(error) }],
      isError: true,
    };
  }
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
    version: "0.0.0",
  });

  // ── get_project ──────────────────────────────────────────────────────────────
  server.registerTool(
    "get_project",
    {
      description: "Retrieve the Top.gg project associated with the authenticated token.",
      inputSchema: { project: projectParam },
    },
    async (input) =>
      runTool(async () => {
        const client = resolveClient(clients, input.project);
        return getProject(client);
      }),
  );

  // ── update_project ───────────────────────────────────────────────────────────
  server.registerTool(
    "update_project",
    {
      description: "Update the headline and/or page content of the current Top.gg project listing.",
      inputSchema: {
        project: projectParam,
        headline: HeadlineLocaleMapSchema.optional().describe(
          "Supported locale codes mapped to headline text (3-140 characters).",
        ),
        pageContent: PageContentLocaleMapSchema.optional().describe(
          "Supported locale codes mapped to Markdown page content (300-50,000 characters).",
        ),
      },
    },
    async (input) =>
      runTool(async () => {
        const client = resolveClient(clients, input.project);
        return updateProject(client, input);
      }),
  );

  // ── register_commands ────────────────────────────────────────────────────────
  server.registerTool(
    "register_commands",
    {
      description:
        "Replace all registered Discord slash commands for the current Top.gg bot project.",
      inputSchema: {
        project: projectParam,
        commands: z.array(SlashCommandSchema).describe("Array of slash command definitions."),
      },
    },
    async (input) =>
      runTool(async () => {
        const client = resolveClient(clients, input.project);
        return registerCommands(client, { commands: input.commands });
      }),
  );

  // ── get_votes ────────────────────────────────────────────────────────────────
  server.registerTool(
    "get_votes",
    {
      description:
        "Fetch a page of vote history for the current Top.gg project. " +
        "For the first page, provide startDate (ISO 8601, max 1 year ago). " +
        "For subsequent pages, pass the cursor returned by the previous response. " +
        "An empty data array means there are no more votes.",
      inputSchema: {
        project: projectParam,
        cursor: z
          .string()
          .optional()
          .describe(
            "Pagination cursor from the previous response. Use this to fetch the next page. " +
              "Takes precedence if startDate is also provided.",
          ),
        startDate: z.iso
          .datetime()
          .optional()
          .describe(
            "ISO 8601 datetime to start from (e.g. 2026-01-01T00:00:00Z). " +
              "Required for the first page and must be within the last year.",
          ),
      },
    },
    async (input) =>
      runTool(async () => {
        const client = resolveClient(clients, input.project);
        return getVotes(client, input);
      }),
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
    async (input) =>
      runTool(async () => {
        const client = resolveClient(clients, input.project);
        return checkUserVote(client, input);
      }),
  );

  // ── post_metrics ─────────────────────────────────────────────────────────────
  server.registerTool(
    "post_metrics",
    {
      description:
        "Submit a metrics payload for the current Top.gg project. Provide the fields relevant to your project type.",
      inputSchema: {
        project: projectParam,
        server_count: z.number().int().nonnegative().optional().describe("Discord bot: servers."),
        shard_count: z.number().int().nonnegative().optional().describe("Discord bot: shards."),
        member_count: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Discord server: members."),
        online_count: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Discord server: online members."),
        player_count: z
          .number()
          .int()
          .nonnegative()
          .optional()
          .describe("Roblox game: current players."),
      },
    },
    async (input) =>
      runTool(async () => {
        const client = resolveClient(clients, input.project);
        return postMetrics(client, input);
      }),
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
          .describe("Array of metrics entries (1-100)."),
      },
    },
    async (input) =>
      runTool(async () => {
        const client = resolveClient(clients, input.project);
        return postMetricsBatch(client, input);
      }),
  );

  // ── create_announcement ──────────────────────────────────────────────────────
  server.registerTool(
    "create_announcement",
    {
      description:
        "Create an announcement for the current Top.gg project. Rate-limited to one announcement per 4 hours.",
      inputSchema: {
        project: projectParam,
        title: z.string().min(3).max(100).describe("Announcement title."),
        content: z.string().min(10).max(2000).describe("Announcement body text."),
        category: z
          .enum(["announcement", "event", "new_feature"])
          .optional()
          .describe('Announcement category. Defaults to "announcement".'),
      },
    },
    async (input) =>
      runTool(async () => {
        const client = resolveClient(clients, input.project);
        return createAnnouncement(client, input);
      }),
  );

  return server;
}
