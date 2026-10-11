// Pengujian fungsi pembacaan blok ::: dan utilitas direktif.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  formatDetik,
  keDetik,
  parseDurasi,
  parseLangkah,
  parsePin,
  parseUrlYoutube,
  parseVideo,
  pecahBagian,
  pecahBlok,
  urlEmbed,
  urlThumbnail,
} from '../scripts/lib/directives.mjs';

test('keDetik mengubah mm:ss menjadi detik', () => {
  assert.equal(keDetik('00:42'), 42);
  assert.equal(keDetik('2:15'), 135);
  assert.equal(keDetik('1:02:30'), 3750);
  assert.equal(keDetik('salah'), null);
});

test('formatDetik menulis ulang menjadi mm:ss', () => {
  assert.equal(formatDetik(135), '2:15');
  assert.equal(formatDetik(9), '0:09');
  assert.equal(formatDetik(3750), '1:02:30');
});

test('parseDurasi menerima dua bentuk penulisan', () => {
  assert.deepEqual(parseDurasi('2:15'), { detik: 135, teks: '2:15' });
  assert.deepEqual(parseDurasi('2 menit 15 detik'), { detik: 135, teks: '2 menit 15 detik' });
  assert.deepEqual(parseDurasi('45 detik'), { detik: 45, teks: '45 detik' });
  assert.deepEqual(parseDurasi('2 menit 15 ons'), { salah: true, teks: '2 menit 15 ons' });
  assert.equal(parseDurasi(''), null);
});

test('pecahBlok memisahkan blok dan menandai blok tak tertutup', () => {
  const sumber = ['::: pin', '1. [10,20] Label', ':::', '', '::: note', 'Catatan', ':::'].join('\n');
  const blok = pecahBlok(sumber, 1);
  assert.equal(blok.length, 2);
  assert.equal(blok[0].tipe, 'pin');
  assert.equal(blok[0].baris, 1);
  assert.equal(blok[0].barisAkhir, 3);
  assert.equal(blok[1].tipe, 'note');
  assert.equal(blok[1].baris, 5);

  const rusak = pecahBlok('::: warn\nPerhatian', 10);
  assert.equal(rusak[0].belumDitutup, true);
  assert.equal(rusak[0].baris, 10);
});

test('parsePin membaca nomor, koordinat, dan label', () => {
  const pin = parsePin('1. [82,22] Kolom email\n2. [50,50] Tombol', 7);
  assert.equal(pin.length, 2);
  assert.equal(pin[0].nomor, 1);
  assert.equal(pin[0].x, 82);
  assert.equal(pin[0].y, 22);
  assert.equal(pin[0].label, 'Kolom email');
  assert.equal(pin[0].baris, 7);
  assert.equal(pin[1].baris, 8);
});

test('parsePin menandai koordinat yang tidak terbaca', () => {
  const pin = parsePin('1. 50,20 Tanpa kurung', 1);
  assert.equal(pin[0].salahBentuk, true);
  assert.equal(pin[0].x, null);
});

test('parseVideo membaca judul, penjelasan, tautan, durasi, dan bab', () => {
  const isi = [
    '### 1. Login pertama',
    '',
    'Penjelasan singkat.',
    '',
    'https://www.youtube.com/watch?v=VIDEO_ID_CONTOH',
    '',
    'Durasi: 2 menit 15 detik',
    '',
    '- 00:00 → Membuka aplikasi',
    '- 00:42 → Mengisi kolom',
  ].join('\n');
  const v = parseVideo(isi, 30);
  assert.equal(v.judul, '1. Login pertama');
  assert.equal(v.penjelasan, 'Penjelasan singkat.');
  assert.equal(v.tautan, 'https://www.youtube.com/watch?v=VIDEO_ID_CONTOH');
  assert.equal(v.durasi.detik, 135);
  assert.equal(v.bab.length, 2);
  assert.equal(v.bab[0].detik, 0);
  assert.equal(v.bab[1].detik, 42);
  assert.equal(v.bab[1].label, 'Mengisi kolom');
});

test('parseVideo menandai durasi yang salah bentuk', () => {
  const isi = ['### 1. Judul', '', 'Penjelasan.', '', 'https://youtu.be/abcdefghijk', '', 'Durasi: 2 menit 15 ons'].join('\n');
  const v = parseVideo(isi, 1);
  assert.equal(v.durasi.salah, true);
});

test('parseLangkah memisahkan langkah, gambar, dan blok', () => {
  const isi = [
    '### 1. Langkah pertama',
    '![Gambar satu](/assets/login/step-1.png)',
    '::: pin',
    '1. [82,22] Kolom email',
    ':::',
    'Penjelasan langkah pertama.',
    '',
    '### 2. Langkah kedua',
    '![Gambar dua](/assets/login/step-2.png)',
    'Penjelasan langkah kedua.',
  ].join('\n');
  const langkah = parseLangkah(isi, 10);
  assert.equal(langkah.length, 2);
  assert.equal(langkah[0].n, 1);
  assert.equal(langkah[0].judul, 'Langkah pertama');
  assert.equal(langkah[0].gambar.path, '/assets/login/step-1.png');
  assert.equal(langkah[0].gambar.baris, 11);
  assert.equal(langkah[0].penjelasanAda, true);
  assert.equal(langkah[0].pin.tipe, 'pin');
  assert.equal(langkah[0].pinTanpaGambar, null);
  assert.equal(langkah[1].n, 2);
  assert.equal(langkah[1].judul, 'Langkah kedua');
});

test('parseLangkah menandai pin yang tidak punya gambar', () => {
  const isi = ['### 1. Langkah', '::: pin', '1. [10,10] Label', ':::', 'Penjelasan.'].join('\n');
  const langkah = parseLangkah(isi, 1);
  assert.equal(langkah[0].gambar, null);
  assert.notEqual(langkah[0].pinTanpaGambar, null);
});

test('parseUrlYoutube mengenali beberapa bentuk URL', () => {
  const bentuk = [
    'https://www.youtube.com/watch?v=abcdefghijk',
    'https://youtu.be/abcdefghijk',
    'https://www.youtube.com/shorts/abcdefghijk',
    'https://www.youtube.com/embed/abcdefghijk',
    'https://m.youtube.com/watch?v=abcdefghijk&t=90',
  ];
  for (const url of bentuk) {
    const hasil = parseUrlYoutube(url);
    assert.equal(hasil.id, 'abcdefghijk', `gagal pada ${url}`);
  }
  assert.equal(parseUrlYoutube('https://vimeo.com/123456'), null);
  assert.equal(parseUrlYoutube('bukan url'), null);
  assert.equal(parseUrlYoutube('https://www.youtube.com/watch?v=abcdefghijk&t=90').mulaiDetik, 90);
});

test('urlEmbed memuat enablejsapi=1 agar bab video bisa dilompati', () => {
  const url = urlEmbed('abcdefghijk', 42);
  assert.match(url, /^https:\/\/www\.youtube-nocookie\.com\/embed\/abcdefghijk\?/);
  assert.match(url, /enablejsapi=1/);
  assert.match(url, /start=42/);
});

test('urlThumbnail memakai i.ytimg.com tanpa kunci API', () => {
  assert.equal(urlThumbnail('abcdefghijk'), 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
});

test('pecahBagian memisahkan bagian berdasarkan heading dua', () => {
  const isi = [
    '## Sebelum mulai',
    'Teks pertama.',
    '',
    '## Panduan',
    '### 1. Langkah',
    'Penjelasan.',
  ].join('\n');
  const bagian = pecahBagian(isi, 1);
  assert.equal(bagian.length, 2);
  assert.equal(bagian[0].judul, 'Sebelum mulai');
  assert.equal(bagian[1].judul, 'Panduan');
  assert.equal(bagian[1].baris, 4);
  assert.equal(bagian[1].barisIsi, 5);
  assert.equal(bagian[1].isi, '### 1. Langkah\nPenjelasan.');
});
