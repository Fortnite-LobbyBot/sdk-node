import FNLB from '../src/index';

const fnlb = new FNLB();

await fnlb.start({
	token: process.env.TOKEN ?? '',
	numberOfShards: 1,
	categories: process.env.CATEGORIES?.split(',')
});
