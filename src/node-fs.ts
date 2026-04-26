/*!
 * Copyright (c) 2026-present, Vanilagy and contributors
 *
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

import type * as NodeFs from 'node:fs/promises';

type NodeFsModule = typeof NodeFs;
type NodeRequireLike = (specifier: string) => unknown;
type ProcessWithBuiltinModule = {
	getBuiltinModule?: (specifier: string) => unknown;
};
type GlobalWithRequire = typeof globalThis & {
	process?: ProcessWithBuiltinModule;
	require?: NodeRequireLike;
	module?: {
		require?: NodeRequireLike;
	};
};

let nodeFsPromise: Promise<NodeFsModule> | null = null;

// Avoid a static Node import so browser bundles don't stub out file-path APIs at build time.
const getInlineRequire = new Function(
	'return typeof require === "function" ? require : undefined;',
) as () => NodeRequireLike | undefined;

const dynamicImport = new Function(
	'specifier',
	'return import(specifier);',
) as (specifier: string) => Promise<NodeFsModule>;

const getRequire = () => {
	const globalObject = globalThis as GlobalWithRequire;
	const builtinModule = globalObject.process?.getBuiltinModule?.('node:fs/promises');

	if (builtinModule) {
		return () => builtinModule;
	}

	const inlineRequire = getInlineRequire();

	if (typeof inlineRequire === 'function') {
		return inlineRequire;
	}

	if (typeof globalObject.require === 'function') {
		return globalObject.require;
	}
	if (typeof globalObject.module?.require === 'function') {
		return globalObject.module.require.bind(globalObject.module);
	}

	return null;
};

const loadNodeFs = async () => {
	const require = getRequire();

	if (require) {
		return require('node:fs/promises') as NodeFsModule;
	}

	try {
		return await dynamicImport('node:fs/promises');
	} catch {
		throw new Error('File path APIs require a runtime that supports node:fs/promises.');
	}
};

export const getNodeFs = async () => {
	if (!nodeFsPromise) {
		nodeFsPromise = loadNodeFs().catch((error: unknown) => {
			nodeFsPromise = null;

			if (error instanceof Error) {
				throw error;
			}

			throw new Error('File path APIs require a runtime that supports node:fs/promises.');
		});
	}

	return await nodeFsPromise;
};
