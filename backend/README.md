# PresenPRO Backend

Backend awal ini memakai PHP PDO dan database MySQL/MariaDB XAMPP.

## Database

Nama database: `presenpro`

File schema dan seed:

```bash
database/presenpro.sql
```

Koneksi default:

```txt
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=presenpro
DB_USERNAME=root
DB_PASSWORD=
```

## Akun Seed

```txt
2406411-0001.I / password            -> Ketua Bidang, akses semua menu
2406411-0002.I / password            -> Anggota Sekretaris, akses Dashboard, Kegiatan, Laporan, dan absensi kegiatan
```

Tabel utama:

- `roles`
- `users`
- `divisions`
- `members`
- `event_categories`
- `events`
- `event_participants`
- `attendance_sessions`
- `attendances`
- `app_settings`

## Endpoint API

Base URL XAMPP:

```txt
http://localhost/PresenPro/backend/public/index.php
```

Gunakan query `route` untuk endpoint:

```txt
POST ?route=/auth/login
GET  ?route=/auth/me
GET  ?route=/events
POST ?route=/events
GET  ?route=/events/{slug}
POST ?route=/events/{slug}/sessions/start
POST ?route=/events/{slug}/sessions/end
GET  ?route=/events/{slug}/attendance
POST ?route=/events/{slug}/attendance/scan
```

Login mengembalikan bearer token. Request selain login dan health harus membawa header:

```txt
Authorization: Bearer {token}
```
