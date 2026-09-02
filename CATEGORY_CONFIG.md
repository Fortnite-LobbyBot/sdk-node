# Category config reference

Keys accepted inside `overrideCategoryConfig` on [`start()`](./README.md#override-category-settings-at-start).

```ts
overrideCategoryConfig?: {
  all?: Partial<ICategoryConfig>;
  categories?: Record<string, Partial<ICategoryConfig>>;
  bots?: Record<string, Partial<ICategoryConfig>>;
}
```

Only set the keys you want to override. Unspecified keys keep the config pulled from FNLB (then defaults fill gaps).

**Merge order (later wins):** pulled config → `all` → `categories[categoryId]` → `bots[botId]`

Types and enums: `@fnlb-project/shared/types` (`ICategoryConfig`, `CategoryConfigPartyPrivacy`, `CategoryConfigStatusType`, etc.).

## General

| Key | Type | Description |
| --- | --- | --- |
| `searchLangs` | `APILocales[]` | Languages used when searching cosmetics |
| `platform` | `('WIN' \| 'MAC' \| 'PSN' \| 'XBL' \| 'SWT' \| 'SWT2' \| 'IOS' \| 'AND' \| 'PS5' \| 'XSX')[]` | Platform icon(s) |
| `privacy` | `CategoryConfigPartyPrivacy` (`0` Public, `1` Private) | Default party privacy |
| `prefixes` | `string[]` | Command prefixes |
| `statusType` | `CategoryConfigStatusType` (`0` Auto, `1` Online, `2` Away) | Online presence mode |
| `statusText` | `string[]` | Rotating status messages |
| `statusInterval` | `number` | Status rotation interval (seconds) |
| `level` | `number[]` | Cosmetic account level options |
| `bpLevel` | `number[]` | Cosmetic battle pass level options |

## User management

User entries are `{ id?: string; name?: string }`.

| Key | Type | Description |
| --- | --- | --- |
| `extraOwners` | `ICategoryConfigUser[]` | Extra users with full command access |
| `admins` | `ICategoryConfigUser[]` | Admin users |
| `whitelistUsers` | `ICategoryConfigUser[]` | Whitelisted users |
| `blacklistUsers` | `ICategoryConfigUser[]` | Blacklisted / banned users |
| `excludedAutoAddFriends` | `ICategoryConfigUser[]` | Skip auto-adding these users as friends |
| `otherBots` | `ICategoryConfigUser[]` | Foreign bots to ignore |

## Limits and behavior

| Key | Type | Description |
| --- | --- | --- |
| `inviteTimeout` | `number` | Re-invite cooldown (seconds) |
| `maxBotsPerLobby` | `number` | Max bots per party |
| `maxBotsPerLobbyWithOwner` | `number` | Max bots when an owner is present |
| `maxBotsPerLobbyWithAdmin` | `number` | Max bots when an admin is present |
| `maxBotsPerLobbyWithWhitelistUser` | `number` | Max bots when a whitelisted user is present |
| `allowMatchmaking` | `boolean` | Allow matchmaking |
| `leaveAfterMatchmaking` | `boolean` | Leave the party after matchmaking starts |
| `disableMatchmakingChecks` | `boolean` | Disable matchmaking cooldown checks |
| `disablePlaylistChecks` | `boolean` | Allow non-standard playlists |
| `disableJoinMessages` | `boolean` | Disable join messages |
| `disableAutomaticMessages` | `boolean` | Disable automatic messages |
| `acceptFriendRequests` | `boolean` | Auto-accept friend requests |
| `sendFriendRequestOnJoinParty` | `boolean` | Friend party members when the bot joins |
| `sendFriendRequestOnMemberJoinParty` | `boolean` | Friend members when they join |
| `runCommandsWithoutPrefix` | `boolean` | Allow commands without a prefix |
| `setCosmeticsWithoutCommands` | `boolean` | Set cosmetics by typing the name in party chat |
| `setCosmeticsWithPrefix` | `boolean` | Set cosmetics with a prefix (e.g. `!floss`) |
| `acceptInvites` | `boolean` | Auto-accept party invites / join requests |
| `startBannedBots` | `boolean` | Start bots even if matchmaking-banned |

## Triggers

| Key | Type | Description |
| --- | --- | --- |
| `triggers` | `ICategoryConfigTrigger[]` | Event, custom-command, or scheduled trigger trees |

Each trigger has a name, optional flags, and an `actions` tree. Actions can run commands, call functions, or use control-flow statements. Trigger types:

- **Event** — fires on a `CategoryConfigTriggerEventType` (e.g. party member joined)
- **Custom command** — fires when a custom command string is used
- **Scheduled** — fires on a cron-style `interval`

## Command restrictions

Values are command name arrays.

| Key | Type | Description |
| --- | --- | --- |
| `onlyOwnerCommands` | `string[]` | Owner-only commands |
| `onlyAdminCommands` | `string[]` | Admin/owner-only commands |
| `onlyWhitelistUsersCommands` | `string[]` | Whitelist/admin/owner-only commands |
| `onlyFriendsCommands` | `string[]` | Friends-only commands |
| `onlyPartyMembersCommands` | `string[]` | Party-member-only commands |
| `onlyWhisperCommands` | `string[]` | Whisper/DM-only commands |

## Cosmetics

Outfit, backpack, pickaxe, shoes, and sidekick slots use `{ id?: string; variants?: number[] }[]`. Banner and banner color slots use `{ id?: string }[]`. Emote slots (`joinEmote`, `memberJoinEmote`) accept emotes, emojis, or jam tracks. Backpack slots accept backpacks or pet carriers.

| Key | When it applies |
| --- | --- |
| `startOutfit`, `startBackpack`, `startPickaxe`, `startShoes`, `startSidekick`, `startBanner`, `startBannerColor` | Bot start |
| `joinOutfit`, `joinBackpack`, `joinPickaxe`, `joinEmote`, `joinShoes`, `joinSidekick`, `joinBanner`, `joinBannerColor` | Bot joins a party |
| `memberJoinOutfit`, `memberJoinBackpack`, `memberJoinPickaxe`, `memberJoinEmote`, `memberJoinShoes`, `memberJoinSidekick`, `memberJoinBanner`, `memberJoinBannerColor` | Another member joins the party |
