// Pengujian konversi gambar: nama berkas harus berubah bila isi gambar berubah,
// dan tetap sama bila gambar tidak berubah.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';

import { namaHasil, prosesGambar, gantiPlaceholderGambar, kumpulkanPlaceholderGambar } from '../scripts/lib/images.mjs';
import { hashIsi } from '../scripts/lib/hash.mjs';

const CONFIG = {
  images: { format: 'webp', quality: 80, maxWidth: 1600, effort: 1, hashLength: 8, minWidth: 640 },
};

function buatProyek(akar) {
  const folder = path.join(akar, 'content', 'assets', 'uji');
  fs.mkdirSync(folder, { recursive: true });
  return folder;
}

async function gambar(warna, lebar = 1400, tinggi = 900) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${lebar}" height="${tinggi}">`
    + `<rect width="${lebar}" height="${tinggi}" fill="${warna}"/></svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

test('namaHasil menyisipkan hash isi di tengah nama berkas', () => {
  assert.equal(namaHasil('login/step-1.png', 'a3f9c2', 'webp'), 'login/step-1.a3f9c2.webp');
  assert.equal(namaHasil('step-1.png', 'a3f9c2', 'webp'), 'step-1.a3f9c2.webp');
});

test('hashIsi menghasilkan 8 karakter heksadesimal', () => {
  const h = hashIsi('isi berkasnya', 8);
  assert.match(h, /^[0-9a-f]{8}$/);
  assert.notEqual(hashIsi('isi satu', 8), hashIsi('isi dua', 8));
});

test('gambar yang sama menghasilkan nama berkas yang sama', async (t) => {
  const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-gambar-'));
  t.after(() => fs.rmSync(akar, { recursive: true, force: true }));
  const folder = buatProyek(akar);
  fs.writeFileSync(path.join(folder, 'step-1.png'), await gambar('#ffffff'));

  const pertama = await prosesGambar({ daftarPath: ['/assets/uji/step-1.png'], akarProyek: akar, config: CONFIG });
  const kedua = await prosesGambar({ daftarPath: ['/assets/uji/step-1.png'], akarProyek: akar, config: CONFIG });

  const nama1 = [...pertama.berkas.keys()][0];
  const nama2 = [...kedua.berkas.keys()][0];
  assert.equal(nama1, nama2);
  assert.match(nama1, /step-1\.[0-9a-f]{8}\.webp$/);
});

test('gambar yang diganti menghasilkan nama berkas yang berbeda', async (t) => {
  const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-gambar-'));
  t.after(() => fs.rmSync(akar, { recursive: true, force: true }));
  const folder = buatProyek(akar);
  const berkas = path.join(folder, 'step-1.png');

  fs.writeFileSync(berkas, await gambar('#ffffff'));
  const sebelum = await prosesGambar({ daftarPath: ['/assets/uji/step-1.png'], akarProyek: akar, config: CONFIG });

  fs.writeFileSync(berkas, await gambar('#123456'));
  const sesudah = await prosesGambar({ daftarPath: ['/assets/uji/step-1.png'], akarProyek: akar, config: CONFIG });

  const namaSebelum = [...sebelum.berkas.keys()][0];
  const namaSesudah = [...sesudah.berkas.keys()][0];
  assert.notEqual(namaSebelum, namaSesudah);
  assert.equal(namaSebelum.split('/').pop().startsWith('step-1.'), true);
  assert.equal(namaSesudah.split('/').pop().startsWith('step-1.'), true);
});

test('prosesGambar mencatat dimensi dan penghematan ukuran', async (t) => {
  const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-gambar-'));
  t.after(() => fs.rmSync(akar, { recursive: true, force: true }));
  const folder = buatProyek(akar);
  fs.writeFileSync(path.join(folder, 'step-1.png'), await gambar('#ffffff', 1400, 900));

  const hasil = await prosesGambar({ daftarPath: ['/assets/uji/step-1.png'], akarProyek: akar, config: CONFIG });
  const meta = hasil.peta.get('/assets/uji/step-1.png');
  assert.equal(meta.width, 1400);
  assert.equal(meta.height, 900);
  assert.ok(meta.bytesAsli > 0);
  assert.equal(hasil.ringkasan.jumlah, 1);
});

test('gambar lebih lebar dari maxWidth dikecilkan', async (t) => {
  const akar = fs.mkdtempSync(path.join(os.tmpdir(), 'manual-gambar-'));
  t.after(() => fs.rmSync(akar, { recursive: true, force: true }));
  const folder = buatProyek(akar);
  fs.writeFileSync(path.join(folder, 'lebar.png'), await gambar('#eeeeee', 2400, 1200));

  const hasil = await prosesGambar({
    daftarPath: ['/assets/uji/lebar.png'],
    akarProyek: akar,
    config: { ...CONFIG, images: { ...CONFIG.images, maxWidth: 1600 } },
  });
  const meta = hasil.peta.get('/assets/uji/lebar.png');
  assert.equal(meta.width, 1600);
  assert.equal(meta.height, 800);
});

test('gantiPlaceholderGambar mengganti semua placeholder', () => {
  const peta = new Map([['/assets/uji/step-1.png', { src: '/assets/uji/step-1.a3f9c2.webp', width: 1, height: 1 }]]);
  const html = '<p><span data-src="{{img:/assets/uji/step-1.png}}"></span></p>';
  assert.equal(gantiPlaceholderGambar(html, peta), '<p><span data-src="/assets/uji/step-1.a3f9c2.webp"></span></p>');
  assert.equal(gantiPlaceholderGambar('<p>{{img:/tidak/ada.png}}</p>', peta), '<p></p>');
});

test('kumpulkanPlaceholderGambar menemukan seluruh gambar pada HTML', () => {
  const html = '{{img:/assets/a.png}}<p>{{img:/assets/b.png}}</p>';
  assert.deepEqual(kumpulkanPlaceholderGambar(html), ['/assets/a.png', '/assets/b.png']);
});