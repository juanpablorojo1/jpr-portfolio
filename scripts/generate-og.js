/**
 * generate-og.js
 * Generates minimal valid PNG placeholder OG images (1200x630)
 * No external dependencies — uses Node.js built-ins only.
 *
 * Usage: node scripts/generate-og.js
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

/**
 * Minimal PNG encoder — produces a valid solid-color PNG.
 * Format: IHDR + IDAT (deflated scanlines) + IEND
 */
function createSolidColorPNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk: width(4) height(4) bitDepth(1) colorType(2=RGB) compression(1) filter(1) interlace(1)
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 2;  // color type RGB
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // Raw image data: each row has a filter byte (0 = None) + RGB pixels
  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    const offset = y * rowSize;
    raw[offset] = 0; // filter type None
    for (let x = 0; x < width; x++) {
      raw[offset + 1 + x * 3 + 0] = r;
      raw[offset + 1 + x * 3 + 1] = g;
      raw[offset + 1 + x * 3 + 2] = b;
    }
  }

  const compressed = zlib.deflateSync(raw, { level: 1 });
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crc = crc32(Buffer.concat([typeBuffer, data]));
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc >>> 0, 0);
  return Buffer.concat([len, typeBuffer, data, crcBuf]);
}

// CRC32 table
const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = crcTable[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF);
}

// Generate both OG images — solid dark background matching brand (#080808)
const outDir = path.join(__dirname, '..', 'public', 'og');
fs.mkdirSync(outDir, { recursive: true });

const width = 1200;
const height = 630;

// Brand bg color: #080808 = rgb(8, 8, 8)
const png = createSolidColorPNG(width, height, 8, 8, 8);

fs.writeFileSync(path.join(outDir, 'og-en.png'), png);
fs.writeFileSync(path.join(outDir, 'og-es.png'), png);

console.log(`Generated public/og/og-en.png (${width}x${height})`);
console.log(`Generated public/og/og-es.png (${width}x${height})`);
console.log('NOTE: These are solid-color placeholders. Replace with real OG images when ready.');
