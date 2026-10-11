// Pengujian fungsi murni router. Tidak memakai DOM sehingga bisa dijalankan
// langsung dari Node.

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  BATAS_SESI_MS,
  KUNCI_SESI,
  bacaSesi,
  gabungState,
  hitungBadge,
  jarakLevenshtein,
  nomorValid,
  normalisasiKata,
  parseQuery,
  saranTerdekat,
  simpanSesi,
  stateAwal,
  stateToQuery,
} from '../src/router-core.mjs';

const DATA = {
  pages: [{ id: 'beranda' }, { id: 'login' }, { id: 'dashboard' }, { id: 'laporan-bulanan' }],
  defaultLang: 'id',
  langs: { id: { label: 'Indonesia', dir: 'pages' } },
};

const DATA_BERANDA = {
  ...DATA,
  pages: [{ id: 'beranda' }, { id: 'login' }, { id: 'dashboard' }, { id: 'laporan-bulanan' }],
};

const HALAMAN_LOGIN = {
  id: 'login',
  langkah: [{ n: 1 }, { n: 2 }, { n: 3 }],
  videos: [{ judul: 'Satu' }, { judul: 'Dua' }],
};

const SEKARANG = 1_700_000_000_000;

/** Penyimpanan sederhana untuk menguji bacaSesi dan simpanSesi. */
function penyimpananPalsu() {
  const isi = new Map();
  return {
    isi,
    getItem(kunci) { return isi.has(kunci) ? isi.get(kunci) : null; },
    setItem(kunci, nilai) { isi.set(kunci, String(nilai)); },
    removeItem(kunci) { isi.delete(kunci); },
  };
}

test('parseQuery tanpa parameter membuka halaman Beranda', () => {
  const hasil = parseQuery('', DATA);
  assert.deepEqual(hasil.state, { view: 'page', pageId: 'beranda', tab: 'guide', step: null, lang: null });
  assert.equal(hasil.unknownPage, false);
});

test('Beranda memakai id beranda dan tidak ditulis ulang ke query', () => {
  const hasil = parseQuery('?p=beranda', DATA_BERANDA);
  assert.equal(hasil.state.view, 'page');
  assert.equal(hasil.state.pageId, 'beranda');
  assert.equal(hasil.unknownPage, false);
  assert.equal(stateToQuery({ view: 'page', pageId: 'beranda', tab: 'guide', step: null, lang: null }), '');
});

test('parseQuery membaca p, tab, dan s lengkap', () => {
  const hasil = parseQuery('?p=login&tab=video&s=3', DATA);
  assert.deepEqual(hasil.state, { view: 'page', pageId: 'login', tab: 'video', step: 3, lang: null });
  assert.equal(hasil.unknownPage, false);
});

test('tab video dengan s berarti nomor video', () => {
  const hasil = parseQuery('?p=login&tab=video&s=2', DATA);
  assert.equal(hasil.state.tab, 'video');
  assert.equal(hasil.state.step, 2);
  assert.equal(hasil.unknownPage, false);
  assert.equal(nomorValid(hasil.state, HALAMAN_LOGIN), 2);
});

test('nomorValid menerima langkah pada tab guide', () => {
  assert.equal(nomorValid({ tab: 'guide', step: 1 }, HALAMAN_LOGIN), 1);
  assert.equal(nomorValid({ tab: 'guide', step: 3 }, HALAMAN_LOGIN), 3);
  assert.equal(nomorValid({ tab: 'guide', step: null }, HALAMAN_LOGIN), null);
  assert.equal(nomorValid({ tab: 'guide', step: 4 }, HALAMAN_LOGIN), null);
});

test('nomorValid menerima nomor video pada tab video', () => {
  assert.equal(nomorValid({ tab: 'video', step: 1 }, HALAMAN_LOGIN), 1);
  assert.equal(nomorValid({ tab: 'video', step: 2 }, HALAMAN_LOGIN), 2);
  assert.equal(nomorValid({ tab: 'video', step: null }, HALAMAN_LOGIN), null);
});

test('nomor di luar jumlah video diabaikan tanpa galat', () => {
  assert.equal(nomorValid({ tab: 'video', step: 3 }, HALAMAN_LOGIN), null);
  assert.equal(nomorValid({ tab: 'video', step: 99 }, HALAMAN_LOGIN), null);
  assert.equal(nomorValid({ tab: 'video', step: 1 }, null), null);
  assert.equal(nomorValid({ tab: 'guide', step: 0 }, HALAMAN_LOGIN), null);
});

test('?p=changelog membuka tampilan catatan perubahan', () => {
  const hasil = parseQuery('?p=changelog', DATA);
  assert.equal(hasil.state.view, 'changelog');
  assert.equal(hasil.state.pageId, null);
  assert.equal(hasil.unknownPage, false);
});

test('stateToQuery menulis ?p=changelog untuk tampilan catatan', () => {
  assert.equal(stateToQuery({ view: 'changelog', pageId: null, tab: 'guide', step: null, lang: null }), '?p=changelog');
});

test('putar ulang ?p=changelog mengembalikan tampilan catatan', () => {
  const asal = { view: 'changelog', pageId: null, tab: 'guide', step: null, lang: null };
  assert.deepEqual(parseQuery(stateToQuery(asal), DATA).state, asal);
});

test('gabungState membersihkan isi ketika view catatan', () => {
  const kotor = { view: 'changelog', pageId: 'login', tab: 'video', step: 2, lang: null };
  assert.deepEqual(gabungState(kotor, {}), { view: 'changelog', pageId: null, tab: 'guide', step: null, lang: null });
});

test('sesi tampilan catatan tersimpan dan terbaca kembali', () => {
  const sesi = penyimpananPalsu();
  simpanSesi(sesi, { view: 'changelog', pageId: null, tab: 'guide', step: null }, 300, SEKARANG);
  const hasil = bacaSesi(sesi, SEKARANG + 1000);
  assert.equal(hasil.view, 'changelog');
  assert.equal(hasil.pageId, null);
});

test('hitungBadge memberi Baru untuk halaman yang baru ditambah', () => {
  const aturan = { newDays: 30, updatedDays: 45 };
  assert.deepEqual(hitungBadge('2026-09-20', '2026-09-20', '2026-10-09', aturan), ['baru']);
  assert.deepEqual(hitungBadge('2026-09-09', '2026-09-09', '2026-10-09', aturan), ['baru']);
});

test('hitungBadge memberi Diperbarui untuk halaman lama yang baru disentuh', () => {
  const aturan = { newDays: 30, updatedDays: 45 };
  assert.deepEqual(hitungBadge('2026-01-10', '2026-09-20', '2026-10-09', aturan), ['diperbarui']);
});

test('hitungBadge kosong untuk halaman yang sudah lama', () => {
  const aturan = { newDays: 30, updatedDays: 45 };
  assert.deepEqual(hitungBadge('2026-01-10', '2026-01-15', '2026-10-09', aturan), []);
});

test('Baru menyembunyikan Diperbarui pada kartu yang sama', () => {
  const aturan = { newDays: 30, updatedDays: 45 };
  assert.deepEqual(hitungBadge('2026-10-01', '2026-10-05', '2026-10-09', aturan), ['baru']);
});

test('since kosong tidak pernah Baru, hanya bisa Diperbarui', () => {
  const aturan = { newDays: 30, updatedDays: 45 };
  assert.deepEqual(hitungBadge(null, '2026-10-05', '2026-10-09', aturan), ['diperbarui']);
  assert.deepEqual(hitungBadge('', '2026-10-05', '2026-10-09', aturan), ['diperbarui']);
  assert.deepEqual(hitungBadge(undefined, '2026-10-05', '2026-10-09', aturan), ['diperbarui']);
  assert.deepEqual(hitungBadge(null, '2026-01-15', '2026-10-09', aturan), []);
});

test('hitungBadge menahan tanggal yang salah bentuk', () => {
  const aturan = { newDays: 30, updatedDays: 45 };
  assert.deepEqual(hitungBadge('bukan-tanggal', '2026-10-05', '2026-10-09', aturan), ['diperbarui']);
  assert.deepEqual(hitungBadge(null, null, '2026-10-09', aturan), []);
  assert.deepEqual(hitungBadge('2026-10-01', '2026-10-05', 'salah', aturan), []);
  assert.deepEqual(hitungBadge('2026-12-01', '2026-12-01', '2026-10-09', aturan), []);
});

test('parseQuery menandai halaman yang tidak dikenal', () => {
  const hasil = parseQuery('?p=login2', DATA);
  assert.equal(hasil.state.view, 'page');
  assert.equal(hasil.state.pageId, 'login2');
  assert.equal(hasil.unknownPage, true);
});

test('parseQuery mengabaikan parameter tak dikenal', () => {
  const hasil = parseQuery('?p=login&warna=biru&x=1&s=2&tab=guide', DATA);
  assert.equal(hasil.state.pageId, 'login');
  assert.equal(hasil.state.step, 2);
  assert.equal(hasil.state.tab, 'guide');
});

test('parseQuery mengabaikan tab yang tidak dikenal', () => {
  assert.equal(parseQuery('?p=login&tab=audio', DATA).state.tab, 'guide');
  assert.equal(parseQuery('?p=login&tab=', DATA).state.tab, 'guide');
  assert.equal(parseQuery('?p=login&tab=VIDEO', DATA).state.tab, 'guide');
});

test('parseQuery mengabaikan langkah yang bukan angka positif', () => {
  for (const nilai of ['abc', '-2', '0', '1.5', '', ' ', '2a']) {
    assert.equal(parseQuery(`?p=login&s=${encodeURIComponent(nilai)}`, DATA).state.step, null, `s=${nilai}`);
  }
  assert.equal(parseQuery('?p=login&s=1', DATA).state.step, 1);
  assert.equal(parseQuery('?p=login&s=12', DATA).state.step, 12);
});

test('parseQuery mengabaikan p kosong', () => {
  assert.equal(parseQuery('?p=', DATA).state.pageId, 'beranda');
  assert.equal(parseQuery('?tab=video', DATA).state.pageId, 'beranda');
});

test('parseQuery hanya menerima bahasa yang terdaftar dan bukan bawaan', () => {
  const duaBahasa = { ...DATA, langs: { ...DATA.langs, en: { label: 'English', dir: 'pages.en' } } };
  assert.equal(parseQuery('?lang=en', duaBahasa).state.lang, 'en');
  assert.equal(parseQuery('?lang=id', duaBahasa).state.lang, null, 'bahasa bawaan tidak perlu dimuat');
  assert.equal(parseQuery('?lang=zz', duaBahasa).state.lang, null);
  assert.equal(parseQuery('?lang=bahasa', duaBahasa).state.lang, null);
});

test('stateToQuery hanya memuat parameter bermakna', () => {
  assert.equal(stateToQuery(stateAwal()), '');
  assert.equal(stateToQuery({ view: 'page', pageId: 'login', tab: 'guide', step: null, lang: null }), '?p=login');
  assert.equal(stateToQuery({ view: 'page', pageId: 'login', tab: 'video', step: null, lang: null }), '?p=login&tab=video');
  assert.equal(stateToQuery({ view: 'page', pageId: 'login', tab: 'guide', step: 3, lang: null }), '?p=login&s=3');
  assert.equal(stateToQuery({ view: 'page', pageId: 'login', tab: 'video', step: 3, lang: null }), '?p=login&tab=video&s=3');
  assert.equal(stateToQuery({ view: 'home', pageId: null, tab: 'guide', step: 3, lang: null }), '');
  assert.equal(stateToQuery({ view: 'changelog', pageId: null, tab: 'guide', step: null, lang: null }), '?p=changelog');
  assert.equal(stateToQuery({ view: 'page', pageId: 'login', tab: 'guide', step: 0, lang: null }), '?p=login');
  assert.equal(stateToQuery({ view: 'page', pageId: 'login', tab: 'guide', step: null, lang: 'en' }), '?p=login&lang=en');
});

test('stateToQuery meloloskan karakter khusus pada id halaman', () => {
  assert.equal(stateToQuery({ view: 'page', pageId: 'a b&c', tab: 'guide', step: null, lang: null }), '?p=a%20b%26c');
});

test('putar ulang parseQuery(stateToQuery(state)) mengembalikan state yang sama', () => {
  const daftar = [
    stateAwal(),
    { view: 'page', pageId: 'login', tab: 'guide', step: null, lang: null },
    { view: 'page', pageId: 'dashboard', tab: 'video', step: 2, lang: null },
    { view: 'page', pageId: 'laporan-bulanan', tab: 'video', step: 10, lang: 'en' },
    { view: 'page', pageId: 'login', tab: 'guide', step: 1, lang: 'en' },
  ];
  const dataDuaBahasa = { ...DATA, langs: { ...DATA.langs, en: { label: 'English', dir: 'pages.en' } } };
  for (const asal of daftar) {
    const kueri = stateToQuery(asal);
    const hasil = parseQuery(kueri, dataDuaBahasa);
    assert.deepEqual(hasil.state, asal, `putar ulang gagal untuk ${kueri}`);
    assert.equal(hasil.unknownPage, false);
  }
});

test('gabungState membersihkan isi ketika view bukan halaman', () => {
  const dirty = { view: 'changelog', pageId: 'login', tab: 'video', step: 3, lang: null };
  assert.deepEqual(gabungState(dirty, {}), { view: 'changelog', pageId: null, tab: 'guide', step: null, lang: null });
  const kept = { view: 'page', pageId: 'login', tab: 'guide', step: null, lang: null };
  assert.deepEqual(gabungState(kept, { tab: 'video' }), { ...kept, tab: 'video' });
  const beranda = { view: 'page', pageId: 'beranda', tab: 'guide', step: null, lang: null };
  assert.deepEqual(gabungState(beranda, {}), beranda);
});

test('jarakLevenshtein menghitung jarak yang benar', () => {
  assert.equal(jarakLevenshtein('', ''), 0);
  assert.equal(jarakLevenshtein('abc', 'abc'), 0);
  assert.equal(jarakLevenshtein('abc', ''), 3);
  assert.equal(jarakLevenshtein('', 'abc'), 3);
  assert.equal(jarakLevenshtein('kitten', 'sitting'), 3);
  assert.equal(jarakLevenshtein('login2', 'login'), 1);
});

test('normalisasiKata membuang tanda baca dan huruf besar', () => {
  assert.equal(normalisasiKata('Login 2!'), 'login 2');
  assert.equal(normalisasiKata('Café--Mkop'), 'cafe mkop');
  assert.equal(normalisasiKata('  Laporan   Bulanan  '), 'laporan bulanan');
  assert.equal(normalisasiKata(''), '');
});

test('saranTerdekat menemukan Login dari ketik login2', () => {
  const saran = saranTerdekat('login2', [
    { id: 'login', title: 'Login' },
    { id: 'dashboard', title: 'Dashboard' },
    { id: 'laporan-bulanan', title: 'Laporan Bulanan' },
  ]);
  assert.ok(saran.length >= 1);
  assert.equal(saran[0].id, 'login');
  assert.ok(saran.length <= 3);
});

test('saranTerdekat tidak_null dan tidak lebih dari batas', () => {
  assert.deepEqual(saranTerdekat('', DATA.pages), []);
  const saran = saranTerdekat('zzzzzz', [
    { id: 'login', title: 'Login' },
    { id: 'dashboard', title: 'Dashboard' },
    { id: 'laporan-bulanan', title: 'Laporan Bulanan' },
    { id: 'profil', title: 'Profil' },
  ]);
  assert.ok(saran.length <= 3);
  for (const s of saran) assert.equal(typeof s.id, 'string');
});

test('saranTerdekat membatasi jumlah hasil', () => {
  const daftar = [
    { id: 'a', title: 'A' }, { id: 'ab', title: 'AB' },
    { id: 'abc', title: 'ABC' }, { id: 'abcd', title: 'ABCD' },
  ];
  assert.ok(saranTerdekat('ab', daftar, 2).length <= 2);
});

test('simpanSesi menulis posisi ke sessionStorage', () => {
  const sesi = penyimpananPalsu();
  simpanSesi(sesi, { pageId: 'login', tab: 'video', step: 3 }, 812.4, SEKARANG);
  assert.ok(sesi.getItem(KUNCI_SESI));
  const tersimpan = JSON.parse(sesi.getItem(KUNCI_SESI));
  assert.equal(tersimpan.pageId, 'login');
  assert.equal(tersimpan.tab, 'video');
  assert.equal(tersimpan.step, 3);
  assert.equal(tersimpan.scrollY, 812);
  assert.equal(tersimpan.ts, SEKARANG);
});

test('bacaSesi mengembalikan posisi yang masih berlaku', () => {
  const sesi = penyimpananPalsu();
  simpanSesi(sesi, { pageId: 'login', tab: 'guide', step: 2 }, 100, SEKARANG);
  const hasil = bacaSesi(sesi, SEKARANG + 1000);
  assert.equal(hasil.pageId, 'login');
  assert.equal(hasil.step, 2);
});

test('bacaSesi menolak posisi yang kedaluwarsa setelah 12 jam', () => {
  const sesi = penyimpananPalsu();
  simpanSesi(sesi, { pageId: 'login', tab: 'guide', step: 2 }, 100, SEKARANG);
  assert.equal(bacaSesi(sesi, SEKARANG + BATAS_SESI_MS + 1), null);
  assert.notEqual(bacaSesi(sesi, SEKARANG + BATAS_SESI_MS), null);
});

test('bacaSesi menahan muatan rusak dan beranda', () => {
  const rusak = penyimpananPalsu();
  rusak.setItem(KUNCI_SESI, 'bukan json');
  assert.equal(bacaSesi(rusak, SEKARANG), null);

  const takValid = penyimpananPalsu();
  takValid.setItem(KUNCI_SESI, JSON.stringify({ view: 'lain', pageId: null, tab: 'guide', step: null, ts: SEKARANG }));
  assert.equal(bacaSesi(takValid, SEKARANG), null);

  const beranda = penyimpananPalsu();
  beranda.setItem(KUNCI_SESI, JSON.stringify({
    view: 'page', pageId: 'beranda', tab: 'guide', step: null, ts: SEKARANG,
  }));
  assert.equal(bacaSesi(beranda, SEKARANG).pageId, 'beranda');
});

test('bacaSesi menangani penyimpanan yang tidak tersedia', () => {
  assert.equal(bacaSesi(null, SEKARANG), null);
  assert.equal(bacaSesi({}, SEKARANG), null);
  assert.doesNotThrow(() => simpanSesi(null, { pageId: 'login', tab: 'guide', step: null }, 0, SEKARANG));
});