#!/usr/bin/env node
/**
 * Generates every rasterised brand asset from the two committed masters:
 *
 *   resources/icon.png    1024x1024 finished square application icon
 *   resources/splash.png  2732x2732 transparent — the icon inside a safe area
 *
 * Outputs, all git-ignored and regenerated:
 *
 *   mobile/res/android/...        launcher icons (legacy + adaptive), splash icon,
 *                                 Play Store listing icon
 *   Frontend/public/icons/...     favicon PNGs, apple-touch-icon, PWA 192/512
 *   Frontend/public/favicon.ico   multi-size ICO
 *
 * Run after changing the logo, then rebuild:
 *
 *   npm run gen:res
 *
 * Sizes follow the Android asset guidelines:
 *   - Legacy launcher icon: 48dp square, scaled per density.
 *   - Adaptive icon: 108dp canvas where only the centre 66dp is guaranteed
 *     visible (the launcher masks/animates the rest), so the mark is inset.
 *   - Android 12 splash: 1152x1152 canvas with the icon confined to the
 *     centre 768x768 (the system masks it to a circle and may crop further).
 */

const fs = require('node:fs');
const path = require('node:path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const repo = path.resolve(root, '..');

const ICON_MASTER = path.join(repo, 'resources', 'icon.png');
const SPLASH_MASTER = path.join(repo, 'resources', 'splash.png');

const resDir = path.join(root, 'res');
const webDir = path.join(repo, 'Frontend', 'public');
const webIconDir = path.join(webDir, 'icons');

// The supplied application icon is a finished, opaque dark square. Use its edge
// colour whenever a platform requires a flattened background so no unrelated
// colour appears around the artwork.
const BRAND_BACKGROUND = '#1B2027';

/** Legacy square launcher icons: 48dp at each density. */
const LEGACY_ICONS = [
  { density: 'ldpi', size: 36 },
  { density: 'mdpi', size: 48 },
  { density: 'hdpi', size: 72 },
  { density: 'xhdpi', size: 96 },
  { density: 'xxhdpi', size: 144 },
  { density: 'xxxhdpi', size: 192 },
];

/** Adaptive icon layers: 108dp canvas at each density. */
const ADAPTIVE_ICONS = [
  { density: 'ldpi', size: 81 },
  { density: 'mdpi', size: 108 },
  { density: 'hdpi', size: 162 },
  { density: 'xhdpi', size: 216 },
  { density: 'xxhdpi', size: 324 },
  { density: 'xxxhdpi', size: 432 },
];

/**
 * Web icons. `favicon-16/32` are the browser tab; `apple-touch-icon` is the iOS
 * home screen (no alpha allowed, so it is flattened); 192/512 are the PWA
 * manifest sizes. 512 is also the maskable source, hence the tighter inset.
 */
const WEB_ICONS = [
  { file: 'favicon-16x16.png', size: 16, inset: 1, flatten: false },
  { file: 'favicon-32x32.png', size: 32, inset: 1, flatten: false },
  { file: 'apple-touch-icon.png', size: 180, inset: 1, flatten: true },
  { file: 'icon-192.png', size: 192, inset: 1, flatten: false },
  { file: 'icon-512.png', size: 512, inset: 1, flatten: false },
  { file: 'icon-maskable-512.png', size: 512, inset: 1, flatten: true },
];

/** ICO bundles the classic three sizes so Windows/older browsers all resolve. */
const ICO_SIZES = [16, 32, 48];

for (const master of [ICON_MASTER, SPLASH_MASTER]) {
  if (!fs.existsSync(master)) {
    console.error(`[gen-res] Brand master not found at ${master}`);
    process.exit(1);
  }
}

/**
 * Renders a master centred on a transparent square canvas.
 * @param {string} master  source PNG path
 * @param {number} canvas  full output edge length in px
 * @param {number} inset   fraction of the canvas the mark may occupy (0-1)
 */
async function renderMark(master, canvas, inset) {
  const box = Math.max(1, Math.round(canvas * inset));
  // `contain` preserves the mark's aspect ratio instead of stretching it.
  const mark = await sharp(master)
    .resize(box, box, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: canvas,
      height: canvas,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, gravity: 'centre' }])
    .png();
}

/** Flattens a transparent render onto the brand background colour. */
async function renderOnBackground(master, canvas, inset, background = BRAND_BACKGROUND) {
  const layered = await renderMark(master, canvas, inset).then((img) => img.toBuffer());
  return sharp(layered).flatten({ background }).png();
}

async function write(pipeline, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await pipeline.toFile(target);
  return path.relative(repo, target);
}

/**
 * Minimal ICO container. sharp cannot emit ICO, and the format is simple enough
 * that a dependency is not worth it: a 6-byte header, one 16-byte directory
 * entry per image, then the PNG payloads concatenated.
 */
async function writeIco(master, sizes, target) {
  const pngs = [];
  for (const size of sizes) {
    pngs.push(await renderMark(master, size, 1).then((img) => img.toBuffer()));
  }

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: 1 = icon
  header.writeUInt16LE(sizes.length, 4);

  let offset = header.length + sizes.length * 16;
  const entries = [];
  for (let i = 0; i < sizes.length; i += 1) {
    const entry = Buffer.alloc(16);
    // 0 means 256 in the ICO spec; all our sizes are < 256 so a plain write is fine.
    entry.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 0); // width
    entry.writeUInt8(sizes[i] >= 256 ? 0 : sizes[i], 1); // height
    entry.writeUInt8(0, 2); // palette size (0 = no palette)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(pngs[i].length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += pngs[i].length;
    entries.push(entry);
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, Buffer.concat([header, ...entries, ...pngs]));
  return path.relative(repo, target);
}

async function main() {
  const written = [];

  // ---------- Android (mobile/res) ----------
  fs.rmSync(resDir, { recursive: true, force: true });

  // Legacy icons are drawn on the brand background: they are not masked, so a
  // transparent PNG would show launcher wallpaper through the logo.
  for (const { density, size } of LEGACY_ICONS) {
    written.push(
      await write(
        await renderOnBackground(ICON_MASTER, size, 1),
        path.join(resDir, 'android', 'icon', `${density}.png`),
      ),
    );
  }

  // Adaptive foregrounds stay transparent; the mark is held inside the 66/108
  // safe zone the launcher guarantees is visible.
  for (const { density, size } of ADAPTIVE_ICONS) {
    written.push(
      await write(
        await renderMark(ICON_MASTER, size, 1),
        path.join(resDir, 'android', 'adaptive', `${density}-foreground.png`),
      ),
    );

    // cordova-android always emits `<background android:drawable="@mipmap/
    // ic_launcher_background" />`, so the background must be a real image —
    // a colour literal in config.xml fails resource linking. Flat brand fill.
    written.push(
      await write(
        sharp({
          create: { width: size, height: size, channels: 4, background: BRAND_BACKGROUND },
        }).png(),
        path.join(resDir, 'android', 'adaptive', `${density}-background.png`),
      ),
    );
  }

  // Android 12+ splash icon, from the splash master (which already carries the
  // safe-area padding). 768/1152 is the documented visible fraction, and the
  // master insets the mark further, so this renders it full-canvas.
  written.push(
    await write(
      await renderMark(SPLASH_MASTER, 1152, 1),
      path.join(resDir, 'android', 'splash', 'splash-icon.png'),
    ),
  );

  // Play Store listing icon (512x512, no transparency allowed).
  written.push(
    await write(
      await renderOnBackground(ICON_MASTER, 512, 1),
      path.join(resDir, 'android', 'play-store-icon.png'),
    ),
  );

  // ---------- Web (Frontend/public) ----------
  fs.rmSync(webIconDir, { recursive: true, force: true });

  for (const { file, size, inset, flatten } of WEB_ICONS) {
    const pipeline = flatten
      ? await renderOnBackground(ICON_MASTER, size, inset, BRAND_BACKGROUND)
      : await renderMark(ICON_MASTER, size, inset);
    written.push(await write(pipeline, path.join(webIconDir, file)));
  }

  written.push(await writeIco(ICON_MASTER, ICO_SIZES, path.join(webDir, 'favicon.ico')));

  console.log(`[gen-res] Generated ${written.length} asset(s):`);
  for (const file of written) console.log(`           ${file}`);
  console.log(`[gen-res] Icon background ${BRAND_BACKGROUND}`);
}

main().catch((error) => {
  console.error('[gen-res] Failed:', error);
  process.exit(1);
});
