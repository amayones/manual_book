// scripts/validate.mjs - memeriksa seluruh konten tanpa menulis dist.
//
// Jalankan berkas ini setiap kali selesai menulis konten.
// Opsi: --strict menjadikan peringatan sebagai kesalahan.

import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { muatConfig, GalatConfig } from './lib/config.mjs';
import { muatSemuaHalaman, validasiSemua } from './lib/content.mjs';
import { formatMasalah, ringkasPemakaian } from './lib/rules.mjs';

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KETAT = process.argv.slice(2).includes('--strict');

let config;
try {
  config = await muatConfig(AKAR);
} catch (galat) {
  if (galat instanceof GalatConfig) {
    process.stderr.write(`\n${formatMasalah(galat.daftar, 'Config tidak valid')}\n`);
    process.exit(1);
  }
  throw galat;
}

const { daftar, diabaikan, info } = muatSemuaHalaman({ akarProyek: AKAR, config });
const { galat, peringatan } = validasiSemua(daftar, { config, akarProyek: AKAR });
const total = ringkasPemakaian(daftar);

for (const catatan of info) process.stdout.write(`catatan: ${catatan}\n`);
for (const f of diabaikan) process.stdout.write(`diabaikan: ${f}\n`);

if (peringatan.length) {
  process.stdout.write(`\n${formatMasalah(peringatan, `Peringatan (${peringatan.length})`)}\n`);
}
if (galat.length) {
  process.stderr.write(`\n${formatMasalah(galat, `Kesalahan (${galat.length})`)}\n`);
}
if (KETAT && peringatan.length && galat.length === 0) {
  process.stderr.write(`\nMode --strict: ${peringatan.length} peringatan dianggap kesalahan.\n`);
}

const adaKendala = galat.length > 0 || (KETAT && peringatan.length > 0);
process.stdout.write(
  `Ringkasan: ${total.halaman} halaman, ${total.langkah} langkah, ${total.video} video.\n`,
);
process.stdout.write(
  `${galat.length} kesalahan, ${peringatan.length} peringatan.\n`
  + (adaKendala ? 'Konten belum siap.\n' : 'Konten siap.\n'),
);
process.exit(adaKendala ? 1 : 0);
