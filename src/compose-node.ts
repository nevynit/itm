import type { ItmIncludeProvider } from "./compose";

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