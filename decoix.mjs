// decoix

import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import scrape from "website-scraper";

const DEFAULT_TARGET = "https://www.cuesta.edu/"; // page url
const DEFAULT_DIRECTORY = "../cuesta_update_video"; // output folder name
const DEFAULT_FILENAME = "index.html";
const MANIFEST_FILENAME = "decoix-manifest.json";

// Install dependencies:
// > npm install
//
// Run with the defaults above:
// > npm run decoix
//
// Run with custom values:
// > npm run decoix -- --url "https://example.com/page" --out "./site-copy"

const SUBDIRECTORIES = [
  { directory: "", extensions: [".html", ".ico", ".php"] },
  {
    directory: "_resources/images",
    extensions: [".jpg", ".jpeg", ".png", ".svg", ".gif", ".mp4", ".webp"]
  },
  { directory: "_resources/js", extensions: [".js"] },
  { directory: "_resources/css", extensions: [".css"] },
  {
    directory: "_resources/fonts",
    extensions: [".woff", ".woff2", ".eot", ".ttf", ".otf"]
  }
];

const MIME_TO_EXTENSION = new Map([
  ["text/html", ".html"],
  ["text/css", ".css"],
  ["text/javascript", ".js"],
  ["application/javascript", ".js"],
  ["image/svg+xml", ".svg"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/gif", ".gif"],
  ["image/webp", ".webp"],
  ["image/x-icon", ".ico"],
  ["video/mp4", ".mp4"],
  ["font/woff", ".woff"],
  ["font/woff2", ".woff2"],
  ["font/ttf", ".ttf"],
  ["font/otf", ".otf"],
  ["application/font-woff", ".woff"],
  ["application/font-woff2", ".woff2"],
  ["application/x-font-ttf", ".ttf"],
  ["application/vnd.ms-fontobject", ".eot"],
  ["application/octet-stream", ""]
]);

const BLOCKED_HOST_PATTERNS = [
  "google-analytics.com",
  "googletagmanager.com",
  "doubleclick.net",
  "facebook.net",
  "connect.facebook.net",
  "hotjar.com",
  "hubspot.com",
  "hs-scripts.com",
  "hs-analytics.net",
  "ads-twitter.com",
  "static.ads-twitter.com"
];

const BLOCKED_URL_PATTERNS = [
  "/gtm.js",
  "/analytics.js",
  "/collect",
  "/pixel",
  "/events.js"
];

class StableFilenamePlugin {
  apply(registerAction) {
    let occupiedFilenames = new Set();
    let subdirectories = [];
    let defaultFilename = DEFAULT_FILENAME;

    registerAction("beforeStart", ({ options }) => {
      occupiedFilenames = new Set();
      subdirectories = options.subdirectories || [];
      defaultFilename = options.defaultFilename || DEFAULT_FILENAME;
    });

    registerAction("generateFilename", ({ resource, responseData }) => {
      const filename = createStableFilename({
        defaultFilename,
        occupiedFilenames,
        resource,
        responseData,
        subdirectories
      });

      occupiedFilenames.add(filename);
      return { filename };
    });
  }
}

class ManifestPlugin {
  apply(registerAction) {
    let directory = DEFAULT_DIRECTORY;
    let startedAt = new Date().toISOString();
    let sourceUrls = [];
    let saved = [];
    let failed = [];

    registerAction("beforeStart", ({ options }) => {
      directory = options.directory;
      startedAt = new Date().toISOString();
      sourceUrls = options.urls.map((item) =>
        typeof item === "string" ? item : item.url
      );
      saved = [];
      failed = [];
    });

    registerAction("onResourceSaved", ({ resource }) => {
      saved.push({
        filename: resource.getFilename(),
        type: resource.getType(),
        url: resource.getUrl()
      });
    });

    registerAction("onResourceError", ({ error, resource }) => {
      failed.push({
        error: error.message,
        filename: resource.getFilename() || null,
        type: resource.getType(),
        url: resource.getUrl()
      });
    });

    registerAction("afterFinish", async () => {
      const manifestPath = path.resolve(directory, MANIFEST_FILENAME);
      const manifest = {
        failedCount: failed.length,
        finishedAt: new Date().toISOString(),
        savedCount: saved.length,
        savedResources: saved,
        sourceUrls,
        startedAt,
        version: 1,
        failedResources: failed
      };

      await fs.mkdir(path.dirname(manifestPath), { recursive: true });
      await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    });
  }
}

function parseArgs(argv) {
  const options = {
    out: DEFAULT_DIRECTORY,
    url: DEFAULT_TARGET
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg.startsWith("--url=")) {
      options.url = arg.slice("--url=".length);
      continue;
    }

    if (arg === "--url") {
      options.url = argv[index + 1];
      index += 1;
      continue;
    }

    if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
      continue;
    }

    if (arg === "--out") {
      options.out = argv[index + 1];
      index += 1;
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  if (!options.url) {
    throw new Error("Missing value for --url");
  }

  if (!options.out) {
    throw new Error("Missing value for --out");
  }

  return options;
}

function printHelp() {
  console.log("Usage:");
  console.log(
    '  npm run decoix -- --url "https://example.com/page" --out "./site-copy"'
  );
  console.log("");
  console.log("Options:");
  console.log(`  --url   Source page to scrape. Defaults to ${DEFAULT_TARGET}`);
  console.log(`  --out   Output folder. Defaults to ${DEFAULT_DIRECTORY}`);
  console.log("  --help  Show this help message");
}

function createStableFilename({
  defaultFilename,
  occupiedFilenames,
  resource,
  responseData,
  subdirectories
}) {
  const resourceUrl = new URL(resource.getUrl());
  const typekitFilename = getTypekitFilename(resourceUrl);

  if (typekitFilename) {
    return getUniqueFilename(typekitFilename, occupiedFilenames);
  }

  const pathname = safeDecodeURIComponent(resourceUrl.pathname || "/");
  const preferredFilename = resource.getFilename() || "";
  const preferredExtension = path.posix
    .extname(preferredFilename)
    .toLowerCase();
  const rawFilename = path.posix.basename(pathname);
  const rawExtension = path.posix.extname(rawFilename).toLowerCase();
  const inferredExtension =
    preferredExtension ||
    rawExtension ||
    getExtensionFromResponse(responseData) ||
    getExtensionFromType(resource.getType()) ||
    "";

  let stem = sanitizeStem(
    path.posix.basename(
      preferredFilename || rawFilename,
      preferredFilename ? preferredExtension : rawExtension
    )
  );

  if (
    preferredFilename === defaultFilename ||
    !rawFilename ||
    rawFilename === "/"
  ) {
    stem = path.posix.basename(
      defaultFilename,
      path.posix.extname(defaultFilename)
    );
  }

  if (!isUsefulStem(stem)) {
    const fallbackStem = pathname
      .split("/")
      .filter(Boolean)
      .map((segment) =>
        sanitizeStem(path.posix.basename(segment, path.posix.extname(segment)))
      )
      .reverse()
      .find(isUsefulStem);

    stem =
      fallbackStem ||
      `${sanitizeStem(resourceUrl.hostname) || "asset"}-${shortHash(resource.getUrl())}`;
  }

  let extension = inferredExtension;
  if (!extension && resource.getType() === "html") {
    extension = ".html";
  }

  if (!extension) {
    extension = ".bin";
  }

  const directory = getDirectoryByExtension(extension, subdirectories);
  const filename = `${stem}${extension}`;
  const candidate = directory ? path.posix.join(directory, filename) : filename;

  return getUniqueFilename(candidate, occupiedFilenames);
}

function getTypekitFilename(resourceUrl) {
  if (resourceUrl.hostname !== "use.typekit.net") {
    return null;
  }

  const segments = resourceUrl.pathname.split("/").filter(Boolean);
  if (segments.length < 5 || segments[0] !== "af") {
    return null;
  }

  const assetId = segments[2];
  const formatCode = segments[4];
  const format = getTypekitFormat(formatCode);

  if (!assetId || !format) {
    return null;
  }

  const fvd = sanitizeStem(resourceUrl.searchParams.get("fvd") || "");
  const shortAssetId = assetId.slice(-8).toLowerCase();
  const variant = fvd ? `-${fvd}` : "";
  const filename = `typekit-${shortAssetId}${variant}.${format.extension}`;

  return path.posix.join("_resources/fonts", filename);
}

function getTypekitFormat(formatCode) {
  switch (formatCode) {
    case "l":
      return { extension: "woff2" };
    case "d":
      return { extension: "woff" };
    case "a":
      return { extension: "otf" };
    default:
      return null;
  }
}

function getUniqueFilename(candidate, occupiedFilenames) {
  if (!occupiedFilenames.has(candidate)) {
    return candidate;
  }

  const extension = path.posix.extname(candidate);
  const directory = path.posix.dirname(candidate);
  const basename = path.posix.basename(candidate, extension);
  let suffix = 2;
  let nextCandidate = candidate;

  while (occupiedFilenames.has(nextCandidate)) {
    const nextFilename = `${basename}-${suffix}${extension}`;
    nextCandidate =
      directory && directory !== "."
        ? path.posix.join(directory, nextFilename)
        : nextFilename;
    suffix += 1;
  }

  return nextCandidate;
}

function getDirectoryByExtension(extension, subdirectories) {
  const normalizedExtension = extension.toLowerCase();

  return (
    subdirectories.find((directory) =>
      directory.extensions.includes(normalizedExtension)
    )?.directory || ""
  );
}

function getExtensionFromResponse(responseData) {
  const mimeType = responseData?.headers?.["content-type"]
    ?.split(";")[0]
    ?.trim()
    ?.toLowerCase();

  return MIME_TO_EXTENSION.get(mimeType) || "";
}

function getExtensionFromType(type) {
  switch (type) {
    case "html":
      return ".html";
    case "css":
      return ".css";
    case "js":
      return ".js";
    default:
      return "";
  }
}

function sanitizeStem(value) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function isUsefulStem(value) {
  return Boolean(value) && value.length >= 3;
}

function shortHash(value) {
  return createHash("sha1").update(value).digest("hex").slice(0, 10);
}

function safeDecodeURIComponent(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function shouldDownloadUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const href = parsedUrl.href.toLowerCase();

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      return false;
    }

    if (BLOCKED_HOST_PATTERNS.some((pattern) => hostname.includes(pattern))) {
      return false;
    }

    if (BLOCKED_URL_PATTERNS.some((pattern) => href.includes(pattern))) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    printHelp();
    return;
  }

  const scrapeOptions = {
    defaultFilename: DEFAULT_FILENAME,
    directory: args.out,
    ignoreErrors: true,
    plugins: [new StableFilenamePlugin(), new ManifestPlugin()],
    recursive: false,
    requestConcurrency: 8,
    subdirectories: SUBDIRECTORIES,
    urlFilter: shouldDownloadUrl,
    urls: [args.url]
  };

  console.warn(`Scraping URL: ${args.url}`);
  console.warn(`Saving to: ${args.out}`);

  await scrape(scrapeOptions);

  console.log("Scrape complete.");
  console.log(`Manifest written to ${path.join(args.out, MANIFEST_FILENAME)}`);
}

main().catch((error) => {
  console.error("Decoix failed:", error.message);
  process.exitCode = 1;
});
