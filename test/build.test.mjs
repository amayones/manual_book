// Pengujian hasil build: dist harus lengkap, aset dan data ber-hash isi,
// serta tidak boleh memuat style sebaris atau skrip sebaris.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { AKAR_PROYEK, buatProyekUji } from './alat.mjs';

function jalankanBuild(proyek) {
  return execFileSync(process.execPath, [
    path.join(AKAR_PROYEK, 'scripts', 'build.mjs'),
    `--akar=${proyek.akar}`,
    '--no-budget',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function isiDist(proyek) {
  const hasil = [];
  const jelajah = (folder, relatif = '') => {
    for (const entri of fs.readdirSync(folder, { withFileTypes: true })) {
      const gabungan = relatif ? `${relatif}/${entri.name}` : entri.name;
      if (entri.isDirectory()) jelajah(path.join(folder, entri.name), gabungan);
      else hasil.push(gabungan);
    }
  };
  jelajah(proyek.dist);
  return hasil.sort();
}

test('build menghasilkan dist yang lengkap', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());

  const keluaran = jalankanBuild(proyek);
  const berkas = isiDist(proyek);

  assert.ok(berkas.includes('index.html'), 'index.html harus ada');
  assert.ok(berkas.includes('_headers'), '_headers harus ada');
  assert.ok(berkas.some((b) => /^assets\/app\.[0-9a-f]{8}\.js$/.test(b)), 'app.js ber-hash harus ada');
  assert.ok(berkas.some((b) => /^assets\/app\.[0-9a-f]{8}\.css$/.test(b)), 'app.css ber-hash harus ada');
  assert.ok(berkas.some((b) => /^assets\/theme-boot\.[0-9a-f]{8}\.js$/.test(b)), 'theme-boot ber-hash harus ada');
  assert.ok(berkas.some((b) => /^data\/id\.[0-9a-f]{8}\.json$/.test(b)), 'data JSON ber-hash harus ada');
  assert.ok(keluaran.includes('Halaman     : 2'), 'ringkasan harus menyebut jumlah halaman');
  assert.ok(keluaran.includes('hemat'), 'ringkasan harus menyebut penghematan WebP');
});

test('setiap gambar pada konten menghasilkan tepat satu berkas WebP', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  jalankanBuild(proyek);

  const webp = isiDist(proyek).filter((b) => b.endsWith('.webp'));
  // Dua gambar pada halaman uji dan satu gambar pada halaman induk.
  assert.equal(webp.length, 3);
  for (const nama of webp) {
    assert.match(nama, /\.[0-9a-f]{8}\.webp$/, `nama ${nama} harus memuat hash isi`);
  }
});

test('index.html menunjuk ke berkas ber-hash dan tidak memuat nilai kosong', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  jalankanBuild(proyek);

  const html = fs.readFileSync(path.join(proyek.dist, 'index.html'), 'utf8');
  assert.ok(!html.includes('{{'), 'semua placeholder harus terisi');
  assert.match(html, /data-json="\/data\/id\.[0-9a-f]{8}\.json"/);
  assert.match(html, /src="\/assets\/theme-boot\.[0-9a-f]{8}\.js"/);
  assert.match(html, /href="\/assets\/app\.[0-9a-f]{8}\.css"/);
  assert.match(html, /src="\/assets\/app\.[0-9a-f]{8}\.js"/);
});

test('index.html memuat sprite ikon tanpa style dan handler sebaris', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  jalankanBuild(proyek);

  const html = fs.readFileSync(path.join(proyek.dist, 'index.html'), 'utf8');
  assert.match(html, /<svg class="sprite"/);
  assert.match(html, /<symbol id="i-lock"/);
  assert.match(html, /<symbol id="i-ui-sun"/);
  assert.match(html, /<symbol id="i-ui-menu"/);
  const sprite = html.slice(html.indexOf('<svg class="sprite"'), html.indexOf('</svg>', html.indexOf('<svg class="sprite"')));
  assert.ok(!/\sstyle="/.test(sprite), 'sprite tidak boleh memuat atribut style');
  assert.ok(!/\son[a-z]+="/.test(sprite), 'sprite tidak boleh memuat handler sebaris');
  const idSimbol = [...sprite.matchAll(/<symbol id="([^"]+)"/g)].map((m) => m[1]);
  assert.equal(idSimbol.length, new Set(idSimbol).size, 'id simbol harus unik tanpa duplikat');
});

test('data JSON memakai nama ikon, bukan jalur SVG', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  jalankanBuild(proyek);

  const namaData = isiDist(proyek).find((b) => b.startsWith('data/'));
  const data = JSON.parse(fs.readFileSync(path.join(proyek.dist, ...namaData.split('/')), 'utf8'));
  for (const halaman of data.pages) {
    assert.equal(typeof halaman.icon, 'string');
    assert.ok(!('iconSvg' in halaman), 'iconSvg lama harus sudah hilang');
  }
  for (const grup of data.meta.groups) {
    assert.equal(typeof grup.icon, 'string');
    assert.ok(!('iconSvg' in grup), 'iconSvg lama harus sudah hilang');
  }
});
test('berkas bundle memuat router-core sebagai MBInti dalam satu berkas', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  jalankanBuild(proyek);

  const bundle = isiDist(proyek).find((b) => /^assets\/app\.[0-9a-f]{8}\.js$/.test(b));
  const isi = fs.readFileSync(path.join(proyek.dist, ...bundle.split('/')), 'utf8');
  assert.match(isi, /MBInti\s*=\s*\{/);
  assert.match(isi, /parseQuery/);
  assert.match(isi, /stateToQuery/);
  assert.match(isi, /saranTerdekat/);
  const berkasBundle = isiDist(proyek).filter((b) => /^assets\/app\.[0-9a-f]{8}\.js$/.test(b));
  assert.equal(berkasBundle.length, 1, 'hasil akhir tetap satu app.<hash>.js');
});

test('isi data JSON memuat id, order, readTime, dan kunci tahap 2', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  jalankanBuild(proyek);

  const namaData = isiDist(proyek).find((b) => b.startsWith('data/'));
  const data = JSON.parse(fs.readFileSync(path.join(proyek.dist, ...namaData.split('/')), 'utf8'));

  const halaman = data.pages.find((p) => p.id === 'induk');
  assert.equal(halaman.id, 'induk');
  assert.equal(halaman.order, 2);
  assert.ok(halaman.readTime >= 1);
  assert.equal(halaman.readTimeOtomatis, true);
  assert.equal(halaman.level, 'Dasar');
  assert.equal(halaman.icon, 'grid');
  assert.equal(halaman.langkah.length, 1);
  assert.match(halaman.langkah[0].gambar.src, /\/assets\/induk\/step-1\.[0-9a-f]{8}\.webp$/);
  assert.equal(halaman.langkah[0].gambar.width, 1200);
  assert.equal(data.features && typeof data.features, 'object');
  assert.equal(halaman.glossary.length, 0);
  assert.equal(halaman.feedback, null);
  assert.ok(data.changelog);
});

test('html langkah tidak memuat placeholder gambar', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  jalankanBuild(proyek);

  const namaData = isiDist(proyek).find((b) => b.startsWith('data/'));
  const data = JSON.parse(fs.readFileSync(path.join(proyek.dist, ...namaData.split('/')), 'utf8'));
  for (const halaman of data.pages) {
    assert.ok(!halaman.htmlLangkah.includes('{{img:'), `placeholder tersisa di ${halaman.id}`);
    assert.match(halaman.htmlLangkah, /<img src="\/assets\/.*\.webp"/);
    assert.match(halaman.htmlLangkah, /loading="lazy"/);
  }
});

test('build berhenti dan tidak menulis dist saat ada gambar yang hilang', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  fs.rmSync(path.join(proyek.akar, 'content', 'assets', 'uji', 'step-1.png'));
  fs.mkdirSync(proyek.dist, { recursive: true });
  fs.writeFileSync(path.join(proyek.dist, 'penanda.txt'), 'isi lama', 'utf8');

  let galat = null;
  let keluaran = '';
  try {
    keluaran = execFileSync(process.execPath, [
      path.join(AKAR_PROYEK, 'scripts', 'build.mjs'),
      `--akar=${proyek.akar}`,
      '--no-budget',
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (galatTangkap) {
    galat = galatTangkap;
    keluaran = `${galatTangkap.stdout ?? ''}${galatTangkap.stderr ?? ''}`;
  }

  assert.notEqual(galat, null, 'build harus gagal');
  assert.equal(galat.status, 1, 'kode keluar harus 1');
  assert.match(keluaran, /langkah 1/);
  assert.match(keluaran, /gambar assets\/uji\/step-1\.png tidak ditemukan/);
  assert.match(keluaran, /Folder dist\/ tidak ditulis/);
  assert.deepEqual(fs.readdirSync(proyek.dist), ['penanda.txt'], 'dist lama tidak boleh diubah');
});

test('data JSON memakai nama ber-hash sehingga aman di-cache immutable', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());

  jalankanBuild(proyek);
  const pertama = isiDist(proyek).find((b) => b.startsWith('data/'));

  jalankanBuild(proyek);
  const kedua = isiDist(proyek).find((b) => b.startsWith('data/'));
  assert.equal(pertama, kedua, 'konten sama harus menghasilkan nama berkas sama');

fs.appendFileSync(path.join(proyek.akar, 'content', 'pages', '02-induk.md'), '\nTambahan teks.\n', 'utf8');
  jalankanBuild(proyek);
  const ketiga = isiDist(proyek).filter((b) => b.startsWith('data/'));
  assert.equal(ketiga.length, 1, 'berkas data lama harus hilang karena dist dibersihkan');
  assert.notEqual(ketiga[0], kedua, 'konten berubah harus menghasilkan nama berkas baru');
});

test('ukuran dihitung dalam gzip dan dibandingkan dengan anggaran', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());

  const keluaran = jalankanBuild(proyek);
  assert.match(keluaran, /app\.js: [\d.]+ KiB gzip, batas 22 KiB/);
  assert.match(keluaran, /styles\.css: [\d.]+ KiB gzip, batas 12 KiB/);
  assert.ok(!keluaran.includes('LEWAT'), 'anggaran tidak boleh terlampaui');
});