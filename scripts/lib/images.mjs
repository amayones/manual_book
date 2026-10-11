// Mengubah gambar mentah menjadi WebP dengan nama berkas ber-hash isi.
//
// Nama berkas hasil memuat hash isi, jadi Cache-Control immutable aman:
// begitu screenshot diganti, hash berubah, nama berkas berubah, dan browser
// otomatis meminta berkas yang baru.

import fs from 'node:fs';
import path from 'node:path';

import { hashIsi } from './hash.mjs';

let sharpDinuat = null;

/** Memuat sharp secara malas supaya build tetap jalan bila paket tidak tersedia. */
async function ambilSharp() {
  if (process.env.SKIP_IMAGES === '1') return null;
  if (!sharpDinuat) {
    try {
      const modul = await import('sharp');
      sharpDinuat = modul.default;
    } catch (galat) {
      catatPeringatan(`paket sharp tidak dapat dimuat (${galat.message}). Gambar disalin apa adanya tanpa konversi.`);
      sharpDinuat = null;
    }
  }
  return sharpDinuat;
}

const peringatan = [];
export function catatPeringatan(pesan) {
  peringatan.push(pesan);
}
export function daftarPeringatan() {
  return peringatan;
}

/** Menyusun nama berkas hasil: step-1.png menjadi step-1.a3f9c2.webp */
export function namaHasil(pathAsli, hash, ekstensi) {
  const dir = path.posix.dirname(pathAsli);
  const dasar = path.posix.basename(pathAsli, path.posix.extname(pathAsli));
  const nama = `${dasar}.${hash}.${ekstensi}`;
  return dir === '.' ? nama : `${dir}/${nama}`;
}

/**
 * Memproses satu daftar gambar.
 * Mengembalikan peta metadata dan kumpulan berkas hasil konversi.
 * Berkas sengaja belum ditulis ke disk supaya seluruh isi dist dapat ditulis
 * bersama-sama setelah folder dist dibersihkan.
 */
export async function prosesGambar({ daftarPath, akarProyek, config }) {
  const sharp = await ambilSharp();
  const peta = new Map();
  const berkas = new Map();
  const options = config.images;
  let totalSebelum = 0;
  let totalSesudah = 0;

  for (const pathAsli of daftarPath) {
    const relatif = pathAsli.replace(/^\/assets\//, '');
    const sumber = path.join(akarProyek, 'content', 'assets', relatif);
    const data = fs.readFileSync(sumber);
    totalSebelum += data.length;

    let keluaran = data;
    let ekstensi = path.posix.extname(pathAsli).replace('.', '').toLowerCase();
    let lebar = 0;
    let tinggi = 0;

    if (sharp) {
      const gambar = sharp(data, { failOn: 'none' });
      const meta = await gambar.metadata();
      lebar = meta.width ?? 0;
      tinggi = meta.height ?? 0;

      let ukuran = gambar;
      const sisiTerpanjang = Math.max(lebar, tinggi);
      if (sisiTerpanjang > options.maxWidth) {
        ukuran = gambar.resize({
          width: lebar >= tinggi ? options.maxWidth : undefined,
          height: tinggi > lebar ? options.maxWidth : undefined,
          fit: 'inside',
          withoutEnlargement: true,
        });
      }
      keluaran = await ukuran
        .webp({ quality: options.quality, effort: options.effort })
        .toBuffer();
      const metaKecil = await sharp(keluaran).metadata();
      lebar = metaKecil.width ?? lebar;
      tinggi = metaKecil.height ?? tinggi;
      ekstensi = options.format;
    } else {
      const meta = ukuranTanpaSharp(data);
      lebar = meta.lebar;
      tinggi = meta.tinggi;
    }

    const hash = hashIsi(keluaran, options.hashLength);
    const nama = namaHasil(relatif, hash, ekstensi);
    berkas.set(nama, keluaran);

    totalSesudah += keluaran.length;
    peta.set(pathAsli, {
      src: `/assets/${nama}`,
      width: lebar,
      height: tinggi,
      bytes: keluaran.length,
      bytesAsli: data.length,
    });
  }

  return {
    peta,
    berkas,
    ringkasan: {
      jumlah: daftarPath.length,
      totalSebelum,
      totalSesudah,
      hemat: totalSebelum > 0 ? 1 - totalSesudah / totalSebelum : 0,
    },
  };
}

/** Membaca ukuran PNG atau JPEG tanpa dependensi lain. Dipakai saat sharp tidak tersedia. */
function ukuranTanpaSharp(data) {
  // PNG: byte 16 sampai 23 berisi lebar dan tinggi.
  if (data.length > 24 && data.readUInt32BE(0) === 0x89504e47) {
    return { lebar: data.readUInt32BE(16), tinggi: data.readUInt32BE(20) };
  }
  // JPEG: Cari penanda SOF.
  let i = 2;
  while (i < data.length - 9) {
    if (data[i] !== 0xff) {
      i += 1;
      continue;
    }
    const penanda = data[i + 1];
    const panjang = data.readUInt16BE(i + 2);
    if (penanda >= 0xc0 && penanda <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(penanda)) {
      return { tinggi: data.readUInt16BE(i + 5), lebar: data.readUInt16BE(i + 7) };
    }
    i += 2 + panjang;
  }
  return { lebar: 0, tinggi: 0 };
}

/**
 * Mengganti seluruh placeholder gambar di dalam HTML.
 * Placeholder src ditulis {{img:path}}, sedangkan lebar dan tinggi ditulis
 * {{lebar:path}} dan {{tinggi:path}} supaya atribut img tetap punya angka.
 */
export function gantiPlaceholderGambar(html, peta, basePath = '') {
  let hasil = String(html);
  hasil = hasil.replace(/\{\{img:([^}]+)\}\}/g, (_, pathAsli) => {
    const ketemu = peta.get(pathAsli);
    return ketemu ? `${basePath}${ketemu.src}` : '';
  });
  hasil = hasil.replace(/\{\{lebar:([^}]+)\}\}/g, (_, pathAsli) => {
    const ketemu = peta.get(pathAsli);
    return ketemu && ketemu.width ? String(ketemu.width) : '1600';
  });
  hasil = hasil.replace(/\{\{tinggi:([^}]+)\}\}/g, (_, pathAsli) => {
    const ketemu = peta.get(pathAsli);
    return ketemu && ketemu.height ? String(ketemu.height) : '900';
  });
  return hasil;
}

/** Mengambil seluruh atribut gambar dari HTML untuk diukur validasi lebar minimum. */
export function kumpulkanPlaceholderGambar(html) {
  const hasil = [];
  const pola = /\{\{img:([^}]+)\}\}/g;
  let cocok;
  while ((cocok = pola.exec(String(html))) !== null) hasil.push(cocok[1]);
  return hasil;
}
