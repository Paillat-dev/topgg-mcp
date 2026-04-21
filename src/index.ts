import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createClient } from "./client.js";
import { createServer } from "./server.js";

const clients = new Map<string, ReturnType<typeof createClient>>();

const single = process.env["TOPGG_TOKEN"];
if (single) {
  clients.set("default", createClient(single));
}

for (const [key, value] of Object.entries(process.env)) {
  if (key.startsWith("TOPGG_TOKEN_") && value) {
    const name = key.slice("TOPGG_TOKEN_".length).toLowerCase();
    clients.set(name, createClient(value));
  }
}

if (clients.size === 0) {
  console.error(
    "Error: At least one token is required. Set TOPGG_TOKEN for a single project, " +
      "or TOPGG_TOKEN_<NAME> (e.g. TOPGG_TOKEN_MYBOT) for multiple.",
  );
  process.exit(1);
}

const server = createServer(clients);
const transport = new StdioServerTransport();
await server.connect(transport);
