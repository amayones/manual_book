// scripts/lib/headers.mjs - menyusun berkas _headers untuk Cloudflare Pages.
//
// Berkas public/_headers adalah templat. Dua penanda {{...}} di dalamnya
// diganti sesuai pengaturan, lalu hasilnya ditulis ke dist/_headers.
//
// Catatan routing: aplikasi ini tidak memakai routing berbasis path. Address bar
// selalu menunjuk ke root, dan seluruh perpindahan halaman dikerjakan oleh
// JavaScript. Karena itu tidak ada berkas routing tambahan yang diperlukan.
//
// Berkas data JSON memakai nama ber-hash isi seperti aset lain, sehingga aman
// memakai Cache-Control immutable selama satu tahun.

import fs from 'node:fs';
import path from 'node:path';

/**
 * Menyusun isi _headers dari public/_headers. Domain Cloudflare Web Analytics
 * hanya ditambahkan bila fiturnya benar-benar diaktifkan lewat config.
 */
export function susunHeaders({ akarProyek, analytics }) {
  const templat = fs.readFileSync(path.join(akarProyek, 'public', '_headers'), 'utf8');
  const aktif = Boolean(analytics?.cloudflareWebAnalytics && analytics?.siteId);
  return templat
    .split('{{TAMBAHAN_SKRIP}}').join(aktif ? ' https://static.cloudflareinsights.com' : '')
    .split('{{TAMBAHAN_KONEKSI}}').join(aktif ? ' https://cloudflareinsights.com' : '');
}

/** Skrip beacon Cloudflare Web Analytics. Tidak memakai cookie. */
export function skripAnalytics({ analytics }) {
  if (!analytics?.cloudflareWebAnalytics || !analytics.siteId) return '';
  return `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" `
    + `data-cf-beacon='${JSON.stringify({ v: 4, r: true, a: Number(analytics.siteId) })}'></script>`;
}
