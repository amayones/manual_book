// src/app.js - shell, router, dan tampilan manual book.
//
// Berkas ini digabungkan dengan src/router-core.mjs oleh build menjadi satu
// berkas app.<hash>.js. Tidak ada pustaka luar dan tidak ada bundler.
//
// Aturan yang dijaga ketat di berkas ini:
// - Tidak ada atribut style pada HTML. Semua gaya lewat styles.css atau CSSOM.
// - Tidak ada atribut event sebaris dan tidak ada skrip sebaris.
// - Semua teks yang berasal dari URL, state, atau input pengguna masuk lewat
//   textContent atau elemen DOM. innerHTML hanya dipakai untuk HTML konten
//   yang sudah dihasilkan build dari berkas Markdown milik sendiri.

(function () {
  'use strict';

  var D = window.MBInti;
  var KUNCI_TEMA = 'mb:theme';
  var KUNCI_NAV = 'mb:nav';

  var AKAR = document.documentElement;
  var ISI = document.getElementById('isi');
  var LACI = document.getElementById('laci');
  var LACI_ISI = document.getElementById('laci-isi');
  var TIRAI = document.querySelector('.tirai');
  var TOAST = document.getElementById('toast');
  var IKON_TEMA = document.getElementById('ikon-tema');
  var NS_SVG = 'http://www.w3.org/2000/svg';

  var BASE = AKAR.getAttribute('data-base') || '/';
  var URUT_TEMA = ['light', 'dark'];
  var data = null;
  var state = Object.assign(D.stateAwal(), { i: 0, unknown: null, gulir: 0 });
  var giliranCari = 0;
  var tundaSesi = 0;
  var kotakCariAktif = null;
  var tahanFokusJudul = false;

  // ------------------------------------------------------------ alat dasar

  function buat(nama, kelas, teks) {
    var el = document.createElement(nama);
    if (kelas) el.className = kelas;
    if (teks !== undefined && teks !== null) el.textContent = teks;
    return el;
  }

  function qs(pilih, akar) {
    return (akar || document).querySelector(pilih);
  }

  function qsa(pilih, akar) {
    return Array.prototype.slice.call((akar || document).querySelectorAll(pilih));
  }

  function kosongkan(node) {
    while (node && node.firstChild) node.removeChild(node.firstChild);
  }

  /** Membuat tombol dengan data-action dan atribut tambahan sekaligus. */
  function buatTombol(aksi, kelas, teks, atribut) {
    var b = buat('button', kelas);
    b.type = 'button';
    if (aksi) b.setAttribute('data-action', aksi);
    if (teks !== undefined && teks !== null) b.textContent = teks;
    if (atribut) {
      for (var k in atribut) {
        if (Object.prototype.hasOwnProperty.call(atribut, k)) b.setAttribute(k, atribut[k]);
      }
    }
    return b;
  }

  /**
   * Membuat elemen ikon dari sprite. Nama berasal dari data JSON yang sudah
   * divalidasi build, dan karakter selain huruf kecil, angka, dan tanda
   * hubung dibuang supaya tidak bisa menjadi id asing.
   */
  function buatIkon(nama, ui) {
    var bersih = String(nama || '').replace(/[^a-z0-9-]/g, '') || 'file';
    var svg = document.createElementNS(NS_SVG, 'svg');
    svg.setAttribute('class', 'ikon');
    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('focusable', 'false');
    var pakai = document.createElementNS(NS_SVG, 'use');
    pakai.setAttribute('href', ui ? '#i-ui-' + bersih : '#i-' + bersih);
    svg.appendChild(pakai);
    return svg;
  }

  function simpanPenyimpanan(nama, jenis, nilai) {
    try {
      window[jenis].setItem(nama, nilai);
    } catch {
      /* penyimpanan penuh atau dinonaktifkan, diabaikan */
    }
  }

  function formatTanggal(teks) {
    var bagian = String(teks || '').split('-');
    if (bagian.length !== 3) return teks || '';
    var bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
    return Number(bagian[2]) + ' ' + bulan[Number(bagian[1]) - 1] + ' ' + bagian[0];
  }

  /** Tanggal hari ini dalam UTC, bentuk YYYY-MM-DD, untuk menghitung badge. */
  function hariIni() {
    return new Date().toISOString().slice(0, 10);
  }

  /** Badge dihitung di browser dari since/updated dan tanggal hari ini. */
  function lencanaHalaman(halaman) {
    return D.hitungBadge(halaman.since, halaman.updated, hariIni(), data.meta.badges);
  }

  // ------------------------------------------------------------------ toast

  var tundaToast = 0;
  function toast(pesan) {
    if (!TOAST) return;
    TOAST.textContent = pesan;
    TOAST.hidden = false;
    TOAST.classList.add('toast-muncul');
    window.clearTimeout(tundaToast);
    tundaToast = window.setTimeout(function () {
      TOAST.classList.remove('toast-muncul');
      TOAST.hidden = true;
    }, 2000);
  }

  // ------------------------------------------------------------------- data

  function sumberData() {
    return AKAR.getAttribute('data-json') || '';
  }

  function ambilData() {
    var sumber = sumberData();
    if (!sumber) return Promise.reject(new Error('alamat berkas data tidak ditemukan'));
    return window.fetch(sumber, { credentials: 'omit' }).then(function (jawaban) {
      if (!jawaban.ok) throw new Error('HTTP ' + jawaban.status);
      return jawaban.json();
    });
  }

  function cariHalaman(id) {
    var daftar = (data && data.pages) || [];
    for (var i = 0; i < daftar.length; i++) {
      if (daftar[i].id === id) return daftar[i];
    }
    return null;
  }

  function halamanTerurut() {
    return (data.pages || []).slice().sort(function (a, b) {
      return a.order - b.order || a.id.localeCompare(b.id);
    });
  }

  // ------------------------------------------------------------------ riwayat

  function entriRiwayat() {
    return { i: state.i, view: state.view, pageId: state.pageId, tab: state.tab, step: state.step };
  }

  function terapkan(stateBaru, mode) {
    var baru = Object.assign(D.stateAwal(), stateBaru);
    baru.i = mode === 'kembali' ? (stateBaru.i || 0)
      : mode === 'ganti' ? state.i : state.i + 1;
    state = baru;
    if (mode === 'ganti') window.history.replaceState(entriRiwayat(), '', BASE);
    else if (mode === 'maju') window.history.pushState(entriRiwayat(), '', BASE);
    gambar();
  }

  function navigasi(perubahan) {
    terapkan(Object.assign({}, state, perubahan, { unknown: null, gulir: 0 }), 'maju');
  }

  // ------------------------------------------------------------------ render

  function gambar() {
    if (!data) return;
    tutupLaci();
    kosongkan(ISI);
    if (state.unknown !== null) renderTidakDitemukan(state.unknown);
    else if (state.view === 'changelog') renderCatatan();
    else if (state.view === 'page') renderHalaman(cariHalaman(state.pageId));
    perbaruiSidebar();
    window.scrollTo(0, state.gulir || 0);
    window.requestAnimationFrame(fokusJudul);
    if (state.view === 'page' && state.unknown === null) simpanPosisiSegera();
  }

  function fokusJudul() {
    if (tahanFokusJudul) {
      tahanFokusJudul = false;
      return;
    }
    var judul = qs('h1', ISI);
    if (!judul) return;
    judul.setAttribute('tabindex', '-1');
    judul.focus({ preventScroll: true });
  }

  // ------------------------------------------------------------- beranda

  // --------------------------------------------------------------- pencarian

  /**
   * Kotak pencarian berada di dalam header, bukan di halaman, sehingga
   * selalu tersedia di halaman mana pun.
   */
  function kotakCari() {
    return document.querySelector('.cari-navbar');
  }

  /** Kotak pencarian yang memuat input tertentu, baik di navbar maupun di beranda. */
  function kotakDariInput(input) {
    if (!input) return null;
    if (input.classList.contains('cari-input')) return kotakCari();
    if (input.classList.contains('cari-besar-input')) return input.closest('.cari-besar');
    return null;
  }

  function cariHalamanSemua(teks) {
    var q = String(teks || '').trim().toLowerCase();
    if (!q) return [];
    var kata = q.split(/\s+/).filter(Boolean);
    var indeks = data.searchIndex || {};
    var peta = new Map();

    function tambah(p, n, skor) {
      var kunci = p + '#' + n;
      var ada = peta.get(kunci);
      if (ada) ada.skor += skor;
      else peta.set(kunci, { p: p, n: n, skor: skor });
    }

    for (var i = 0; i < kata.length; i += 1) {
      var langsung = indeks[kata[i]];
      if (langsung) {
        for (var a = 0; a < langsung.length; a += 1) {
          tambah(langsung[a].p, langsung[a].n, langsung[a].b);
        }
      }
      if (kata[i].length >= 3) {
        for (var kunci in indeks) {
          if (kunci.length > kata[i].length && kunci.indexOf(kata[i]) === 0) {
            var parsial = indeks[kunci];
            for (var b = 0; b < parsial.length; b += 1) {
              tambah(parsial[b].p, parsial[b].n, parsial[b].b * 0.6);
            }
          }
        }
      }
    }

    var semua = data.pages || [];
    for (var c = 0; c < semua.length; c += 1) {
      if (String(semua[c].title).toLowerCase().indexOf(q) !== -1) {
        tambah(semua[c].id, 0, 30);
      }
    }

    var urut = Array.from(peta.values()).sort(function (x, y) {
      return y.skor - x.skor || x.p.localeCompare(y.p);
    });
    return urut.slice(0, 10).map(function (item) {
      var halaman = cariHalaman(item.p);
      var judulLangkah = '';
      if (halaman && item.n) {
        for (var s = 0; s < halaman.langkah.length; s += 1) {
          if (halaman.langkah[s].n === item.n) judulLangkah = halaman.langkah[s].judul;
        }
      }
      return { id: item.p, langkah: item.n || null, halaman: halaman, judul: judulLangkah };
    });
  }

  function escPola(teks) {
    return String(teks).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function tulisSorot(node, teks, kata) {
    var pola = kata.filter(Boolean).slice().sort(function (a, b) { return b.length - a.length; });
    if (!pola.length || !teks) {
      node.textContent = teks || '';
      return;
    }
    var re = new RegExp('(' + pola.map(escPola).join('|') + ')', 'ig');
    var sisa = 0;
    var cocok;
    while ((cocok = re.exec(teks)) !== null) {
      if (cocok.index > sisa) node.appendChild(document.createTextNode(teks.slice(sisa, cocok.index)));
      node.appendChild(buat('mark', '', cocok[0]));
      sisa = cocok.index + cocok[0].length;
      if (cocok[0].length === 0) re.lastIndex += 1;
    }
    node.appendChild(document.createTextNode(teks.slice(sisa)));
  }

  function inputCariDi(kotak) {
    if (!kotak) return null;
    return qs('.cari-input', kotak) || qs('.cari-besar-input', kotak);
  }

  function gambarkanHasil(daftar, kata, kotak) {
    var wadah = kotak && qs('.cari-hasil', kotak);
    var input = inputCariDi(kotak);
    var status = kotak && qs('.cari-status', kotak);
    if (!wadah || !input) return;
    kosongkan(wadah);
    if (!daftar.length) {
      wadah.hidden = true;
      input.setAttribute('aria-expanded', 'false');
      if (status) status.textContent = kata.length ? 'Tidak ada hasil untuk kata itu.' : '';
      return;
    }
    for (var i = 0; i < daftar.length; i += 1) {
      var item = daftar[i];
      var tombol = buatTombol('buka-hasil', 'cari-item', null, {
        role: 'option',
        'data-halaman': item.id,
        'data-langkah': item.langkah == null ? '' : String(item.langkah),
      });
      var judul = buat('span', 'cari-item-judul');
      tulisSorot(judul, item.halaman ? item.halaman.title : item.id, kata);
      tombol.appendChild(judul);
      if (item.judul) {
        var sub = buat('span', 'cari-item-sub');
        tulisSorot(sub, 'Langkah ' + item.langkah + ': ' + item.judul, kata);
        tombol.appendChild(sub);
      } else if (item.halaman) {
        var ringkas = buat('span', 'cari-item-sub');
        tulisSorot(ringkas, item.halaman.summary, kata);
        tombol.appendChild(ringkas);
      }
      wadah.appendChild(tombol);
    }
    wadah.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    if (status) status.textContent = daftar.length + ' hasil ditemukan.';
  }

  function jalankanCari(kotak) {
    var input = inputCariDi(kotak);
    if (!input) return;
    var kata = input.value.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (!kata.length) {
      gambarkanHasil([], [], kotak);
      return;
    }
    gambarkanHasil(cariHalamanSemua(input.value), kata, kotak);
  }

  function fokuskanCari(nilai) {
    var kotak = kotakCari();
    if (!kotak) return;
    var input = qs('.cari-input', kotak);
    if (nilai !== undefined) input.value = nilai;
    input.focus();
    input.select();
    jalankanCari(kotak);
  }

  // --------------------------------------------------------------- halaman

  function renderHalaman(halaman) {
    if (!halaman) {
      state.unknown = state.pageId;
      renderTidakDitemukan(state.pageId);
      return;
    }
    document.title = halaman.title + ' - ' + data.meta.appName;
    var meta = document.querySelector('meta[name="description"]');
    if (meta) meta.setAttribute('content', halaman.summary || '');

    var artikel = buat('article', 'halaman');

    // Halaman Beranda: hanya logo dan teks penjelasan, tanpa chip dan tanpa tab.
    if (halaman.id === D.ID_BERANDA) {
      renderPembuka(artikel, halaman);
      ISI.appendChild(artikel);
      return;
    }

    var kepala = buat('header', 'halaman-kepala');

    var lencanaIkon = buat('span', 'halaman-ikon');
    lencanaIkon.appendChild(buatIkon(halaman.icon));
    kepala.appendChild(lencanaIkon);

    var barisJudul = buat('div', 'halaman-judul-baris');
    barisJudul.appendChild(buat('h1', 'halaman-judul', halaman.title));
    var lencana = lencanaHalaman(halaman);
    if (lencana.indexOf('baru') !== -1) {
      barisJudul.appendChild(buat('span', 'lencana lencana-baru', 'Baru'));
    } else if (lencana.indexOf('diperbarui') !== -1) {
      barisJudul.appendChild(buat('span', 'lencana lencana-diperbarui', 'Diperbarui'));
    }
    kepala.appendChild(barisJudul);
    kepala.appendChild(buat('p', 'halaman-ringkas', halaman.summary));

    artikel.appendChild(kepala);

    if (halaman.htmlSebelum) {
      var sebelum = buat('section', 'kotak sebelum-mulai');
      var judulSebelum = buat('h2', 'kotak-judul');
      judulSebelum.id = 'sebelum-mulai';
      judulSebelum.appendChild(buatIkon('list', true));
      judulSebelum.appendChild(buat('span', '', 'Sebelum mulai'));
      sebelum.appendChild(judulSebelum);
      sebelum.insertAdjacentHTML('beforeend', halaman.htmlSebelum);
      artikel.appendChild(sebelum);
    }

    var tablist = buat('div', 'tablist');
    tablist.setAttribute('role', 'tablist');
    tablist.setAttribute('aria-label', 'Isi halaman ' + halaman.title);

    var panelPanduan = buat('div', 'panel');
    panelPanduan.id = 'panel-panduan';
    panelPanduan.setAttribute('role', 'tabpanel');
    panelPanduan.setAttribute('tabindex', '0');

    var panelVideo = buat('div', 'panel');
    panelVideo.id = 'panel-video';
    panelVideo.setAttribute('role', 'tabpanel');
    panelVideo.setAttribute('tabindex', '0');

    // Halaman tanpa langkah dan tanpa video tidak memakai tab sama sekali.
    var adaIsi = Boolean(halaman.htmlLangkah) || Boolean(halaman.htmlVideo);
    tablist.hidden = !adaIsi;
    panelPanduan.hidden = !adaIsi || state.tab === 'video';
    panelVideo.hidden = !adaIsi || state.tab !== 'video';

    [['guide', 'Panduan', panelPanduan], ['video', 'Video', panelVideo]].forEach(function (pasangan, urutan) {
      var tombol = buatTombol('ganti-tab', 'tab', pasangan[1], {
        role: 'tab',
        'aria-controls': pasangan[2].id,
        'data-tab': pasangan[0],
        'aria-selected': urutan === 0 ? 'true' : 'false',
      });
      tombol.id = 'tab-' + pasangan[0];
      tablist.appendChild(tombol);
    });

    panelPanduan.setAttribute('aria-labelledby', 'tab-guide');
    panelVideo.setAttribute('aria-labelledby', 'tab-video');

    panelPanduan.insertAdjacentHTML('beforeend', halaman.htmlLangkah || '');

    if (halaman.htmlHasil) {
      var hasil = buat('section', 'kotak hasil-akhir');
      var judulHasil = buat('h2', 'kotak-judul');
      judulHasil.id = 'hasil-akhir';
      judulHasil.appendChild(buatIkon('flag', true));
      judulHasil.appendChild(buat('span', '', 'Hasil akhir'));
      hasil.appendChild(judulHasil);
      hasil.insertAdjacentHTML('beforeend', halaman.htmlHasil);
      panelPanduan.appendChild(hasil);
    }

    if (halaman.htmlMasalah) {
      var masalah = buat('section', 'kotak masalah-kotak');
      var judulMasalah = buat('h2', 'kotak-judul', 'Masalah yang sering terjadi');
      judulMasalah.id = 'masalah-sering';
      masalah.appendChild(judulMasalah);
      masalah.insertAdjacentHTML('beforeend', halaman.htmlMasalah);
      panelPanduan.appendChild(masalah);
    }

    panelVideo.insertAdjacentHTML('beforeend', halaman.htmlVideo || '');

    var badan = buat('div', 'halaman-badan');
    var wadahIsi = buat('div', 'halaman-isi');
    wadahIsi.appendChild(tablist);
    wadahIsi.appendChild(panelPanduan);
    wadahIsi.appendChild(panelVideo);
    var nav = buat('nav', 'daftar-isi');
    nav.setAttribute('aria-label', 'Di halaman ini');
    nav.appendChild(buat('p', 'daftar-isi-judul', 'Di halaman ini'));
    var navDaftar = buat('ul', 'daftar-isi-daftar');
    nav.appendChild(navDaftar);
    badan.appendChild(wadahIsi);
    badan.appendChild(nav);
    artikel.appendChild(badan);

    var catatanAkhir = buat('p', 'halaman-diperbarui');
    catatanAkhir.appendChild(buatIkon('clock', true));
    catatanAkhir.appendChild(buat('span', '', 'Terakhir diperbarui: ' + formatTanggal(halaman.updated)));
    artikel.appendChild(catatanAkhir);

    ISI.appendChild(artikel);

    terapkanTab(state.tab, panelPanduan, panelVideo);
    tempatkanPin(panelPanduan);
    isiDaftarIsi(state.tab);
    sorotKonten(halaman);
  }

/**
   * Halaman Beranda: logo besar, nama aplikasi, kalimat penjelasan, kotak
   * pencarian besar, lalu kartu halaman per grup. Isi diambil dari bagian
   * "Sebelum mulai" pada berkas 00-beranda.md.
   */
  function renderPembuka(artikel, halaman) {
    var meta = data.meta;

    var pembuka = buat('section', 'pembuka');
    var tanda = buat('span', 'pembuka-logo');
    tanda.appendChild(buatIkon(halaman.icon));
    pembuka.appendChild(tanda);
    pembuka.appendChild(buat('h1', 'pembuka-judul', meta.appName));
    pembuka.appendChild(buat('p', 'pembuka-teks', meta.tagline || halaman.summary));
    pembuka.appendChild(buatKotakCariBesar());
    artikel.appendChild(pembuka);

    if (halaman.htmlSebelum) {
      var isi = buat('div', 'pembuka-isi');
      isi.insertAdjacentHTML('beforeend', halaman.htmlSebelum);
      artikel.appendChild(isi);
    }

    artikel.appendChild(buatKartuGrup());
  }

  /** Kotak pencarian besar di beranda; hasilnya muncul tepat di bawah input. */
  function buatKotakCariBesar() {
    var kotak = buat('div', 'cari-besar');
    var ikon = buat('span', 'cari-besar-ikon');
    ikon.setAttribute('aria-hidden', 'true');
    ikon.appendChild(buatIkon('search', true));
    kotak.appendChild(ikon);
    var input = buat('input', 'cari-besar-input');
    input.type = 'search';
    input.autocomplete = 'off';
    input.placeholder = metaPlaceholder();
    input.setAttribute('role', 'combobox');
    input.setAttribute('aria-expanded', 'false');
    input.setAttribute('aria-autocomplete', 'list');
    input.setAttribute('aria-haspopup', 'listbox');
    input.setAttribute('aria-label', 'Cari halaman atau langkah');
    kotak.appendChild(input);
    var hasil = buat('div', 'cari-hasil');
    hasil.setAttribute('role', 'listbox');
    hasil.hidden = true;
    kotak.appendChild(hasil);
    var status = buat('p', 'cari-status');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    kotak.appendChild(status);
    return kotak;
  }

  function metaPlaceholder() {
    return 'Contoh: login, dashboard, kata sandi';
  }

  /** Kartu halaman dikelompokkan sesuai grup di config. */
  function buatKartuGrup() {
    var wadah = buat('div', 'kelompok-kartu');
    var meta = data.meta;
    var urutan = halamanTerurut();

    for (var g = 0; g < meta.groups.length; g += 1) {
      var grup = meta.groups[g];
      var isi = urutan.filter(function (h) { return h.group === grup.id; });
      if (!isi.length) continue;

      var bagian = buat('section', 'kelompok-kartu-bagian');
      var judul = buat('h2', 'kelompok-kartu-judul', grup.label);
      bagian.appendChild(judul);

      var daftar = buat('ul', 'kartu-daftar');
      for (var i = 0; i < isi.length; i += 1) {
        daftar.appendChild(buatKartu(isi[i]));
      }
      bagian.appendChild(daftar);
      wadah.appendChild(bagian);
    }
    return wadah;
  }

  function buatKartu(halaman) {
    var li = buat('li');
    var kartu = buat('a', 'kartu');
    kartu.href = BASE;
    kartu.setAttribute('data-action', 'buka-halaman');
    kartu.setAttribute('data-halaman', halaman.id);

    var kepala = buat('span', 'kartu-kepala');
    var ikon = buat('span', 'kartu-ikon');
    ikon.appendChild(buatIkon(halaman.icon));
    kepala.appendChild(ikon);
    kepala.appendChild(buat('span', 'kartu-judul', halaman.title));

    var lencana = lencanaHalaman(halaman);
    if (lencana.indexOf('baru') !== -1) {
      kepala.appendChild(buat('span', 'lencana lencana-baru', 'Baru'));
    } else if (lencana.indexOf('diperbarui') !== -1) {
      kepala.appendChild(buat('span', 'lencana lencana-diperbarui', 'Diperbarui'));
    }
    kartu.appendChild(kepala);
    kartu.appendChild(buat('span', 'kartu-ringkas', halaman.summary));
    li.appendChild(kartu);
    return li;
  }

  function terapkanTab(tab, panelPanduan, panelVideo) {
    var tabPanduan = document.getElementById('tab-guide');
    var tabVideo = document.getElementById('tab-video');
    var video = tab === 'video';
    tabPanduan.setAttribute('aria-selected', video ? 'false' : 'true');
    tabVideo.setAttribute('aria-selected', video ? 'true' : 'false');
    tabPanduan.tabIndex = video ? -1 : 0;
    tabVideo.tabIndex = video ? 0 : -1;
    panelPanduan.hidden = video;
    panelVideo.hidden = !video;
  }

  function gerakHalus() {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
  }

  /**
   * Menyorot konten yang ditunjuk parameter s.
   * Pada tab guide, s adalah nomor langkah. Pada tab video, s adalah nomor video.
   * Nomor di luar jangkauan diabaikan tanpa galat.
   */
  function sorotKonten(halaman) {
    var nomor = D.nomorValid(state, halaman);
    if (!nomor) return;
    var penanda;
    if (state.tab === 'video') {
      penanda = qs('.video[data-video-nomor="' + nomor + '"]', ISI);
    } else {
      penanda = qs('#langkah-' + nomor, ISI);
    }
    if (!penanda) return;
    penanda.classList.add('disorot');
    penanda.scrollIntoView({ behavior: gerakHalus(), block: 'start' });
    var judul = qs('.video-judul, .langkah-judul', penanda);
    if (judul && state.tab === 'video') {
      judul.setAttribute('tabindex', '-1');
      judul.focus({ preventScroll: true });
      tahanFokusJudul = true;
    }
    window.setTimeout(function () { penanda.classList.remove('disorot'); }, 1500);
  }

  function tempatkanPin(akar) {
    var butir = qsa('.pin-item', akar || ISI);
    for (var i = 0; i < butir.length; i += 1) {
      var x = butir[i].getAttribute('data-x');
      var y = butir[i].getAttribute('data-y');
      if (x === null || y === null) continue;
      butir[i].style.left = x + '%';
      butir[i].style.top = y + '%';
    }
  }

  // ------------------------------------------------------- daftar isi

  var pengamatIsi = null;

  /** Mengisi daftar "Di halaman ini" dari panel yang sedang aktif. */
  function isiDaftarIsi(tab) {
    var nav = qs('.daftar-isi', ISI);
    if (!nav) return;
    var daftar = qs('.daftar-isi-daftar', nav);
    kosongkan(daftar);
    if (pengamatIsi) {
      pengamatIsi.disconnect();
      pengamatIsi = null;
    }
    var panel = tab === 'video' ? qs('#panel-video', ISI) : qs('#panel-panduan', ISI);
    if (!panel) return;
    var daftarJudul = qsa('h2, h3', panel).filter(function (h) {
      return h.id && h.textContent.trim() !== '';
    });
    if (tab !== 'video') {
      var awal = qs('#sebelum-mulai', ISI);
      if (awal) daftarJudul.unshift(awal);
    }
    var judul = daftarJudul;
    for (var i = 0; i < judul.length; i += 1) {
      var h = judul[i];
      var nama = qs('.langkah-teks-judul, .video-teks-judul', h);
      var teks = (nama ? nama.textContent : h.textContent).trim();
      if (!teks) continue;
      var li = buat('li');
      var tombol = buatTombol(null, 'daftar-isi-item' + (h.tagName === 'H2' ? ' daftar-isi-bagian' : ''), teks, {
        'data-target': '#' + h.id,
      });
      tombol.addEventListener('click', function () {
        var tujuan = qs(this.getAttribute('data-target'), ISI);
        if (tujuan) tujuan.scrollIntoView({ behavior: gerakHalus(), block: 'start' });
      });
      li.appendChild(tombol);
      daftar.appendChild(li);
    }
    nav.hidden = judul.length < 3;
    if (!window.IntersectionObserver || !judul.length) return;
    pengamatIsi = new IntersectionObserver(function (entri) {
      for (var k = 0; k < entri.length; k += 1) {
        if (!entri[k].isIntersecting) continue;
        var id = '#' + entri[k].target.id;
        qsa('.daftar-isi-item', nav).forEach(function (b) {
          b.classList.toggle('daftar-isi-aktif', b.getAttribute('data-target') === id);
        });
      }
    }, { rootMargin: '-76px 0px -88px 0px' });
    judul.forEach(function (h) { pengamatIsi.observe(h); });
  }

  // ------------------------------------------------------------- lightbox

  var CAHAYA = null;
  var cahaya = {
    daftar: [], aktif: 0, pemicu: null, zoom: false, maks: false,
    sentuhX: null, geser: false, seret: false, serpihX: 0, serpihY: 0,
  };

  function elemenCahaya() {
    if (!CAHAYA) {
      var kepala = document.getElementById('cahaya-kepala');
      CAHAYA = {
        dialog: document.getElementById('cahaya'),
        isi: document.getElementById('cahaya-isi'),
        judul: document.getElementById('cahaya-judul'),
        hitung: document.getElementById('cahaya-hitung'),
        kepala: kepala,
      };
      if (CAHAYA.dialog) {
        CAHAYA.dialog.addEventListener('close', function () {
          if (cahaya.pemicu && cahaya.pemicu.focus) cahaya.pemicu.focus();
          cahaya.pemicu = null;
        });
        CAHAYA.dialog.addEventListener('click', function (peristiwa) {
          if (peristiwa.target === CAHAYA.dialog) tutupCahaya();
        });
        CAHAYA.isi.addEventListener('click', function (peristiwa) {
          if (cahaya.geser) return;
          if (peristiwa.target && peristiwa.target.closest
            && peristiwa.target.closest('.bingkai-gambar img')) {
            aturZoomCahaya(!cahaya.zoom);
          }
        });
        CAHAYA.isi.addEventListener('touchstart', function (peristiwa) {
          cahaya.sentuhX = peristiwa.touches.length ? peristiwa.touches[0].clientX : null;
          cahaya.geser = false;
        }, { passive: true });
        CAHAYA.isi.addEventListener('touchend', function (peristiwa) {
          if (cahaya.sentuhX === null || !peristiwa.changedTouches.length) return;
          var dx = peristiwa.changedTouches[0].clientX - cahaya.sentuhX;
          cahaya.sentuhX = null;
          if (cahaya.zoom || Math.abs(dx) < 50) return;
          cahaya.geser = true;
          geserCahaya(dx < 0 ? 1 : -1);
          window.setTimeout(function () { cahaya.geser = false; }, 50);
        }, { passive: true });

        // Jendela digeser lewat judulnya, seperti jendela aplikasi biasa.
        CAHAYA.kepala.addEventListener('pointerdown', function (peristiwa) {
          if (cahaya.maks) return;
          if (peristiwa.target.closest('button')) return;
          cahaya.seret = true;
          cahaya.serpihX = peristiwa.clientX;
          cahaya.serpihY = peristiwa.clientY;
          CAHAYA.kepala.setPointerCapture(peristiwa.pointerId);
          peristiwa.preventDefault();
        });
        CAHAYA.kepala.addEventListener('pointermove', function (peristiwa) {
          if (!cahaya.seret) return;
          geserJendela(peristiwa);
        });
        CAHAYA.kepala.addEventListener('pointerup', function () { cahaya.seret = false; });
        CAHAYA.kepala.addEventListener('pointercancel', function () { cahaya.seret = false; });
        CAHAYA.kepala.addEventListener('dblclick', function (peristiwa) {
          if (peristiwa.target.closest('button')) return;
          aturMaksCahaya(!cahaya.maks);
        });
      }
    }
    return CAHAYA.dialog ? CAHAYA : null;
  }

  /** Mengumpulkan gambar langkah pada halaman yang sedang dibuka, urutan langkah. */
  function kumpulkanGambarCahaya() {
    var hasil = [];
    var semuaLangkah = qsa('.langkah', ISI);
    for (var i = 0; i < semuaLangkah.length; i += 1) {
      var gambar = qs('.bingkai-gambar', semuaLangkah[i]);
      if (!gambar) continue;
      var nama = qs('.langkah-teks-judul', semuaLangkah[i]);
      hasil.push({
        gambar: gambar,
        judul: (nama ? nama.textContent : '').trim() || ('Langkah ' + (i + 1)),
      });
    }
    return hasil;
  }

  function bukaCahaya(tombol) {
    var kotak = elemenCahaya();
    if (!kotak) return;
    cahaya.daftar = kumpulkanGambarCahaya();
    if (!cahaya.daftar.length) return;
    var gambar = tombol.closest ? tombol.closest('.bingkai-gambar') : null;
    var posisi = 0;
    for (var i = 0; i < cahaya.daftar.length; i += 1) {
      if (cahaya.daftar[i].gambar === gambar) posisi = i;
    }
    cahaya.aktif = posisi;
    cahaya.pemicu = tombol;
    tampilanKoyer();
    if (!kotak.dialog.open) kotak.dialog.showModal();
  }

  /** Menampilkan gambar yang sedang aktif di dalam jendela. */
  function tampilanKoyer() {
    var kotak = elemenCahaya();
    if (!kotak || !cahaya.daftar.length) return;
    var item = cahaya.daftar[cahaya.aktif];
    var salin = item.gambar.cloneNode(true);
    var zb = qs('.tombol-perbesar', salin);
    if (zb) zb.remove();
    tempatkanPin(salin);
    kosongkan(kotak.isi);
    kotak.isi.appendChild(salin);
    kotak.isi.scrollTop = 0;
    kotak.isi.scrollLeft = 0;
    kotak.judul.textContent = item.judul;
    kotak.hitung.textContent = (cahaya.aktif + 1) + ' / ' + cahaya.daftar.length;
    aturZoomCahaya(false);
    var sendiri = cahaya.daftar.length < 2;
    var sebelum = qs('.cahaya-sebelumnya', kotak.dialog);
    var berikut = qs('.cahaya-berikutnya', kotak.dialog);
    if (sebelum) sebelum.disabled = sendiri;
    if (berikut) berikut.disabled = sendiri;
  }

  function aturZoomCahaya(zoom) {
    var kotak = elemenCahaya();
    if (!kotak) return;
    cahaya.zoom = zoom;
    kotak.isi.classList.toggle('cahaya-zoom', zoom);
  }

  /** Memindahkan atau mengembalikan jendela ke layar penuh. */
  function aturMaksCahaya(maks) {
    var kotak = elemenCahaya();
    if (!kotak) return;
    cahaya.maks = Boolean(maks);
    kotak.dialog.classList.toggle('cahaya-maks', cahaya.maks);
    var tombol = qs('[data-action="cahaya-maks"]', kotak.dialog);
    var ikon = qs('#ikon-maks', kotak.dialog);
    var nama = cahaya.maks ? 'Kembalikan ke ukuran jendela' : 'Perbesar ke layar penuh';
    if (tombol) {
      tombol.setAttribute('aria-label', nama);
      tombol.setAttribute('title', nama);
    }
    if (ikon) ikon.setAttribute('href', cahaya.maks ? '#i-ui-restore' : '#i-ui-maximize');
    kotak.isi.scrollTop = 0;
    kotak.isi.scrollLeft = 0;
  }

  /** Memindahkan jendela mengikuti tetikus atau jari, dibatasi tetap di layar. */
  function geserJendela(peristiwa) {
    var kotak = elemenCahaya();
    if (!kotak || cahaya.maks) return;
    var dialog = kotak.dialog;
    var awalX = peristiwa.clientX - cahaya.serpihX;
    var awalY = peristiwa.clientY - cahaya.serpihY;
    var lebar = dialog.offsetWidth;
    var tinggi = dialog.offsetHeight;
    var maksX = Math.max(0, window.innerWidth - lebar);
    var maksY = Math.max(0, window.innerHeight - tinggi);
    dialog.style.setProperty('--jx', Math.round(Math.min(maksX, Math.max(-maksX, awalX))) + 'px');
    dialog.style.setProperty('--jy', Math.round(Math.min(maksY, Math.max(-maksY, awalY))) + 'px');
  }

  function geserCahaya(arah) {
    if (!cahaya.daftar.length) return;
    cahaya.aktif = (cahaya.aktif + arah + cahaya.daftar.length) % cahaya.daftar.length;
    tampilanKoyer();
  }

  function tutupCahaya() {
    var kotak = elemenCahaya();
    if (!kotak || !kotak.dialog.open) return;
    aturMaksCahaya(false);
    kotak.dialog.style.setProperty('--jx', '0px');
    kotak.dialog.style.setProperty('--jy', '0px');
    kotak.dialog.close();
  }

  // ----------------------------------------------------- catatan perubahan

  function renderCatatan() {
    var catatan = data.changelog;
    document.title = 'Catatan Perubahan - ' + data.meta.siteName;
    var bagian = buat('article', 'halaman');
    bagian.appendChild(buat('p', 'halaman-grup', data.meta.appName));
    bagian.appendChild(buat('h1', 'halaman-judul', 'Catatan Perubahan'));
    bagian.appendChild(buat('p', 'halaman-ringkas', 'Semua perubahan penting pada manual ini.'));

    var daftar = (catatan && catatan.items) || [];
    if (!daftar.length) {
      bagian.appendChild(buat('p', 'halaman-ringkas', 'Belum ada catatan perubahan.'));
    }
    for (var i = 0; i < daftar.length; i += 1) {
      var entri = buat('section', 'kotak');
      entri.appendChild(buat('h2', 'kotak-judul', daftar[i].tanggal));
      var ul = buat('ul', 'catatan-daftar');
      var butir = daftar[i].items || [];
      for (var j = 0; j < butir.length; j += 1) {
        ul.appendChild(buat('li', '', butir[j]));
      }
      entri.appendChild(ul);
      bagian.appendChild(entri);
    }
    ISI.appendChild(bagian);
  }

  // -------------------------------------------------------- halaman gagal

  function renderTidakDitemukan(id) {
    document.title = 'Halaman tidak ditemukan - ' + data.meta.siteName;
    var bagian = buat('section', 'halaman');
    bagian.appendChild(buat('h1', 'halaman-judul', 'Halaman tidak ditemukan'));
    bagian.appendChild(buat('p', 'halaman-ringkas',
      'Tidak ada halaman dengan nama "' + String(id) + '".'));

    var daftar = (data.pages || []).map(function (h) { return { id: h.id, title: h.title }; });
    var saran = D.saranTerdekat(id, daftar, 3);
    if (saran.length) {
      bagian.appendChild(buat('p', 'halaman-ringkas', 'Mungkin yang Anda maksud:'));
      var daftarSaran = buat('ul', 'saran-daftar');
      saran.forEach(function (item) {
        var li = buat('li');
        li.appendChild(buatTombol('buka-halaman', 'tombol', item.title, {
          'data-halaman': item.id,
        }));
        daftarSaran.appendChild(li);
      });
      bagian.appendChild(daftarSaran);
    }

    // Kotak pencarian ada di header, jadi cukup diisi dengan id yang diketik.
    var kotak = kotakCari();
    if (kotak) {
      var inputCari = qs('.cari-input', kotak);
      if (inputCari) inputCari.value = String(id);
    }

    bagian.appendChild(buatTombol('ke-beranda', 'tombol tombol-utama', 'Kembali ke beranda'));
    ISI.appendChild(bagian);
  }

  // ---------------------------------------------------------------- sidebar

  function bacaNav() {
    try {
      return JSON.parse(window.localStorage.getItem(KUNCI_NAV) || '{}') || {};
    } catch {
      return {};
    }
  }

  function simpanNav(nav) {
    simpanPenyimpanan(KUNCI_NAV, 'localStorage', JSON.stringify(nav));
  }

  function perbaruiSidebar() {
    if (!LACI_ISI) return;
    var nav = bacaNav();
    kosongkan(LACI_ISI);
    var halamanSekarang = state.pageId;
    var aktif = null;
    var tandaiFeatured = data.meta.sidebar.markFeatured !== false;

    // Beranda berada di luar daftar grup, sama seperti Catatan Perubahan.
    var beranda = buat('a', 'menu-item menu-beranda');
    beranda.href = BASE;
    beranda.setAttribute('data-action', 'ke-beranda');
    var ikonBeranda = buat('span', 'menu-item-ikon');
    ikonBeranda.setAttribute('aria-hidden', 'true');
    ikonBeranda.appendChild(buatIkon('home'));
    beranda.appendChild(ikonBeranda);
    beranda.appendChild(buat('span', 'menu-item-teks', 'Beranda'));
    if (state.view === 'page' && halamanSekarang === D.ID_BERANDA) {
      beranda.classList.add('menu-item-aktif');
      beranda.setAttribute('aria-current', 'page');
    }
    LACI_ISI.appendChild(beranda);

    

    (data.meta.groups || []).forEach(function (grup) {
      var isi = halamanTerurut().filter(function (h) { return h.group === grup.id; });
      if (!isi.length) return;
      var buka = nav[grup.id] !== false;
      var kotak = buat('div', 'grup');
      var tombol = buatTombol('buka-grup', 'grup-tombol', null, {
        'data-grup': grup.id,
        'aria-expanded': buka ? 'true' : 'false',
      });
      var chevron = buat('span', 'grup-panah', '');
      chevron.setAttribute('aria-hidden', 'true');
      chevron.appendChild(buatIkon('chevron', true));
      var lencana = buat('span', 'grup-ikon');
      lencana.appendChild(buatIkon(grup.icon));
      tombol.appendChild(lencana);
      tombol.appendChild(buat('span', 'grup-label', grup.label));
      tombol.appendChild(chevron);
      kotak.appendChild(tombol);

      var daftar = buat('ul', 'grup-daftar');
      daftar.hidden = !buka;
      isi.forEach(function (h) {
        var li = buat('li');
        var tautan = buat('a', 'menu-item');
        tautan.href = BASE;
        tautan.setAttribute('data-action', 'buka-halaman');
        tautan.setAttribute('data-halaman', h.id);
        var ikonItem = buat('span', 'menu-item-ikon');
        ikonItem.setAttribute('aria-hidden', 'true');
        ikonItem.appendChild(buatIkon(h.icon));
        tautan.appendChild(ikonItem);
        tautan.appendChild(buat('span', 'menu-item-teks', h.title));
        if (tandaiFeatured && h.featured) {
          var bintang = buat('span', 'menu-item-bintang');
          bintang.setAttribute('aria-hidden', 'true');
          bintang.appendChild(buatIkon('star'));
          tautan.appendChild(bintang);
        }
        if (h.id === halamanSekarang) {
          tautan.classList.add('menu-item-aktif');
          tautan.setAttribute('aria-current', 'page');
          aktif = tautan;
        }
        li.appendChild(tautan);
        daftar.appendChild(li);
      });
      kotak.appendChild(daftar);
      LACI_ISI.appendChild(kotak);
    });

    if (aktif && LACI && LACI.getAttribute('data-laci-terbuka') === 'ya') {
      aktif.scrollIntoView({ block: 'nearest' });
    }

    if (data.changelog) {
      var catatan = buat('div', 'menu-khusus');
      var tautan = buat('a', 'menu-item');
      tautan.href = BASE;
      tautan.setAttribute('data-action', 'ke-catatan');
      var ikonCatatan = buat('span', 'menu-item-ikon');
      ikonCatatan.setAttribute('aria-hidden', 'true');
      ikonCatatan.appendChild(buatIkon('clock'));
      tautan.appendChild(ikonCatatan);
      tautan.appendChild(buat('span', 'menu-item-teks', 'Catatan Perubahan'));
      if (state.view === 'changelog') {
        tautan.classList.add('menu-item-aktif');
        tautan.setAttribute('aria-current', 'page');
      }
      catatan.appendChild(tautan);
      LACI_ISI.appendChild(catatan);
    }
  }

  /** Membuka halaman pertama sebagai pengganti bila halaman Beranda tidak ada. */
  function halamanCadangan() {
    var daftar = halamanTerurut();
    return daftar.length ? daftar[0].id : null;
  }

  function layarLebar() {
    return window.matchMedia('(min-width: 1024px)').matches;
  }

  /**
   * Tinggi header bisa bertambah saat teks membungkus atau ukuran huruf
   * diperbesar pengguna. Nilainya ditulis ke --tinggi-bilah supaya
   * padding halaman, posisi laci, dan lompatan antarbagian tetap pas.
   */
  function sinkronTinggiBilah() {
    var bilah = qs('.bilah-atas');
    if (!bilah) return;
    var tinggi = Math.round(bilah.getBoundingClientRect().height);
    if (!tinggi) return;
    var nilai = tinggi + 'px';
    if (AKAR.style.getPropertyValue('--tinggi-bilah') === nilai) return;
    AKAR.style.setProperty('--tinggi-bilah', nilai);
  }

  function sinkronLaci() {
    if (!LACI) return;
    if (layarLebar()) {
      LACI.removeAttribute('inert');
      LACI.removeAttribute('data-laci-terbuka');
      if (TIRAI) TIRAI.hidden = true;
      var tombol = qs('[data-action="buka-laci"]');
      if (tombol) tombol.setAttribute('aria-expanded', 'false');
      return;
    }
    if (LACI.getAttribute('data-laci-terbuka') !== 'ya') {
      LACI.setAttribute('inert', '');
      if (TIRAI) TIRAI.hidden = true;
    }
  }

  function bukaLaci() {
    if (!LACI) return;
    LACI.setAttribute('data-laci-terbuka', 'ya');
    LACI.removeAttribute('inert');
    if (TIRAI) TIRAI.hidden = false;
    var tombol = qs('[data-action="buka-laci"]');
    if (tombol) tombol.setAttribute('aria-expanded', 'true');
    var tutup = qs('.tombol-tutup-laci', LACI);
    if (tutup) tutup.focus();
  }

  function tutupLaci() {
    if (!LACI) return;
    if (LACI.getAttribute('data-laci-terbuka') !== 'ya') {
      sinkronLaci();
      return;
    }
    LACI.removeAttribute('data-laci-terbuka');
    if (!layarLebar()) LACI.setAttribute('inert', '');
    if (TIRAI) TIRAI.hidden = true;
    var tombol = qs('[data-action="buka-laci"]');
    if (tombol) tombol.setAttribute('aria-expanded', 'false');
  }

  // ------------------------------------------------------------------ salin

  function tautanSalin(id, langkah, tab) {
    return window.location.origin + BASE + D.stateToQuery({
      view: 'page',
      pageId: id,
      tab: tab || 'guide',
      step: langkah == null || langkah === '' ? null : Number(langkah),
      lang: null,
    });
  }

  function salinTeks(teks) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(teks).then(function () {
        toast('Tersalin');
      }, function () { salinCadangan(teks); });
      return;
    }
    salinCadangan(teks);
  }

  function salinCadangan(teks) {
    var bidang = document.createElement('textarea');
    bidang.value = teks;
    bidang.setAttribute('readonly', '');
    bidang.className = 'salin-sembunyi';
    document.body.appendChild(bidang);
    bidang.select();
    var berhasil = false;
    try {
      berhasil = document.execCommand('copy');
    } catch {
      berhasil = false;
    }
    document.body.removeChild(bidang);
    toast(berhasil ? 'Tersalin' : 'Tidak dapat menyalin otomatis. Salin dari bilah alamat.');
  }

  // ------------------------------------------------------------------- video

  function putarVideo(artikel) {
    var slot = qs('.video-player', artikel);
    if (!slot || slot.firstChild) return;
    var embed = slot.getAttribute('data-embed');
    if (!embed) return;
    var iframe = document.createElement('iframe');
    iframe.className = 'video-iframe';
    iframe.title = 'Pemutar video YouTube';
    iframe.loading = 'lazy';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture';
    iframe.allowFullscreen = true;
    iframe.src = embed + '&autoplay=1';
    slot.appendChild(iframe);
    artikel.classList.add('video-berjalan');
  }

  function lompatKeBab(artikel, detik, tungguMuat) {
    var slot = qs('.video-player', artikel);
    var iframe = slot && qs('iframe', slot);
    if (!iframe || !iframe.contentWindow) return;
    var asal = 'https://www.youtube-nocookie.com';
    var kirim = function () {
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command', func: 'seekTo', args: [Number(detik) || 0, true],
      }), asal);
      iframe.contentWindow.postMessage(JSON.stringify({
        event: 'command', func: 'playVideo',
      }), asal);
    };
    if (tungguMuat) iframe.addEventListener('load', kirim, { once: true });
    else kirim();
  }

  // ------------------------------------------------------------- penghematan

  function simpanPosisiSegera() {
    window.clearTimeout(tundaSesi);
    tundaSesi = window.setTimeout(function () {
      if ((state.view !== 'page' && state.view !== 'changelog') || (state.view === 'page' && !state.pageId)) return;
      D.simpanSesi(
        window.sessionStorage,
        { view: state.view, pageId: state.pageId, tab: state.tab, step: state.step },
        window.scrollY,
      );
    }, 150);
  }

  // ------------------------------------------------------------------ events

  function pasangKlik() {
    document.addEventListener('click', function (peristiwa) {
      var sasaran = peristiwa.target;
      while (sasaran && sasaran !== document && !(sasaran.getAttribute && sasaran.getAttribute('data-action'))) {
        sasaran = sasaran.parentNode;
      }
      if (!sasaran || sasaran === document) return;
      aksi(sasaran.getAttribute('data-action'), sasaran, peristiwa);
    });
  }

  function aksi(nama, elemen, peristiwa) {
    if (!nama) return;
    if (peristiwa && elemen.tagName === 'A') peristiwa.preventDefault();

    switch (nama) {
      case 'buka-halaman': {
        var halaman = elemen.getAttribute('data-halaman');
        var tab = elemen.getAttribute('data-tab') || 'guide';
        var langkah = elemen.getAttribute('data-langkah');
        navigasi({
          view: 'page',
          pageId: halaman,
          tab: tab,
          step: langkah ? Number(langkah) : null,
        });
        break;
      }
      case 'ke-beranda':
        if (cariHalaman(D.ID_BERANDA)) navigasi({ view: 'page', pageId: D.ID_BERANDA, tab: 'guide', step: null });
        else {
          var cadangan = halamanCadangan();
          if (cadangan) navigasi({ view: 'page', pageId: cadangan, tab: 'guide', step: null });
        }
        break;
      case 'ke-atas':
        window.scrollTo({ top: 0, behavior: gerakHalus() });
        break;
      case 'ke-catatan':
        navigasi({ view: 'changelog' });
        break;
      case 'lanjutkan':
        navigasi({
          view: 'page',
          pageId: elemen.getAttribute('data-halaman'),
          tab: elemen.getAttribute('data-tab') || 'guide',
          step: elemen.getAttribute('data-langkah') ? Number(elemen.getAttribute('data-langkah')) : null,
        });
        break;
      case 'buka-hasil': {
        navigasi({
          view: 'page',
          pageId: elemen.getAttribute('data-halaman'),
          tab: 'guide',
          step: elemen.getAttribute('data-langkah') ? Number(elemen.getAttribute('data-langkah')) : null,
        });
        break;
      }
      case 'ganti-tab':
        navigasi({ tab: elemen.getAttribute('data-tab'), step: null });
        break;
      case 'buka-grup': {
        var idGrup = elemen.getAttribute('data-grup');
        var nav = bacaNav();
        nav[idGrup] = elemen.getAttribute('aria-expanded') !== 'true';
        simpanNav(nav);
        perbaruiSidebar();
        break;
      }
      case 'buka-laci':
        bukaLaci();
        break;
      case 'tutup-laci':
        tutupLaci();
        break;
      case 'ganti-tema':
        gantiTema();
        break;
      case 'fokus-cari':
        fokuskanCari();
        break;
      case 'salin-langkah':
        salinTeks(tautanSalin(
          elemen.getAttribute('data-halaman'),
          Number(elemen.getAttribute('data-langkah')),
          state.tab,
        ));
        break;
      case 'salin-video':
        salinTeks(tautanSalin(
          elemen.getAttribute('data-halaman'),
          Number(elemen.getAttribute('data-video')),
          'video',
        ));
        break;
      case 'putar-video':
        putarVideo(elemen.closest('.video'));
        break;
      case 'buka-cahaya':
        bukaCahaya(elemen);
        break;
      case 'cahaya-tutup':
        tutupCahaya();
        break;
      case 'cahaya-sebelumnya':
        geserCahaya(-1);
        break;
      case 'cahaya-berikutnya':
        geserCahaya(1);
        break;
      case 'cahaya-maks':
        aturMaksCahaya(!cahaya.maks);
        break;
      case 'cahaya-zoom':
        aturZoomCahaya(!cahaya.zoom);
        break;
      case 'lompat-bab': {
        var artikelVideo = elemen.closest('.video');
        var slot = qs('.video-player', artikelVideo);
        var baru = !qs('iframe', slot || artikelVideo);
        if (baru) putarVideo(artikelVideo);
        lompatKeBab(artikelVideo, elemen.getAttribute('data-detik'), baru);
        break;
      }
      case 'pin':
        elemen.parentNode.classList.toggle('pin-aktif');
        break;
      case 'coba-lagi':
        window.location.reload();
        break;
      default:
        break;
    }
  }

  function pasangKetik() {
    document.addEventListener('input', function (peristiwa) {
      var input = peristiwa.target;
      var kotak = kotakDariInput(input);
      if (!kotak) return;
      kotakCariAktif = kotak;
      var gilir = ++giliranCari;
      window.setTimeout(function () {
        if (gilir !== giliranCari) return;
        jalankanCari(kotakCariAktif);
      }, 120);
    });

    document.addEventListener('keydown', function (peristiwa) {
      var dialog = document.getElementById('cahaya');
      if (dialog && dialog.open) {
        if (peristiwa.key === 'ArrowLeft') {
          peristiwa.preventDefault();
          geserCahaya(-1);
          return;
        }
        if (peristiwa.key === 'ArrowRight') {
          peristiwa.preventDefault();
          geserCahaya(1);
          return;
        }
        if (peristiwa.key === 'Escape' && cahaya.maks) {
          peristiwa.preventDefault();
          aturMaksCahaya(false);
        }
        return;
      }
      var input = peristiwa.target;
      var kotakInput = kotakDariInput(input);
      if (!kotakInput) {
        // Pintasan: Ctrl+K, Cmd+K, atau garis miring untuk fokus ke pencarian.
        var target = peristiwa.target;
        var diKotakIsi = target && target.tagName
          && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable);
        var pintasan = (peristiwa.key === 'k' && (peristiwa.ctrlKey || peristiwa.metaKey))
          || (peristiwa.key === '/' && !diKotakIsi);
        if (pintasan) {
          peristiwa.preventDefault();
          fokuskanCari();
          return;
        }
      }
      if (kotakInput) {
        if (peristiwa.key === 'ArrowDown' || peristiwa.key === 'ArrowUp') {
          peristiwa.preventDefault();
          geserHasil(peristiwa.key === 'ArrowDown' ? 1 : -1, kotakInput);
        } else if (peristiwa.key === 'Enter') {
          var pilihan = qs('.cari-item[aria-selected="true"]', kotakInput);
          if (pilihan) {
            peristiwa.preventDefault();
            pilihan.click();
          }
        } else if (peristiwa.key === 'Escape') {
          var wadah = qs('.cari-hasil', kotakInput);
          if (wadah && !wadah.hidden) {
            wadah.hidden = true;
            input.setAttribute('aria-expanded', 'false');
          }
          return;
        }
        return;
      }

      if (peristiwa.target && peristiwa.target.getAttribute
        && peristiwa.target.getAttribute('role') === 'tab') {
        var tab = peristiwa.target.getAttribute('data-tab');
        if (peristiwa.key === 'ArrowRight' || peristiwa.key === 'ArrowLeft') {
          peristiwa.preventDefault();
          navigasi({ tab: tab === 'guide' ? 'video' : 'guide', step: null });
          window.setTimeout(function () {
            var baru = qs('#tab-' + (tab === 'guide' ? 'video' : 'guide'));
            if (baru) baru.focus();
          }, 0);
        } else if (peristiwa.key === 'Home' || peristiwa.key === 'End') {
          peristiwa.preventDefault();
          navigasi({ tab: peristiwa.key === 'Home' ? 'guide' : 'video', step: null });
          window.setTimeout(function () {
            var baru = qs('#tab-' + (peristiwa.key === 'Home' ? 'guide' : 'video'));
            if (baru) baru.focus();
          }, 0);
        }
        return;
      }

      if (peristiwa.key === 'Escape') tutupLaci();
    });

    document.addEventListener('scroll', simpanPosisiSegera, { passive: true });
  }

  function geserHasil(arah, kotak) {
    var wadahCari = kotak || kotakCariAktif || kotakCari();
    if (!wadahCari) return;
    var item = qsa('.cari-item', wadahCari);
    if (!item.length) return;
    var sekarang = item.findIndex(function (el) { return el.getAttribute('aria-selected') === 'true'; });
    var baru = Math.min(item.length - 1, Math.max(0, (sekarang < 0 ? -1 : sekarang) + arah));
    for (var i = 0; i < item.length; i += 1) item[i].setAttribute('aria-selected', i === baru ? 'true' : 'false');
    item[baru].scrollIntoView({ block: 'nearest' });
  }

  function ikonTemaUntuk(pilihan) {
    return pilihan === 'light' ? 'moon' : 'sun';
  }

  function terapkanTampilanTema(pilihan) {
    AKAR.setAttribute('data-theme', pilihan);
    simpanPenyimpanan(KUNCI_TEMA, 'localStorage', pilihan);
    var tombol = qs('[data-action="ganti-tema"]');
    if (tombol) {
      var aksi = pilihan === 'light' ? 'Ganti ke tema gelap' : 'Ganti ke tema terang';
      tombol.setAttribute('aria-label', aksi);
      tombol.setAttribute('title', aksi);
    }
    if (IKON_TEMA) IKON_TEMA.setAttribute('href', '#i-ui-' + ikonTemaUntuk(pilihan));
  }

  function gantiTema() {
    var sekarang = AKAR.getAttribute('data-theme');
    terapkanTampilanTema(sekarang === 'dark' ? 'light' : 'dark');
  }

  function pasangTema() {
    var sekarang = AKAR.getAttribute('data-theme');
    if (URUT_TEMA.indexOf(sekarang) === -1) sekarang = 'light';
    AKAR.setAttribute('data-theme', sekarang);
    terapkanTampilanTema(sekarang);
  }

  function pasangRiwayat() {
    window.addEventListener('popstate', function (peristiwa) {
      var s = peristiwa.state;
      if (s && (s.view === 'home' || s.view === 'page' || s.view === 'changelog')) {
        terapkan({
          view: s.view,
          pageId: s.pageId,
          tab: s.tab || 'guide',
          step: s.step || null,
          i: typeof s.i === 'number' ? s.i : 0,
          unknown: null,
        }, 'kembali');
        return;
      }
      var hasil = D.parseQuery(window.location.search, data);
      if (hasil.state.view === 'page') {
        state.unknown = hasil.unknownPage ? hasil.state.pageId : null;
        terapkan(hasil.state, 'kembali');
        return;
      }
      terapkan({ view: 'home' }, 'kembali');
    });
  }

  function pasangLiveReload() {
    if (!window.EventSource || window.location.hostname !== 'localhost') return;
    try {
      var aliran = new EventSource('/__dev/reload');
      aliran.addEventListener('message', function (peristiwa) {
        if (peristiwa.data === 'muat ulang') window.location.reload();
      });
      window.setTimeout(function () { aliran.close(); }, 3000);
    } catch {
      /* server lokal tidak aktif, diabaikan */
    }
  }

  // -------------------------------------------------------------------- awal

  function tampilGagal(galat) {
    kosongkan(ISI);
    var bagian = buat('section', 'halaman');
    bagian.appendChild(buat('h1', 'halaman-judul', 'Isi manual belum dapat dimuat'));
    bagian.appendChild(buat('p', 'halaman-ringkas',
      'Berkas isi manual gagal diambil. Periksa koneksi, lalu coba lagi.'));
    var tombol = buatTombol('coba-lagi', 'tombol tombol-utama', 'Coba lagi');
    bagian.appendChild(tombol);
    ISI.appendChild(bagian);
    if (window.console && console.warn) console.warn('Gagal memuat isi manual:', galat);
  }

  function mulai() {
    pasangKlik();
    pasangKetik();
    pasangTema();
    pasangLiveReload();
    sinkronLaci();
    sinkronTinggiBilah();
    window.addEventListener('resize', function () {
      sinkronLaci();
      sinkronTinggiBilah();
    });
    if (window.ResizeObserver) {
      var pengamat = new ResizeObserver(sinkronTinggiBilah);
      var bilah = qs('.bilah-atas');
      if (bilah) pengamat.observe(bilah);
    }
    ambilData().then(function (isi) {
      data = isi;
      document.body.setAttribute('data-siap', 'ya');
      pasangRiwayat();
      awal();
    }).catch(tampilGagal);
  }

  function awal() {
    var hasil = D.parseQuery(window.location.search, data);
    // Tautan tanpa p berarti "lanjutkan tempat terakhir", bukan selalu Beranda.
    var adaTautan = /(?:^|[?&])p=/.test(window.location.search);
    if (hasil.state.view === 'page') {
      if (hasil.unknownPage) {
        // Halaman Beranda yang tidak ada digantikan halaman pertama.
        var cadangan = hasil.state.pageId === D.ID_BERANDA ? halamanCadangan() : null;
        if (cadangan) {
          state = Object.assign({}, hasil.state, { pageId: cadangan, i: 0, unknown: null, gulir: 0 });
        } else {
          state = Object.assign({}, hasil.state, { i: 0, unknown: hasil.state.pageId, gulir: 0 });
          if (window.console && console.warn) {
            console.warn('Halaman tidak dikenal dari tautan: ' + hasil.state.pageId);
          }
        }
      } else if (adaTautan) {
        state = Object.assign({}, hasil.state, { i: 0, unknown: null, gulir: 0 });
      } else {
        // Tanpa tautan, lanjutkan posisi baca terakhir.
        pulihkanSesi();
      }
      window.history.replaceState(entriRiwayat(), '', BASE);
      gambar();
      return;
    }
    if (hasil.state.view === 'changelog') {
      state = Object.assign(D.stateAwal(), { view: 'changelog', i: 0, unknown: null, gulir: 0 });
      window.history.replaceState(entriRiwayat(), '', BASE);
      gambar();
      return;
    }
    pulihkanSesi();
    window.history.replaceState(entriRiwayat(), '', BASE);
    gambar();
  }

  /**
   * Melanjutkan posisi baca terakhir. Dipakai saat aplikasi dibuka tanpa
   * tautan halaman, sehingga penyegaran mengembalikan pengguna ke tempat
   * terakhir ia membaca.
   */
  function pulihkanSesi() {
    var sesi = D.bacaSesi(window.sessionStorage);
    if (sesi && sesi.view === 'changelog') {
      state = Object.assign(D.stateAwal(), {
        view: 'changelog',
        i: 0,
        unknown: null,
        gulir: sesi.scrollY || 0,
      });
      return;
    }
    if (sesi && cariHalaman(sesi.pageId)) {
      state = Object.assign(D.stateAwal(), {
        view: 'page',
        pageId: sesi.pageId,
        tab: sesi.tab || 'guide',
        step: sesi.step || null,
        i: 0,
        unknown: null,
        gulir: sesi.scrollY || 0,
      });
      return;
    }
    if (!cariHalaman(D.ID_BERANDA)) {
      var pertama = halamanCadangan();
      if (pertama) state = Object.assign(D.stateAwal(), { pageId: pertama, i: 0, unknown: null, gulir: 0 });
    }
  }

  if (ISI && D) mulai();
}());