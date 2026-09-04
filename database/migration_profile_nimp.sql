-- Jalankan pada database lama sebelum memakai registrasi NIM-P.
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS nim_p VARCHAR(40) NULL UNIQUE AFTER name;

ALTER TABLE members
  ADD COLUMN IF NOT EXISTS faculty VARCHAR(160) NULL AFTER phone,
  ADD COLUMN IF NOT EXISTS cohort_year SMALLINT UNSIGNED NULL AFTER faculty;

UPDATE users
SET nim_p = CONCAT('2406411-', LPAD(id, 4, '0'), '.I')
WHERE nim_p IS NULL OR nim_p = '';

UPDATE members m
JOIN users u ON u.email = m.email
SET m.nim = u.nim_p
WHERE u.email IS NOT NULL;

ALTER TABLE users DROP COLUMN email;
ALTER TABLE members DROP COLUMN email;
