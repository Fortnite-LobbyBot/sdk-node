# 🚀 FNLB – Self-Host Your Own Fortnite Bot

Easily run your own bot using **[FNLB](https://fnlb.net)**, a powerful and scalable system for managing Fortnite bots.  
Whether you're running one bot or hundreds, FNLB gives you full control.  

## 📦 Installation

Install the latest version via **npm install**:

```bash
npm install fnlb@latest
```

Using **[bun](https://bun.sh)**? Install the latest version via **bun install**:

```bash
bun install fnlb@latest
```

## ⛓️‍💥 Useful Links

- 📖 **[FNLB Documentation](https://docs.fnlb.net/introduction)**
- 📄 **[FNLB Changelog](https://docs.fnlb.net/bots/changelog)**
- 🗨️ **[FNLB Discord Server](https://fnlb.net/discord)**

## 🤖 Starting a Single Bot

Get started with a single bot using your [FNLB API token](https://app.fnlb.net/account):

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    apiToken: 'your-api-token', // 🔑 Replace with your actual token from https://app.fnlb.net/account
    categories: ['your-category-id'] // Get the category of your bot on https://app.fnlb.net/bots -> Click on your bot -> About this bot -> Category ID
});
```

## 🔁 Running Multiple Bots (Same Shard)

Run multiple bots in a **single subprocess** using the `botsPerShard` option:

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    apiToken: 'your-api-token',
    categories: ['your-category-id'],
    botsPerShard: 10 // 🧱 Spawns max 10 bots
});
```

## 🧩 Using Multiple Shards (Subprocesses)

Scale even more by spawning multiple **shards** (subprocesses) with multiple bots each:

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    apiToken: 'your-api-token',
    categories: ['your-category-id'],
    numberOfShards: 2,     // 2 shards 🧩
    botsPerShard: 10       // max 10 bots per shard 🤖
});
```

> 💡 Total bots: `numberOfShards × botsPerShard`  
> In this example: 2 × 10 = **20 bots max**

## 🗂️ Launching Bots Across Multiple Categories

Want to run bots from different FNLB categories? Just add them to the `categories` array:

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    apiToken: 'your-api-token',
    categories: ['category-id-1', 'category-id-2'], // 🔄 Multi-category support
    numberOfShards: 2,
    botsPerShard: 10
});
```

## ⛔ Stopping All Bots

Shut everything down cleanly using the `stop()` method:

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

await fnlb.start({
    apiToken: 'your-api-token',
    numberOfShards: 2,
    botsPerShard: 10
});

await fnlb.stop(); // 🛑 Stops all shards and bots
```

## 🏷️ Naming Your Cluster

Customize your cluster with a unique name using the `clusterName` option:

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB({ clusterName: 'MyAwesomeCluster' });

await fnlb.start({
    apiToken: 'your-api-token'
});
```

## 🔄 Auto-Restart Every Hour (Optional)

Want to keep things fresh? Here's how to restart your bots automatically every hour:

```ts
import FNLB from 'fnlb';

const fnlb = new FNLB();

async function startFNLB() {
    await fnlb.start({
        apiToken: 'your-api-token',
        numberOfShards: 1,
        botsPerShard: 5,
        categories: ['your-category-id']
    });
}

async function restartFNLB() {
    console.log('🔁 Restarting FNLB...');
    await fnlb.stop();
    await startFNLB();
}

await startFNLB();

// ⏱️ Restart every hour (3600000 ms)
setInterval(restartFNLB, 3_600_000);
```

## 🗨️ Join the Community

Need help, support, or just want to chat with other developers?  
Come hang out with us on Discord! 👇

[![Join FNLB on Discord](https://discord.com/api/guilds/1106879710744543303/widget.png?style=banner3)](https://fnlb.net/discord)