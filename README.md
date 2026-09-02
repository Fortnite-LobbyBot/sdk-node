# FNLB – Self-Host Your Own Fortnite Bot

Self-host and scale Fortnite lobby bots for Bot Lobbies with the official [FNLB](https://fnlb.net) Node.js / Bun SDK.

```bash
npm install fnlb@latest
# or
bun install fnlb@latest
```

You need [Node.js 22+](https://nodejs.org/en/download) or [Bun](https://bun.sh/get), and an [API token](https://app.fnlb.net/account) from your FNLB account.

## Start your first bot

Create a client, then call `start()` with your token and the category that owns the bot.

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
  token: 'your-api-token', // https://app.fnlb.net/account
  categories: ['your-category-id'] // bot page → About this bot → Category ID
});
```

When you're done:

```ts
await fnlb.stop();
```

## Authentication

`start()` accepts `token` (API Token or OAuth2 access token):

| Credential | Prefix | Where to get it |
| --- | --- | --- |
| API token | `FNLB_…` | [app.fnlb.net/account](https://app.fnlb.net/account) |
| OAuth2 access token | `FNLBOA2AT_…` | Needs `bots.run`, `categories.read`, and `bots.read` (see [OAuth2 docs](https://developer-docs.fnlb.net/oauth2)) |

```ts
await fnlb.start({
  token: 'FNLBOA2AT_...',
  categories: ['your-category-id']
});
```

## Run more bots on one process

`botsPerShard` is the max number of bots that can run inside a single shard (subprocess):

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
  token: 'your-api-token',
  categories: ['your-category-id'],
  botsPerShard: 10
});
```

## Scale with multiple shards

Each shard is its own subprocess. Multiply shards × bots-per-shard for your capacity ceiling:

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
  token: 'your-api-token',
  categories: ['your-category-id'],
  numberOfShards: 2,
  botsPerShard: 10 // up to 20 bots total
});
```

## Choose which bots to run

### By category

Pass one or more category IDs. Find them on [app.fnlb.net/bots](https://app.fnlb.net/bots) → select a bot → **About this bot** → **Category ID**.

```ts
await fnlb.start({
  token: 'your-api-token',
  categories: ['category-id-1', 'category-id-2'],
  numberOfShards: 2,
  botsPerShard: 10
});
```

### By bot ID

Pass exact bot IDs from the same **About this bot** panel (**FNLB ID**):

```ts
await fnlb.start({
  token: 'your-api-token',
  bots: ['bot-id-1', 'bot-id-2'],
  botsPerShard: 2
});
```

### How selection works

`categories` and `bots` are include lists:

- **Categories only** - bots in those categories, plus unassigned bots
- **Bots only** - only the listed IDs
- **Both** - union of category bots and listed bot IDs
- **Neither** - your full bot pool

Invalid IDs are ignored. Multiple shards can share the same `bots` list; the gateway assigns each ID to one shard.

```ts
await fnlb.start({
  token: 'your-api-token',
  categories: ['category-id-1', 'category-id-2'],
  bots: ['bot-id-1', 'bot-id-2'],
  numberOfShards: 2,
  botsPerShard: 10
});
```

Omit `categories` (or pass `[]`) when you only want specific bot IDs from any category. If `categories` is set, bots without a category are still included.

## Update selection without restart

After `start()`, you can change which categories/bots the running shards may use without calling `stop()`.

Optional second argument: a partial category config applied to those ids (same merge rules as `overrideCategoryConfig`).

```ts
import FNLB from 'fnlb';
import { CategoryConfigPartyPrivacy } from '@fnlb-project/shared/types';

const fnlb = new FNLB();

await fnlb.start({
  apiToken: 'your-api-token',
  categories: ['category-id-1'],
  botsPerShard: 10
});

// Expand the include list
fnlb.addCategories(['category-id-2'], {
  privacy: CategoryConfigPartyPrivacy.Private
});
fnlb.addBots(['bot-id-1'], {
  acceptFriendRequests: false
});

// Replace the include list
fnlb.setCategories(['category-id-2', 'category-id-3']);
fnlb.setBots(['bot-id-1', 'bot-id-2'], {
  statusText: ['Custom status']
});

// Clear (back to unrestricted)
fnlb.setCategories();
fnlb.setBots();

// Shrink it (bots that no longer match are stopped; capacity refills from the new pool)
fnlb.removeCategories(['category-id-1']);
fnlb.removeBots(['bot-id-1']);

// Current include lists (`undefined` = unrestricted for that dimension)
fnlb.getCategories();
fnlb.getBots();
```

Rules:

- `undefined` means unrestricted for that dimension.
- `add*` on an unrestricted dimension starts an include list (narrows from “all”).
- `add*` on an existing list unions and dedupes.
- `set*` replaces the list (`undefined` / omitted = unrestricted).
- `remove*` on unrestricted is a no-op.
- Removing until empty returns that dimension to unrestricted.
- Overrides passed to `add*` / `set*` are stored per id and removed with `remove*` (or when `set*` drops that id).
- Throws if no shards are running.

## Override category settings at start

Change a few category options for this run without editing the dashboard.

`overrideCategoryConfig` is scoped. Merge order (later wins): FNLB config → `all` → matching category → matching bot.

```ts
import FNLB from 'fnlb';
import { CategoryConfigPartyPrivacy } from '@fnlb-project/shared/types';

const fnlb = new FNLB();

await fnlb.start({
  apiToken: 'your-api-token',
  overrideCategoryConfig: {
    // every bot
    all: {
      acceptFriendRequests: false
    },
    // bots in this category
    categories: {
      'category-id-1': {
        privacy: CategoryConfigPartyPrivacy.Private
      }
    },
    // one specific bot
    bots: {
      'bot-id-1': {
        statusText: ['Special bot']
      }
    }
  }
});
```

Overrides stay applied even if the category config is updated live.

See **[CATEGORY_CONFIG.md](./CATEGORY_CONFIG.md)** for every supported key and type.

## Name your cluster

Useful when you run more than one host and want clear logs / gateway labels:

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB({ clusterName: 'MyAwesomeCluster' });

await fnlb.start({
  token: 'your-api-token'
});
```

## Restart on a schedule

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

async function startFNLB() {
  await fnlb.start({
    token: 'your-api-token',
    categories: ['your-category-id'],
    numberOfShards: 1,
    botsPerShard: 5
  });
}

async function restartFNLB() {
  console.log('Restarting FNLB...');
  await fnlb.stop();
  await startFNLB();
}

await startFNLB();
setInterval(restartFNLB, 3_600_000); // every hour
```

Prefer a ready-made env-based launcher? Use the [Self-Hosted](https://github.com/Fortnite-LobbyBot/Self-Hosted) template.

## Options reference

### Constructor (`FNLBConfig`)

| Option | Description |
| --- | --- |
| `clusterName` | Label for this cluster in logs / gateway |
| `fnlbPath` | Directory for the `.fnlb` download cache (default: current working directory) |
| `channel` | Default release channel: `stable` \| `beta` \| `dev` |
| `updateIntervalMs` | How often to check for package updates |
| `maxDownloadRetries` / `maxBackoffMs` | Download retry behavior |
| `onLogMessage` / `onSubProcessLogMessage` | Log callbacks |
| `disableLogs` / `disableErrorLogs` | Mute SDK logs |
| `disableSubProcessLogs` / `disableSubProcessErrorLogs` | Mute shard stdout/stderr mirroring |

### `start()` (`StartConfig`)

| Option | Description |
| --- | --- |
| `token` | Auth credential (one required) |
| `categories` | Category ID include list |
| `bots` | Bot ID include list |
| `numberOfShards` | Number of subprocesses (default `1`) |
| `botsPerShard` | Max bots per shard (default `1`) |
| `overrideCategoryConfig` | Scoped partial category config for this run - see [CATEGORY_CONFIG.md](./CATEGORY_CONFIG.md) |
| `channel` | Release channel for this run |
| `logLevel` | `'INFO'` or `'DEBUG'` (`LogLevel` enum exported) |
| `hideUsernames` / `hideEmails` | Redact PII in shard logs |
| `extraEnv` | Extra env vars passed into each shard process |

## Links

- [Category config reference](./CATEGORY_CONFIG.md)
- [Website](https://fnlb.net)
- [Documentation](https://docs.fnlb.net/introduction)
- [Node.js SDK docs](https://docs.fnlb.net/sdk-node)
- [Changelog](https://docs.fnlb.net/bots/changelog)
- [Discord](https://fnlb.net/discord)

[![Join FNLB on Discord](https://discord.com/api/guilds/1106879710744543303/widget.png?style=banner3)](https://fnlb.net/discord)
