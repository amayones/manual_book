// Menghitung estimasi waktu baca bila frontmatter tidak mengisi readTime.

/**
 * Membuang blok ::: satu level beserta isinya. Dipakai agar teks pin,
 * judul video tidak ikut dihitung sebagai kata baca.
 */
export function buangBlok(raw) {
  return String(raw ?? '').replace(/^:::[^\n]*\n[\s\S]*?^:::[^\n]*$/gm, '\n');
}

/** Menghitung jumlah kata pada teks halaman. */
export function hitungKata(teks) {
  const bersih = String(teks ?? '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, ' ')
    .replace(/[#>*_`|~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!bersih) return 0;
  return bersih.split(' ').filter((k) => /[\p{L}\p{N}]/u.test(k)).length;
}

/**
 * Rumus tetap dari rencana: menit = max(1, ceil(kata / 200 + langkah * 0.5)).
 * Nilai ini boleh ditimpa lewat frontmatter readTime.
 */
export function hitungReadTime({ kata, langkah }) {
  const menit = Math.ceil(kata / 200 + langkah * 0.5);
  return Math.max(1, menit);
}

/** Membantu: menghitung langsung dari isi mentah berkas Markdown. */
export function readTimeDariRaw(raw, jumlahLangkah) {
  return hitungReadTime({ kata: hitungKata(buangBlok(raw)), langkah: jumlahLangkah });
}
