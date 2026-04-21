# topgg-mcp

A [Model Context Protocol](https://modelcontextprotocol.io) server for the [Top.gg v1 API](https://docs.top.gg/introduction), letting AI assistants manage your Top.gg bot or server listing directly.

## Tools

| Tool                  | Description                                                 |
| --------------------- | ----------------------------------------------------------- |
| `get_project`         | Retrieve the project associated with your token             |
| `update_project`      | Update headline and page content (per locale)               |
| `register_commands`   | Replace registered Discord slash commands                   |
| `get_votes`           | Fetch paginated vote history (cursor-based)                 |
| `check_user_vote`     | Check whether a specific user has voted                     |
| `post_metrics`        | Submit metrics (server count, player count, etc.)           |
| `post_metrics_batch`  | Submit up to 100 metrics entries in one request             |
| `create_announcement` | Post a project announcement (rate-limited to 1 per 4 hours) |

## Requirements

- Node.js 22+
- A Top.gg API token (obtained from your [Top.gg dashboard](https://top.gg/))

## Setup

### Single project

Set `TOPGG_TOKEN` to your API token. The `project` parameter on every tool is optional and can be omitted.

**Claude Desktop** (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "topgg": {
      "command": "npx",
      "args": ["-y", "topgg-mcp"],
      "env": {
        "TOPGG_TOKEN": "your-token-here"
      }
    }
  }
}
```

**Claude Code:**

```bash
claude mcp add topgg -e TOPGG_TOKEN=your-token-here -- npx -y topgg-mcp
```

### Multiple projects

Use `TOPGG_TOKEN_<NAME>` for each project. The suffix becomes the name used in the `project` parameter (lowercased). When multiple tokens are configured, the `project` parameter is required on every tool call.

```json
{
  "mcpServers": {
    "topgg": {
      "command": "npx",
      "args": ["-y", "topgg-mcp"],
      "env": {
        "TOPGG_TOKEN_MYBOT": "token-for-mybot",
        "TOPGG_TOKEN_OTHERBOT": "token-for-otherbot"
      }
    }
  }
}
```

With the above config, pass `"project": "mybot"` or `"project": "otherbot"` in every tool call.

You can also mix `TOPGG_TOKEN` (name: `"default"`) with named tokens if needed.

## API coverage

The server targets the Top.gg v1 REST API (`https://top.gg/api/v1`). All requests are authenticated with `Authorization: Bearer <token>`. API errors are surfaced as readable tool errors using the RFC 7807 problem details format returned by Top.gg.

**Rate limits** (enforced by Top.gg, not this server):

- 100 requests/second globally
- 60 requests/minute for bot endpoints
- Violations result in a 1-hour block

## Development

```bash
pnpm install
pnpm build        # compile to dist/
pnpm typecheck    # TypeScript strict check
pnpm lint         # ESLint
pnpm format       # Prettier
pnpm test         # Vitest (no live API required)
pnpm test:coverage
```

Tests use `fetch` mocks — no `TOPGG_TOKEN` is needed to run them.

## License

ISC
