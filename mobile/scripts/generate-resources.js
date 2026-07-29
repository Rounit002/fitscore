#!/usr/bin/env node
/**
 * Generates the Android launcher icons and the Android 12+ splash screen icon
 * from the app's brand mark (Frontend/public/favicon.svg).
 *
 * Output lands in mobile/res/, which config.xml references. Re-run this after
 * changing the logo:
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
const logo = path.resolve(root, '..', 'Frontend', 'public', 'favicon.svg');
const resDir = path.join(root, 'res');

// Matches --ns-surface in Frontend/src/tailwind.css so the icon background and
// splash read as part of the app rather than a stock white.
const BRAND_BACKGROUND = '#F5F5F5';

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

if (!fs.existsSync(logo)) {
  console.error(`[gen-res] Brand mark not found at ${logo}`);
  process.exit(1);
}

const svg = fs.readFileSync(logo);

/**
 * Renders the logo centred on a transparent canvas.
 * @param {number} canvas  full output edge length in px
 * @param {number} inset   fraction of the canvas the logo may occupy (0-1)
 */
async function renderMark(canvas, inset) {
  const box = Math.round(canvas * inset);
  // `contain` preserves the logo's 48:46 aspect ratio instead of stretching it.
  const mark = await sharp(svg, { density: 640 })
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
async function renderOnBackground(canvas, inset) {
  const layered = await renderMark(canvas, inset).then((img) => img.toBuffer());
  return sharp(layered).flatten({ background: BRAND_BACKGROUND }).png();
}

async function write(pipeline, ...segments) {
  const target = path.join(resDir, ...segments);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  await pipeline.toFile(target);
  return path.relative(root, target);
}

async function main() {
  fs.rmSync(resDir, { recursive: true, force: true });
  const written = [];

  // Legacy icons are drawn on the brand background: they are not masked, so a
  // transparent PNG would show launcher wallpaper through the logo.
  for (const { density, size } of LEGACY_ICONS) {
    written.push(await write(await renderOnBackground(size, 0.72), 'android', 'icon', `${density}.png`));
  }

  // Adaptive foregrounds stay transparent; the logo is held inside the 66/108
  // safe zone the launcher guarantees is visible.
  for (const { density, size } of ADAPTIVE_ICONS) {
    written.push(
      await write(await renderMark(size, 0.52), 'android', 'adaptive', `${density}-foreground.png`),
    );

    // cordova-android always emits `<background android:drawable="@mipmap/
    // ic_launcher_background" />`, so the background must be a real image —
    // a colour literal in config.xml fails resource linking. Flat brand fill.
    written.push(
      await write(
        sharp({
          create: { width: size, height: size, channels: 4, background: BRAND_BACKGROUND },
        }).png(),
        'android',
        'adaptive',
        `${density}-background.png`,
      ),
    );
  }

  // Android 12+ splash icon. 768/1152 = the documented safe fraction.
  written.push(await write(await renderMark(1152, 0.42), 'android', 'splash', 'splash-icon.png'));

  // Play Store listing icon (512x512, no transparency allowed).
  written.push(await write(await renderOnBackground(512, 0.72), 'android', 'play-store-icon.png'));

  console.log(`[gen-res] Generated ${written.length} asset(s) in mobile/res:`);
  for (const file of written) console.log(`           ${file}`);
}

main().catch((error) => {
  console.error('[gen-res] Failed:', error);
  process.exit(1);
});
