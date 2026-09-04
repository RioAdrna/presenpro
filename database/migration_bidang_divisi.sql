-- Migration Script: Bidang & Divisi Kegiatan
-- WARNING: Backup your database before running this script!

SET FOREIGN_KEY_CHECKS = 0;

-- 1. Rename table `divisions` to `fields`
RENAME TABLE divisions TO fields;

-- 2. Modify `members` table to point to `fields`
ALTER TABLE members CHANGE division_id field_id BIGINT UNSIGNED NOT NULL;
ALTER TABLE members DROP FOREIGN KEY fk_members_division;
ALTER TABLE members ADD CONSTRAINT fk_members_field FOREIGN KEY (field_id) REFERENCES fields(id);

-- 3. Update data in `fields` (Replacing old division data with 5 fields)
TRUNCATE TABLE fields;
INSERT INTO fields (id, code, name, leader_name) VALUES
  (1, 'CTR', 'Citra', 'Raka Pratama'),
  (2, 'KSK', 'Kesekretariatan', 'Salsabila Putri'),
  (3, 'DKT', 'Doktrin', 'Dimas Aditya'),
  (4, 'PNG', 'Penugasan', 'Nadia Rahma'),
  (5, 'AST', 'Aset', 'Fajar Hidayat');

-- Reset auto increment
ALTER TABLE fields AUTO_INCREMENT = 6;

-- Update existing members to use field_id 1 to 5 randomly (since data was mapped to 6 divisions)
UPDATE members SET field_id = (id % 5) + 1;

-- 4. Create `event_divisions` table (for tasks specific to an event)
CREATE TABLE IF NOT EXISTS event_divisions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  event_id BIGINT UNSIGNED NOT NULL,
  name VARCHAR(100) NOT NULL,
  sort_order INT UNSIGNED NOT NULL DEFAULT 0,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_event_divisions_event FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- 5. Modify `event_participants` to link to `event_divisions`
ALTER TABLE event_participants 
  ADD COLUMN event_division_id BIGINT UNSIGNED NULL AFTER member_id,
  ADD CONSTRAINT fk_ep_event_division FOREIGN KEY (event_division_id) REFERENCES event_divisions(id) ON DELETE SET NULL;

-- 6. Create `division_templates` for reusable event divisions
CREATE TABLE IF NOT EXISTS division_templates (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 7. Seed `division_templates`
INSERT INTO division_templates (name) VALUES
  ('Ketua Pelaksana'), ('Wakil Ketua Pelaksana'), ('Acara'), ('Konsumsi'),
  ('Humas'), ('Sekretaris'), ('Bendahara'), ('PDD'), ('Medis'), ('Logistik');

SET FOREIGN_KEY_CHECKS = 1;
