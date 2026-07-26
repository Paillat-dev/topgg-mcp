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

export const SupportedLocaleSchema = z.enum([
  "en",
  "de",
  "fr",
  "pt",
  "tr",
  "hi",
  "ja",
  "ar",
  "nl",
  "ko",
  "it",
  "es",
  "ru",
  "uk",
  "vi",
  "zh",
]);

function localeMapSchema(valueSchema: z.ZodString) {
  return z
    .partialRecord(SupportedLocaleSchema, valueSchema)
    .refine((value) => Object.keys(value).length > 0, "At least one locale is required.");
}

export const HeadlineLocaleMapSchema = localeMapSchema(z.string().min(3).max(140));
export const PageContentLocaleMapSchema = localeMapSchema(z.string().min(300).max(50_000));

export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  platform: z.enum(["discord", "roblox"]),
  type: z.enum(["bot", "server", "game"]),
  headline: z.string(),
  tags: z.array(z.string()),
  votes: z.number(),
  votes_total: z.number(),
  review_score: z.number(),
  review_count: z.number(),
});

export const UpdateProjectInputSchema = z
  .object({
    headline: HeadlineLocaleMapSchema.optional(),
    pageContent: PageContentLocaleMapSchema.optional(),
  })
  .refine(
    (value) => value.headline !== undefined || value.pageContent !== undefined,
    'At least one of "headline" or "pageContent" is required.',
  );

// ── Commands ──────────────────────────────────────────────────────────────────

export interface ApplicationCommandChoiceInput {
  name: string;
  name_localizations?: Record<string, string> | undefined;
  value: string | number;
}

export interface ApplicationCommandOptionInput {
  type: number;
  name: string;
  description: string;
  name_localizations?: Record<string, string> | undefined;
  description_localizations?: Record<string, string> | undefined;
  required?: boolean | undefined;
  choices?: ApplicationCommandChoiceInput[] | undefined;
  options?: ApplicationCommandOptionInput[] | undefined;
  channel_types?: number[] | undefined;
  min_value?: number | undefined;
  max_value?: number | undefined;
  min_length?: number | undefined;
  max_length?: number | undefined;
  autocomplete?: boolean | undefined;
}

const ApplicationCommandChoiceSchema = z.object({
  name: z.string().min(1).max(100),
  name_localizations: z.record(z.string(), z.string().min(1).max(100)).optional(),
  value: z.union([z.string().max(100), z.number()]),
});

const ApplicationCommandOptionSchemaBase = z.object({
  type: z.number().int().min(1).max(11),
  name: z.string().min(1).max(32),
  description: z.string().min(1).max(100),
  name_localizations: z.record(z.string(), z.string().min(1).max(32)).optional(),
  description_localizations: z.record(z.string(), z.string().min(1).max(100)).optional(),
  required: z.boolean().optional(),
  choices: z.array(ApplicationCommandChoiceSchema).max(25).optional(),
  channel_types: z.array(z.number().int()).optional(),
  min_value: z.number().optional(),
  max_value: z.number().optional(),
  min_length: z.number().int().min(0).max(6000).optional(),
  max_length: z.number().int().min(1).max(6000).optional(),
  autocomplete: z.boolean().optional(),
});

export type ApplicationCommandOptionSchemaType = z.ZodType<ApplicationCommandOptionInput>;

export const ApplicationCommandOptionSchema: ApplicationCommandOptionSchemaType = z.lazy(() =>
  ApplicationCommandOptionSchemaBase.extend({
    options: z.array(ApplicationCommandOptionSchema).max(25).optional(),
  }),
);

export const SlashCommandSchema = z
  .object({
    type: z.number().int().min(1).max(4).optional(),
    name: z.string().min(1).max(32),
    description: z.string().max(100),
    name_localizations: z.record(z.string(), z.string().min(1).max(32)).optional(),
    description_localizations: z.record(z.string(), z.string().max(100)).optional(),
    options: z.array(ApplicationCommandOptionSchema).max(25).optional(),
    default_member_permissions: z.string().nullable().optional(),
    dm_permission: z.boolean().optional(),
    default_permission: z.boolean().optional(),
    nsfw: z.boolean().optional(),
    integration_types: z.array(z.number().int().min(0).max(1)).optional(),
    contexts: z.array(z.number().int().min(0).max(2)).optional(),
    handler: z.number().int().min(1).max(2).optional(),
  })
  .superRefine((command, context) => {
    if ((command.type === undefined || command.type === 1) && command.description.length === 0) {
      context.addIssue({
        code: "custom",
        path: ["description"],
        message: "Chat input commands require a description.",
      });
    }
  });

export const RegisterCommandsInputSchema = z.array(SlashCommandSchema);

// ── Votes ─────────────────────────────────────────────────────────────────────

export const VoteSchema = z.object({
  user_id: z.string(),
  platform_id: z.string(),
  weight: z.number(),
  created_at: z.iso.datetime(),
  expires_at: z.iso.datetime(),
});

export const VoteQueueResponseSchema = z.object({
  cursor: z.string(),
  data: z.array(VoteSchema),
});

export const VoteResponseSchema = z.object({
  created_at: z.iso.datetime(),
  expires_at: z.iso.datetime(),
  weight: z.number(),
});

// ── Metrics ───────────────────────────────────────────────────────────────────

const MetricValueSchema = z.number().int().nonnegative();

export const MetricsInputSchema = z
  .object({
    server_count: MetricValueSchema.optional(),
    shard_count: MetricValueSchema.optional(),
    member_count: MetricValueSchema.optional(),
    online_count: MetricValueSchema.optional(),
    player_count: MetricValueSchema.optional(),
  })
  .superRefine((metrics, context) => {
    const payloadKinds = [
      metrics.server_count !== undefined || metrics.shard_count !== undefined,
      metrics.member_count !== undefined || metrics.online_count !== undefined,
      metrics.player_count !== undefined,
    ].filter(Boolean).length;

    if (payloadKinds !== 1) {
      context.addIssue({
        code: "custom",
        message:
          "Provide metrics for exactly one project type: Discord bot, Discord server, or Roblox game.",
      });
    }

    if (
      metrics.member_count !== undefined &&
      metrics.online_count !== undefined &&
      metrics.online_count > metrics.member_count
    ) {
      context.addIssue({
        code: "custom",
        path: ["online_count"],
        message: "online_count cannot exceed member_count.",
      });
    }
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
  title: z.string().min(3).max(100),
  content: z.string().min(10).max(2000),
  category: z.enum(["announcement", "event", "new_feature"]).optional(),
});

export const AnnouncementResponseSchema = z.object({
  title: z.string(),
  content: z.string(),
  created_at: z.iso.datetime(),
});
