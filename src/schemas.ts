import { z } from "zod";

// ── API error (RFC 7807) ──────────────────────────────────────────────────────

export const ProblemDetailsSchema = z.object({
  type: z.string().optional(),
  title: z.string().optional(),
  status: z.number().optional(),
  detail: z.string().optional(),
  instance: z.string().optional(),
});

// ── Project ───────────────────────────────────────────────────────────────────

export const LocaleMapSchema = z.record(z.string(), z.string());

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  headline: z.union([z.string(), LocaleMapSchema]).optional(),
  pageContent: z.union([z.string(), LocaleMapSchema]).optional(),
  type: z.string().optional(),
  tags: z.array(z.string()).optional(),
  vanity: z.string().optional(),
});

export const UpdateProjectInputSchema = z.object({
  headline: LocaleMapSchema.optional(),
  pageContent: LocaleMapSchema.optional(),
});

// ── Commands ──────────────────────────────────────────────────────────────────

export interface ApplicationCommandOptionInput {
  type: number;
  name: string;
  description: string;
  name_localizations?: Record<string, string> | undefined;
  description_localizations?: Record<string, string> | undefined;
  required?: boolean | undefined;
  choices?: Array<{ name: string; value: string | number }> | undefined;
  options?: ApplicationCommandOptionInput[] | undefined;
}

const ApplicationCommandOptionSchemaBase = z.object({
  type: z.number().int(),
  name: z.string(),
  description: z.string(),
  name_localizations: z.record(z.string(), z.string()).optional(),
  description_localizations: z.record(z.string(), z.string()).optional(),
  required: z.boolean().optional(),
  choices: z
    .array(z.object({ name: z.string(), value: z.union([z.string(), z.number()]) }))
    .optional(),
});

export type ApplicationCommandOptionSchemaType = z.ZodType<ApplicationCommandOptionInput>;

export const ApplicationCommandOptionSchema: ApplicationCommandOptionSchemaType = z.lazy(() =>
  ApplicationCommandOptionSchemaBase.extend({
    options: z.array(ApplicationCommandOptionSchema).optional(),
  }),
);

export const SlashCommandSchema = z.object({
  type: z.number().int(),
  name: z.string(),
  description: z.string(),
  name_localizations: z.record(z.string(), z.string()).optional(),
  description_localizations: z.record(z.string(), z.string()).optional(),
  options: z.array(ApplicationCommandOptionSchema).optional(),
  nsfw: z.boolean().optional(),
});

export const RegisterCommandsInputSchema = z.array(SlashCommandSchema);

// ── Votes ─────────────────────────────────────────────────────────────────────

export const VoteSchema = z.object({
  id: z.string(),
  userId: z.string(),
  createdAt: z.string(),
  weight: z.number().optional(),
});

export const VoteQueueResponseSchema = z.object({
  cursor: z.string().nullable(),
  data: z.array(VoteSchema),
});

export const VoteResponseSchema = z.object({
  createdAt: z.string(),
  expiresAt: z.string().optional(),
  weight: z.number().optional(),
});

// ── Metrics ───────────────────────────────────────────────────────────────────

export const MetricsInputSchema = z.object({
  server_count: z.number().int().optional(),
  shard_count: z.number().int().optional(),
  member_count: z.number().int().optional(),
  online_count: z.number().int().optional(),
  player_count: z.number().int().optional(),
  players_online: z.number().int().optional(),
  players_max: z.number().int().optional(),
  uptime_seconds: z.number().optional(),
  tick_rate: z.number().optional(),
  tick_duration_avg: z.number().optional(),
  world_size_x: z.number().optional(),
  world_size_y: z.number().optional(),
});

export const MetricsBatchEntrySchema = z.object({
  metrics: MetricsInputSchema,
  timestamp: z.iso.datetime().optional(),
});

export const MetricsBatchInputSchema = z.object({
  data: z.array(MetricsBatchEntrySchema).min(1).max(100),
});

// ── Announcements ─────────────────────────────────────────────────────────────

export const AnnouncementInputSchema = z.object({
  title: z.string(),
  content: z.string(),
});

export const AnnouncementResponseSchema = z.object({
  title: z.string(),
  content: z.string(),
  createdAt: z.string().optional(),
});
