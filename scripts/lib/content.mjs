// Memindai berkas .md di content/, membaca frontmatter, dan menurunkan
// id serta order dari nama file.
//
// Aturan nama file: 01-login.md menghasilkan id "login" dan order 1.
// Berkas yang namanya diawali garis bawah (contoh _template.md) diabaikan.

import fs from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';

import { hitungReadTime, hitungKata, buangBlok } from './readtime.mjs';
import {
  pecahBagian,
  pecahBlok,
  parseLangkah,
  parseVideo,
} from './directives.mjs';
import {
  TIPE_BLOK,
  TIPE_CALLOUT,
  pecahNamaBerkas,
  tanggalTeks,
  validasiAdaLangkah,
  validasiAset,
  validasiBlok,
  validasiFrontmatter,
  validasiGrupDipakai,
  validasiNamaBerkas,
  validasiPanjangTeks,
  validasiPin,
  validasiLangkah,
  validasiTautanInternal,
  validasiVideo,
} from './rules.mjs';

const JUDUL_BAGIAN_PANDUAN = 'panduan';
const JUDUL_BAGIAN_VIDEO = 'video';

function namaBagianSama(judul, bandingkan) {
  return String(judul ?? '').trim().toLowerCase() === bandingkan;
}

/** Membaca satu berkas halaman menjadi objek lengkap. */
export function bacaHalaman({ akarProyek, config, kodeBahasa, folder, namaBerkas }) {
  const relatif = `content/${folder}/${namaBerkas}`.split(path.sep).join('/');
  const absolut = path.join(akarProyek, 'content', folder, namaBerkas);
  const isi = fs.readFileSync(absolut, 'utf8');

  let hasilMatter;
  try {
    hasilMatter = matter(isi);
  } catch (galat) {
    return {
      file: relatif,
      namaBerkas,
      bahasa: kodeBahasa,
      namaGagal: true,
      galatMatter: galat.message,
      bagian: [],
      langkah: [],
      videos: [],
    };
  }

  const fm = hasilMatter.data ?? {};
  const body = hasilMatter.content ?? '';
  const nama = pecahNamaBerkas(namaBerkas);
  const barisBody = hasilMatter.content.split(/\r?\n/).length;
  const barisAwalBody = isi.slice(0, isi.length - body.length).split(/\r?\n/).length;

  const bagian = pecahBagian(body, barisAwalBody);
  const bagianPanduan = bagian.find((b) => namaBagianSama(b.judul, JUDUL_BAGIAN_PANDUAN));
  const bagianVideo = bagian.find((b) => namaBagianSama(b.judul, JUDUL_BAGIAN_VIDEO));

  const langkah = bagianPanduan
    ? parseLangkah(bagianPanduan.isi, bagianPanduan.barisIsi)
    : [];

  const blokVideo = bagianVideo ? pecahBlok(bagianVideo.isi, bagianVideo.barisIsi) : [];
  const videos = blokVideo
    .filter((b) => b.tipe === 'video')
    .map((b) => parseVideo(b.isi, b.barisIsi));

  const kata = hitungKata(buangBlok(body));
  // group: none berarti halaman tidak masuk grup mana pun (mis. halaman Beranda).
  const grup = fm.group === 'none' ? null : config.groups.find((g) => g.id === fm.group) ?? null;

  const halaman = {
    file: relatif,
    namaBerkas,
    bahasa: kodeBahasa,
    tanpaFrontmatter: !isi.trimStart().startsWith('---'),
    barisAwalBody,
    id: nama.valid ? nama.slug : nama.tanpaPrefix,
    order: nama.valid ? nama.prefix : 999,
    namaValid: nama.valid,
    frontmatter: fm,
    raw: isi,
    body,
    barisBody,
    bagian,
    langkah,
    videos,
    kata,
    readTime: hitungReadTime({ kata, langkah: langkah.length }),
    group: fm.group,
    grup,
    icon: fm.icon || grup?.icon || 'file',
    iconDariGrup: !fm.icon,
    level: fm.level || 'Dasar',
    title: fm.title,
    updated: tanggalTeks(fm.updated),
    since: tanggalTeks(fm.since) ?? null,
    summary: fm.summary,
    tags: Array.isArray(fm.tags) ? fm.tags : [],
    featured: fm.featured === true,
  };
  return halaman;
}

/** Menerapkan seluruh aturan pada satu daftar halaman. */
export function validasiSemua(daftarHalaman, { config, akarProyek }) {
  const galat = [];
  const peringatan = [];

  // Aturan 1 dan 2 per berkas.
  for (const halaman of daftarHalaman) {
    galat.push(...validasiNamaBerkas(halaman.file, halaman.namaBerkas));
  }

  // Aturan 3 dan 4 lintas berkas.
  const prefixDipakai = new Map();
  const idDipakai = new Map();
  for (const halaman of daftarHalaman) {
    const { prefix, slug } = pecahNamaBerkas(halaman.namaBerkas);
    if (prefix !== null) {
      const kunci = `${halaman.bahasa}:${prefix}`;
      if (prefixDipakai.has(kunci)) {
        galat.push({
          file: halaman.file,
          baris: null,
          konteks: 'nama file',
          pesan: `prefix "${String(prefix).padStart(2, '0')}" dipakai ganda oleh ${prefixDipakai.get(kunci)}.`,
        });
      } else {
        prefixDipakai.set(kunci, halaman.namaBerkas);
      }
    }
    if (slug) {
      const kunci = `${halaman.bahasa}:${slug}`;
      if (idDipakai.has(kunci)) {
        galat.push({
          file: halaman.file,
          baris: null,
          konteks: 'nama file',
          pesan: `id "${slug}" muncul pada dua file: ${halaman.namaBerkas} dan ${idDipakai.get(kunci)}. Gunakan nama file berbeda.`,
        });
      } else {
        idDipakai.set(kunci, halaman.namaBerkas);
      }
    }
  }

  for (const halaman of daftarHalaman) {
    if (halaman.namaGagal) {
      galat.push({ file: halaman.file, baris: 1, konteks: 'frontmatter', pesan: `gagal dibaca: ${halaman.galatMatter}` });
      continue;
    }
    if (halaman.tanpaFrontmatter) {
      galat.push({
        file: halaman.file,
        baris: 1,
        konteks: 'frontmatter',
        pesan: 'frontmatter tidak ditemukan. Baris pertama file harus "---".',
      });
    } else {
      galat.push(...validasiFrontmatter(halaman.file, halaman.frontmatter, config));
    }
    galat.push(...validasiAdaLangkah([halaman]));
    galat.push(...validasiBlokTubuh(halaman));
    for (const langkah of halaman.langkah) {
      galat.push(...validasiLangkah(halaman.file, langkah, { akarProyek }));
      galat.push(...validasiPin(halaman.file, langkah));
      galat.push(...validasiBlok(halaman.file, langkah));
    }
    halaman.videos.forEach((video, i) => galat.push(...validasiVideo(halaman.file, video, i + 1)));
  }

  galat.push(...validasiTautanInternal(daftarHalaman));
  peringatan.push(...validasiPanjangTeks(daftarHalaman));
  peringatan.push(...validasiAset(daftarHalaman, { akarProyek }));
  peringatan.push(...validasiGrupDipakai(config, daftarHalaman));

  return { galat: buangDuplikat(galat), peringatan: buangDuplikat(peringatan) };
}

/**
 * Memeriksa blok ::: di luar langkah, misalnya blok video.
 * Blok di dalam langkah diperiksa oleh validasiBlok per langkah.
 */
function validasiBlokTubuh(halaman) {
  const hasil = [];
  for (const b of pecahBlok(halaman.body, halaman.barisAwalBody)) {
    if (b.belumDitutup) {
      hasil.push({
        file: halaman.file,
        baris: b.baris,
        konteks: 'blok',
        pesan: `blok yang dibuka pada baris ${b.baris} belum ditutup. Tutup dengan ":::" pada baris sendiri.`,
      });
      continue;
    }
    if (!TIPE_BLOK.includes(b.tipe)) {
      hasil.push({
        file: halaman.file,
        baris: b.baris,
        konteks: 'callout',
        pesan: `tipe callout "${b.tipe}" tidak dikenal. Gunakan: ${TIPE_CALLOUT.join(', ')}.`,
      });
    }
  }
  return hasil;
}

/** Menghapus pesan yang sama persis supaya tidak dilaporkan dua kali. */
function buangDuplikat(daftar) {
  const dilihat = new Set();
  return daftar.filter((m) => {
    const kunci = `${m.file}|${m.baris}|${m.konteks}|${m.pesan}`;
    if (dilihat.has(kunci)) return false;
    dilihat.add(kunci);
    return true;
  });
}

/**
 * Membaca content/changelog.md menjadi daftar entri untuk halaman Perubahan.
 * Changelog tidak memakai blok :::, hanya heading tanggal dan daftar bullet.
 */
export async function bacaChangelog({ akarProyek, config }) {
  const berkas = path.join(akarProyek, 'content', 'changelog.md');
  if (!fs.existsSync(berkas)) return null;
  const isi = fs.readFileSync(berkas, 'utf8');
  const baris = isi.split(/\r?\n/);
  const entri = [];
  let aktif = null;
  let penampung = [];

  const tutup = () => {
    if (!aktif) return;
    aktif.items = penampung.filter((t) => t.trim() !== '');
    entri.push(aktif);
    aktif = null;
    penampung = [];
  };

  for (let i = 0; i < baris.length; i += 1) {
    const teks = baris[i];
    const tanggal = teks.match(/^##\s+(.+)$/);
    if (tanggal) {
      tutup();
      aktif = { tanggal: tanggal[1].trim(), baris: i + 1, items: [] };
      continue;
    }
    if (aktif && teks.trim() !== '') penampung.push(teks.trim().replace(/^[-*]\s+/, ''));
  }
  tutup();

  return {
    judul: 'Catatan Perubahan',
    ringkas: 'Semua perubahan penting pada manual ini.',
    items: entri,
    sumber: 'content/changelog.md',
    basePath: config.basePath,
  };
}

/** Memindai seluruh folder bahasa dan mengembalikan daftar halaman terurut. */
export function muatSemuaHalaman({ akarProyek, config }) {
  const daftar = [];
  const diabaikan = [];
  const info = [];

  for (const [kode, bahasa] of Object.entries(config.langs)) {
    const folder = path.join(akarProyek, 'content', bahasa.dir);
    if (!fs.existsSync(folder)) {
      info.push(`Folder bahasa "${kode}" belum ada: content/${bahasa.dir}/ (lewati)`);
      continue;
    }
    for (const entri of fs.readdirSync(folder, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entri.isFile() || !entri.name.endsWith('.md')) continue;
      if (entri.name.startsWith('_')) {
        diabaikan.push(`content/${bahasa.dir}/${entri.name}`);
        continue;
      }
      daftar.push(bacaHalaman({ akarProyek, config, kodeBahasa: kode, folder: bahasa.dir, namaBerkas: entri.name }));
    }
  }

  // Berkas .md di luar folder bahasa yang aktif.
  const folderAktif = new Set(Object.values(config.langs).map((b) => b.dir));
  const folderContent = path.join(akarProyek, 'content');
  for (const entri of fs.readdirSync(folderContent, { withFileTypes: true })) {
    if (entri.isDirectory() && !folderAktif.has(entri.name) && entri.name.startsWith('pages')) {
      info.push(`Folder content/${entri.name}/ tidak aktif di config.langs, isinya tidak dipindai.`);
    }
  }

  daftar.sort((a, b) => (a.order - b.order) || a.id.localeCompare(b.id));
  return { daftar, diabaikan, info };
}
