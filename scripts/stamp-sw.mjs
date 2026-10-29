// postbuild: stamps public/sw.js with the Next build id so every deploy gets
// fresh caches and old ones are purged on activate.
import { readFile, writeFile } from "node:fs/promises";

const buildId = (await readFile(".next/BUILD_ID", "utf8")).trim();
const file = "public/sw.js";
const src = await readFile(file, "utf8");
const out = src.replace(/const VERSION = "[^"]*";/, `const VERSION = "${buildId}";`);
await writeFile(file, out);
console.log(`sw.js stamped with build ${buildId}`);
