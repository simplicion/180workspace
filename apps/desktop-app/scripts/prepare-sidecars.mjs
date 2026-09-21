// Copies the FFmpeg / FFprobe binaries that the repo already depends on (@ffmpeg-installer / @ffprobe-installer, which
// ship one platform-specific binary per OS) into src-tauri/binaries using the "<name>-<target-triple>[.exe]" naming that
// Tauri's `externalBin` requires. Run on each CI runner before `tauri build` so the runner's own platform binary is used.
//
// LICENSING (read this): the Windows/Linux/macOS binaries these packages ship are static FFmpeg builds. The Windows one
// is GPLv3 (see node_modules/@ffmpeg-installer/win32-x64/package.json). Redistributing a GPL FFmpeg inside an installer
// is allowed only if you comply with the GPL for that binary: include the licence text, and offer the corresponding
// source. Keep FFmpeg a separate executable (as it is here: a sidecar process, never linked into the app). Before the
// first public release get this reviewed, or swap in an LGPL-only build and point FFMPEG_BINARY / FFPROBE_BINARY at it.

import { createRequire } from 'node:module';
import { copyFileSync, mkdirSync, existsSync, chmodSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const binariesDir = resolve(here, '..', 'src-tauri', 'binaries');
// The installer packages are hoisted to the repo root node_modules; resolve from there.
const require = createRequire(resolve(here, '..', '..', '..', 'package.json'));

const TRIPLES = {
  'win32-x64': 'x86_64-pc-windows-msvc',
  'win32-arm64': 'aarch64-pc-windows-msvc',
  'darwin-x64': 'x86_64-apple-darwin',
  'darwin-arm64': 'aarch64-apple-darwin',
  'linux-x64': 'x86_64-unknown-linux-gnu',
  'linux-arm64': 'aarch64-unknown-linux-gnu',
};

const key = `${process.platform}-${process.arch}`;
const triple = process.env.TAURI_TARGET_TRIPLE || TRIPLES[key];
if (!triple) {
  console.error(`Unsupported build platform "${key}". Set TAURI_TARGET_TRIPLE explicitly.`);
  process.exit(1);
}
const ext = process.platform === 'win32' ? '.exe' : '';

function source(envVar, pkg) {
  if (process.env[envVar]) return process.env[envVar];
  try {
    return require(pkg).path;
  } catch (err) {
    console.error(`Cannot locate ${pkg} for ${key}: ${err.message}\nRun "pnpm install" first, or set ${envVar} to a binary path.`);
    process.exit(1);
  }
}

mkdirSync(binariesDir, { recursive: true });

for (const [name, envVar, pkg] of [
  ['ffmpeg', 'FFMPEG_BINARY', '@ffmpeg-installer/ffmpeg'],
  ['ffprobe', 'FFPROBE_BINARY', '@ffprobe-installer/ffprobe'],
]) {
  const from = source(envVar, pkg);
  if (!existsSync(from)) {
    console.error(`${name} binary not found at ${from}`);
    process.exit(1);
  }
  const to = join(binariesDir, `${name}-${triple}${ext}`);
  copyFileSync(from, to);
  if (process.platform !== 'win32') chmodSync(to, 0o755);
  console.log(`✔ ${name}: ${from} -> ${to}`);
}

writeFileSync(
  join(binariesDir, 'FFMPEG-NOTICE.txt'),
  'FFmpeg is bundled as a separate executable and is licensed separately (GPL/LGPL depending on the build).\n' +
    'Licence text and source: https://ffmpeg.org/legal.html  |  https://ffmpeg.org/download.html#get-sources\n' +
    'Ship your own copy of the exact licence and a written source offer with every release.\n'
);
console.warn('\n⚠  FFmpeg licensing: see the header of scripts/prepare-sidecars.mjs before publishing a release.');
