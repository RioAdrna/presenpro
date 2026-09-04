-- Tambahkan mode absensi pada database yang sudah pernah dibuat.
-- Jalankan setelah memilih database PresenPro di phpMyAdmin.

ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS attendance_mode ENUM('offline','online') NOT NULL DEFAULT 'offline' AFTER location;

UPDATE meetings
SET attendance_mode = 'online'
WHERE LOWER(COALESCE(location, '')) REGEXP 'online|zoom|google[[:space:]]*meet|microsoft[[:space:]]*teams';
