import { expect, test } from 'vitest';
import fs from 'node:fs/promises';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const mediabunny = require(
	fileURLToPath(new URL('../../dist/bundles/mediabunny.cjs', import.meta.url)),
) as typeof import('../../src/index.js');

test('CommonJS bundle supports FilePathSource', async () => {
	const tempDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'mediabunny-cjs-'));
	const filePath = path.join(tempDirectory, 'sample.bin');
	await fs.writeFile(filePath, new Uint8Array([1, 2, 3, 4]));

	const source = new mediabunny.FilePathSource(filePath);

	try {
		expect(await source.getSize()).toBe(4);
	} finally {
		(source as typeof source & { _dispose(): void })._dispose();
		await fs.rm(tempDirectory, { recursive: true, force: true });
	}
});
