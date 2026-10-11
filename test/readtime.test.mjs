// Pengujian perhitungan estimasi waktu baca.

import test from 'node:test';
import assert from 'node:assert/strict';

import { buangBlok, hitungKata, hitungReadTime, readTimeDariRaw } from '../scripts/lib/readtime.mjs';

test('hitungReadTime memakai rumus kata per 200 ditambah langkah dikali 0,5', () => {
  assert.equal(hitungReadTime({ kata: 200, langkah: 2 }), 2);
  assert.equal(hitungReadTime({ kata: 400, langkah: 2 }), 3);
  assert.equal(hitungReadTime({ kata: 0, langkah: 1 }), 1);
  assert.equal(hitungReadTime({ kata: 0, langkah: 4 }), 2);
});

test('hitungReadTime tidak pernah lebih kecil dari satu menit', () => {
  assert.equal(hitungReadTime({ kata: 1, langkah: 0 }), 1);
  assert.equal(hitungReadTime({ kata: 0, langkah: 0 }), 1);
});

test('hitungKata mengabaikan Markdown dan tautan gambar', () => {
  assert.equal(hitungKata('Halo dunia'), 2);
  assert.equal(hitungKata('# Judul\n\nParagraf **tebal**'), 3);
  assert.equal(hitungKata('![Gambar contoh](/assets/a.png)'), 0);
  assert.equal(hitungKata(''), 0);
});

test('buangBlok membuang isi blok :::', () => {
  const sumber = ['Paragraf pertama.', '', '::: tip', 'Isi tip', ':::', '', 'Paragraf kedua.'].join('\n');
  const sisa = buangBlok(sumber);
  assert.ok(sisa.includes('Paragraf pertama.'));
  assert.ok(sisa.includes('Paragraf kedua.'));
  assert.ok(!sisa.includes('Isi tip'));
  assert.ok(!sisa.includes(':::'));
});

test('readTimeDariRaw menghitung dari isi berkas Markdown', () => {
  const isi = ['## Panduan', '', '### 1. Langkah', '![Gambar](/assets/a.png)', 'Penjelasan langkah.'].join('\n');
  const hasil = readTimeDariRaw(isi, 1);
  assert.ok(hasil >= 1);
  assert.equal(typeof hasil, 'number');
});