import FNLB from '../src/index';

const fnlb = new FNLB({
	clusterName: 'MyCluster'
});

await fnlb.start({
	apiToken: process.env.API_TOKEN as string,
	botsPerShard: 1,
	categories: process.env.CATEGORIES?.split(',').map((c) => c.trim())
});
