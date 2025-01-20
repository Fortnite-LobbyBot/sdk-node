# Fortnite LobbyBot

Self-Host your own Fortnite LobbyBot with FNLB's system.

## Installation

```sh
npm i fnlb@latest
```

## Start a bot

This will start a single bot. You need to change the API Token to use the one of your FNLB account.  

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    apiToken: 'abc'
});
```

## Start multiple bots

To do it you can configure the botsPerShard setting. This example will spawn 10 bots on the same subprocess.

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    apiToken: 'abc',
    botsPerShard: 10
});
```

## Start multiple shards

To do it you can configure the numberOfShards setting. This example will spawn 2 shards (subprocesses) with 10 bots per shard for a total of 20 bots.

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    apiToken: 'abc',
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
    apiToken: 'abc',
    categories: ['abc', 'abc']
    numberOfShards: 2,
    botsPerShard: 10
});
```

## Stop your bot

The FNLB.stop() method will kill all the shards.

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    apiToken: 'abc',
    numberOfShards: 2,
    botsPerShard: 10
});

// do something

await fnlb.stop()
```

## Set a cluster name

You can use the clusterName option to set your cluster name.

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB({ clusterName: 'MyCluster' });

await fnlb.start({
    apiToken: 'abc'
});
```
