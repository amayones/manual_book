// Daftar ikon SVG bawaan. Semua ikon memakai currentColor supaya ikut warna teks.
// Ikon penulis konten ada di IKON (22 nama). Ikon antarmuka ada di IKON_UI
// dan tidak boleh dipakai penulis konten. ID sprite: i-<nama> untuk penulis,
// i-ui-<nama> untuk antarmuka, sehingga tidak ada duplikat.

export const IKON = {
  rocket: ['M12 2c2.5 1.8 4 5 4 8.5V15l-2-2h-4l-2 2v-4.5C8 7 9.5 3.8 12 2zm0 5a1.4 1.4 0 1 0 0 2.8A1.4 1.4 0 0 0 12 7zm-4 9-3 3v2l2-1 2-1 2 1 2 1v-2l-3-3z'],
  grid: ['M3 3h7v7H3V3zm11 0h7v7h-7V3zM3 14h7v7H3v-7zm11 0h7v7h-7v-7z'],
  chart: ['M3 3h2v16h16v2H3V3zm4 12h3v4H7v-4zm5-5h3v9h-3v-9zm5-4h3v13h-3V6z'],
  lock: ['M6 10V8a6 6 0 0 1 12 0v2h1v11H5V10h1zm2 0h8V8a4 4 0 0 0-8 0v2z'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0 2c-4 0-8 2-8 5v2h16v-2c0-3-4-5-8-5z'],
  gear: ['M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm9 4-2.2-.6a6.7 6.7 0 0 0-.7-1.7l1-2-1.7-1.7-2 1a6.7 6.7 0 0 0-1.7-.7L13 3h-2l-.6 2.3a6.7 6.7 0 0 0-1.7.7l-2-1L5 6.7l1 2a6.7 6.7 0 0 0-.7 1.7L3 11v2l2.3.6c.2.6.4 1.2.7 1.7l-1 2L6.7 19l2-1c.5.3 1.1.5 1.7.7L11 21h2l.6-2.3c.6-.2 1.2-.4 1.7-.7l2 1 1.7-1.7-1-2c.3-.5.5-1.1.7-1.7L21 13v-2z'],
  cart: ['M3 4h2.2l2.4 10h9.6l2-7H7M9 20a1.4 1.4 0 1 0 0-2.8A1.4 1.4 0 0 0 9 20zm8 0a1.4 1.4 0 1 0 0-2.8 1.4 1.4 0 0 0 0 2.8z'],
  bell: ['M12 3a5 5 0 0 0-5 5v4l-2 3h14l-2-3V8a5 5 0 0 0-5-5zm-2 15h4a2 2 0 0 1-4 0z'],
  file: ['M6 2h8l5 5v15H6V2zm7 1.5V8h4.5L13 3.5z'],
  search: ['M10.5 3a7.5 7.5 0 1 0 4.5 13.5l4.2 4.2 1.4-1.4-4.2-4.2A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z'],
  shield: ['M12 2l8 3v6c0 5-3.4 9.4-8 11-4.6-1.6-8-6-8-11V5l8-3z'],
  help: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm.1 15.6a1.3 1.3 0 1 1 0 2.6 1.3 1.3 0 0 1 0-2.6zM12 5.6c2 0 3.6 1.3 3.6 3.1 0 1.3-.6 2-1.8 2.8-.8.5-1 .8-1 1.6v.4h-2v-.7c0-1.4.5-2.1 1.6-2.9.8-.5 1.1-.8 1.1-1.3 0-.7-.6-1.1-1.5-1.1s-1.6.5-1.7 1.4H8.3C8.5 6.8 10 5.6 12 5.6z'],
  download: ['M12 21l-6-6h4V9h4v6h4l-6 6z', 'M5 19h14v2H5z'],
  upload: ['M12 3l6 6h-4v6h-4V9H6l6-6z', 'M5 19h14v2H5z'],
  mail: ['M5 5h14a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z', 'M5 7l7 5 7-5 1.2 1.5L12 14.5 3.8 8.5 5 7z'],
  edit: ['M4 20l1-4L16.5 4.5a1.4 1.4 0 0 1 2 2L7 18l-3 2z'],
  trash: ['M6 7h12l-1 13H7L6 7z', 'M4 5h16v2H4z', 'M10 3h4v2h-4z'],
  star: ['M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8-6.1-3.4-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2z'],
  home: ['M12 3l9 8h-3v9h-4v-6H10v6H6v-9H3l9-8z'],
  calendar: ['M7 4h2v3H7z', 'M15 4h2v3h-2z', 'M5 8h14v11H5z', 'M7 11h10v6H7z'],
  key: ['M10 12a2 2 0 1 0 0 .01V12zm0-6a6 6 0 0 0 0 12c.5 0 1-.1 1.5-.2V16h5v-2h2V12h4V10h-4V8h-4V6.2A6 6 0 0 0 10 6z'],
  print: ['M7 8V3h10v5H7z', 'M5 10h14a1 1 0 0 1 1 1v7h-4v-3H8v3H4v-7a1 1 0 0 1 1-1zm3 2v3h8v-3H8z'],
};

export const NAMA_IKON = Object.keys(IKON);

export const IKON_UI = {
  sun: ['M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0-8 0', 'M11 2h2v3h-2z', 'M11 19h2v3h-2z', 'M2 11h3v2H2z', 'M19 11h3v2h-3z', 'M4.9 4.9l1.4-1.4 2.1 2.1-1.4 1.4z', 'M15.6 15.6l1.4-1.4 2.1 2.1-1.4 1.4z', 'M19.1 4.9l-1.4-1.4-2.1 2.1 1.4 1.4z', 'M8.4 15.6l-1.4-1.4-2.1 2.1 1.4 1.4z'],
  moon: ['M20 14A8 8 0 1 1 10 4a7 7 0 0 0 10 10z'],
  auto: ['M12 4v16a8 8 0 0 0 0-16z', 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z'],
  search: ['M10.5 3a7.5 7.5 0 1 0 4.5 13.5l4.2 4.2 1.4-1.4-4.2-4.2A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z'],
  menu: ['M4 6h16v2H4z', 'M4 11h16v2H4z', 'M4 16h16v2H4z'],
  close: ['M5.3 4.1l14.6 14.6-1.8 1.8L3.5 5.9z', 'M18.7 4.1L4.1 18.7l1.8 1.8 14.6-14.6z'],
  copy: ['M9 9h10v10H9z', 'M5 15V5h10v2H7v8H5z'],
  check: ['M9.5 15.6L5.9 12l-1.8 1.8 5.4 5.4 12-12-1.8-1.8z'],
  play: ['M8 5l11 7-11 7V5z'],
  eye: ['M12 5c5 0 9 4.5 10 7-1 2.5-5 7-10 7S3 14.5 2 12c1-2.5 5-7 10-7zm0 2c-3.3 0-6 2.4-7.4 5C6 14.6 8.7 17 12 17s6-2.4 7.4-5C18 9.4 15.3 7 12 7z', 'M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4z'],
  'eye-off': ['M12 5c5 0 9 4.5 10 7-.4 1-1.3 2.4-2.7 3.7l-1.5-1.5c1-1 1.8-2 2.2-2.7-.9-1.9-3.1-4.1-6-4.8L12.7 8H12c-.5 0-1 0-1.5.1L8.9 6.5C9.9 5.7 10.9 5 12 5zM7.1 8.3L5.6 6.8C4 7.9 2.7 9.9 2 12c1 2.5 5 7 10 7 1.5 0 2.9-.4 4.1-1l-1.6-1.6c-.7.3-1.6.6-2.5.6-3.3 0-6-2.4-7.4-5 .4-.9 1.2-1.9 2.5-2.7zM4 4l16 16-1.5 1.5L2.5 5.5z'],
  'zoom-in': ['M10.5 3a7.5 7.5 0 1 0 4.5 13.5l4.2 4.2 1.4-1.4-4.2-4.2A7.5 7.5 0 0 0 10.5 3zm0 2a5.5 5.5 0 1 1 0 11 5.5 5.5 0 0 1 0-11z', 'M10.5 8h2v3h3v2h-3v3h-2v-3h-3v-2h3V8z'],
  'arrow-right': ['M13 5l7 7-7 7v-4H4v-6h9V5z'],
  'arrow-left': ['M11 5L4 12l7 7v-4h9v-6h-9V5z'],
  chevron: ['M9 5l7 7-7 7-1.8-1.8L12.4 12 7.2 6.8z'],
  clock: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm0 2a8 8 0 1 1 0 16 8 8 0 0 1 0-16z', 'M11 7h2v6l4 2-1 1.7-5-2.5V7z'],
  warning: ['M12 3L2 20h20L12 3zm0 4l6 11H6l6-11z', 'M11 10h2v5h-2z', 'M11 16.5h2v2h-2z'],
  info: ['M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm-1 5h2v2h-2V7zm0 4h2v6h-2v-6z'],
  lightbulb: ['M12 2a6 6 0 0 0-3.5 10.9c.8.6 1.5 1.4 1.5 2.6V16h4v-.5c0-1.2.7-2 1.5-2.6A6 6 0 0 0 12 2z', 'M10 18h4v1.5h-4z', 'M10 21h4v1h-4z'],
  flag: ['M6 3h2v18H6z', 'M10 4h9l-3 4 3 4h-9V4z'],
  list: ['M4 6h2v2H4z', 'M9 6h11v2H9z', 'M4 11h2v2H4z', 'M9 11h11v2H9z', 'M4 16h2v2H4z', 'M9 16h11v2H9z'],
  image: ['M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zm3 3a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm-1 9l4-4 3 3 3-3 4 4v1H6v-1z'],
  external: ['M14 4h6v6h-2V7.4l-7.3 7.3-1.4-1.4L16.6 6H14V4z', 'M6 6h6v2H8v8h8v-4h2v4a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2z'],
  'arrow-up': ['M12 4l7 7h-4v9h-6v-9H5l7-7z'],
  maximize: ['M4 4h16v16H4V4zm2 2v12h12V6H6z'],
  restore: ['M7 7h13v13h-2V9H7V7z', 'M4 7h3v10h10v3H4V7z'],
};

export const NAMA_IKON_UI = Object.keys(IKON_UI);

/** Simbol yang memakai fill-rule evenodd (bentuk berlubang). */
export const SIMBOL_EVENODD = new Set([
  'i-ui-moon', 'i-ui-auto', 'i-ui-eye', 'i-ui-eye-off', 'i-ui-clock', 'i-ui-warning', 'i-ui-info',
]);

/** Mengembalikan potongan SVG siap pakai untuk sebuah nama ikon penulis. */
export function svgIkon(nama, ukuran = 24) {
  const jalur = IKON[nama];
  if (!jalur) return '';
  const isi = jalur.map((d) => `<path d="${d}"/>`).join('');
  return `<svg class="ikon" width="${ukuran}" height="${ukuran}" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">${isi}</svg>`;
}

/**
 * Membangun blok sprite <svg> berisi seluruh simbol ikon penulis dan UI.
 * Dipanggil build dan disisipkan ke index.html lewat penanda {{SPRITE}}.
 */
export function bangunSprite() {
  const simbol = (id, daftarJalur, genap) => {
    const isi = daftarJalur.map((d) => `<path d="${d}"/>`).join('');
    const aturan = genap ? ' fill-rule="evenodd"' : '';
    return `<symbol id="${id}" viewBox="0 0 24 24"${aturan}>${isi}</symbol>`;
  };
  const penulis = Object.entries(IKON).map(([nama, jalur]) => simbol(`i-${nama}`, jalur, false));
  const ui = Object.entries(IKON_UI).map(([nama, jalur]) => simbol(`i-ui-${nama}`, jalur, SIMBOL_EVENODD.has(`i-ui-${nama}`)));
  return `<svg class="sprite" aria-hidden="true" focusable="false">${penulis.join('')}${ui.join('')}</svg>`;
}
