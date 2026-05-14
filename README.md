# DSSI Discord Knowledge Bot

This repository is a clone of [`tantaihaha4487/discord-vector-rag`](https://github.com/tantaihaha4487/discord-vector-rag), adapted to run as the DSSI Discord bot knowledge service.

The bot answers questions from local knowledge files when mentioned in Discord. It supports text, PDF, and image files, stores embeddings in Qdrant, uses Ollama for local embeddings by default, and can fall back to any OpenAI-compatible chat provider.

## What It Does

- Answers questions from the `data/` knowledge folder
- Supports `.txt`, `.pdf`, `.png`, `.jpg`, `.jpeg`, `.webp`, `.heic`, and `.heif`
- Uses Qdrant for vector search and Ollama for embeddings
- Supports slash commands for upload, refresh, reload, view, and ping
- Works well for DSSI server knowledge, docs, handbooks, and reference files

## DSSI Deployment

1. Install dependencies.

```bash
npm install
cp .env.example .env
```

2. Fill in the Discord and AI settings in `.env`.

```env
BOT_TOKEN=
DISCORD_CLIENT_ID=
DISCORD_GUILD_ID=
DISCORD_ADMIN_USER_IDS=
DISCORD_MODERATOR_ROLE_IDS=
AI_PROVIDER_OPENROUTER_API_KEY=
```

3. Put DSSI knowledge files in `data/`.

```text
data/
  handbook.pdf
  policies/
    rules.txt
  images/
    notice.png
```

4. Deploy Discord commands when needed.

```bash
npm run deploy
```

5. Start the service.

```bash
docker compose up -d --build
```

If you do not use Docker, run Qdrant and Ollama separately, then start the bot with `npm start`.

## Notes

- Keep secrets and Discord IDs in `.env`
- Keep knowledge files in `data/`
- Re-run `npm run deploy` only when slash commands change
- Enable Message Content Intent in the Discord Developer Portal

## Docs

Detailed guides are in [`docs/`](docs/README.md).
