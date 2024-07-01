import FNLB from '../src/index';

const fnlb = new FNLB();

await fnlb.start({
	apiToken: process.env.API_TOKEN ?? '',
	numberOfShards: 1,
	categories: process.env.CATEGORIES?.split(',')
});
