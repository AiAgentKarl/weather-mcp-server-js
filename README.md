# @aiagentkarl/weather-mcp-server

MCP Server for global weather data, forecasts and air quality — powered by [Open-Meteo](https://open-meteo.com/).

**Free, no API key needed.**

## Tools

| Tool | Description |
|------|-------------|
| `geocode` | City name to coordinates (up to 5 results) |
| `get_current_weather` | Current temperature, wind, humidity, pressure |
| `get_forecast` | Daily forecast up to 16 days |
| `get_air_quality` | European AQI, PM2.5, PM10, NO2, Ozone |

## Quick Start

### With Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "weather": {
      "command": "npx",
      "args": ["-y", "@aiagentkarl/weather-mcp-server"]
    }
  }
}
```

### With npm (global)

```bash
npm install -g @aiagentkarl/weather-mcp-server
weather-mcp-server
```

## Example Usage

```
> get_current_weather({ location: "Berlin" })
> get_forecast({ location: "Tokyo", days: 5 })
> get_air_quality({ location: "Los Angeles" })
> geocode({ name: "München" })
```

Locations can be city names or coordinates (e.g. `"48.14,11.58"`).

## API

Uses the free [Open-Meteo API](https://open-meteo.com/) — no registration, no API key, no rate limits for reasonable usage.


---

## More MCP Servers by AiAgentKarl

| Category | Servers |
|----------|---------|
| 🔗 Blockchain | [Solana](https://github.com/AiAgentKarl/solana-mcp-server) |
| 🌍 Data | [Weather](https://github.com/AiAgentKarl/weather-mcp-server) · [Germany](https://github.com/AiAgentKarl/germany-mcp-server) · [Agriculture](https://github.com/AiAgentKarl/agriculture-mcp-server) · [Space](https://github.com/AiAgentKarl/space-mcp-server) · [Aviation](https://github.com/AiAgentKarl/aviation-mcp-server) · [EU Companies](https://github.com/AiAgentKarl/eu-company-mcp-server) |
| 🔒 Security | [Cybersecurity](https://github.com/AiAgentKarl/cybersecurity-mcp-server) · [Policy Gateway](https://github.com/AiAgentKarl/agent-policy-gateway-mcp) · [Audit Trail](https://github.com/AiAgentKarl/agent-audit-trail-mcp) |
| 🤖 Agent Infra | [Memory](https://github.com/AiAgentKarl/agent-memory-mcp-server) · [Directory](https://github.com/AiAgentKarl/agent-directory-mcp-server) · [Hub](https://github.com/AiAgentKarl/mcp-appstore-server) · [Reputation](https://github.com/AiAgentKarl/agent-reputation-mcp-server) |
| 🔬 Research | [Academic](https://github.com/AiAgentKarl/crossref-academic-mcp-server) · [LLM Benchmark](https://github.com/AiAgentKarl/llm-benchmark-mcp-server) · [Legal](https://github.com/AiAgentKarl/legal-court-mcp-server) |

[→ Full catalog (40+ servers)](https://github.com/AiAgentKarl)

## License

MIT
