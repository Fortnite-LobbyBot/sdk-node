import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export default class FNLB {
    public async setup() {
        const releaseURL = 'https://dist.fnlb.net/packages/zenith/release';
        const response = await fetch(releaseURL);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = (await response.json()) as { hash: string; url: string; version: string };

        const downloadURL = data.url;

        const downloadResponse = await fetch(downloadURL);

        if (!downloadResponse.ok) {
            throw new Error(`HTTP error! status: ${downloadResponse.status}`);
        }

        const release = await downloadResponse.text();

        const tempFilePath = path.join('zenith.js');

        fs.writeFileSync(tempFilePath, release);

        console.log(`Data saved to ${tempFilePath}`);
    }
}
