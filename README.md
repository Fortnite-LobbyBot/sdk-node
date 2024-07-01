# Fortnite LobbyBot

Self-Host your own Fortnite LobbyBot with FNLB's system.

## Installation

```sh
npm i fnlb@latest
```

## Start a bot

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    token: 'abc'
});
```

## Start multiple bots

To do it you can configure the botsPerShard setting. This example will spawn 10 bots on the same subprocess.

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    token: 'abc',
    botsPerShard: 10
});
```

## Start multiple shards

To do it you can configure the numberOfShards setting. This example will spawn 2 shards (subprocesses) with 10 bots per shard for a total of 20 bots.

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    token: 'abc',
    numberOfShards: 2,
    botsPerShard: 10
});
```

## Start bots only from certain categories

To do it you can configure the categories setting.

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    token: 'abc',
    categories: ['abc', 'abc']
    numberOfShards: 2,
    botsPerShard: 10
});
```


## Stop your bot

The fnlb.start method returns a Subprocess array

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

const subprocesses = await fnlb.start({
    token: 'abc',
    numberOfShards: 2,
    botsPerShard: 10
});

subprocesses.forEach((ps) => ps.kill())
```
