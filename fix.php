<?php
$pdo = require __DIR__ . '/backend/config/database.php';

$pdo->exec("ALTER TABLE meetings ADD COLUMN IF NOT EXISTS attendance_mode ENUM('offline','online') NOT NULL DEFAULT 'offline' AFTER location");
$pdo->exec("UPDATE meetings SET attendance_mode = 'online' WHERE LOWER(COALESCE(location, '')) LIKE '%online%' OR LOWER(COALESCE(location, '')) LIKE '%zoom%' OR LOWER(COALESCE(location, '')) LIKE '%google meet%' OR LOWER(COALESCE(location, '')) LIKE '%teams%'");

$pdo->exec('ALTER TABLE users ADD COLUMN IF NOT EXISTS nim_p VARCHAR(40) NULL UNIQUE AFTER name');
$pdo->exec('ALTER TABLE members ADD COLUMN IF NOT EXISTS faculty VARCHAR(160) NULL AFTER phone');
$pdo->exec('ALTER TABLE members ADD COLUMN IF NOT EXISTS cohort_year SMALLINT UNSIGNED NULL AFTER faculty');

// Beri NIM-P dummy untuk akun lama agar tetap dapat login setelah email dihapus.
$pdo->exec("UPDATE users SET nim_p = CONCAT('2406411-', LPAD(id, 4, '0'), '.I') WHERE nim_p IS NULL OR nim_p = ''");
$emailCheck = $pdo->query("SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = 'users' AND column_name = 'email'");
if ((int) $emailCheck->fetchColumn() > 0) {
    $pdo->exec('UPDATE members m JOIN users u ON u.email = m.email SET m.nim = u.nim_p WHERE u.email IS NOT NULL');
}

function makeUniqueMemberNim(PDO $pdo): string
{
    $statement = $pdo->prepare('SELECT COUNT(*) FROM members WHERE nim = ?');

    do {
        $nim = 'MBR-' . date('Ymd-His') . '-' . random_int(100, 999);
        $statement->execute([$nim]);
    } while ((int) $statement->fetchColumn() > 0);

    return $nim;
}

$pdo->beginTransaction();

try {
// Sinkronkan semua pengguna Personel yang sudah approved ke tabel members.
$stmt = $pdo->query('
    SELECT u.* FROM users u
    JOIN roles r ON r.id = u.role_id
    WHERE u.approved = "approved" AND r.name = "anggota"
');
$approvedUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

$created = 0;
$updated = 0;

foreach ($approvedUsers as $targetUser) {
    $stmt = $pdo->prepare('SELECT id FROM members WHERE nim = ? LIMIT 1');
    $stmt->execute([$targetUser['nim_p']]);
    $member = $stmt->fetch(PDO::FETCH_ASSOC);

    if ($member) {
        echo "Updating member: " . $targetUser['name'] . "\n";
        $stmt = $pdo->prepare(
            'UPDATE members
             SET name = ?, status = "aktif", approved = "approved", joined_at = COALESCE(joined_at, CURDATE())
             WHERE id = ?'
        );
        $stmt->execute([$targetUser['name'], $member['id']]);
        $updated++;
        continue;
    }

    echo "Creating member: " . $targetUser['name'] . "\n";
    $nimValue = $targetUser['nim_p'] ?: makeUniqueMemberNim($pdo);
    $qrToken = 'QR-PRESENPRO-' . $nimValue;

    $stmt = $pdo->prepare(
        'INSERT INTO members (nim, name, qr_token, status, approved, joined_at)
         VALUES (?, ?, ?, "aktif", "approved", CURDATE())'
    );
    $stmt->execute([$nimValue, $targetUser['name'], $qrToken]);
    $created++;
}

// Pastikan kegiatan lama punya minimal satu pertemuan.
$meetingCreated = 0;
$events = $pdo->query('SELECT * FROM events ORDER BY id')->fetchAll(PDO::FETCH_ASSOC);
$countMeetings = $pdo->prepare('SELECT COUNT(*) FROM meetings WHERE event_id = ?');
$insertMeeting = $pdo->prepare(
    'INSERT INTO meetings (event_id, title, meeting_date, start_time, end_time, location, late_tolerance_minutes, status, sort_order)
     VALUES (?, "Pertemuan Utama", ?, ?, ?, ?, ?, "aktif", 1)'
);

foreach ($events as $event) {
    $countMeetings->execute([$event['id']]);
    if ((int) $countMeetings->fetchColumn() > 0) {
        continue;
    }

    echo "Creating default meeting for: " . $event['title'] . "\n";
    $insertMeeting->execute([
        $event['id'],
        $event['event_date'],
        $event['start_time'],
        $event['end_time'],
        $event['location'],
        $event['late_tolerance_minutes'],
    ]);
    $meetingCreated++;
}

// Tautkan sesi/log lama yang belum punya meeting_id ke pertemuan pertama event.
$sessionsLinked = $pdo->exec(
    'UPDATE attendance_sessions s
     JOIN (
       SELECT event_id, MIN(id) AS meeting_id
       FROM meetings
       GROUP BY event_id
     ) first_meeting ON first_meeting.event_id = s.event_id
     SET s.meeting_id = first_meeting.meeting_id
     WHERE s.meeting_id IS NULL'
);

$attendancesLinked = $pdo->exec(
    'UPDATE attendances a
     JOIN attendance_sessions s ON s.id = a.session_id
     SET a.meeting_id = s.meeting_id
     WHERE a.meeting_id IS NULL AND s.meeting_id IS NOT NULL'
);

// Hapus kolom email setelah relasi akun lama dipindahkan ke NIM-P.
foreach ([['users', 'email'], ['members', 'email']] as [$table, $column]) {
    $check = $pdo->prepare('SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? AND column_name = ?');
    $check->execute([$table, $column]);
    if ((int) $check->fetchColumn() > 0) {
        $pdo->exec("ALTER TABLE {$table} DROP COLUMN {$column}");
    }
}

if ($pdo->inTransaction()) {
    $pdo->commit();
}

echo "Done fixing! Created members: {$created}, updated members: {$updated}, created meetings: {$meetingCreated}, linked sessions: {$sessionsLinked}, linked attendances: {$attendancesLinked}\n";
} catch (Throwable $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    throw $e;
}
