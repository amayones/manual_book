// src/theme-boot.js - dijalankan sebelum halaman digambar supaya tema tidak berkedip.
//
// Berkas ini dimuat di dalam <head> tanpa defer dan sengaja dibuat sangat kecil.
// Content-Security-Policy melarang gaya sebaris, jadi semua gaya lewat berkas CSS.
//
// Dua mode saja: light dan dark. Bila pengguna belum pernah memilih, tema
// mengikuti sistem operasi satu kali tanpa disimpan; setelah pengguna klik,
// pilihannya tersimpan dan tidak lagi mengikuti sistem.

(function jalankan() {
  var KUNCI = 'mb:theme';
  var pilihan = 'light';
  try {
    var tersimpan = window.localStorage.getItem(KUNCI);
    if (tersimpan === 'light' || tersimpan === 'dark') {
      pilihan = tersimpan;
    } else if (window.matchMedia) {
      pilihan = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } catch (galat) {
    pilihan = 'light';
  }
  document.documentElement.setAttribute('data-theme', pilihan);
}());