// Pengujian validator: satu fixture untuk satu aturan.
//
// Semua fixture berada di test/fixtures/invalid dan daftarnya ada di
// test/aturan-validator.json. Setiap proyek uji dibuat di folder sementara
// supaya isi proyek utama tidak tersentuh.

import test from 'node:test';
import assert from 'node:assert/strict';

import { muatConfig } from '../scripts/lib/config.mjs';
import { muatSemuaHalaman, validasiSemua } from '../scripts/lib/content.mjs';
import { formatMasalah } from '../scripts/lib/rules.mjs';
import { FIXTURE_VALID, bacaAturan, buatProyekUji, kosongkanHalaman, pasangFixture } from './alat.mjs';

const daftarAturan = bacaAturan();

test('proyek contoh tanpa fixture lolos dari semua pemeriksaan', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  const config = await muatConfig(proyek.akar);
  const { daftar } = muatSemuaHalaman({ akarProyek: proyek.akar, config });
  const { galat } = validasiSemua(daftar, { config, akarProyek: proyek.akar });
  assert.equal(galat.length, 0, formatMasalah(galat, 'Galat tak terduga'));
});

test('halaman contoh menurunkan id, order, dan readTime dari nama file', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  const config = await muatConfig(proyek.akar);
  const { daftar } = muatSemuaHalaman({ akarProyek: proyek.akar, config });
  const induk = daftar.find((h) => h.namaBerkas === '02-induk.md');
  assert.equal(induk.id, 'induk');
  assert.equal(induk.order, 2);
  assert.equal(induk.readTime >= 1, true);
  assert.equal(induk.frontmatter.readTime, undefined);
  assert.equal(induk.level, 'Dasar');
  assert.equal(induk.icon, 'grid');
  assert.equal(induk.iconDariGrup, true);
});

test('fixture halaman yang benar lolos dari semua pemeriksaan', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  kosongkanHalaman(proyek);
  pasangFixture(proyek, {
    nama: 'valid',
    folder: FIXTURE_VALID,
    berkas: ['01-halaman-contoh.md'],
    salinFO: ['03-contoh.md'],
  });
  const config = await muatConfig(proyek.akar);
  const { daftar } = muatSemuaHalaman({ akarProyek: proyek.akar, config });
  const { galat } = validasiSemua(daftar, { config, akarProyek: proyek.akar });
  assert.equal(galat.length, 0, formatMasalah(galat, 'Galat tak terduga'));

  const contoh = daftar.find((h) => h.id === 'contoh');
  assert.equal(contoh.readTime >= 1, true);
  assert.equal(contoh.icon, 'lock');
  assert.equal(contoh.level, 'Dasar');
  assert.equal(contoh.featured, true);
  assert.equal(contoh.tags.length, 2);
  assert.equal(contoh.langkah.length, 2);
  assert.equal(contoh.videos.length, 1);
  assert.equal(contoh.problems.length, 1);
  assert.equal(contoh.videos[0].durasi.detik, 90);
  assert.equal(contoh.videos[0].bab.length, 2);
});

for (const aturan of daftarAturan) {
  test(`aturan ${aturan.nama} menghasilkan pesan yang benar`, async (t) => {
    const proyek = await buatProyekUji();
    t.after(() => proyek.bersih());
    pasangFixture(proyek, aturan);

    const config = await muatConfig(proyek.akar);
    const { daftar } = muatSemuaHalaman({ akarProyek: proyek.akar, config });
    const { galat, peringatan } = validasiSemua(daftar, { config, akarProyek: proyek.akar });
    const semuaPesan = galat.map((m) => `${m.file}: ${m.baris ?? '-'} ${m.konteks ?? ''} ${m.pesan}`);
    const semuaPeringatan = peringatan.map((m) => `${m.file}: ${m.konteks ?? ''} ${m.pesan}`);
    const kumpulan = aturan.peringatan ? peringatan : galat;
    const teks = kumpulan
      .map((m) => `${m.file}: ${m.konteks ?? ''} ${m.pesan}`)
      .concat(aturan.peringatan ? [] : semuaPesan);

    assert.ok(
      teks.some((p) => p.includes(aturan.pesan)),
      `pesan "${aturan.pesan}" tidak ditemukan. Pesan yang muncul:\n${teks.join('\n')}`,
    );

    for (const wajib of aturan.peringatan ?? []) {
      assert.ok(
        semuaPeringatan.some((p) => p.includes(wajib)),
        `peringatan "${wajib}" tidak ditemukan. Peringatan yang muncul:\n${semuaPeringatan.join('\n')}`,
      );
    }
  });
}

test('validasiTautanInternal menerima tautan menuju halaman yang ada', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  const config = await muatConfig(proyek.akar);
  const { daftar } = muatSemuaHalaman({ akarProyek: proyek.akar, config });
  const { galat } = validasiSemua(daftar, { config, akarProyek: proyek.akar });
  assert.equal(galat.length, 0, formatMasalah(galat, 'Galat tak terduga'));
});

test('formatMasalah mengelompokkan pesan per berkas', () => {
  const teks = formatMasalah([
    { file: 'a.md', baris: 3, konteks: 'langkah 1', pesan: 'Pesan satu.' },
    { file: 'a.md', baris: null, konteks: null, pesan: 'Pesan dua.' },
    { file: 'b.md', baris: 9, konteks: 'video 1', pesan: 'Pesan tiga.' },
  ], 'Judul Uji');
  assert.match(teks, /Judul Uji/);
  assert.match(teks, /a\.md/);
  assert.match(teks, /baris 3, langkah 1: Pesan satu\./);
  assert.match(teks, /Pesan dua\./);
  assert.match(teks, /b\.md/);
  assert.match(teks, /baris 9, video 1: Pesan tiga\./);
});