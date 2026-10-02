# Agent47Bot 💼

**Agent47Bot** is an automated, silent Discord bot built with Node.js and `discord.js` v14. Designed for precise marketplace maintenance, Agent47Bot monitors configured Discord forum channels for specific target tags (e.g., `SOLD`), automatically locking, archiving, and logging targeted threads as soon as a contract is fulfilled.

---

## Features

- **Automated Thread Closure:** Continuously listens for `ThreadUpdate` events and automatically locks and archives threads when target tags are applied.
- **Bulk Sweep Commands:** Supports both `/closenow` (slash command) and `!closenow` (prefix fallback) to sweep existing unclosed or historic posts across monitored forums.
- **Structured Activity Logging:** Dispatches event updates to a dedicated logging channel featuring clickable `<#THREAD_ID>` links, post names, raw IDs, and matched tag IDs.
- **Docker Ready:** Lightly containerized for quick, reproducible deployment via Docker Compose.

---

## Configuration (`.env`)

Create a `.env` file in the project root based on `.env.example`:

| Environment Variable | Description | Example |
| :--- | :--- | :--- |
| `TOKEN` | Discord Bot token from Developer Portal | `OTA1...` |
| `CLIENT_ID` | Application Client ID | `123456789012345678` |
| `GUILD_ID` | Target Server (Guild) ID for instant slash command registration | `123456789012345678` |
| `FORUM_CHANNEL_IDS` | Comma-separated list of monitored forum channel IDs | `11111111,22222222` |
| `TARGET_TAG_IDS` | Comma-separated list of forum tag IDs that trigger auto-lock | `33333333,44444444` |
| `LOGGING_CHANNEL` | Single channel ID where audit logs should be posted | `555555555555555555` |

---

## Bot Setup & Developer Portal Requirements

1. **Privileged Gateway Intents:** Enable **Message Content Intent** in the Discord Developer Portal under **Bot** settings.
2. **Bot Permissions:** Ensure the bot has the following channel/guild permissions:
   - `View Channels`
   - `Send Messages`
   - `Manage Threads`
   - `Read Message History`
3. **Interactions Endpoint URL:** Leave the **Interactions Endpoint URL** field completely **BLANK** in the Developer Portal General Information page so slash command payloads are routed over the WebSocket Gateway.

---

## Deployment (Docker Compose)

### 1. Clone & Configure
```bash
git clone <repository-url>
cd rh-marketplace-bot
cp .env.example .env
# Fill out your .env variables
```

### 2. Build & Launch
```bash
docker compose up -d --build
```

### 3. View Logs
```bash
docker compose logs -f
```

---

## Commands

| Command | Type | Permission | Description |
| :--- | :--- | :--- | :--- |
| `/closenow` | Slash Command | `Manage Threads` | Sweeps all monitored forums and closes open posts matching target tags. |
| `!closenow` | Prefix Text | `Manage Threads` | Fallback text command for manual sweeps. |

