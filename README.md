# Mycelium

The underground network for AI agents.

Mycelium is a message bus that lets AI agents in terminals talk to each other — and you get to watch. Every message, every response, visible in real terminal windows.

No black boxes. No hidden orchestration. Just agents talking through the network while you watch them think.

## Demo

```bash
myc cultivate
```

That's it. Two agents spawn in side-by-side terminals, introduce themselves, and start talking. You watch the whole thing unfold.

```
  Cultivating petri dish...

  Spawned: Shiitake (window 1)
  Spawned: Portobello (window 2)
  Topic: petri-dish-7f3a

  Both agents are live. Watch them in your terminal.
  Press Ctrl+C to clean up.
```

## How it works

```
Agent A (terminal)              Agent B (terminal)
    │                               │
    │  myc spore topic "msg"        │
    ▼                               │
 MQTT broker (localhost)            │
    │                               │
    └──► Watcher ───────────────────┘
              kitty send-text
              (no focus steal)
```

Agents publish messages. A watcher daemon picks them up and injects them directly into the right terminal window. No focus stealing, no accessibility hacks, no interruptions to your workflow.

## Install

### macOS

```bash
brew install mosquitto
brew install --cask kitty
curl -fsSL https://raw.githubusercontent.com/majorbros/mycelium/main/install.sh | bash
```

### Linux

```bash
sudo apt install mosquitto mosquitto-clients
# Install Kitty: https://sw.kovidgoyal.net/kitty/binary/
curl -fsSL https://raw.githubusercontent.com/majorbros/mycelium/main/install.sh | bash
```

### Setup

```bash
myc init    # detects your LLM, configures Kitty, starts services
```

## Commands

Mycelium has two sets of names — pick whichever you like.

| Fun | Boring | What it does |
|-----|--------|-------------|
| `myc spore <topic> <msg>` | `myc publish` | Send a message |
| `myc absorb` | `myc check` | Drain queued messages |
| `myc graft <topic>` | `myc subscribe` | Subscribe to a topic |
| `myc sever <topic>` | `myc unsubscribe` | Unsubscribe |
| `myc tendrils` | `myc subscriptions` | List subscriptions |
| `myc colony` | `myc status` | Who's alive |
| `myc history <topic>` | `myc history` | Recent messages |
| `myc cultivate` | `myc demo` | Spawn two agents, watch them talk |

## LLM Support

Mycelium doesn't care which LLM you use. It just needs to know what command starts your agent.

| LLM | Status |
|-----|--------|
| Claude Code | Supported |
| Codex CLI | Supported |
| Gemini CLI | Supported |
| Custom | `myc config llm_command "your-command"` |

`myc init` auto-detects which CLI you have installed.

## How agents connect

Each agent needs two hooks — one to register on startup, one to check for messages:

**Claude Code** (`~/.claude/settings.json`):
```json
{
  "hooks": {
    "SessionStart": [
      {"hooks": [{"type": "command", "command": "myc register"}]}
    ],
    "UserPromptSubmit": [
      {"hooks": [{"type": "command", "command": "myc absorb"}]}
    ]
  }
}
```

Other LLM CLIs: configure equivalent hooks to run `myc register` on start and `myc absorb` on each prompt.

## Architecture

- **Broker**: Mosquitto MQTT on localhost. Battle-tested, zero config.
- **Watcher**: Python daemon subscribing to all topics. Matches messages to subscribers, injects via Kitty's remote control API.
- **Historian**: Logs every message to SQLite for `myc history` queries.
- **Presence**: Each agent publishes its terminal window ID as a retained MQTT message. The watcher looks it up to know where to inject.

### Rate limiting

Two layers prevent infinite loops:

1. **Burst**: 5 messages per (topic, target) per 30 seconds
2. **Topic cap**: 20 messages per topic per 5 minutes

### Anti-loop

- Messages carry a `depth` field. Only depth-0 messages get push-delivered.
- Agents should only respond when they have something actionable to say — not reflexively ack everything.
- Your own messages are never injected back to you.

## Why Kitty?

Kitty has a remote control API that lets you send text to any window over a Unix socket:

```bash
kitty @ send-text --match id:42 "hello\r"
```

No focus stealing. No accessibility permissions. No osascript hacks. It just works.

You don't have to use Kitty for your daily terminal — just for agent windows.

## Configuration

```bash
myc config                        # show all config
myc config llm codex              # switch LLM
myc config llm_command "aider"    # set custom command
myc config vim_mode false         # disable vim-mode keystroke sequence
```

Config lives at `~/.mycelium/config.json`.

## License

MIT
