import type { ItmIncludeProvider, ItmLoadedIncludeSource } from "./compose";

export interface ItmStdAsset {
  key: string;
  mediaType: "text/itm";
  aliases: string[];
  relativePath: string;
}

export interface LoadedItmStdAsset extends ItmStdAsset {
  text: string;
  uri: string;
}

const STD_SCHEME_PREFIXES = ["std:", "std://"] as const;

const STD_ASSETS: readonly ItmStdAsset[] = [
  {
    key: "profiles/archimate-basic-profile.itm",
    mediaType: "text/itm",
    relativePath: "examples/archimate/archimate-basic-profile.itm",
    aliases: [
      "archimate-basic-profile",
      "archimate/basic-profile",
      "profiles/archimate-basic-profile",
      "profiles/archimate-basic-profile.itm",
      "std:archimate-basic-profile",
      "std:archimate/basic-profile",
      "std:profiles/archimate-basic-profile",
      "std:profiles/archimate-basic-profile.itm",
      "std://archimate-basic-profile",
      "std://profiles/archimate-basic-profile",
      "std://profiles/archimate-basic-profile.itm"
    ]
  },
  {
    key: "profiles/bpmn20-basic-profile.itm",
    mediaType: "text/itm",
    relativePath: "examples/BPMN/bpmn20-basic-profile.itm",
    aliases: [
      "bpmn20-basic-profile",
      "bpmn/basic-profile",
      "profiles/bpmn20-basic-profile",
      "profiles/bpmn20-basic-profile.itm",
      "std:bpmn20-basic-profile",
      "std:bpmn/basic-profile",
      "std:profiles/bpmn20-basic-profile",
      "std:profiles/bpmn20-basic-profile.itm",
      "std://bpmn20-basic-profile",
      "std://profiles/bpmn20-basic-profile",
      "std://profiles/bpmn20-basic-profile.itm"
    ]
  }
];

const STD_ASSETS_BY_ALIAS = new Map<string, ItmStdAsset>();

for (const asset of STD_ASSETS) {
  for (const alias of [asset.key, ...asset.aliases]) {
    STD_ASSETS_BY_ALIAS.set(normalizeStdAssetKey(alias), asset);
  }
}

function normalizeStdAssetKey(key: string): string {
  let normalized = key.trim();

  for (const prefix of STD_SCHEME_PREFIXES) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
      break;
    }
  }

  normalized = normalized.replace(/^\/+|^\.\/+|\/+$/gu, "");
  return normalized;
}

function toStdUri(key: string): string {
  return `std://${normalizeStdAssetKey(key)}`;
}

export function listStdAssets(): ItmStdAsset[] {
  return STD_ASSETS.map((asset) => ({ ...asset, aliases: [...asset.aliases] }));
}

export function readStdAsset(key: string): ItmStdAsset | undefined {
  const asset = STD_ASSETS_BY_ALIAS.get(normalizeStdAssetKey(key));

  if (!asset) {
    return undefined;
  }

  return {
    ...asset,
    aliases: [...asset.aliases]
  };
}

async function resolveStdAssetPaths(relativePath: string): Promise<string[]> {
  const [{ resolve, dirname }, { fileURLToPath }] = await Promise.all([
    import("node:path"),
    import("node:url")
  ]);
  const candidates = new Set<string>();

  if (typeof __filename === "string") {
    candidates.add(resolve(dirname(__filename), "..", relativePath));
  }

  try {
    const moduleUrl = (0, eval)("import.meta.url") as string;

    if (typeof moduleUrl === "string" && moduleUrl.length > 0) {
      candidates.add(resolve(dirname(fileURLToPath(moduleUrl)), "..", relativePath));
    }
  } catch {
    // Ignore environments where import.meta is unavailable.
  }

  candidates.add(resolve(process.cwd(), relativePath));

  return [...candidates];
}

export async function loadStdAsset(key: string): Promise<LoadedItmStdAsset | undefined> {
  const asset = readStdAsset(key);

  if (!asset) {
    return undefined;
  }

  const candidatePaths = await resolveStdAssetPaths(asset.relativePath);

  const { readFile } = await import("node:fs/promises");

  for (const candidatePath of candidatePaths) {
    try {
      const text = await readFile(candidatePath, "utf8");

      return {
        ...asset,
        text,
        uri: toStdUri(asset.key)
      };
    } catch {
      // Try the next candidate location.
    }
  }

  return undefined;
}

export function createStdIncludeProvider(): ItmIncludeProvider {
  return {
    name: "std",
    async load(target): Promise<ItmLoadedIncludeSource | undefined> {
      const asset = await loadStdAsset(target);

      if (!asset) {
        return undefined;
      }

      return {
        text: asset.text,
        uri: toStdUri(asset.key)
      };
    }
  };
}