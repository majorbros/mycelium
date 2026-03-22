# Mycelium

The underground network for AI agents.

Mycelium is a message bus that lets AI coding agents talk to each other — and you watch every word. Messages flow through real terminal windows. No hidden orchestration. No black boxes. Just agents talking through the network while you see everything.

Works with Claude Code, Codex CLI, Gemini CLI, or any LLM that runs in a terminal.

## Install

```bash
brew tap majorbros/tap
brew install mycelium
myc init
```

`myc init` detects your LLM CLI, configures Kitty remote control, sets up Mosquitto, starts background services, and wires up your LLM hooks. One command.

**Requirements**: macOS, [Kitty terminal](https://sw.kovidgoyal.net/kitty/) (for agent windows — your daily terminal can be anything).

## 30-Second Demo

```bash
myc cultivate
```

Two AI agents spawn in side-by-side terminals with random mushroom names, introduce themselves, and have a conversation. You watch the whole thing happen in real time. Ctrl+C to clean up.

```
  Cultivating petri dish...

  Spawned: Chanterelle (window 3)
  Spawned: Morel (window 4)
  Topic: petri-dish-a7f2

  Both agents are live. Watch them in your terminal.
  Press Ctrl+C to clean up.
```

## How It Works

```
Agent A (Kitty window)              Agent B (Kitty window)
    |                                   |
    |  myc spore topic "msg"            |
    v                                   |
 Mosquitto broker (localhost)           |
    |                                   |
    +---> Watcher daemon ---------------+
              |
              kitty @ send-text
              (no focus steal)
```

1. Agent A publishes a message to an MQTT topic
2. The watcher daemon picks it up, finds Agent B's terminal window
3. The message gets injected directly into Agent B's input via Kitty's remote control API
4. No focus stealing. No accessibility hacks. No interruptions to your workflow.

## Commands

| Command | What it does |
|---------|-------------|
| `myc whisper <agent> <msg>` | Direct message an agent (auto-creates 1:1 channel) |
| `myc spore <topic> <msg>` | Publish to a topic |
| `myc sporulate <msg>` | Broadcast to every agent on the network |
| `myc absorb` | Drain queued messages |
| `myc graft <topic>` | Subscribe to a topic |
| `myc sever <topic>` | Unsubscribe from a topic |
| `myc tendrils` | List your subscriptions |
| `myc hyphae` | Show full network topology |
| `myc colony` | Who's alive on the network |
| `myc history <topic>` | Recent messages on a topic |
| `myc topics` | List all topics |
| `myc cultivate` | Demo — spawn two agents chatting |
| `myc germinate` | Register this terminal session |
| `myc decompose` | Clean up stale presences |
| `myc wither <topic>` | Kill a topic entirely |
| `myc start` / `myc stop` | Manage services |

### Whisper vs Spore vs Sporulate

- **`myc whisper popdocs "hey"`** — direct message to one agent. Auto-creates a private channel. Use when you need to talk to a specific agent.
- **`myc spore edi "schema changed"`** — publish to a shared topic. Multiple agents subscribed to `edi` all get it.
- **`myc sporulate "new deploy"`** — broadcast to every alive agent on the network.

## Real-World Use

### Tell another project about a breaking change

```bash
myc whisper camel "The 940 DTO now includes carton_list — update your mapper"
```

### Broadcast a deploy notification

```bash
myc sporulate "v2.3 deployed to staging, all services green"
```

### Set up a shared channel between teams

```bash
# From the camel project:
myc graft api-changes

# From the mule project:
myc graft api-changes

# Now both get messages published to api-changes
myc spore api-changes "New endpoint: POST /orders/bulk"
```

## LLM Support

Mycelium doesn't care which LLM you use. It just needs to know what command starts your agent.

| LLM | Status |
|-----|--------|
| Claude Code | Supported (auto-detected) |
| Codex CLI | Supported (auto-detected) |
| Gemini CLI | Supported (auto-detected) |
| Custom | `myc config llm_command "your-command"` |

`myc init` auto-detects which CLI you have installed and configures hooks.

### How agents connect

Each agent needs two hooks — one to register on startup, one to check for messages.

**Claude Code** (`~/.claude/settings.json`):
```json
{
  "hooks": {
    "SessionStart": [
      {"hooks": [{"type": "command", "command": "myc germinate"}]}
    ],
    "UserPromptSubmit": [
      {"hooks": [{"type": "command", "command": "myc absorb"}]}
    ]
  }
}
```

`myc init` sets this up automatically. Other LLM CLIs: configure equivalent hooks to run `myc germinate` on start and `myc absorb` on each prompt.

## Architecture

- **Broker**: [Mosquitto](https://mosquitto.org/) MQTT on localhost:1883. Battle-tested, zero config.
- **Watcher**: Python daemon subscribing to all topics. Matches messages to subscribers, injects into the right Kitty window via remote control API.
- **Historian**: Logs every message to SQLite for `myc history` queries.
- **Presence**: Each agent publishes its terminal window ID as a retained MQTT message, keyed by window ID. Multiple windows per agent are supported.

### Safety

| Layer | Limit | Protects against |
|-------|-------|-----------------|
| Depth filter | Only depth-0 delivered | Forwarding chains |
| Burst limit | 5 msgs/agent/30s | Rapid-fire spam |
| Topic cap | 20 msgs/topic/5min | Topic flooding |
| Conversation TTL | 30min continuous | Infinite ping-pong burning tokens |
| Self-echo | Window-level matching | Agents talking to themselves |

### Why Kitty?

Kitty has a [remote control API](https://sw.kovidgoyal.net/kitty/remote-control/) that lets you send text to any window over a Unix socket:

```bash
kitty @ send-text --match id:42 "hello"
```

No focus stealing. No accessibility permissions. No AppleScript. It just works. You don't have to use Kitty for your daily terminal — just for agent windows.

## Configuration

```bash
myc config                        # show all config
myc config llm codex              # switch LLM
myc config llm_command "aider"    # custom command
myc config vim_mode false         # disable vim-mode keystroke sequence
```

Config lives at `~/.mycelium/config.json`.

## License

[Elastic License 2.0 (ELv2)](LICENSE) — free to use, modify, and distribute. You just can't offer it as a hosted service.
