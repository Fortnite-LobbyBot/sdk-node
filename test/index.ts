import FNLB from '../src/index';

const fnlb = new FNLB();

await fnlb.start({
	numberOfShards: 1,
	token: '123'
});
