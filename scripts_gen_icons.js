const sharp = require('sharp');
const fs = require('fs');

const svg = fs.readFileSync('public/logo-pmrv-sc.svg');

(async () => {
  await sharp(svg).resize(192, 192).png().toFile('public/icon-192.png');
  await sharp(svg).resize(512, 512).png().toFile('public/icon-512.png');
  await sharp(svg).resize(180, 180).png().toFile('public/apple-touch-icon.png');
  // favicon.ico as 32px png-ish (browsers accept .ico; generate multi-size ico)
  await sharp(svg).resize(32, 32).png().toFile('public/favicon-32.png');
  console.log('PNG icons generated: icon-192, icon-512, apple-touch-icon, favicon-32');
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
