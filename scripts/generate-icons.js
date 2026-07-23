// Generates PWA icons using only Node.js built-ins (zlib + fs)
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// --- Minimal PNG encoder ---

function makeCRCTable() {
  const t = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
}
const CRC_TABLE = makeCRCTable();

function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = (c >>> 8) ^ CRC_TABLE[(c ^ buf[i]) & 0xff];
  return (c ^ -1) >>> 0;
}

function pngChunk(type, data) {
  const typeB = Buffer.from(type, 'ascii');
  const lenB = Buffer.alloc(4);
  lenB.writeUInt32BE(data.length, 0);
  const crcB = Buffer.alloc(4);
  crcB.writeUInt32BE(crc32(Buffer.concat([typeB, data])), 0);
  return Buffer.concat([lenB, typeB, data, crcB]);
}

function encodePNG(size, getPixel) {
  // Build raw scanlines: filter-byte(0) + R G B per pixel
  const raw = Buffer.alloc(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0; // filter: None
    for (let x = 0; x < size; x++) {
      const [r, g, b] = getPixel(x, y);
      const o = y * (1 + size * 3) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 2; // 8-bit RGB
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Design ---

const BG   = [9, 9, 11];         // zinc-950
const CARD = [39, 39, 42];       // zinc-800
const FG   = [244, 244, 245];    // zinc-100 (near white)
const ACC  = [34, 197, 94];      // green-500

// 5×7 pixel art for "F"
const F = [
  [1,1,1,1,1],
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,1,1,1,0],
  [1,0,0,0,0],
  [1,0,0,0,0],
  [1,0,0,0,0],
];
const LETTER_W = 5, LETTER_H = 7, LETTER_GAP = 2;
const TOTAL_W = LETTER_W * 2 + LETTER_GAP; // 12
const TOTAL_H = LETTER_H;                   // 7

function makeIconPixel(size) {
  const cx = size / 2, cy = size / 2;
  const circleR = size * 0.42;

  // scale letters to fill ~60% of the circle diameter
  const scale = Math.max(1, Math.floor((circleR * 1.1) / Math.max(TOTAL_W, TOTAL_H)));
  const drawnW = TOTAL_W * scale;
  const drawnH = TOTAL_H * scale;
  const ox = Math.round(cx - drawnW / 2); // top-left of "FF" block
  const oy = Math.round(cy - drawnH / 2);

  // Build a lookup set for letter pixels
  const letterPixels = new Set();
  for (let row = 0; row < LETTER_H; row++) {
    for (let col = 0; col < LETTER_W; col++) {
      if (F[row][col]) {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = ox + col * scale + sx;
            const py = oy + row * scale + sy;
            letterPixels.add(`${px},${py}`);
          }
        }
      }
    }
  }
  // Second F
  const f2ox = ox + (LETTER_W + LETTER_GAP) * scale;
  for (let row = 0; row < LETTER_H; row++) {
    for (let col = 0; col < LETTER_W; col++) {
      if (F[row][col]) {
        for (let sy = 0; sy < scale; sy++) {
          for (let sx = 0; sx < scale; sx++) {
            const px = f2ox + col * scale + sx;
            const py = oy + row * scale + sy;
            letterPixels.add(`${px},${py}`);
          }
        }
      }
    }
  }

  // Accent dot: small green square below the letters
  const dotSize = Math.max(2, Math.round(scale * 0.6));
  const dotY = oy + drawnH + Math.round(scale * 0.8);
  const dotX = Math.round(cx - dotSize / 2);
  const dotPixels = new Set();
  for (let dy = 0; dy < dotSize; dy++) {
    for (let dx = 0; dx < dotSize; dx++) {
      dotPixels.add(`${dotX + dx},${dotY + dy}`);
    }
  }

  return (x, y) => {
    const dx = x - cx, dy = y - cy;
    const inCircle = dx * dx + dy * dy <= circleR * circleR;
    const key = `${x},${y}`;
    if (dotPixels.has(key)) return ACC;
    if (letterPixels.has(key)) return FG;
    if (inCircle) return CARD;
    return BG;
  };
}

// --- Generate ---

const OUT = path.join(__dirname, '..', 'public', 'icons');

const targets = [
  { name: 'icon-512.png',          size: 512 },
  { name: 'icon-192.png',          size: 192 },
  { name: 'apple-touch-icon.png',  size: 180 },
];

for (const { name, size } of targets) {
  const buf = encodePNG(size, makeIconPixel(size));
  fs.writeFileSync(path.join(OUT, name), buf);
  console.log(`✓ ${name} (${size}×${size})`);
}
