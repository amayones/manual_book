// Pengujian Content-Security-Policy.
//
// Content-Security-Policy yang dihasilkan tidak memakai unsafe-inline, jadi
// tidak boleh ada style sebaris, atribut event sebaris, atau skrip sebaris
// di hasil build maupun di berkas sumber.

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

import { susunHeaders, skripAnalytics } from '../scripts/lib/headers.mjs';
import { AKAR_PROYEK, buatProyekUji } from './alat.mjs';

const POLA_GAYA_SEBARIS = /\sstyle="/i;
const POLA_EVENT_SEBARIS = /\son[a-z]+="/i;
const POLA_SKRIP_SEBARIS = /<script(?![^>]*\bsrc=)[^>]*>/i;

function headerUji(analytics) {
  return susunHeaders({ akarProyek: AKAR_PROYEK, analytics });
}

test('header dasar tidak memakai unsafe-inline', () => {
  const isi = headerUji({ cloudflareWebAnalytics: false, siteId: null });
  assert.ok(!isi.includes('unsafe-inline'));
  assert.ok(!isi.includes('unsafe-eval'));
});

test('header memuat kebijakan yang disepakati', () => {
  const isi = headerUji({ cloudflareWebAnalytics: false, siteId: null });
  assert.match(isi, /default-src 'self'/);
  assert.match(isi, /script-src 'self'/);
  assert.match(isi, /style-src 'self'/);
  assert.match(isi, /img-src 'self' data: https:\/\/i\.ytimg\.com/);
  assert.match(isi, /frame-src https:\/\/www\.youtube-nocookie\.com/);
  assert.match(isi, /connect-src 'self'/);
  assert.match(isi, /frame-ancestors 'self'/);
  assert.match(isi, /\/assets\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
  assert.match(isi, /\/data\/\*\n {2}Cache-Control: public, max-age=31536000, immutable/);
  assert.match(isi, /^\/\n {2}Cache-Control: public, max-age=0, must-revalidate$/m);
});

test('domain analytics hanya muncul saat fiturnya diaktifkan', () => {
  const mati = headerUji({ cloudflareWebAnalytics: false, siteId: '123' });
  assert.ok(!mati.includes('static.cloudflareinsights.com'));
  assert.ok(!mati.includes('cloudflareinsights.com'));

  const hidup = headerUji({ cloudflareWebAnalytics: true, siteId: '123' });
  assert.match(hidup, /script-src 'self' https:\/\/static\.cloudflareinsights\.com/);
  assert.match(hidup, /connect-src 'self' https:\/\/cloudflareinsights\.com/);
});

test('skrip beacon hanya dibuat saat analytics diaktifkan', () => {
  assert.equal(skripAnalytics({ analytics: { cloudflareWebAnalytics: false, siteId: '123' } }), '');
  const hidup = skripAnalytics({ analytics: { cloudflareWebAnalytics: true, siteId: '123' } });
  assert.match(hidup, /static\.cloudflareinsights\.com\/beacon\.min\.js/);
  assert.match(hidup, /defer/);
});

test('berkas sumber di src/ bebas dari gaya, event, dan skrip sebaris', () => {
  const folder = path.join(AKAR_PROYEK, 'src');
  for (const nama of ['index.html', 'app.js', 'styles.css', 'theme-boot.js']) {
    const isi = fs.readFileSync(path.join(folder, nama), 'utf8');
    if (nama.endsWith('.html')) {
      assert.ok(!POLA_GAYA_SEBARIS.test(isi), `${nama} memuat atribut style`);
      assert.ok(!POLA_EVENT_SEBARIS.test(isi), `${nama} memuat atribut event sebaris`);
      assert.ok(!POLA_SKRIP_SEBARIS.test(isi), `${nama} memuat skrip sebaris`);
      assert.ok(!/<style[\s>]/i.test(isi), `${nama} memuat elemen style`);
    }
    if (nama.endsWith('.js')) {
      assert.ok(!/\.setAttribute\(\s*['"]style['"]/.test(isi), `${nama} memakai setAttribute style`);
      assert.ok(!/\.innerHTML\s*=/.test(isi), `${nama} memakai innerHTML`);
    }
  }
});

test('hasil build bebas dari gaya, event, dan skrip sebaris', async (t) => {
  const proyek = await buatProyekUji();
  t.after(() => proyek.bersih());
  execFileSync(process.execPath, [
    path.join(AKAR_PROYEK, 'scripts', 'build.mjs'),
    `--akar=${proyek.akar}`,
    '--no-budget',
  ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

  const html = fs.readFileSync(path.join(proyek.dist, 'index.html'), 'utf8');
  assert.ok(!POLA_GAYA_SEBARIS.test(html), 'index.html hasil build memuat atribut style');
  assert.ok(!POLA_EVENT_SEBARIS.test(html), 'index.html hasil build memuat atribut event sebaris');
  assert.ok(!POLA_SKRIP_SEBARIS.test(html), 'index.html hasil build memuat skrip sebaris');
  assert.ok(!/<style[\s>]/i.test(html), 'index.html hasil build memuat elemen style');

  const data = fs.readdirSync(path.join(proyek.dist, 'data'))[0];
  const isiData = fs.readFileSync(path.join(proyek.dist, 'data', data), 'utf8');
  assert.ok(!POLA_SKRIP_SEBARIS.test(isiData), 'data JSON memuat skrip sebaris');
  assert.ok(!POLA_EVENT_SEBARIS.test(isiData), 'data JSON memuat atribut event sebaris');
});

test('app.js tidak boleh memakai innerHTML atau setAttribute style', () => {
  const mentah = fs.readFileSync(path.join(AKAR_PROYEK, 'src', 'app.js'), 'utf8');
  // Abaikan komentar supaya aturan tidak menuduh dokumentasinya sendiri.
  const isi = mentah.replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/innerHTML/.test(isi), 'app.js tidak boleh memakai innerHTML');
  assert.ok(!/setAttribute\(\s*['"]style['"]/.test(isi), 'app.js tidak boleh memakai setAttribute style');
  assert.ok(!/\.style\s*=\s*['"]/.test(isi), 'app.js tidak boleh mengisi style sebagai teks');
});

test('app.js memakai sprite lewat use, bukan jalur SVG mentah', () => {
  const isi = fs.readFileSync(path.join(AKAR_PROYEK, 'src', 'app.js'), 'utf8');
  assert.ok(isi.includes("setAttribute('href', ui ? '#i-ui-'"), 'buatIkon memakai use dengan id sprite');
  assert.ok(!/M\d[\d\s.,-]{20,}/.test(isi.replace(/^\s*\/\/.*$/gm, '')), 'app.js tidak boleh memuat data path SVG');
});