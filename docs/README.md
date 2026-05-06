# Documentation

[Back to project README](../README.md)

This directory contains the detailed guides for running, configuring, and operating the Discord Vector RAG Bot. The root [README](../README.md) is the quick-start; these pages hold the full reference.

## Start Here

- [Setup Guide](setup.md) covers first install, credentials, slash command deploys, mention setup, and run modes.
- [Configuration Guide](configuration.md) explains `.env`, `config.yaml`, command access, reloads, embeddings, Qdrant, and retrieval settings.
- [Knowledge Files](knowledge-files.md) explains supported files, folder layout, uploads, viewing files, indexing, and image text extraction.
- [Operations Guide](operations.md) covers mention-based questions, slash commands, Docker Compose, local runs, refreshes, reloads, and maintenance tasks.
- [Provider Guide](providers.md) explains built-in OpenAI-compatible providers, fallback order, credentials, and custom providers.
- [Architecture](architecture.md) explains the command layer, RAG pipeline, retrieval strategy, vector store, and data flow.
- [Troubleshooting](troubleshooting.md) lists common setup and runtime failures with fixes.

## Backlinks

Every docs page links back here and to the root [README](../README.md). Topic pages also link to related pages so the documentation stays navigable in both directions.

## Project Map

```text
README.md                  Quick overview and basic usage
docs/                      Detailed documentation
config.yaml                Non-secret runtime configuration
.env                       Local secrets and Discord IDs, not committed
data/                      Knowledge files scanned by the bot
.cache/image-text/         Cached text extracted from image files
src/commands/              Discord slash commands
src/rag/                   Knowledge loading, retrieval, vector store, and LLM flow
src/events/                Discord event handlers
src/utils/                 Command/event loader and slash command deploy script
docker-compose.yml         Bot, Qdrant, and Ollama stack
Dockerfile                 Bot container image
```
