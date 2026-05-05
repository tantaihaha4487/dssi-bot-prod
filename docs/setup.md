# Setup Guide

[Back to docs index](README.md) | [Back to project README](../README.md)

Use this guide to get the bot running from a clean clone.

## Requirements

- Node.js compatible with the dependencies in `package.json`.
- npm for dependency install and scripts.
- A Discord application and bot token.
- One chat provider API key, usually OpenRouter for the default config.
- Docker Compose if you want the recommended all-in-one local stack.

Related pages: [Configuration Guide](configuration.md), [Provider Guide](providers.md), [Operations Guide](operations.md).

## Install Dependencies

```bash
npm install
```

## Create `.env`

```bash
cp .env.example .env
```

Minimum useful values:

```env
BOT_TOKEN=
AI_PROVIDER_OPENROUTER_API_KEY=
```

Keep secrets in `.env`. Do not put API keys in `config.yaml` or knowledge files.

For all built-in provider credential names, see `.env.advanced.example` and [Provider Guide](providers.md).

## Configure Discord IDs

Edit `config.yaml`:

```yaml
discord:
  clientId: "YOUR_CLIENT_ID"
  guildId: "YOUR_GUILD_ID"
  adminUserIds: []
  moderatorRoleIds: []

commands:
  view:
    allowEveryone: true
```

Keep Discord IDs quoted. Discord snowflake IDs are larger than JavaScript's safe integer range.

Mention-based questions and `/ping` are public. `/view` is also public while `commands.view.allowEveryone` is `true`. Set it to `false` if file viewing should require `discord.adminUserIds` or `discord.moderatorRoleIds`.

`/upload`, `/refresh`, and `/reload` always require `discord.adminUserIds` or `discord.moderatorRoleIds`. If both lists are empty, those admin commands are denied for everyone.

Enable Message Content Intent for the bot in the Discord Developer Portal so mentions like `@bot what's DSSI` include the question text.

For restricted channels, make sure the bot role is high enough and has `View Channel`, `Send Messages`, and `Read Message History`. `Read Message History` is required for Discord reply messages.

## Add Knowledge Files

Create `data/` if needed and add supported files:

```text
data/
  admissions.txt
  handbooks/
    handbook.pdf
  posters/
    event.jpg
```

Supported types are `.txt`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.heic`, and `.heif`.

More detail: [Knowledge Files](knowledge-files.md).

## Deploy Slash Commands

```bash
npm run deploy
```

Deploy after changing command definitions or after first setup. You do not need to redeploy when changing `data/`, `.env`, or runtime config values such as command access, provider order, models, or retrieval settings.

If `discord.clientId` or `discord.guildId` is empty, deploy skips command registration and prints a warning.

## Run With Docker Compose

Recommended local mode:

```bash
docker compose up -d --build
```

This starts the bot, Qdrant, Ollama, and an `ollama-model` helper that pulls the default embedding model.

Useful logs:

```bash
docker compose logs -f bot
docker compose logs -f ollama-model
```

Stop the stack:

```bash
docker compose down
```

Docker Compose mounts `./data`, `./.cache`, and `./config.yaml` into the bot container.

## Run Without Docker Compose

Use this when Docker Compose is not available or when you want to run the bot directly.

1. Install Ollama and pull the default embedding model:

```bash
ollama pull nomic-embed-text
```

2. Start Qdrant:

```bash
docker run -d \
  --name discord-vector-qdrant \
  -p 6333:6333 \
  -p 6334:6334 \
  -v discord_vector_qdrant_storage:/qdrant/storage \
  qdrant/qdrant:latest
```

3. Start the bot:

```bash
npm start
```

## Next Steps

- Tune settings in [Configuration Guide](configuration.md).
- Learn command usage in [Operations Guide](operations.md).
- Fix common startup issues in [Troubleshooting](troubleshooting.md).
