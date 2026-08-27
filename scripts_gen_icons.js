const sharp = require('sharp');

const src = 'public/logo-pmrv-sc.png';

(async () => {
  const fitOnGreen = async (size, padRatio) => {
    const pad = Math.round(size * padRatio);
    const inner = size - pad * 2;
    const fg = await sharp(src)
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
      .png();
  };

  await sharp(src)
    .resize(32, 32, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile('public/favicon-32.png');
  await (await fitOnGreen(180, 0.08)).toFile('public/apple-touch-icon.png');
  await (await fitOnGreen(192, 0.1)).toFile('public/icon-192.png');
  await (await fitOnGreen(512, 0.1)).toFile('public/icon-512.png');
  console.log('PNG icons generated from logo-pmrv-sc.png');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
