import { z } from "zod";
import type { TopggClient } from "../client.js";
import { MetricsInputSchema, MetricsBatchInputSchema } from "../schemas.js";

export async function postMetrics(
  client: TopggClient,
  input: z.infer<typeof MetricsInputSchema>,
): Promise<string> {
  const body = MetricsInputSchema.parse(input);
  await client.post<undefined>("/projects/@me/metrics", body);
  return "Metrics submitted successfully.";
}

export async function postMetricsBatch(
  client: TopggClient,
  input: z.infer<typeof MetricsBatchInputSchema>,
): Promise<string> {
  const body = MetricsBatchInputSchema.parse(input);
  await client.post<undefined>("/projects/@me/metrics/batch", body);
  return `Batch of ${body.data.length.toString()} metrics entries submitted successfully.`;
}
