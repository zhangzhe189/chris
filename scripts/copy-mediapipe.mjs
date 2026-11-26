import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const srcDir = path.join(rootDir, 'node_modules', '@mediapipe', 'hands');
const destDir = path.join(rootDir, 'public', 'mediapipe', 'hands');

if (!fs.existsSync(srcDir)) {
  console.warn('[copy-mediapipe] @mediapipe/hands not installed yet, skipping.');
  process.exit(0);
}

fs.mkdirSync(destDir, { recursive: true });

const allowedExt = new Set(['.js', '.wasm', '.data', '.tflite', '.binarypb']);
let copied = 0;

for (const entry of fs.readdirSync(srcDir, { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  const ext = path.extname(entry.name).toLowerCase();
  if (!allowedExt.has(ext)) continue;
  fs.copyFileSync(path.join(srcDir, entry.name), path.join(destDir, entry.name));
  copied++;
}

console.log(`[copy-mediapipe] Synced ${copied} runtime files to public/mediapipe/hands/`);
