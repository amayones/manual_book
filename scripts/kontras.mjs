// Menghitung rasio kontras pasangan warna memakai rumus WCAG.
// Dijalankan manual: node scripts/kontras.mjs (tidak masuk build).
//
// Warna aksen-lembut dan aksen-tulis dihitung meniru color-mix() pada CSS,
// supaya angka yang dilaporkan sama dengan warna yang tampil di browser.

function keRgb(hex) {
  const n = hex.replace('#', '');
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}

function keHex(rgb) {
  return '#' + rgb.map((c) => Math.round(Math.max(0, Math.min(255, c))).toString(16).padStart(2, '0')).join('');
}

/** Meniru color-mix(in srgb, warnaA p%, warnaB): campuran per kanal srgb. */
function campur(warnaA, persenA, warnaB) {
  const a = keRgb(warnaA);
  const b = keRgb(warnaB);
  const p = persenA / 100;
  return keHex(a.map((c, i) => c * p + b[i] * (1 - p)));
}

const AKSEN = '#2563eb';
const AKSEN_GELAP = '#60a5fa';
const LEMBUT_TERANG = campur(AKSEN, 10, '#ffffff');
const TULIS_TERANG = campur(AKSEN, 72, '#000000');
const LEMBUT_GELAP = campur(AKSEN_GELAP, 20, '#000000');
const TULIS_GELAP = campur(AKSEN_GELAP, 42, '#ffffff');

function terang(hex) {
  const n = hex.replace('#', '');
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

function rasio(a, b) {
  const x = terang(a);
  const y = terang(b);
  const atas = Math.max(x, y) + 0.05;
  const bawah = Math.min(x, y) + 0.05;
  return atas / bawah;
}

const pasangan = [
  // [nama, depan, belakang]
  ['terang: teks di atas latar', '#0f172a', '#f8fafc'],
  ['terang: teks lembut di atas latar', '#475569', '#f8fafc'],
  ['terang: teks di atas kartu', '#0f172a', '#ffffff'],
  ['terang: aksen di atas kartu (tautan)', AKSEN, '#ffffff'],
  ['terang: aksen di atas latar', AKSEN, '#f8fafc'],
  ['terang: aksen tulis di atas aksen lembut (menu aktif)', TULIS_TERANG, LEMBUT_TERANG],
  ['terang: putih di atas aksen (tombol)', '#ffffff', AKSEN],
  ['terang: judul tips di atas latar callout', '#15803d', '#f1f5f9'],
  ['terang: judul peringatan di atas latar callout', '#b45309', '#f1f5f9'],
  ['terang: judul catatan di atas latar callout', AKSEN, '#f1f5f9'],
  ['terang: isi toast (latar di atas teks)', '#f8fafc', '#0f172a'],
  ['terang: label pin (latar di atas teks)', '#f8fafc', '#0f172a'],
  ['terang: lencana Baru', '#15803d', '#dcfce7'],
  ['terang: lencana Diperbarui', '#b45309', '#fef3c7'],
  ['gelap: teks di atas latar', '#e6edf7', '#0b1220'],
  ['gelap: teks lembut di atas latar', '#9fb0c8', '#0b1220'],
  ['gelap: teks di atas kartu', '#e6edf7', '#131c2e'],
  ['gelap: aksen di atas kartu (tautan)', AKSEN_GELAP, '#131c2e'],
  ['gelap: aksen di atas latar', AKSEN_GELAP, '#0b1220'],
  ['gelap: aksen tulis di atas aksen lembut (menu aktif)', TULIS_GELAP, LEMBUT_GELAP],
  ['gelap: putih di atas aksen (tombol)', '#ffffff', AKSEN],
  ['gelap: judul tips di atas latar callout', '#86efac', '#0f172a'],
  ['gelap: judul peringatan di atas latar callout', '#fcd34d', '#0f172a'],
  ['gelap: judul catatan di atas latar callout', AKSEN_GELAP, '#0f172a'],
  ['gelap: isi toast (latar di atas teks)', '#0b1220', '#e6edf7'],
  ['gelap: lencana Baru', '#86efac', '#14321f'],
  ['gelap: lencana Diperbarui', '#fcd34d', '#3a2c0c'],
];

console.log(`Warna turunan: lembut terang ${LEMBUT_TERANG}, tulis terang ${TULIS_TERANG}, lembut gelap ${LEMBUT_GELAP}, tulis gelap ${TULIS_GELAP}`);

let gagal = 0;
for (const [nama, depan, belakang] of pasangan) {
  const nilai = rasio(depan, belakang);
  const lulus = nilai >= 4.5;
  if (!lulus) gagal += 1;
  console.log(`${lulus ? 'LULUS' : 'GAGAL'}  ${nilai.toFixed(2)}:1  ${nama}`);
}
console.log(gagal ? `\n${gagal} pasangan teks di bawah 4.5:1` : '\nSemua pasangan teks memenuhi 4.5:1');

// Pemeriksaan non-teks (ambang 3:1): ikon, indikator, dan batas komponen
// interaktif. Nilai mengikuti token CSS: --aksen-tulis untuk ikon di atas
// kotak ikon, --garis-kuat untuk batas tombol dan input.
const GARIS_KUAT_TERANG = '#64748b';
const GARIS_KUAT_GELAP = '#7d8fb0';
const nonTeks = [
  ['terang: ikon tulis di kotak ikon dan sidebar', TULIS_TERANG, LEMBUT_TERANG],
  ['terang: batas tombol dan input di atas kartu', GARIS_KUAT_TERANG, '#ffffff'],
  ['terang: batas tombol di atas latar', GARIS_KUAT_TERANG, '#f6f7fb'],
  ['terang: batang aksen item aktif di atas kartu', AKSEN, '#ffffff'],
  ['terang: panah grup di atas kartu', '#556075', '#ffffff'],
  ['gelap: ikon tulis di kotak ikon dan sidebar', TULIS_GELAP, LEMBUT_GELAP],
  ['gelap: batas tombol dan input di atas kartu', GARIS_KUAT_GELAP, '#131c2e'],
  ['gelap: batas tombol di atas latar', GARIS_KUAT_GELAP, '#0b1220'],
  ['gelap: batang aksen item aktif di atas kartu', AKSEN_GELAP, '#131c2e'],
  ['gelap: panah grup di atas kartu', '#9dabc4', '#131c2e'],
];

// Warna turunan kotak ikon (gradien) memakai warna aksen digelapkan 20 persen
// supaya ikon putih tetap terbaca di kedua ujung gradien.
const KOTAK_AWAL = AKSEN;
const KOTAK_AKHIR = campur(AKSEN, 80, '#000000');

let gagalNonTeks = 0;
for (const [nama, depan, belakang] of nonTeks) {
  const nilai = rasio(depan, belakang);
  const lulus = nilai >= 3;
  if (!lulus) gagalNonTeks += 1;
  console.log(`${lulus ? 'LULUS' : 'GAGAL'}  ${nilai.toFixed(2)}:1  ${nama}`);
}

// Ikon putih di dalam kotak ikon bergradien dan teks tab aktif >= 4.5:1.
const ikonPutih = [
  ['ikon putih di ujung awal gradien', '#ffffff', KOTAK_AWAL],
  ['ikon putih di ujung akhir gradien', '#ffffff', KOTAK_AKHIR],
  ['teks putih di atas tab aktif', '#ffffff', AKSEN],
];
for (const [nama, depan, belakang] of ikonPutih) {
  const nilai = rasio(depan, belakang);
  const lulus = nilai >= 4.5;
  if (!lulus) gagalNonTeks += 1;
  console.log(`${lulus ? 'LULUS' : 'GAGAL'}  ${nilai.toFixed(2)}:1  ${nama}`);
}
console.log(`Warna kotak ikon: awal ${KOTAK_AWAL}, akhir ${KOTAK_AKHIR}`);
const totalGagal = gagal + gagalNonTeks;
console.log(totalGagal ? `\n${gagalNonTeks} pasangan non-teks di bawah 3:1` : '\nSemua pasangan non-teks memenuhi 3:1');
process.exit(totalGagal ? 1 : 0);