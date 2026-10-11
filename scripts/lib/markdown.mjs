// Mengubah Markdown menjadi HTML memakai marked, dengan penyesuaian untuk manual book.
//
// Aturan yang berlaku:
// - Semua style dan script bersifat eksternal karena Content-Security-Policy ketat.
// - Gambar tidak dirender langsung, melainkan menjadi placeholder {{img:path}}
//   supaya nama berkas ber-hash bisa disisipkan setelah konversi WebP selesai.

import { Marked } from 'marked';

/** Melindungi teks dari injeksi HTML. Dipakai untuk atribut yang berasal dari konten. */
export function esc(teks) {
  return String(teks ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Membuat slug untuk id elemen heading. */
export function slug(teks) {
  return String(teks ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'bagian';
}

/** Membuat instance marked terpisah supaya pengaturan tidak bocor antar berkas. */
export function buatPenanda({ idHeadingUnik = false } = {}) {
  const penanda = new Marked({ gfm: true, breaks: false });

  const dipakai = new Map();
  const idUnik = (dasar) => {
    if (!idHeadingUnik) return dasar;
    const n = (dipakai.get(dasar) ?? 0) + 1;
    dipakai.set(dasar, n);
    return n === 1 ? dasar : `${dasar}-${n}`;
  };

  penanda.use({
    renderer: {
      image(token) {
        const alt = esc(token.text || '');
        return `<span class="gambar-holder" data-src="{{img:${esc(token.href)}}}" data-alt="${alt}"></span>`;
      },
      heading(token) {
        const teks = penanda.parseInline(token.tokens);
        return `<h${token.depth} id="${esc(idUnik(slug(token.text)))}">${teks}</h${token.depth}>\n`;
      },
      link(token) {
        const teks = penanda.parseInline(token.tokens);
        const href = token.href || '';
        const luar = /^https?:/i.test(href);
        return `<a href="${esc(href)}"${luar ? ' target="_blank" rel="noopener noreferrer"' : ''}>${teks}</a>`;
      },
    },
  });

  return penanda;
}
