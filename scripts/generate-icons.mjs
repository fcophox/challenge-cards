// Renders the PWA icons from inline SVG with sharp (bundled with Next.js).
// Usage: npm run icons
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";

const cards = (s) => `
  <g transform="translate(${256 - 128 * s} ${256 - 128 * s}) scale(${s})">
    <rect x="64" y="40" width="128" height="176" rx="22" fill="#3178D4" transform="rotate(-14 128 128)"/>
    <rect x="66" y="40" width="128" height="176" rx="22" fill="#7440AB" transform="rotate(9 128 128)"/>
    <rect x="64" y="40" width="128" height="176" rx="22" fill="#8B5CF6"/>
    <rect x="74" y="50" width="108" height="156" rx="15" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="3"/>
    <path d="M128 86l12 24.5 27 3.9-19.5 19 4.6 26.9L128 147.6l-24.1 12.7 4.6-26.9-19.5-19 27-3.9z" fill="#fff"/>
  </g>`;

const svg = ({ maskable }) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <radialGradient id="g" cx="50%" cy="35%" r="70%">
      <stop offset="0" stop-color="#2a1f4d"/><stop offset="1" stop-color="#0B0D14"/>
    </radialGradient>
  </defs>
  <rect width="512" height="512" ${maskable ? "" : 'rx="112"'} fill="url(#g)"/>
  ${cards(maskable ? 1.25 : 1.55)}
</svg>`;

await mkdir("public/icons", { recursive: true });
await writeFile("public/icons/icon.svg", svg({ maskable: false }));
const targets = [
  ["icon-192.png", 192, false],
  ["icon-512.png", 512, false],
  ["maskable-512.png", 512, true],
  ["maskable-192.png", 192, true],
  ["apple-touch-icon.png", 180, true],
];
for (const [name, size, maskable] of targets) {
  await sharp(Buffer.from(svg({ maskable }))).resize(size, size).png().toFile(`public/icons/${name}`);
}
console.log("Icons generated in public/icons");
