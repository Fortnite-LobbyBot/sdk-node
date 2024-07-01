import FNLB from '../src/index';

const fnlb = new FNLB();

await fnlb.start({
	apiToken: process.env.API_TOKEN as string
});
