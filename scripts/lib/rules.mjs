// Seluruh aturan validator beserta pesan errornya.
//
// Bentuk pesan: content/pages/01-login.md: [baris] konteks. pesan.
// Semua teks yang dibaca pengguna ditulis di berkas ini.
//
// Daftar aturan mengikuti Bagian 8 rencana revisi. Aturan tentang id dan order
// sudah dihapus karena keduanya diturunkan dari nama file.

import fs from 'node:fs';
import path from 'node:path';
import { NAMA_IKON } from './icons.mjs';
import { CALLOUT, PLACEHOLDER_ID, parsePin, parseUrlYoutube } from './directives.mjs';
import { hitungKata } from './readtime.mjs';

export const TIPE_BLOK = ['pin', 'tip', 'warn', 'note', 'problem', 'video'];
export const TIPE_CALLOUT = Object.keys(CALLOUT);
export const LEVEL = ['Dasar', 'Menengah', 'Lanjut'];

/** Id yang dicadangkan untuk halaman sistem dan tidak boleh dipakai konten. */
export const ID_DICADANGKAN = ['beranda', 'changelog'];

/** Berkas resmi yang memakai id yang dicadangkan. */
export const BERKAS_RESMI = { beranda: '00-beranda.md', changelog: 'content/changelog.md' };

const POLA_NAMA_BERKAS = /^(\d{2})-(.+)\.md$/;
const POLA_SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Membuat objek masalah beserta letaknya. */
export function masalah(file, baris, konteks, pesan) {
  return { file, baris: baris ?? null, konteks, pesan };
}

/** Menggabungkan masalah menjadi teks siap tampil, dikelompokkan per berkas. */
export function formatMasalah(daftar, judul) {
  const perBerkas = new Map();
  for (const m of daftar) {
    if (!perBerkas.has(m.file)) perBerkas.set(m.file, []);
    perBerkas.get(m.file).push(m);
  }
  const baris = [judul, ''];
  for (const [file, isi] of perBerkas) {
    baris.push(file);
    for (const m of isi) {
      const letak = m.baris ? `baris ${m.baris}` : null;
      const depan = m.konteks ? (letak ? `${letak}, ${m.konteks}` : m.konteks) : letak;
      baris.push(`  ${depan ? `${depan}: ` : ''}${m.pesan}`);
    }
    baris.push('');
  }
  return baris.join('\n');
}

/** Memecah nama berkas menjadi prefix angka dan slug. */
export function pecahNamaBerkas(nama) {
  const cocok = POLA_NAMA_BERKAS.exec(nama);
  if (!cocok) {
    return { valid: false, prefix: null, slug: null, tanpaPrefix: nama.replace(/\.md$/, '') };
  }
  return { valid: true, prefix: Number(cocok[1]), slug: cocok[2] };
}

/** Aturan 1 dan 2: nama berkas, termasuk id yang dicadangkan sistem. */
export function validasiNamaBerkas(file, nama) {
  const hasil = [];
  const { valid, slug } = pecahNamaBerkas(nama);
  if (!valid) {
    hasil.push(masalah(file, null, 'nama file', 'nama file harus diawali 2 angka karena angka menentukan urutan sidebar, contoh "01-login.md".'));
    return hasil;
  }
  if (!POLA_SLUG.test(slug)) {
    hasil.push(masalah(file, null, 'nama file', `bagian nama file "${slug}" tidak valid. Gunakan huruf kecil, angka, dan tanda hubung, contoh "dashboard-admin".`));
  }
  if (ID_DICADANGKAN.includes(slug)) {
    const resmi = BERKAS_RESMI[slug];
    if (nama !== resmi) {
      hasil.push(masalah(file, null, 'nama file', `id "${slug}" dicadangkan untuk halaman sistem dan hanya boleh dipakai oleh berkas "${resmi}".`));
    }
  }
  return hasil;
}

/**
 * Menormalkan tanggal menjadi teks YYYY-MM-DD.
 * Penulis YAML membaca "2026-09-28" sebagai objek Date, jadi harus diubah
 * kembali ke teks sebelum diperiksa.
 */
export function tanggalTeks(nilai) {
  if (nilai instanceof Date) {
    return Number.isNaN(nilai.getTime()) ? String(nilai) : nilai.toISOString().slice(0, 10);
  }
  return nilai;
}

/** Aturan 6 sampai 17: frontmatter. */
export function validasiFrontmatter(file, frontmatter, config) {
  const hasil = [];
  const fm = {
    ...frontmatter,
    updated: tanggalTeks(frontmatter.updated),
    since: tanggalTeks(frontmatter.since),
  };
  const tambah = (nama, pesan) => hasil.push(masalah(file, 1, `field "${nama}"`, pesan));

  for (const wajib of ['title', 'group', 'updated', 'summary']) {
    if (fm[wajib] === undefined || fm[wajib] === null || String(fm[wajib]).trim() === '') {
      tambah(wajib, wajib === 'summary'
        ? 'wajib diisi (1 kalimat singkat, maksimal 200 karakter).'
        : 'wajib diisi dengan teks.');
    }
  }

  // group: none berarti halaman tanpa grup, bolehkan.
  if (fm.group && fm.group !== 'none' && !config.groups.some((g) => g.id === fm.group)) {
    const pilihan = config.groups.map((g) => g.id).join(', ');
    tambah('group', `"${fm.group}" tidak dikenal. Pilihan yang tersedia: ${pilihan}.`);
  }

  const periksaTanggal = (nama, nilai, tolakMasaDepan) => {
    if (nama === 'updated' && (nilai === undefined || nilai === null || String(nilai).trim() === '')) return false;
    if (nilai === undefined || nilai === null || String(nilai).trim() === '') return true;
    if (typeof nilai === 'object' || !POLA_TANGGAL.test(String(nilai))) {
      tambah(nama, `"${nilai}" harus format YYYY-MM-DD, contoh 2026-09-28.`);
      return false;
    }
    const waktu = new Date(`${nilai}T00:00:00Z`);
    if (Number.isNaN(waktu.getTime())) {
      tambah(nama, `"${nilai}" bukan tanggal yang nyata.`);
      return false;
    }
    if (tolakMasaDepan && waktu.getTime() > Date.now()) {
      tambah(nama, `(${nilai}) tidak boleh di masa depan.`);
      return false;
    }
    return true;
  };

  const updatedOke = periksaTanggal('updated', fm.updated, true);
  if (fm.since !== undefined && fm.since !== null && String(fm.since).trim() !== '') {
    const sinceOke = periksaTanggal('since', fm.since, false);
    if (sinceOke && updatedOke && String(fm.since) > String(fm.updated)) {
      tambah('since', `(${fm.since}) tidak boleh lebih baru dari "updated" (${fm.updated}).`);
    }
  }

  if (fm.summary && String(fm.summary).length > 200) {
    tambah('summary', `terlalu panjang (${String(fm.summary).length} karakter). Maksimal 200 karakter.`);
  }

  if (fm.level !== undefined && fm.level !== null && fm.level !== '' && !LEVEL.includes(fm.level)) {
    tambah('level', `"${fm.level}" tidak dikenal. Pilihan: ${LEVEL.join(', ')}.`);
  }

  if (fm.icon !== undefined && fm.icon !== null && fm.icon !== '') {
    if (!NAMA_IKON.includes(fm.icon)) {
      tambah('icon', `"${fm.icon}" tidak dikenal. Pilihan: ${NAMA_IKON.join(', ')}.`);
    }
  }

  if (fm.readTime !== undefined && fm.readTime !== null && fm.readTime !== '') {
    const angka = Number(fm.readTime);
    if (!Number.isInteger(angka) || angka < 1 || angka > 120) {
      tambah('readTime', `(${fm.readTime}) tidak masuk akal. Kosongkan saja agar dihitung otomatis.`);
    }
  }

  if (fm.featured !== undefined && typeof fm.featured !== 'boolean') {
    tambah('featured', 'harus true atau false.');
  }

  if (fm.tags !== undefined && fm.tags !== null && fm.tags !== '') {
    if (!Array.isArray(fm.tags)) {
      tambah('tags', 'harus berupa daftar di dalam kurung siku, contoh: [masuk, akun].');
    } else if (fm.tags.some((t) => typeof t !== 'string')) {
      tambah('tags', 'setiap item harus berupa teks tanpa tanda kutip, contoh: [masuk, akun].');
    }
  }

  return hasil;
}

/**
 * Aturan peringatan: batas panjang teks agar tampilan tetap ringkas.
 * Bukan kesalahan; hanya menunjukkan bagian yang sebaiknya dipangkas.
 */
export function validasiPanjangTeks(daftarHalaman) {
  const hasil = [];
  const tambah = (halaman, konteks, pesan) => hasil.push(masalah(halaman.file, null, konteks, pesan));

  for (const halaman of daftarHalaman) {
    if (String(halaman.summary ?? '').length > 100) {
      tambah(halaman, 'summary', `ringkasan terlalu panjang (${String(halaman.summary).length} karakter). Batas yang nyaman dibaca 100 karakter.`);
    }
    for (const langkah of halaman.langkah ?? []) {
      const judul = String(langkah.judul ?? '').trim();
      const jumlahKata = judul ? judul.split(/\s+/).length : 0;
      if (jumlahKata > 8) {
        tambah(halaman, `langkah ${langkah.n}`, `judul langkah "${judul}" punya ${jumlahKata} kata. Sisakan maksimal 8 kata.`);
      }
      if (hitungKata(buangBlokTeksLangkah(langkah)) > 40) {
        tambah(halaman, `langkah ${langkah.n}`, `penjelasan langkah punya lebih dari 40 kata. Pecah jadi beberapa langkah atau ringkas.`);
      }
      for (const blok of langkah.blok ?? []) {
        if (!['tip', 'warn', 'note'].includes(blok.tipe)) continue;
        const jumlah = hitungKata(blok.isi);
        if (jumlah > 25) {
          tambah(halaman, `langkah ${langkah.n}`, `callout ${blok.tipe} punya ${jumlah} kata. Sisakan maksimal 25 kata.`);
        }
      }
    }
  }
  return hasil;
}

function buangBlokTeksLangkah(langkah) {
  const buang = new Set();
  for (const b of langkah.blok ?? []) {
    for (let n = b.baris; n <= b.barisAkhir; n += 1) buang.add(n);
  }
  return langkah.isi
    .split(/\r?\n/)
    .filter((_, indeks) => !buang.has(langkah.barisIsi + indeks))
    .join('\n');
}

/** Aturan 19 sampai 23 dan 37: langkah beserta gambarnya. */
export function validasiLangkah(file, langkah, { akarProyek }) {
  const hasil = [];
  const tambah = (baris, pesan) => hasil.push(masalah(file, baris, `langkah ${langkah.n}`, pesan));

  if (!langkah.judul) {
    tambah(langkah.baris, 'tidak punya judul. Format: "### 2. Judul langkah".');
  }
  if (langkah.gambarJumlah === 0) {
    tambah(langkah.baris, 'tidak punya gambar screenshot.');
  } else if (langkah.gambarJumlah > 1) {
    tambah(langkah.gambar.baris, `punya ${langkah.gambarJumlah} gambar; setiap langkah memakai 1 gambar.`);
  }

  if (langkah.gambarJumlah === 1) {
    if (!langkah.penjelasanAda) {
      tambah(langkah.gambar.baris, 'tidak ada teks penjelasan setelah gambar. Tambahkan minimal satu paragraf.');
    }
    if (!langkah.gambar.alt) {
      tambah(langkah.gambar.baris, 'gambar wajib punya alt text, contoh: ![Form tambah transaksi](/assets/laporan/step-4.png)');
    }
    if (!langkah.gambar.path.startsWith('/assets/')) {
      tambah(langkah.gambar.baris, 'alamat gambar harus diawali "/assets/", contoh: /assets/laporan/step-4.png');
    } else {
      const relatif = langkah.gambar.path.replace(/^\/assets\//, '');
      if (!fs.existsSync(path.join(akarProyek, 'content', 'assets', relatif))) {
        hasil.push(masalah(file, langkah.gambar.baris, `langkah ${langkah.n}`,
          `gambar assets/${relatif} tidak ditemukan. Letakkan file di content/assets/${relatif}`));
      }
    }
  }

  if (langkah.pinTanpaGambar) {
    hasil.push(masalah(file, langkah.pinTanpaGambar.baris, 'blok pin',
      `pada baris ${langkah.pinTanpaGambar.baris} harus diletakkan tepat setelah sebuah gambar.`));
  }

  return hasil;
}

/** Aturan 25 sampai 28: isi blok pin. */
export function validasiPin(file, langkah) {
  const hasil = [];
  if (!langkah.pin) return hasil;
  const pin = parsePin(langkah.pin.isi, langkah.pin.baris + 1);
  let diharapkan = 1;
  for (const p of pin) {
    if (p.salahBentuk && p.nomor === undefined) {
      hasil.push(masalah(file, p.baris, 'pin', 'baris ini tidak mengikuti pola "1. [82,22] Label".'));
      continue;
    }
    if (p.salahBentuk) {
      hasil.push(masalah(file, p.baris, `pin ${p.nomor}`, 'koordinat harus ditulis [x,y], contoh: [82,22]'));
      continue;
    }
    if (p.nomor !== diharapkan) {
      hasil.push(masalah(file, p.baris, 'pin', `nomor pin harus urut 1, 2, 3... ditemukan "${p.nomor}" di baris ${p.baris}.`));
    }
    diharapkan = p.nomor + 1;
    if (p.x > 100 || p.y > 100) {
      hasil.push(masalah(file, p.baris, `pin ${p.nomor}`, `koordinat [${p.x},${p.y}] di luar rentang 0-100. Koordinat adalah persen.`));
    }
    if (!p.label) {
      hasil.push(masalah(file, p.baris, `pin ${p.nomor}`, 'label kosong. Tuliskan keterangan di belakang koordinat.'));
    }
  }
  return hasil;
}

/** Memeriksa semua blok ::: yang ada pada langkah. */
export function validasiBlok(file, langkah) {
  const hasil = [];
  for (const b of langkah.blok ?? []) {
    if (b.belumDitutup) {
      hasil.push(masalah(file, b.baris, 'blok', `blok yang dibuka pada baris ${b.baris} belum ditutup. Tutup dengan ":::" pada baris sendiri.`));
      continue;
    }
    if (TIPE_BLOK.includes(b.tipe)) {
      if (b.tipe === 'pin' && langkah.pinTanpaGambar && b.baris === langkah.pinTanpaGambar.baris) continue;
      continue;
    }
    hasil.push(masalah(file, b.baris, 'callout', `tipe callout "${b.tipe}" tidak dikenal. Gunakan: ${TIPE_CALLOUT.join(', ')}.`));
  }
  return hasil;
}

/** Aturan 31 sampai 35: blok video. */
export function validasiVideo(file, video, nomor) {
  const hasil = [];
  const tambah = (baris, pesan) => hasil.push(masalah(file, baris, `video ${nomor}`, pesan));

  if (!video.judul) {
    tambah(video.baris, 'judul video kosong. Format: "### 1. Judul video".');
  }
  if (!video.penjelasan) {
    tambah(video.baris + 1, 'penjelasan di bawah judul kosong. Tulis 1 sampai 3 kalimat singkat.');
  }
  if (!video.tautan) {
    tambah(video.baris + 1, 'link YouTube tidak ditemukan. Tempel URL YouTube di baris sendiri.');
    return hasil;
  }

  const hasilUrl = parseUrlYoutube(video.tautan);
  if (!hasilUrl) {
    tambah(video.barisTautan, `"${video.tautan}" bukan tautan YouTube. Hanya YouTube yang didukung.`);
    return hasil;
  }

  const { id } = hasilUrl;
  if (id !== PLACEHOLDER_ID && !/^[A-Za-z0-9_-]{11}$/.test(id)) {
    tambah(video.barisTautan, `ID YouTube "${id}" harus 11 karakter. Untuk contoh, pakai ${PLACEHOLDER_ID}.`);
  }

  if (video.durasi?.salah) {
    tambah(video.barisDurasi, `durasi "${video.durasi.teks}" tidak valid. Gunakan "2:15" atau "2 menit 15 detik".`);
  }

  let sebelumnya = -1;
  for (const bab of video.bab) {
    if (bab.detik === null) {
      tambah(bab.baris, `format bab tidak dikenal "${bab.waktu}". Gunakan mm:ss, contoh 01:30.`);
      continue;
    }
    if (bab.detik < sebelumnya) {
      tambah(bab.baris, `bab "${bab.waktu}" lebih kecil dari bab sebelumnya "${formatPendek(video.bab, sebelumnya)}". Urutan bab harus naik.`);
    }
    if (video.durasi && !video.durasi.salah && bab.detik > video.durasi.detik) {
      tambah(bab.baris, `bab "${bab.waktu}" melebihi durasi ${video.durasi.teks}.`);
    }
    sebelumnya = bab.detik;
  }

  return hasil;
}

function formatPendek(daftar, detik) {
  const cocok = daftar.find((b) => b.detik === detik);
  return cocok ? cocok.waktu : String(detik);
}

/** Aturan 36: blok problem. */
export function validasiProblem(file, problem, nomor) {
  const hasil = [];
  for (const bagian of ['masalah', 'penyebab', 'solusi']) {
    const nama = bagian[0].toUpperCase() + bagian.slice(1);
    if (!problem[bagian] || !String(problem[bagian]).trim()) {
      hasil.push(masalah(file, problem.baris[bagian] || problem.baris.masalah, `masalah ${nomor}`,
        `bagian "${nama}" kosong. Format: **${nama}:** ...`));
    }
  }
  return hasil;
}

/** Aturan 38: tautan internal harus menuju halaman yang ada. */
export function validasiTautanInternal(daftarHalaman) {
  const hasil = [];
  const idAda = new Set(daftarHalaman.map((h) => h.id));
  const polos = /(?:^|[\s(])\/([a-z0-9][a-z0-9-]*)(?![\w/-])/g;
  for (const halaman of daftarHalaman) {
    const baris = String(halaman.body ?? '').split(/\r?\n/);
    baris.forEach((teks, i) => {
      polos.lastIndex = 0;
      let cocok;
      while ((cocok = polos.exec(teks)) !== null) {
        if (!idAda.has(cocok[1])) {
          hasil.push(masalah(
            halaman.file,
            (halaman.barisAwalBody ?? 1) + i,
            'tautan internal',
            `"/${cocok[1]}" tidak merujuk halaman yang ada.`,
          ));
        }
      }
    });
  }
  return hasil;
}

/** Aturan 39 dan 40: aset yang tidak terpakai atau terlalu besar. */
export function validasiAset(daftarHalaman, { akarProyek }) {
  const hasil = [];
  const folder = path.join(akarProyek, 'content', 'assets');
  const dipakai = new Set();
  for (const halaman of daftarHalaman) {
    for (const langkah of halaman.langkah ?? []) {
      if (langkah.gambar) dipakai.add(langkah.gambar.path.replace(/^\/assets\//, ''));
    }
  }
  if (!fs.existsSync(folder)) return hasil;

  const semua = [];
  const jelajah = (relatif) => {
    const isi = fs.readdirSync(path.join(folder, relatif), { withFileTypes: true });
    for (const entri of isi) {
      const gabungan = relatif ? `${relatif}/${entri.name}` : entri.name;
      if (entri.isDirectory()) jelajah(gabungan);
      else if (/\.(png|jpe?g|webp)$/i.test(entri.name)) semua.push(gabungan);
    }
  };
  jelajah('');

  for (const relatif of semua) {
    const ukuran = fs.statSync(path.join(folder, relatif)).size;
    const namaRelatif = `content/assets/${relatif}`.split(path.sep).join('/');
    if (!dipakai.has(relatif)) {
      hasil.push(masalah(namaRelatif, null, 'aset', 'tidak dipakai halaman mana pun.'));
    }
    if (ukuran > 2 * 1024 * 1024) {
      hasil.push(masalah(namaRelatif, null, 'aset',
        `berukuran ${(ukuran / 1024 / 1024).toFixed(1)} MB. Hasil WebP diperkirakan besar; pertimbangkan diperkecil.`));
    }
  }
  return hasil;
}

/**
 * Aturan 18: grup yang belum dipakai halaman, sebagai peringatan.
 * Grup bertanda tertunda:true diabaikan karena memang disiapkan lebih dulu.
 */
export function validasiGrupDipakai(config, daftarHalaman) {
  const dipakai = new Set(daftarHalaman.map((h) => h.group));
  const hasil = [];
  for (const grup of config.groups) {
    if (grup.tertunda === true) continue;
    if (!dipakai.has(grup.id)) {
      hasil.push(masalah('content/config.mjs', null, 'groups', `grup "${grup.id}" tidak dipakai halaman mana pun.`));
    }
  }
  return hasil;
}

/**
 * Aturan 37: setiap halaman harus punya minimal satu langkah.
 * Halaman Beranda dikecualikan karena isinya hanya teks penjelasan.
 */
export function validasiAdaLangkah(daftarHalaman) {
  return daftarHalaman
    .filter((h) => h.id !== 'beranda' && (h.langkah ?? []).length === 0)
    .map((h) => masalah(h.file, null, null, 'tidak ada satu pun langkah. Tambahkan bagian "## Panduan" berisi minimal satu langkah.'));
}

/** Ringkasan jumlah isi untuk ditampilkan di akhir validasi. */
export function ringkasPemakaian(daftarHalaman) {
  let langkah = 0;
  let video = 0;
  let masalah = 0;
  for (const h of daftarHalaman) {
    langkah += (h.langkah ?? []).length;
    video += (h.videos ?? []).length;
    masalah += (h.problems ?? []).length;
  }
  return { halaman: daftarHalaman.length, langkah, video, masalah };
}
