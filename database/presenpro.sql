-- CREATE DATABASE IF NOT EXISTS presenpro
--   CHARACTER SET utf8mb4
--   COLLATE utf8mb4_unicode_ci;


CREATE TABLE IF NOT EXISTS roles (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(80) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  role_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(120) NOT NULL,
  nim_p VARCHAR(40) NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  approved ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  last_login_at DATETIME NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_users_role FOREIGN KEY (role_id) REFERENCES roles(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS members (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  nim VARCHAR(40) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  phone VARCHAR(30) NULL,
  faculty VARCHAR(160) NULL,
  cohort_year SMALLINT UNSIGNED NULL,
  probumsil_cohort VARCHAR(40) NULL,
  password_hash VARCHAR(255) NULL,
  qr_token VARCHAR(120) NOT NULL UNIQUE,
  status ENUM('aktif', 'nonaktif') NOT NULL DEFAULT 'aktif',
  approved ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
  joined_at DATE NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_categories (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug VARCHAR(60) NOT NULL UNIQUE,
  name VARCHAR(100) NOT NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  category_id BIGINT UNSIGNED NOT NULL,
  created_by BIGINT UNSIGNED NOT NULL,
  slug VARCHAR(160) NOT NULL UNIQUE,
  title VARCHAR(180) NOT NULL,
  event_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(180) NOT NULL,
  participant_quota INT UNSIGNED NOT NULL DEFAULT 0,
  late_tolerance_minutes INT UNSIGNED NOT NULL DEFAULT 15,
  status ENUM('draft', 'aktif', 'selesai', 'dibatalkan') NOT NULL DEFAULT 'draft',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_events_category FOREIGN KEY (category_id) REFERENCES event_categories(id),
  CONSTRAINT fk_events_creator FOREIGN KEY (created_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_divisions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_divisions_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS event_participants (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  event_division_id BIGINT UNSIGNED NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_event_member (event_id, member_id),
  CONSTRAINT fk_event_participants_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_event_participants_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_ep_event_division FOREIGN KEY (event_division_id) REFERENCES event_divisions(id) ON DELETE SET NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS division_templates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS meetings (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  title VARCHAR(180) NOT NULL,
  meeting_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(180) NULL,
  attendance_mode ENUM('offline','online') NOT NULL DEFAULT 'offline',
  late_tolerance_minutes INT UNSIGNED NOT NULL DEFAULT 15,
  status ENUM('draft','aktif','selesai') NOT NULL DEFAULT 'aktif',
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_meetings_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendance_sessions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  meeting_id BIGINT UNSIGNED NULL,
  started_by BIGINT UNSIGNED NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME NULL,
  status ENUM('aktif', 'selesai') NOT NULL DEFAULT 'aktif',
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_attendance_sessions_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_sessions_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendance_sessions_user FOREIGN KEY (started_by) REFERENCES users(id)
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS attendances (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  session_id BIGINT UNSIGNED NOT NULL,
  event_id BIGINT UNSIGNED NOT NULL,
  meeting_id BIGINT UNSIGNED NULL,
  member_id BIGINT UNSIGNED NOT NULL,
  scanned_by BIGINT UNSIGNED NOT NULL,
  scanned_at DATETIME NOT NULL,
  status ENUM('hadir', 'telat', 'izin', 'alpa') NOT NULL,
  qr_payload VARCHAR(255) NOT NULL,
  note VARCHAR(255) NULL,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_session_member (session_id, member_id),
  KEY idx_attendances_event_status (event_id, status),
  CONSTRAINT fk_attendances_session FOREIGN KEY (session_id) REFERENCES attendance_sessions(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendances_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendances_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendances_member FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  CONSTRAINT fk_attendances_scanner FOREIGN KEY (scanned_by) REFERENCES users(id)
) ENGINE=InnoDB;

INSERT INTO roles (id, name, label) VALUES
  (1, 'super_admin', 'Ketua Bidang'),
  (2, 'admin', 'Anggota Sekretaris'),
  (3, 'anggota', 'Personel')
ON DUPLICATE KEY UPDATE label = VALUES(label);

INSERT INTO users (id, role_id, name, nim_p, password_hash, status, approved) VALUES
  (1, 1, 'Admin Utama', '2406411-0001.I', '$2y$10$G8E7s94oc5gEXNtX6LBpyuge0CctnPQiEkYE0g807hVqi.86Q8tD.', 'aktif', 'approved'),
  (2, 2, 'Sekretaris PROBUMSIL', '2406411-0002.I', '$2y$10$G8E7s94oc5gEXNtX6LBpyuge0CctnPQiEkYE0g807hVqi.86Q8tD.', 'aktif', 'approved')
ON DUPLICATE KEY UPDATE
  role_id = VALUES(role_id),
  name = VALUES(name),
  password_hash = VALUES(password_hash),
  status = VALUES(status),
  approved = VALUES(approved);

INSERT INTO members (id, nim, name, phone, qr_token, status, joined_at, password_hash, approved) VALUES
  (1, '2406411-0003.I', 'Ahmad Nurjaman', '081200000001', 'QR-PRESENPRO-2406411-0003-I', 'aktif', '2023-08-01', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (2, '2406411-0004.I', 'Defia Dealova', '081200000002', 'QR-PRESENPRO-2406411-0004-I', 'aktif', '2023-08-01', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (3, '2406411-0005.I', 'Budi Santoso', '081200000003', 'QR-PRESENPRO-2406411-0005-I', 'aktif', '2023-08-01', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (4, '2406411-0006.I', 'Dian Rosita', '081200000004', 'QR-PRESENPRO-2406411-0006-I', 'aktif', '2023-08-01', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (5, '2406411-0007.I', 'Nadia Rahma', '081200000005', 'QR-PRESENPRO-2406411-0007-I', 'aktif', '2023-08-01', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (6, '2406411-0008.I', 'Raka Pratama', '081200000006', 'QR-PRESENPRO-2406411-0008-I', 'aktif', '2023-08-01', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (7, '2406411-0001.I', 'Admin Utama', '081200000007', 'QR-PRESENPRO-2406411-0001-I', 'aktif', '2023-08-01', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (8, '2406411-0002.I', 'Sekretaris PROBUMSIL', '081200000008', 'QR-PRESENPRO-2406411-0002-I', 'aktif', '2023-08-01', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (9, '2406411-0009.I', 'Farhan Ramadhan', '081200000009', 'QR-PRESENPRO-2406411-0009-I', 'aktif', '2024-02-15', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (10, '2406411-0010.I', 'Siti Nurhaliza', '081200000010', 'QR-PRESENPRO-2406411-0010-I', 'aktif', '2024-02-15', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved'),
  (11, '2406411-0011.I', 'Gilang Dirga', '081200000011', 'QR-PRESENPRO-2406411-0011-I', 'aktif', '2024-02-15', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'pending'),
  (12, '2406411-0012.I', 'Putri Diana', '081200000012', 'QR-PRESENPRO-2406411-0012-I', 'aktif', '2024-02-15', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'rejected'),
  (13, '2406411-0013.I', 'Kevin Julio', '081200000013', 'QR-PRESENPRO-2406411-0013-I', 'nonaktif', '2024-02-15', '$2y$10$FLf2j9s/GBILuqjXtp.5H.W3Rjet9T6TVSGX6TJVfz6RZ0zizmtPW', 'approved')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  phone = VALUES(phone),
  qr_token = VALUES(qr_token),
  status = VALUES(status);

INSERT INTO event_categories (id, slug, name) VALUES
  (1, 'rapat', 'Rapat'),
  (2, 'pelatihan', 'Pelatihan'),
  (3, 'evaluasi', 'Evaluasi'),
  (4, 'penugasan', 'Penugasan')
ON DUPLICATE KEY UPDATE name = VALUES(name);

INSERT INTO events (
  id,
  category_id,
  created_by,
  slug,
  title,
  event_date,
  start_time,
  end_time,
  location,
  participant_quota,
  late_tolerance_minutes,
  status
) VALUES
  (1, 1, 2, 'rapat-pengurus-probumsil', 'Rapat Pengurus PROBUMSIL', '2026-09-01', '10:00:00', '12:00:00', 'Ruang Rapat Utama Gd. Rektorat', 50, 15, 'aktif'),
  (2, 2, 2, 'pelatihan-jurnalistik-dasar', 'Pelatihan Jurnalistik Dasar', '2026-10-28', '13:00:00', '16:00:00', 'Auditorium FPIPS UPI', 120, 15, 'draft'),
  (3, 3, 2, 'evaluasi-program-kerja-q3', 'Evaluasi Program Kerja Q3', '2026-10-15', '15:00:00', '17:30:00', 'Ruang Sidang Lt. 2', 38, 15, 'selesai')
ON DUPLICATE KEY UPDATE
  category_id = VALUES(category_id),
  created_by = VALUES(created_by),
  title = VALUES(title),
  event_date = VALUES(event_date),
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  location = VALUES(location),
  participant_quota = VALUES(participant_quota),
  late_tolerance_minutes = VALUES(late_tolerance_minutes),
  status = VALUES(status);

INSERT INTO meetings (id, event_id, title, meeting_date, start_time, end_time, location, attendance_mode, late_tolerance_minutes, status, sort_order) VALUES
  (1, 1, 'Pertemuan Utama', '2026-09-01', '10:00:00', '12:00:00', 'Ruang Rapat Utama Gd. Rektorat', 'offline', 15, 'aktif', 1),
  (2, 2, 'Pertemuan Utama', '2026-10-28', '13:00:00', '16:00:00', 'Auditorium FPIPS UPI', 'offline', 15, 'aktif', 1),
  (3, 3, 'Pertemuan Utama', '2026-10-15', '15:00:00', '17:30:00', 'Ruang Sidang Lt. 2', 'offline', 15, 'selesai', 1)
ON DUPLICATE KEY UPDATE
  event_id = VALUES(event_id),
  title = VALUES(title),
  meeting_date = VALUES(meeting_date),
  start_time = VALUES(start_time),
  end_time = VALUES(end_time),
  location = VALUES(location),
  attendance_mode = VALUES(attendance_mode),
  late_tolerance_minutes = VALUES(late_tolerance_minutes),
  status = VALUES(status),
  sort_order = VALUES(sort_order);

INSERT IGNORE INTO event_participants (event_id, member_id, event_division_id) VALUES
  (1, 1, NULL), (1, 2, NULL), (1, 3, NULL), (1, 4, NULL), (1, 5, NULL), (1, 6, NULL),
  (2, 1, NULL), (2, 2, NULL), (2, 3, NULL), (2, 4, NULL), (2, 5, NULL), (2, 6, NULL),
  (3, 1, NULL), (3, 2, NULL), (3, 3, NULL), (3, 4, NULL);

INSERT IGNORE INTO division_templates (name) VALUES
  ('Ketua Pelaksana'), ('Wakil Ketua Pelaksana'), ('Acara'), ('Konsumsi'),
  ('Humas'), ('Sekretaris'), ('Bendahara'), ('PDD'), ('Medis'), ('Logistik');

INSERT INTO attendance_sessions (id, event_id, meeting_id, started_by, started_at, ended_at, status) VALUES
  (1, 1, 1, 2, '2026-09-01 10:00:00', NULL, 'aktif')
ON DUPLICATE KEY UPDATE
  event_id = VALUES(event_id),
  meeting_id = VALUES(meeting_id),
  started_by = VALUES(started_by),
  started_at = VALUES(started_at),
  ended_at = VALUES(ended_at),
  status = VALUES(status);

INSERT INTO attendances (session_id, event_id, meeting_id, member_id, scanned_by, scanned_at, status, qr_payload, note) VALUES
  (1, 1, 1, 1, 2, '2026-09-01 10:15:32', 'telat', 'QR-PRESENPRO-1904561', 'Seed monitoring'),
  (1, 1, 1, 2, 2, '2026-09-01 10:14:45', 'hadir', 'QR-PRESENPRO-1904230', 'Seed monitoring'),
  (1, 1, 1, 3, 2, '2026-09-01 10:12:10', 'hadir', 'QR-PRESENPRO-1903982', 'Seed monitoring'),
  (1, 1, 1, 4, 2, '2026-09-01 10:09:55', 'hadir', 'QR-PRESENPRO-1904112', 'Seed monitoring')
ON DUPLICATE KEY UPDATE
  meeting_id = VALUES(meeting_id),
  scanned_at = VALUES(scanned_at),
  status = VALUES(status),
  qr_payload = VALUES(qr_payload),
  note = VALUES(note);
