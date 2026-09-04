-- ═══════════════════════════════════════════════════════════════
-- Migration: Tambah tabel meetings + update attendance tables
-- ═══════════════════════════════════════════════════════════════

USE presenpro;

-- 1. Tabel meetings (pertemuan di dalam kegiatan)
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

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS attendance_mode ENUM('offline','online') NOT NULL DEFAULT 'offline' AFTER location;

-- 2. Tambah meeting_id ke attendance_sessions
ALTER TABLE attendance_sessions
  ADD COLUMN meeting_id BIGINT UNSIGNED NULL AFTER event_id,
  ADD CONSTRAINT fk_attendance_sessions_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE;

-- 3. Tambah meeting_id ke attendances
ALTER TABLE attendances
  ADD COLUMN meeting_id BIGINT UNSIGNED NULL AFTER event_id,
  ADD CONSTRAINT fk_attendances_meeting FOREIGN KEY (meeting_id) REFERENCES meetings(id) ON DELETE CASCADE;

-- 4. Seed: buat meeting untuk event yang sudah ada (migrasi data lama)
INSERT INTO meetings (event_id, title, meeting_date, start_time, end_time, location, attendance_mode, late_tolerance_minutes, status, sort_order)
SELECT id, CONCAT(title, ' - Pertemuan 1'), event_date, start_time, end_time, location, 'offline', late_tolerance_minutes, status, 1
FROM events;

-- 5. Update attendance_sessions yang sudah ada agar terhubung ke meeting
UPDATE attendance_sessions AS ats
JOIN meetings AS m ON m.event_id = ats.event_id
SET ats.meeting_id = m.id
WHERE ats.meeting_id IS NULL;

-- 6. Update attendances yang sudah ada agar terhubung ke meeting
UPDATE attendances AS att
JOIN meetings AS m ON m.event_id = att.event_id
SET att.meeting_id = m.id
WHERE att.meeting_id IS NULL;
