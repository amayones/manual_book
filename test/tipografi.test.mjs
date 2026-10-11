// Pengujian aturan tipografi pada styles.css hasil build.
//
// Aturan yang dijaga:
// - Semua font-size memakai variabel --t-* (t-judul, t-bagian, t-isi,
//   t-kecil).
// - Hanya dua ketebalan: 400 dan 600.
// - Tidak ada text-transform: uppercase maupun letter-spacing.
// - Tidak ada font monospace.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { AKAR_PROYEK, buatProyekUji } from './alat.mjs';

const UKURAN_DIizinkan = [
  'var(--t-judul)',
  'var(--t-bagian)',
  'var(--t-isi)',
  'var(--t-kecil)',
];

/** Membangun proyek uji lalu membaca CSS sumber yang sudah diawetkan. */
async function cssHasilBuild() {
  const proyek = await buatProyekUji();
  try {
    execFileSync(process.execPath, [
      path.join(AKAR_PROYEK, 'scripts', 'build.mjs'),
      `--akar=${proyek.akar}`,
      '--no-budget',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const nama = fs.readdirSync(path.join(proyek.dist, 'assets'))
      .find((n) => /^app\.[0-9a-f]{8}\.css$/.test(n));
    assert.ok(nama, 'berkas CSS hasil build harus ada');
    return fs.readFileSync(path.join(proyek.dist, 'assets', nama), 'utf8');
  } finally {
    proyek.bersih();
  }
}

/**
 * CSS yang diperiksa adalah styles.css sumber setelah warna aksen disubstitusi,
 * karena berisi sepotongan CSS contoh milik proyek uji.
 */
async function cssSumber() {
  const asli = fs.readFileSync(path.join(AKAR_PROYEK, 'src', 'styles.css'), 'utf8');
  return asli
    .split('{{AKSEN}}').join('#2563eb')
    .split('{{AKSEN_GELAP}}').join('#60a5fa');
}

test('semua font-size memakai variabel --t-*', async () => {
  const css = await cssSumber();
  const semua = css.match(/font-size:([^;}]+)/g) ?? [];
  assert.ok(semua.length > 10, `hanya ditemukan ${semua.length} aturan font-size`);
  const buruk = semua.filter((d) => !UKURAN_DIizinkan.some((v) => d.includes(v)));
  assert.deepEqual(buruk, [], `font-size di luar variabel: ${buruk.join(' | ')}`);
});

test('hanya ada dua ketebalan: 400 dan 600', async () => {
  const css = await cssSumber();
  const bobot = new Set((css.match(/font-weight: ?([0-9]+)/g) ?? []).map((d) => d.split(':')[1].trim()));
  for (const b of bobot) {
    assert.ok(['400', '600'].includes(b), `ketebalan ${b} di luar 400 dan 600`);
  }
  assert.ok(bobot.has('400'), `harus ada ketebalan 400, yang ada: ${[...bobot].join(',')}`);
  assert.ok(bobot.has('600'), `harus ada ketebalan 600, yang ada: ${[...bobot].join(',')}`);
});

test('tidak ada text-transform uppercase maupun letter-spacing', async () => {
  const css = await cssSumber();
  assert.ok(!/text-transform:\s*uppercase/i.test(css), 'dilarang text-transform uppercase');
  assert.ok(!/letter-spacing/i.test(css), 'dilarang letter-spacing');
});

test('tidak ada font monospace', async () => {
  const css = await cssSumber();
  assert.ok(!/monospace/i.test(css), 'dilarang font monospace');
  assert.ok(!/font-mono/.test(css), 'dilarang token font-mono');
  assert.ok(!/ui-monospace|SFMono|Menlo|Consolas/.test(css), 'dilarang nama font monospace');
});

test('waktu bab memakai angka tabular, bukan font berbeda', async () => {
  const css = await cssSumber();
  assert.match(css, /font-variant-numeric: ?tabular-nums/, 'waktu bab harus memakai tabular-nums');
});

test('lintasan isi dibatasi maksimal 68 karakter', async () => {
  const css = await cssSumber();
  const ch = css.match(/max-width: ?([0-9]+)ch/g) ?? [];
  assert.ok(ch.length >= 2, `hanya ditemukan ${ch.length} aturan max-width dalam ch`);
  for (const nilai of ch) {
    const angka = Number(nilai.match(/([0-9]+)/)[1]);
    assert.ok(angka >= 60 && angka <= 72, `lebar baris ${angka}ch di luar 60 sampai 72`);
  }
});

test('isi memakai line-height 1,65', async () => {
  const css = await cssSumber();
  assert.match(css, /line-height: ?1\.65/);
});