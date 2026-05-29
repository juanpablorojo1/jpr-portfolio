import sharp from 'sharp';
import { readdir, mkdir, rename, unlink } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const publicDir = join(__dirname, '..', 'public');
const imagesDir = join(publicDir, 'images');
const iconsDir = join(publicDir, 'icons');
const logosDir = join(publicDir, 'logos');

// Compress hackathon images
const files = await readdir(imagesDir);
const hackathonFiles = files.filter(f => f.startsWith('hackathon') && f.endsWith('.jpg'));

console.log(`Compressing ${hackathonFiles.length} hackathon images...`);
for (const file of hackathonFiles) {
  const input = join(imagesDir, file);
  const tmp = join(imagesDir, `_tmp_${file}`);
  await sharp(input)
    .resize(1200, null, { withoutEnlargement: true })
    .jpeg({ quality: 75, progressive: true })
    .toFile(tmp);
  await unlink(input);
  await rename(tmp, input);
  const { size } = await (await import('fs')).promises.stat(input);
  console.log(`  ${file}: ${(size / 1024).toFixed(0)}KB`);
}

// Generate PWA icons from logo-monogram-white.svg
console.log('\nGenerating PWA icons...');
await mkdir(iconsDir, { recursive: true });

const svgPath = join(logosDir, 'logo-monogram-white.svg');

await sharp(svgPath).resize(192, 192).png().toFile(join(iconsDir, 'icon-192.png'));
console.log('  icon-192.png');

await sharp(svgPath).resize(512, 512).png().toFile(join(iconsDir, 'icon-512.png'));
console.log('  icon-512.png');

const iconBg = await sharp({
  create: { width: 512, height: 512, channels: 4, background: { r: 8, g: 8, b: 8, alpha: 1 } }
}).png().toBuffer();
const iconInner = await sharp(svgPath).resize(320, 320).png().toBuffer();
await sharp(iconBg)
  .composite([{ input: iconInner, gravity: 'center' }])
  .png()
  .toFile(join(iconsDir, 'icon-maskable.png'));
console.log('  icon-maskable.png');

console.log('\nDone.');
