# FNLB – Self-Host Your Own Fortnite Bot

Self-host and scale Fortnite lobby bots for Bot Lobbies with the official [FNLB](https://fnlb.net) Node.js / Bun SDK.

> [!IMPORTANT]
> The full documentation is at [developers.fnlb.net](https://developers.fnlb.net/docs/sdk/overview).
>
> - [SDK Introduction](https://developers.fnlb.net/docs/self-hosting/sdk-node): install, authentication, shards, and shutdown
> - [SDK guides](https://developers.fnlb.net/docs/sdk/overview): events, parties, cosmetics, chat, and `fnlb.api`
> - [SDK reference](https://developers.fnlb.net/sdk): every class and method
> - [Category config](https://developers.fnlb.net/docs/sdk/category-config): every `overrideCategoryConfig` key

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
| OAuth2 access token | `FNLBOA2AT_…` | Needs `bots.run`, `categories.read`, and `bots.read` (see [OAuth2 docs](https://developers.fnlb.net/docs/getting-started/oauth2)) |

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

See the [category config reference](https://developers.fnlb.net/docs/sdk/category-config) for every supported key and type. How overrides are applied is in the [Node.js SDK guide](https://developers.fnlb.net/docs/self-hosting/sdk-node#override-category-settings-at-start).

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

Prefer a ready-made env-based launcher? Use the [Self-Hosted](https://github.com/Fortnite-LobbyBot/Self-Hosted) template, or the [self-hosting guide](https://developers.fnlb.net/docs/self-hosting/overview).

## Listen for events

`FNLB` is an event emitter. Shard processes push live bot events over local IPC, and the client emits them in the parent process. Event names, party actions, and cosmetics are covered in the [SDK guides](https://developers.fnlb.net/docs/sdk/overview).

```ts
import FNLB, { Events } from 'fnlb';

const fnlb = new FNLB({ clusterName: 'dev' });

fnlb.on(Events.Ready, (bot) => {
  console.log(bot.displayName, 'is in party', bot.party.id);
});

fnlb.on(Events.PartyMemberMessage, async (message) => {
  if (message.content === '!ping') await message.reply('pong');
});

await fnlb.start({
  token: 'your-api-token',
  categories: ['your-category-id']
});
```

`fnlb.bots.cache` holds the bots running in this process. `bot.fetch()` refreshes one bot from its shard. `fnlb.bots.fetchAll()` asks every shard.

```ts
const bot = fnlb.bots.cache.get('bot-id') ?? (await fnlb.bots.fetch('bot-id'));

await bot.party.meta.get();
await bot.party.meta.set('Default:CustomMatchKey_s', 'my-key');
await bot.party.meta.get('Default:CustomMatchKey_s');

await bot.runCommand('outfit', ['renegade']);
await bot.party.invite('friend-epic-id');
await bot.party.kick('member-epic-id');
await bot.send('hello party');
```

Party meta `get()` with no key returns the parsed schema. `j` keys are objects, `b` keys are booleans, and `U` keys are numbers. `set()` writes one key and sends that patch. Member meta is `bot.party.me.meta` or `member.meta`.

Other local calls include `bot.friends()`, `bot.pendingFriends()`, `bot.acceptFriend(id)`, `bot.declineFriend(id)`, `bot.whisper(id, content)`, `party.promote`, `party.leave`, and `party.fetchMembers()`. `fnlb.fetchShardInfo()` returns version, gateway state, and bot count for each shard. `fnlb.broadcast(method, params)` sends one bridge call to every shard.

Privacy, playlists, cosmetics, friend add/remove, and presence use the same local bridge. See [Bots and parties](https://developers.fnlb.net/docs/sdk/parties) and [Chat and commands](https://developers.fnlb.net/docs/sdk/chat-and-commands).

These calls need a FNLB build that speaks the SDK bridge. Older downloaded builds throw a clear error. The REST client still works.

## Call the HTTP API

`fnlb.api` uses the same token passed to `start()` and calls `https://api.fnlb.net/v1`. Set `apiBaseUrl` on the constructor to point somewhere else. OAuth tokens still need the scope each route requires. Route details are in the [HTTP client guide](https://developers.fnlb.net/docs/sdk/http-client).

```ts
const accountBots = await fnlb.api.bots.list();
const me = await fnlb.api.user.get({ includeEmail: true });
const categories = await fnlb.api.categories.list();

await fnlb.api.bots.commands.run('bot-id', { command: 'outfit', args: ['renegade'] });
await fnlb.api.bots.chat.send('bot-id', { content: 'hello' });
await fnlb.api.bots.friends.list('bot-id');
await fnlb.api.presets.list();
```

`bot.runCommand` runs on the local shard. `fnlb.api.bots.commands.run` runs through the cloud API, including for bots this process did not start.

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
| `apiBaseUrl` | REST API origin (default `https://api.fnlb.net/v1`) |
| `sdkHelloTimeoutMs` | How long to wait for a shard to announce the local bridge |

### `start()` (`StartConfig`)

| Option | Description |
| --- | --- |
| `token` | Auth credential (one required) |
| `categories` | Category ID include list |
| `bots` | Bot ID include list |
| `numberOfShards` | Number of subprocesses (default `1`) |
| `botsPerShard` | Max bots per shard (default `1`) |
| `overrideCategoryConfig` | Scoped partial category config for this run. Keys are in the [category config reference](https://developers.fnlb.net/docs/sdk/category-config). |
| `channel` | Release channel for this run |
| `logLevel` | `'INFO'` or `'DEBUG'` (`LogLevel` enum exported) |
| `hideUsernames` / `hideEmails` | Redact PII in shard logs |
| `extraEnv` | Extra env vars passed into each shard process |

## Links

- [SDK Documentation](https://developers.fnlb.net/docs/sdk/overview)
- [Node.js SDK](https://developers.fnlb.net/docs/self-hosting/sdk-node)
- [SDK reference](https://developers.fnlb.net/sdk)
- [Category config](https://developers.fnlb.net/docs/sdk/category-config)
- [Developer Documentation](https://developers.fnlb.net/docs)
- [Website](https://fnlb.net)
- [Discord](https://fnlb.net/discord)

[![Join FNLB on Discord](https://discord.com/api/guilds/1106879710744543303/widget.png?style=banner3)](https://fnlb.net/discord)
