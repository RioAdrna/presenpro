# Hosting PresenPRO di InfinityFree

## 1. Siapkan akun dan database

1. Login ke InfinityFree.
2. Buka menu `MySQL Databases`.
3. Buat database baru, lalu catat `MySQL Host Name`, `MySQL User Name`, dan `MySQL DB Name`.
4. Buka phpMyAdmin dari database tersebut.
5. Import file `database/presenpro.sql`.

Jika database InfinityFree sudah pernah dipakai sebelumnya, jalankan juga isi
`database/migration_attendance_mode.sql` pada database yang sama. Migration ini
menambahkan pilihan Online/Offline tanpa menghapus data kegiatan.

Jika import menolak baris `CREATE DATABASE` atau `USE presenpro`, hapus dua bagian tersebut dari file SQL, lalu import ulang setelah memilih database InfinityFree.

## 2. Isi koneksi database

1. Duplikasi file:

```txt
backend/config/database.local.example.php
```

2. Rename menjadi:

```txt
backend/config/database.local.php
```

3. Isi credential MySQL dari InfinityFree:

```php
<?php

return [
    'host' => 'sqlXXX.infinityfree.com',
    'port' => '3306',
    'database' => 'if0_42677559_presenpro',
    'username' => 'if0_XXXXXXXX',
    'password' => 'PASSWORD_DATABASE_INFINITYFREE',
];
```

## 3. Build frontend

Jalankan di komputer lokal:

```bash
npm install
npm run build
```

## 4. Upload ke htdocs InfinityFree

Upload isi ZIP `presenpro-infinityfree-upload.zip` ke `htdocs`:

```txt
dist/*
backend/
```

Struktur akhirnya:

```txt
htdocs/
  index.html
  assets/
  logo.png
  Maskot.PNG
  .htaccess
  backend/
    config/
      database.php
      database.local.php
    public/
      index.php
      .htaccess
```

## 5. Test

Buka domain InfinityFree:

```txt
https://domain-anda.infinityfreeapp.com/login
https://domain-anda.infinityfreeapp.com/register
```

Akun awal dari seed:

```txt
2406411-0001.I / password
2406411-0002.I / password
```

Catatan: jika aplikasi di-upload ke subfolder, set `VITE_API_BASE_URL` sebelum build agar API mengarah ke lokasi backend yang benar.
