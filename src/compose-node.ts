import type { ItmIncludeProvider, ItmSourceProvider } from "./compose";

export function createLocalFileIncludeProvider(
	options: {
		baseDirectory?: string;
		readText?: (path: string) => Promise<string>;
	} = {}
): ItmIncludeProvider {
	return {
		name: "local-file",
		async load(target, context) {
			if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(target) && !/^file:\/\//u.test(target)) {
				return undefined;
			}

			const [{ dirname, isAbsolute, resolve }, { fileURLToPath }, fs] = await Promise.all([
				import("node:path"),
				import("node:url"),
				import("node:fs/promises")
			]);
			const readText = options.readText ?? ((path: string) => fs.readFile(path, "utf8"));

			let resolvedPath: string | undefined;

			if (target.startsWith("file://")) {
				resolvedPath = fileURLToPath(target);
			} else if (isAbsolute(target)) {
				resolvedPath = target;
			} else if (context.sourceDocument.uri?.startsWith("file://")) {
				resolvedPath = resolve(dirname(fileURLToPath(context.sourceDocument.uri)), target);
			} else if (context.sourceDocument.uri && isAbsolute(context.sourceDocument.uri)) {
				resolvedPath = resolve(dirname(context.sourceDocument.uri), target);
			} else if (options.baseDirectory) {
				resolvedPath = resolve(options.baseDirectory, target);
			}

			if (!resolvedPath) {
				return undefined;
			}

			try {
				return {
					text: await readText(resolvedPath),
					uri: resolvedPath
				};
			} catch {
				return undefined;
			}
		}
	};
}

export function createFileSystemSourceProvider(
	options: {
		rootDir?: string;
		allowedExtensions?: string[];
		readText?: (path: string) => Promise<string>;
	} = {}
): ItmSourceProvider {
	return {
		async read(request) {
			const [{ dirname, extname, isAbsolute, normalize, relative, resolve, sep }, { fileURLToPath }, fs] = await Promise.all([
				import("node:path"),
				import("node:url"),
				import("node:fs/promises")
			]);
			const readText = options.readText ?? ((path: string) => fs.readFile(path, "utf8"));
			const target = request.target;

			if (/^[A-Za-z][A-Za-z0-9+.-]*:\/\//u.test(target) && !/^file:\/\//u.test(target)) {
				return undefined;
			}

			let resolvedPath: string | undefined;

			if (target.startsWith("file://")) {
				resolvedPath = fileURLToPath(target);
			} else if (isAbsolute(target)) {
				resolvedPath = target;
			} else if (request.fromUri?.startsWith("file://")) {
				resolvedPath = resolve(dirname(fileURLToPath(request.fromUri)), target);
			} else if (request.fromUri && isAbsolute(request.fromUri)) {
				resolvedPath = resolve(dirname(request.fromUri), target);
			} else if (options.rootDir) {
				resolvedPath = resolve(options.rootDir, target);
			}

			if (!resolvedPath) {
				return undefined;
			}

			const normalizedPath = normalize(resolvedPath);

			if (options.rootDir) {
				const normalizedRoot = normalize(resolve(options.rootDir));
				const relativePath = relative(normalizedRoot, normalizedPath);
				if (relativePath === ".." || relativePath.startsWith(`..${sep}`) || relativePath.includes(`${sep}..${sep}`)) {
					return undefined;
				}
			}

			if (options.allowedExtensions && options.allowedExtensions.length > 0 && !options.allowedExtensions.includes(extname(normalizedPath))) {
				return undefined;
			}

			try {
				return {
					text: await readText(normalizedPath),
					uri: normalizedPath
				};
			} catch {
				return undefined;
			}
		}
	};
}
