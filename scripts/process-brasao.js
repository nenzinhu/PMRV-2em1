const path = require('path');
const sharp = require('sharp');

const SRC = process.argv[2];
const OUT_DIR = path.join(__dirname, '..', 'public');

if (!SRC) {
  console.error('uso: node scripts/process-brasao.js <arquivo.jpg>');
  process.exit(1);
}

function isChecker(r, g, b) {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const sat = max - min;
  const l = (r + g + b) / 3;
  return sat < 28 && l >= 150;
}

function floodClear(data, w, h) {
  const seen = new Uint8Array(w * h);
  const stack = [];

  function push(x, y) {
    if (x < 0 || y < 0 || x >= w || y >= h) return;
    const i = y * w + x;
    if (seen[i]) return;
    const o = i * 4;
    if (!isChecker(data[o], data[o + 1], data[o + 2])) return;
    seen[i] = 1;
    stack.push(i);
  }

  for (let x = 0; x < w; x++) {
    push(x, 0);
    push(x, h - 1);
  }
  for (let y = 0; y < h; y++) {
    push(0, y);
    push(w - 1, y);
  }

  while (stack.length) {
    const i = stack.pop();
    const x = i % w;
    const y = (i / w) | 0;
    const o = i * 4;
    data[o + 3] = 0;
    push(x + 1, y);
    push(x - 1, y);
    push(x, y + 1);
    push(x, y - 1);
  }

  for (let pass = 0; pass < 2; pass++) {
    const kill = [];
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        const i = y * w + x;
        const o = i * 4;
        if (data[o + 3] === 0) continue;
        if (!isChecker(data[o], data[o + 1], data[o + 2])) continue;
        let near = false;
        for (let dy = -1; dy <= 1 && !near; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (data[((y + dy) * w + (x + dx)) * 4 + 3] === 0) {
              near = true;
              break;
            }
          }
        }
        if (near) kill.push(o);
      }
    }
    for (const o of kill) data[o + 3] = 0;
  }
}

function boundingBox(data, w, h) {
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3] < 16) continue;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    }
  }
  const pad = 8;
  return {
    left: Math.max(0, minX - pad),
    top: Math.max(0, minY - pad),
    width: Math.min(w, maxX + pad) - Math.max(0, minX - pad),
    height: Math.min(h, maxY + pad) - Math.max(0, minY - pad),
  };
}

async function fitOnGreen(input, size, padRatio = 0.12) {
  const pad = Math.round(size * padRatio);
  const inner = size - pad * 2;
  const fg = await sharp(input)
    .resize(inner, inner, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();
  return sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 132, b: 72, alpha: 255 },
    },
  })
    .composite([{ input: fg, left: pad, top: pad }])
    .png()
    .toBuffer();
}

(async () => {
  const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  floodClear(data, info.width, info.height);
  const box = boundingBox(data, info.width, info.height);

  const transparent = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .extract(box)
    .png()
    .toBuffer();

  const logoPath = path.join(OUT_DIR, 'logo-pmrv-sc.png');
  await sharp(transparent).png().toFile(logoPath);

  const fav32 = path.join(OUT_DIR, 'favicon-32.png');
  const apple = path.join(OUT_DIR, 'apple-touch-icon.png');
  const icon192 = path.join(OUT_DIR, 'icon-192.png');
  const icon512 = path.join(OUT_DIR, 'icon-512.png');

  await sharp(transparent)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile(fav32);

  await sharp(await fitOnGreen(transparent, 180, 0.08)).toFile(apple);
  await sharp(await fitOnGreen(transparent, 192, 0.1)).toFile(icon192);
  await sharp(await fitOnGreen(transparent, 512, 0.1)).toFile(icon512);

  console.log('brasão processado', {
    origem: `${info.width}x${info.height}`,
    recorte: `${box.width}x${box.height}`,
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
