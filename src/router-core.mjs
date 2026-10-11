// src/router-core.mjs - fungsi murni untuk router, tanpa DOM.
//
// Berkas ini diuji langsung dari Node memakai node:test, lalu digabungkan
// oleh build ke dalam app.<hash>.js. Tidak ada dependensi apa pun.

// Masa berlaku posisi terakhir yang dibaca, dalam milidetik.
export const BATAS_SESI_MS = 12 * 60 * 60 * 1000;

// Nama penyimpanan yang dipakai bersama antara modul ini dan app.js.
export const KUNCI_SESI = 'mb:last';

const TAB_SAH = ['guide', 'video'];
const BENTUK_LANG = /^[a-z]{2}(-[a-z]{2})?$/;
const MARAK_COMBINING = new RegExp('[\\u0300-\\u036f]', 'g');

/** Id halaman yang dibuka otomatis oleh sistem, bukan oleh penulis konten. */
export const ID_BERANDA = 'beranda';
export const ID_CATATAN = 'changelog';

/** State awal saat aplikasi dibuka tanpa parameter: halaman Beranda. */
export function stateAwal() {
  return { view: 'page', pageId: ID_BERANDA, tab: 'guide', step: null, lang: null };
}

/** Id yang dicadangkan untuk tampilan sistem dan tidak boleh dipakai konten. */
export const ID_SISTEM = [ID_BERANDA, ID_CATATAN];

/** Membuat salinan state baru dengan nilai yang berubah. */
export function gabungState(state, perubahan) {
  const baru = Object.assign({}, state, perubahan);
  if (baru.view !== 'page') {
    baru.pageId = null;
    baru.step = null;
    baru.tab = 'guide';
  }
  return baru;
}

/**
 * Membaca query string menjadi state.
 * Parameter tak dikenal diabaikan. Tab yang tidak dikenal kembali ke guide.
 * Langkah yang bukan angka positif diabaikan. Halaman yang tidak dikenal
 * tetap dikembalikan, ditandai oleh unknownPage.
 *
 * Data yang dibutuhkan: { pages: [{ id }], defaultLang, langs }
 */
export function parseQuery(search, data) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''));
  const state = stateAwal();
  const hasil = { state, unknownPage: false };

  const halamanAda = new Set((data?.pages ?? []).map((p) => p.id));

  const p = params.get('p');
  if (p !== null && p !== '') {
    if (p === ID_CATATAN) {
      state.view = 'changelog';
      state.pageId = null;
    } else {
      state.view = 'page';
      state.pageId = p;
      hasil.unknownPage = !halamanAda.has(p);
    }
  }

  const tab = params.get('tab');
  if (tab !== null && TAB_SAH.includes(tab)) state.tab = tab;

  const s = params.get('s');
  if (s !== null && /^\d+$/.test(s.trim()) && Number(s) >= 1) state.step = Number(s);

  const lang = params.get('lang');
  if (lang !== null && BENTUK_LANG.test(lang) && data?.langs && data.langs[lang]
    && lang !== data.defaultLang) {
    state.lang = lang;
  }

  return hasil;
}

/**
 * Menulis state menjadi query string.
 * Hanya parameter yang bermakna yang dimuat: p, tab bila bukan guide,
 * s bila langkah adalah angka positif, dan lang bila bukan bahasa bawaan.
 */
export function stateToQuery(state) {
  const bagian = [];
  if (state?.view === 'changelog') {
    bagian.push('p=changelog');
  } else if (state?.view === 'page' && state.pageId && state.pageId !== ID_BERANDA) {
    bagian.push(`p=${encodeURIComponent(state.pageId)}`);
    if (state.tab && state.tab !== 'guide') bagian.push(`tab=${encodeURIComponent(state.tab)}`);
    if (Number.isInteger(state.step) && state.step >= 1) bagian.push(`s=${state.step}`);
  }
  if (state?.lang) bagian.push(`lang=${encodeURIComponent(state.lang)}`);
  return bagian.length ? `?${bagian.join('&')}` : '';
}

/** Mengubah teks menjadi bentuk pembanding: huruf kecil tanpa tanda baca. */
export function normalisasiKata(teks) {
  return String(teks ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(MARAK_COMBINING, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Jarak Levenshtein sederhana. */
export function jarakLevenshtein(a, b) {
  const s = String(a ?? '');
  const t = String(b ?? '');
  if (s === t) return 0;
  if (!s.length) return t.length;
  if (!t.length) return s.length;

  let sebelumnya = new Array(t.length + 1);
  for (let j = 0; j <= t.length; j += 1) sebelumnya[j] = j;

  for (let i = 1; i <= s.length; i += 1) {
    const sekarang = [i];
    for (let j = 1; j <= t.length; j += 1) {
      const biaya = s[i - 1] === t[j - 1] ? 0 : 1;
      sekarang[j] = Math.min(sebelumnya[j] + 1, sekarang[j - 1] + 1, sebelumnya[j - 1] + biaya);
    }
    sebelumnya = sekarang;
  }
  return sebelumnya[t.length];
}

/**
 * Mencari halaman yang paling mirip dengan kata yang diketik.
 * Daftar masukan berupa [{ id, title }]. Mengembalikan maksimal batas item.
 */
export function saranTerdekat(kata, daftar, batas = 3) {
  const target = normalisasiKata(kata).replace(/\s+/g, '');
  if (!target) return [];

  const hasil = [];
  for (const item of daftar ?? []) {
    const id = normalisasiKata(item.id).replace(/\s+/g, '');
    const judul = normalisasiKata(item.title).replace(/\s+/g, '');
    const jarak = Math.min(
      jarakLevenshtein(target, id),
      judul ? jarakLevenshtein(target, judul.slice(0, Math.max(target.length + 2, 6))) : 9999,
    );
    const toleransi = Math.max(2, Math.ceil(target.length * 0.45));
    if (jarak <= toleransi) hasil.push({ id: item.id, title: item.title, jarak });
  }

  hasil.sort((a, b) => a.jarak - b.jarak || a.id.localeCompare(b.id));
  return hasil.slice(0, batas);
}

/** Membaca posisi tersimpan dari sessionStorage bila masih dalam masa berlaku. */
export function bacaSesi(penyimpanan, sekarang = Date.now()) {
  try {
    const mentah = penyimpanan?.getItem(KUNCI_SESI);
    if (!mentah) return null;
    const simpanan = JSON.parse(mentah);
    if (!simpanan || typeof simpanan !== 'object') return null;
    if (typeof simpanan.ts !== 'number' || sekarang - simpanan.ts > BATAS_SESI_MS) return null;
    if (simpanan.view === 'changelog') return simpanan;
    if (simpanan.view !== 'page') return null;
    return simpanan;
  } catch {
    return null;
  }
}

/**
 * Menulis posisi baca ke sessionStorage. Dipakai hanya agar penyegaran
 * mengembalikan pengguna ke tempat yang sama, bukan sebagai daftar riwayat.
 */
export function simpanSesi(penyimpananSesi, state, scrollY = 0, sekarang = Date.now()) {
  const tampilan = state.view || 'page';
  const simpanan = {
    view: tampilan === 'changelog' ? 'changelog' : 'page',
    pageId: tampilan === 'page' ? state.pageId : null,
    tab: state.tab,
    step: state.step ?? null,
    scrollY: Math.round(Number(scrollY) || 0),
    ts: sekarang,
  };
  try {
    penyimpananSesi?.setItem(KUNCI_SESI, JSON.stringify(simpanan));
  } catch { /* penyimpanan penuh atau dinonaktifkan */ }
  return simpanan;
}

/** Memeriksa apakah simpanan posisi masih berlaku. */
export function masihBerlaku(ts, sekarang = Date.now()) {
  return typeof ts === 'number' && sekarang - ts <= BATAS_SESI_MS;
}

/**
 * Menghitung badge tanggal di browser dari since/updated dan tanggal hari ini.
 * Hari ini disuntikkan sebagai teks YYYY-MM-DD supaya bisa diuji dengan tanggal tetap.
 * Aturan berisi { newDays, updatedDays } dari meta di JSON.
 * "Baru" HANYA muncul bila since terisi dan jaraknya ke hari ini <= newDays.
 * Bila since kosong, halaman tidak pernah "Baru", hanya bisa "Diperbarui".
 * Prioritas: "Baru" menyembunyikan "Diperbarui" pada kartu yang sama.
 */
export function hitungBadge(since, updated, hariIni, aturan) {
  const keWaktu = (t) => {
    if (typeof t !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
    const d = new Date(`${t}T00:00:00Z`);
    return Number.isNaN(d.getTime()) ? null : d.getTime();
  };
  const kini = keWaktu(hariIni);
  if (kini === null) return [];
  const baru = Number(aturan?.newDays) || 30;
  const ubah = Number(aturan?.updatedDays) || 45;
  const sehari = 86400000;
  const awal = keWaktu(since);
  if (awal !== null) {
    const jarakSejak = Math.floor((kini - awal) / sehari);
    if (jarakSejak >= 0 && jarakSejak <= baru) return ['baru'];
  }
  const terakhir = keWaktu(updated);
  if (terakhir !== null) {
    const jarakUbah = Math.floor((kini - terakhir) / sehari);
    if (jarakUbah >= 0 && jarakUbah <= ubah) return ['diperbarui'];
  }
  return [];
}

/**
 * Memeriksa apakah nomor pada state merujuk ke langkah atau video yang ada.
 * Pada tab guide, s adalah nomor langkah. Pada tab video, s adalah nomor video.
 * Mengembalikan nomor bila valid, null bila di luar jangkauan (diabaikan tanpa galat).
 *
 * Halaman masukan berupa { langkah: [{ n }], videos: [...] } dari data JSON.
 */
export function nomorValid(state, halaman) {
  const nomor = state?.step;
  if (!Number.isInteger(nomor) || nomor < 1 || !halaman) return null;
  if (state.tab === 'video') {
    const jumlah = (halaman.videos ?? []).length;
    return nomor >= 1 && nomor <= jumlah ? nomor : null;
  }
  const langkah = halaman.langkah ?? [];
  const cocok = langkah.some((l) => l.n === nomor);
  return cocok ? nomor : null;
}