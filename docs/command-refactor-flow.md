# Command Refactor — Diagram & Flow

## Before / After

```mermaid
flowchart LR
    subgraph Before["Before"]
        direction TB
        B1["/refresh ⚡<br/>refresh vector DB"]
        B2["/reload ⚡<br/>reload config.yaml only"]
    end

    subgraph After["After"]
        direction TB
        A1["/reload config ⚡<br/>reload config.yaml"]
        A2["/reload database ⚡<br/>refresh vector DB"]
        A3["/restart ⚡<br/>soft restart connection"]
    end

    B1 -.->|"merged into"| A2
    B2 -.->|"becomes"| A1
    A3 -.->|"NEW"| A3

    style B1 fill:#ff6b6b,color:#fff
    style B2 fill:#ff6b6b,color:#fff
    style A1 fill:#51cf66,color:#fff
    style A2 fill:#51cf66,color:#fff
    style A3 fill:#339af0,color:#fff
```

## Command Architecture

```mermaid
flowchart TB
    subgraph Discord["Discord Slash Commands"]
        direction LR
        C1["/reload config"]
        C2["/reload database"]
        C3["/restart"]
    end

    subgraph Auth["Admin Auth"]
        AUTH["canUseAdminCommand()<br/>adminUserId + moderatorRoleIds"]
    end

    C1 --> AUTH
    C2 --> AUTH
    C3 --> AUTH

    subgraph Actions["Actions"]
        AC1["reloadConfig()<br/>read config.yaml<br/>validate & swap"]
        AC2["refreshKnowledgeVectorStore()<br/>load data/ → embed → upsert Qdrant"]
        AC3["client.destroy()<br/>↓<br/>client.login(token)<br/>clean reconnect"]
    end

    AUTH -->|"granted"| AC1
    AUTH -->|"granted"| AC2
    AUTH -->|"granted"| AC3

    style AUTH fill:#ffd43b,color:#333
    style AC1 fill:#74c0fc,color:#fff
    style AC2 fill:#74c0fc,color:#fff
    style AC3 fill:#da77f2,color:#fff
```

## /restart — Soft Restart Flow

```mermaid
sequenceDiagram
    actor Admin
    participant DC as Discord API
    participant Bot as Bot Process (discord.js)

    Admin->>Bot: /restart
    Bot->>Bot: deferReply (ephemeral)
    Bot->>Admin: "Restarting..." embed

    Bot->>DC: client.destroy()
    Note over Bot,DC: WebSocket closed<br/>caches cleared<br/>process stays alive

    Bot->>DC: client.login(BOT_TOKEN)
    Note over Bot,DC: New WebSocket<br/>IDENTIFY + RESUME or full reconnect

    DC-->>Bot: READY event
    Bot->>Bot: ClientReady fires<br/>RAG warmup starts
    Bot->>Admin: (bot back online)

    Note over Bot,DC: No process killed<br/>No PM2/Docker restart needed
```

## File Changes

| File | Action |
|------|--------|
| `src/commands/refresh.js` | ❌ Deleted |
| `src/commands/reload.js` | ✏️ Rewritten — subcommands |
| `src/commands/restart.js` | ✅ New file |
