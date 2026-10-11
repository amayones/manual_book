// scripts/dev.mjs - membangun lalu menyajikan dist/ di server lokal.
//
// Sekaligus memantau folder content/ dan src/. Setiap perubahan memicu build
// ulang dan browser dimuat ulang otomatis lewat Server-Sent Events.
//
// Server memakai modul bawaan Node.js saja, tanpa dependensi tambahan.
// Catatan: Content-Security-Policy hanya dipasang di Cloudflare Pages lewat
// _headers, sehingga tidak_memberhentikan apa pun saat belajar di lokal.

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const AKAR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIST = path.join(AKAR, 'dist');
const PORT = Number(process.env.PORT ?? 8788);

const TIPE = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
};

const klienSse = new Set();

function build() {
  return new Promise((selesai) => {
    const proses = spawn(process.execPath, [path.join(AKAR, 'scripts', 'build.mjs'), '--no-budget'], {
      stdio: 'inherit',
      cwd: AKAR,
    });
    proses.on('close', (kode) => selesai(kode));
  });
}

function layani(req, res, nama) {
  const target = path.join(DIST, ...nama.split('/').filter((bagian) => bagian && bagian !== '..'));
  if (!target.startsWith(DIST) || !fs.existsSync(target) || fs.statSync(target).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 - berkas tidak ditemukan. Jalankan npm run build lebih dulu.\n');
    return;
  }
  res.writeHead(200, {
    'Content-Type': TIPE[path.extname(target)] ?? 'application/octet-stream',
    'Cache-Control': 'no-store',
  });
  fs.createReadStream(target).pipe(res);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);

  if (url.pathname === '/__dev/reload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-store',
      Connection: 'keep-alive',
    });
    res.write('data: siap\n\n');
    klienSse.add(res);
    req.on('close', () => klienSse.delete(res));
    return;
  }

  const nama = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
  layani(req, res, nama);
});

function kabari() {
  for (const res of klienSse) res.write('data: muat ulang\n\n');
}

function pantau() {
  let tunda = null;
  for (const folder of ['content', 'src']) {
    const p = path.join(AKAR, folder);
    if (!fs.existsSync(p)) continue;
    fs.watch(p, { recursive: true }, (_peristiwa, namaBerkas) => {
      if (namaBerkas && /\.(png|jpe?g|webp)$/i.test(namaBerkas)) return;
      clearTimeout(tunda);
      tunda = setTimeout(async () => {
        process.stdout.write('\nPerubahan terdeteksi, membangun ulang...\n');
        const kode = await build();
        if (kode === 0) kabari();
        else process.stdout.write('Build gagal, halaman tidak dimuat ulang.\n');
      }, 200);
    });
  }
}

server.listen(PORT, async () => {
  process.stdout.write(`\nServer lokal: http://localhost:${PORT}\n`);
  process.stdout.write('Tekan Ctrl+C untuk berhenti.\n\n');
  const kode = await build();
  if (kode !== 0) process.stdout.write('\nBuild gagal. Perbaiki lalu ubah berkas untuk mencoba lagi.\n');
  pantau();
});
