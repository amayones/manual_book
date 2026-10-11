// Memecah blok ::: dari Markdown dan mengubahnya menjadi data terstruktur.
//
// Bentuk blok yang dikenali:
//   ::: pin        anotasi lingkaran bernomor pada gambar
//   ::: tip        callout: tips
//   ::: warn       callout: peringatan
//   ::: note       callout: catatan
//   ::: problem    satu masalah troubleshooting (Masalah, Penyebab, Solusi)
//   ::: video      satu video (judul, penjelasan, link, durasi, bab)
//
// Parser ini hanya menghasilkan DATA dan penanda struktural. Semua pesan error
// dibuat di rules.mjs supaya seluruh teks untuk pengguna ada di satu tempat.

import { buatPenanda, esc, slug } from './markdown.mjs';

export const PLACEHOLDER_ID = 'VIDEO_ID_CONTOH';
export const CALLOUT = { tip: 'Tips', warn: 'Penting', note: 'Catatan' };
export const PEMBUKA_BLOK = /^:::[ \t]*([a-zA-Z]+)?[ \t]*$/;
export const BARIS_BLOK = /^:::[ \t]*$/;

/** Konversi mm:ss atau hh:mm:ss menjadi jumlah detik. */
export function keDetik(teks) {
  const bagian = String(teks || '').trim().split(':');
  if (bagian.length < 2 || bagian.length > 3) return null;
  const angka = bagian.map((b) => (/^\d+$/.test(b.trim()) ? Number(b.trim()) : NaN));
  if (angka.some(Number.isNaN)) return null;
  if (angka.length === 3) {
    const [jam, menit, detik] = angka;
    return jam * 3600 + menit * 60 + detik;
  }
  const [menit, detik] = angka;
  return menit * 60 + detik;
}

/** Format durasi readable, misalnya "2:15" atau "1:02:30". */
export function formatDetik(detik) {
  const total = Math.max(0, Math.floor(detik));
  const jam = Math.floor(total / 3600);
  const menit = Math.floor((total % 3600) / 60);
  const sisa = total % 60;
  const dua = (n) => String(n).padStart(2, '0');
  return jam > 0 ? `${jam}:${dua(menit)}:${dua(sisa)}` : `${menit}:${dua(sisa)}`;
}

/** Membaca durasi yang ditulis "2:15" atau "2 menit 15 detik". */
export function parseDurasi(teks) {
  const asal = String(teks || '').trim();
  if (!asal) return null;
  const dariJamMenit = keDetik(asal);
  if (dariJamMenit !== null) return { detik: dariJamMenit, teks: asal };
  const pola = /^(\d+)\s*(menit|detik|second|minute)?(?:\s*(\d+)\s*(detik|second))?$/i;
  const cocok = asal.match(pola);
  if (!cocok) return { salah: true, teks: asal };
  const angka1 = Number(cocok[1]);
  const satuan1 = (cocok[2] || 'menit').toLowerCase();
  const angka2 = cocok[3] === undefined ? 0 : Number(cocok[3]);
  const perMenit = satuan1.startsWith('menit') || satuan1.startsWith('minute');
  return { detik: perMenit ? angka1 * 60 + angka2 : angka1 + angka2 * 60, teks: asal };
}

/**
 * Mengambil ID video dan waktu mulai dari berbagai bentuk URL YouTube.
 * Mengembalikan null bila tautan bukan YouTube.
 */
export function parseUrlYoutube(tautan) {
  const asal = String(tautan || '').trim();
  if (!/^https?:\/\//i.test(asal)) return null;
  let url;
  try {
    url = new URL(asal);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase().replace(/^(www|m|music)\./, '');
  let id = null;
  if (host === 'youtu.be') {
    id = url.pathname.slice(1).split('/')[0];
  } else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
    if (url.pathname === '/watch') id = url.searchParams.get('v');
    else if (/^\/(shorts|embed|live|v)\//.test(url.pathname)) id = url.pathname.split('/')[2];
  }
  if (!id) return null;

  let mulai = 0;
  const t = String(url.searchParams.get('t') || url.searchParams.get('start') || '').trim();
  if (t) {
    const pendek = /^(\d+)([smh])?$/.exec(t);
    if (pendek) {
      const pengali = { s: 1, m: 60, h: 3600 }[pendek[2] || 's'];
      mulai = Number(pendek[1]) * pengali;
    } else {
      const detik = keDetik(t);
      mulai = typeof detik === 'number' ? detik : 0;
    }
  }
  return { id, mulaiDetik: mulai };
}

/**
 * Alamat player. Parameter enablejsapi=1 wajib supaya postMessage seekTo
 * untuk lompat ke bab video bekerja.
 */
export function urlEmbed(id, detik = 0) {
  return `https://www.youtube-nocookie.com/embed/${id}?enablejsapi=1&rel=0&playsinline=1&start=${Math.floor(detik)}`;
}

/** Alamat thumbnail gratis tanpa kunci API. */
export function urlThumbnail(id) {
  return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
}

/**
 * Memecah Markdown mentah menjadi daftar blok :::.
 * Hasil: [{ tipe, isi, baris, barisAkhir }] sesuai urutan kemunculan.
 */
export function pecahBlok(raw, nomorBarisAwal = 1) {
  const baris = String(raw || '').split(/\r?\n/);
  const blok = [];
  let aktif = null;
  let penampung = [];

  const simpan = (tipe, isiBaris, mulai, tutup) => {
    blok.push({
      tipe,
      isi: isiBaris.join('\n'),
      baris: mulai,
      barisIsi: mulai + 1,
      barisAkhir: tutup,
      barisTutup: tutup,
    });
  };

  for (let i = 0; i < baris.length; i += 1) {
    const noBaris = nomorBarisAwal + i;
    const teks = baris[i];
    const buka = teks.match(PEMBUKA_BLOK);
    if (aktif === null && buka) {
      aktif = { tipe: (buka[1] || '').toLowerCase(), baris: noBaris };
      penampung = [];
      continue;
    }
    if (aktif !== null && BARIS_BLOK.test(teks)) {
      simpan(aktif.tipe, penampung, aktif.baris, noBaris);
      aktif = null;
      penampung = [];
      continue;
    }
    if (aktif !== null) penampung.push(teks);
  }

  if (aktif !== null) {
    // Blok belum ditutup. Ditandai supaya rules.mjs bisa melaporkannya.
    blok.push({
      tipe: aktif.tipe,
      isi: penampung.join('\n'),
      baris: aktif.baris,
      barisIsi: aktif.baris + 1,
      barisAkhir: nomorBarisAwal + baris.length - 1,
      barisTutup: 0,
      belumDitutup: true,
    });
  }

  return blok;
}

/** Memecah isi satu blok berdasarkan heading ### di dalamnya. */
export function pecahSubBagian(isi, nomorBarisAwal = 1) {
  const baris = String(isi || '').split(/\r?\n/);
  const bagian = [];
  let aktif = null;
  let penampung = [];

  const simpan = (judul, isiBaris, mulai) => {
    bagian.push({
      judul,
      isi: isiBaris.join('\n').trim(),
      isiMentah: isiBaris.join('\n'),
      baris: mulai,
      barisIsi: mulai + 1,
      barisAkhir: nomorBarisAwal + mulai + isiBaris.length - 1,
    });
  };

  for (let i = 0; i < baris.length; i += 1) {
    const noBaris = nomorBarisAwal + i;
    const cocok = baris[i].match(/^###[ \t]+(.*)$/);
    if (cocok) {
      if (aktif !== null) simpan(aktif.judul, penampung, aktif.baris);
      aktif = { judul: cocok[1].trim(), baris: noBaris };
      penampung = [];
      continue;
    }
    if (aktif !== null) penampung.push(baris[i]);
  }
  if (aktif !== null) simpan(aktif.judul, penampung, aktif.baris);
  return bagian;
}

/** Membaca daftar pin: "1. [82,22] Label". */
export function parsePin(isi, nomorBarisAwal = 1) {
  const baris = String(isi || '').split(/\r?\n/);
  return baris.map((teks, i) => {
    const noBaris = nomorBarisAwal + i;
    const cocok = teks.match(/^\s*(\d+)\.\s*(.*)$/);
    if (!cocok) return { salahBentuk: true, teks, baris: noBaris };
    const koordinat = cocok[2].match(/^\[([^\]]*)\]\s*(.*)$/);
    if (!koordinat) {
      return { salahBentuk: true, teks, baris: noBaris, nomor: Number(cocok[1]), x: null, y: null, label: '' };
    }
    const bagian = koordinat[1].split(',').map((b) => b.trim());
    const valid = bagian.length === 2 && bagian.every((b) => /^\d+(\.\d+)?$/.test(b));
    return {
      nomor: Number(cocok[1]),
      sumber: koordinat[1],
      x: valid ? Number(bagian[0]) : null,
      y: valid ? Number(bagian[1]) : null,
      label: koordinat[2].trim(),
      baris: noBaris,
      salahBentuk: !valid,
    };
  });
}

/** Membaca satu blok video. */
export function parseVideo(isi, nomorBarisAwal = 1) {
  const bagian = pecahSubBagian(isi, nomorBarisAwal);
  const baris = isi.split(/\r?\n/);
  const hasil = {
    judul: bagian[0]?.judul ?? '',
    baris: bagian[0]?.baris ?? nomorBarisAwal,
    penjelasan: '',
    tautan: '',
    barisTautan: 0,
    durasi: null,
    barisDurasi: 0,
    bab: [],
  };

  const isiBagian = bagian[0]?.isiMentah ?? '';
  const barisIsi = isiBagian ? isiBagian.split(/\r?\n/) : [];
  const barisIsiAwal = bagian[0]?.barisIsi ?? nomorBarisAwal + 1;
  const teksKeterangan = [];
  for (let i = 0; i < barisIsi.length; i += 1) {
    const teks = barisIsi[i].trim();
    const baris = barisIsiAwal + i;
    if (!teks) {
      teksKeterangan.push('');
      continue;
    }
    const cocokDurasi = teks.match(/^Durasi:\s*(.+)$/i);
    if (cocokDurasi) {
      hasil.durasi = parseDurasi(cocokDurasi[1]);
      hasil.barisDurasi = baris;
      continue;
    }
    if (/^https?:\/\//i.test(teks) && !hasil.tautan) {
      hasil.tautan = teks;
      hasil.barisTautan = baris;
      continue;
    }
    const cocokBab = teks.match(/^-\s*(\d{1,2}:\d{2}(?::\d{2})?)\s*(?:-{1,2}>|=>|[→–—])\s*(.+)$/);
    if (cocokBab) {
      hasil.bab.push({
        waktu: cocokBab[1],
        detik: keDetik(cocokBab[1]),
        label: cocokBab[2].trim(),
        baris,
      });
      continue;
    }
    teksKeterangan.push(teks);
  }
  hasil.penjelasan = teksKeterangan.join('\n').trim();
  return hasil;
}

/** Membaca satu blok troubleshooting. */
export function parseProblem(isi, nomorBarisAwal = 1) {
  const baris = isi.split(/\r?\n/);
  const hasil = { masalah: '', penyebab: '', solusi: '', baris: { masalah: 0, penyebab: 0, solusi: 0 } };
  let tujuan = null;
  for (let i = 0; i < baris.length; i += 1) {
    const teks = baris[i];
    const noBaris = nomorBarisAwal + i;
    const cocok = teks.match(/^\s*\*{0,2}(Masalah|Penyebab|Solusi)\*{0,2}:?\*{0,2}\s*([\s\S]*)$/);
    if (cocok) {
      tujuan = cocok[1].toLowerCase();
      hasil[tujuan] = cocok[2].trim();
      hasil.baris[tujuan] = noBaris;
      continue;
    }
    if (tujuan && teks.trim()) {
      hasil[tujuan] += `\n${teks.trim()}`;
    }
  }
  return hasil;
}

/** Memecah bagian "## Panduan" menjadi daftar langkah. */
export function parseLangkah(isi, nomorBarisAwal = 1) {
  const bagian = pecahSubBagian(isi, nomorBarisAwal);
  return bagian.map((bag, indeks) => {
    const barisIsi = bag.isiMentah ? bag.isiMentah.split(/\r?\n/) : [];
    let gambar = null;
    let gambarJumlah = 0;
    let barisSetelahGambar = 0;
    const blok = pecahBlok(bag.isiMentah, bag.barisIsi);

    for (let i = 0; i < barisIsi.length; i += 1) {
      const teks = barisIsi[i];
      const cocok = teks.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)\s*$/);
      if (!cocok) continue;
      gambarJumlah += 1;
      if (!gambar) gambar = { path: cocok[2], alt: cocok[1].trim(), baris: bag.barisIsi + i };
      barisSetelahGambar = bag.barisIsi + i;
    }

    // Blok yang ada sebelum gambar berarti pin atau callout tanpa gambar.
    const blokSebelumGambar = gambar
      ? blok.filter((b) => b.baris < gambar.baris)
      : blok.slice();

    return {
      n: indeks + 1,
      judul: bag.judul.replace(/^\d+\.\s*/, ''),
      judulMentah: bag.judul,
      baris: bag.baris,
      isi: bag.isi,
      isiMentah: bag.isiMentah,
      barisIsi: bag.barisIsi,
      gambar,
      gambarJumlah,
      penjelasanAda: Boolean(
        barisSetelahGambar
        && barisIsi.some((t, i) => bag.barisIsi + i > barisSetelahGambar && t.trim() !== '' && !/^:::/.test(t)),
      ),
      blok,
      pinTanpaGambar: blokSebelumGambar.find((b) => b.tipe === 'pin') ?? null,
      pin: blok.find((b) => b.tipe === 'pin') ?? null,
    };
  });
}

/** Memecah seluruh isi halaman menjadi bagian berdasarkan heading ##. */
export function pecahBagian(raw, nomorBarisAwal = 1) {
  const baris = String(raw || '').split(/\r?\n/);
  const hasil = [];
  let aktif = null;
  let penampung = [];

  const push = () => {
    hasil.push({
      judul: aktif.judul,
      id: slug(aktif.judul),
      isi: penampung.join('\n').trim(),
      isiMentah: penampung.join('\n'),
      baris: aktif.baris,
      barisIsi: aktif.baris + 1,
      barisAkhir: nomorBarisAwal + baris.length - 1,
    });
  };

  for (let i = 0; i < baris.length; i += 1) {
    const noBaris = nomorBarisAwal + i;
    const cocok = baris[i].match(/^##[ \t]+(.*)$/);
    if (cocok) {
      if (aktif) push();
      aktif = { judul: cocok[1].trim(), baris: noBaris };
      penampung = [];
      continue;
    }
    if (aktif) penampung.push(baris[i]);
  }
  if (aktif) push();
  return hasil;
}

/** Mengubah Markdown biasa menjadi HTML. */
export function mdKeHtml(teks, opsi = {}) {
  if (!String(teks ?? '').trim()) return '';
  return buatPenanda(opsi).parse(String(teks)).trim();
}

/**
 * Mengubah gambar langkah menjadi figure bergaya jendela browser.
 * Lapisan pin dibuat di dalam wadah gambar supaya posisi persen selalu
 * relatif terhadap gambar, berapa pun lebar layar.
 * Tombol perbesar membuka lightbox dan dikelola app.js.
 */
export function gambarKeHtml(gambar, src, opsi = {}) {
  const situs = esc(opsi.situs ?? '');
  const label = esc(`Perbesar gambar langkah ${opsi.langkah ?? ''}: ${gambar.alt}`);
  return `<figure class="bingkai-screenshot">`
    + `<div class="bingkai-bilah" aria-hidden="true">`
    + `<span class="bingkai-titik"></span><span class="bingkai-bilah-url">${situs}</span></div>`
    + `<div class="bingkai-gambar">`
    + `<img src="${esc(src)}" width="{{lebar:${esc(gambar.path)}}}" height="{{tinggi:${esc(gambar.path)}}}" `
    + `alt="${esc(gambar.alt)}" loading="lazy" decoding="async" `
    + `data-situs="${situs}" data-langkah="${esc(String(opsi.langkah ?? ''))}">`
    + (opsi.pin ?? '')
    + `<button class="tombol-perbesar" type="button" data-action="buka-cahaya" `
    + `aria-label="${label}" title="Perbesar gambar">`
    + `<svg class="ikon" aria-hidden="true" focusable="false"><use href="#i-ui-zoom-in"></use></svg>`
    + `</button>`
    + `</div></figure>`;
}
