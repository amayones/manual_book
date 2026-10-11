// scripts/clean.mjs - menghapus folder hasil build.

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

for (const nama of ['dist']) {
  const p = path.join(AKAR, nama);
  if (fs.existsSync(p)) {
    fs.rmSync(p, { recursive: true, force: true });
    process.stdout.write(`${nama}/ dihapus\n`);
  } else {
    process.stdout.write(`${nama}/ memang tidak ada\n`);
  }
}
