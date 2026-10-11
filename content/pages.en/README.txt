Folder ini disiapkan untuk terjemahan lain.

Cara mengaktifkannya: buka `content/config.mjs`, tambahkan satu baris pada
`langs`, misalnya `en: { label: 'English', dir: 'pages.en' }`, lalu salin
setiap berkas dari `content/pages/` ke `content/pages.en/` dan terjemahkan.
Nomor urut berkas dan nama berkas harus sama supaya kedua bahasa sejajar.

`build` sudah membaca semua bahasa yang terdaftar dan menulis satu berkas data
JSON untuk masing-masing bahasa.