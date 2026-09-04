<?php

declare(strict_types=1);

date_default_timezone_set('Asia/Jakarta');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Auth-Token');
header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit;
}

try {
    $pdo = require __DIR__ . '/../config/database.php';
} catch (Throwable $exception) {
    http_response_code(500);
    echo json_encode([
        'message' => 'Koneksi database gagal. Periksa database.local.php di backend/config.',
        'detail' => $exception->getMessage(),
    ], JSON_UNESCAPED_SLASHES);
    exit;
}
$secret = getenv('APP_KEY') ?: 'presenpro-local-dev-key';

function jsonResponse(array $payload, int $status = 200): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_SLASHES);
    exit;
}

function readJson(): array
{
    $raw = file_get_contents('php://input');
    if ($raw === false || trim($raw) === '') {
        return [];
    }

    $data = json_decode($raw, true);
    return is_array($data) ? $data : [];
}

function routePath(): string
{
    $route = $_GET['route'] ?? null;
    if (is_string($route) && $route !== '') {
        return '/' . trim($route, '/');
    }

    $path = $_SERVER['PATH_INFO'] ?? parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH);
    $path = preg_replace('#^.*?/backend/public(?:/index\.php)?#', '', (string) $path);
    return '/' . trim((string) $path, '/');
}

function makeToken(array $user, string $secret): string
{
    $payload = [
        'id' => (int) $user['id'],
        'nimP' => $user['nim_p'],
        'role' => $user['role_name'],
        'exp' => time() + 60 * 60 * 12,
    ];
    $body = rtrim(strtr(base64_encode(json_encode($payload)), '+/', '-_'), '=');
    $signature = hash_hmac('sha256', $body, $secret);
    return $body . '.' . $signature;
}

function readBearer(): string
{
    $header = $_SERVER['HTTP_AUTHORIZATION'] ?? '';
    if ($header === '' && !empty($_SERVER['HTTP_X_AUTH_TOKEN'])) {
        $header = 'Bearer ' . $_SERVER['HTTP_X_AUTH_TOKEN'];
    }
    if ($header === '' && function_exists('apache_request_headers')) {
        $headers = apache_request_headers();
        $header = $headers['Authorization'] ?? $headers['authorization'] ?? '';
    }

    if (!preg_match('/Bearer\s+(.+)/i', $header, $matches)) {
        return '';
    }

    return trim($matches[1]);
}

function currentUser(PDO $pdo, string $secret): ?array
{
    $token = readBearer();
    if ($token === '' || !str_contains($token, '.')) {
        return null;
    }

    [$body, $signature] = explode('.', $token, 2);
    if (!hash_equals(hash_hmac('sha256', $body, $secret), $signature)) {
        return null;
    }

    $json = base64_decode(strtr($body, '-_', '+/'), true);
    $payload = json_decode((string) $json, true);
    if (!is_array($payload) || ($payload['exp'] ?? 0) < time()) {
        return null;
    }

    $statement = $pdo->prepare(
        'SELECT users.id, users.role_id, users.name, users.nim_p, users.status, users.created_at, roles.name AS role_name, roles.label AS role_label
         FROM users
         JOIN roles ON roles.id = users.role_id
         WHERE users.id = ? AND users.status = "aktif"
         LIMIT 1'
    );
    $statement->execute([(int) $payload['id']]);
    $user = $statement->fetch();

    return $user ?: null;
}

function indoDate(string $date): string
{
    $months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
    $time = strtotime($date);
    return date('j', $time) . ' ' . $months[(int) date('n', $time) - 1] . ' ' . date('Y', $time);
}

function uiStatus(string $status): string
{
    return match ($status) {
        'draft' => 'Akan Datang',
        'aktif' => 'Aktif',
        'selesai' => 'Selesai',
        'dibatalkan' => 'Dibatalkan',
        default => 'Aktif',
    };
}

function dbStatus(string $status): string
{
    return match ($status) {
        'Akan Datang' => 'draft',
        'Selesai' => 'selesai',
        'Dibatalkan' => 'dibatalkan',
        default => 'aktif',
    };
}

function isOnlineLocation(?string $location): bool
{
    return (bool) preg_match('/online|zoom|google\s*meet|microsoft\s*teams/i', (string) $location);
}

function meetingAttendanceMode(?string $mode, ?string $location = null): string
{
    if ($mode === 'online' || $mode === 'offline') {
        return $mode;
    }

    return isOnlineLocation($location) ? 'online' : 'offline';
}

function validateMeetingLocation(string $mode, string $location): void
{
    if ($location === '') {
        jsonResponse(['message' => $mode === 'online' ? 'Link Zoom atau Meet wajib diisi.' : 'Lokasi rapat wajib diisi.'], 422);
    }

    if ($mode === 'online' && !filter_var($location, FILTER_VALIDATE_URL)) {
        jsonResponse(['message' => 'Masukkan link Zoom atau Meet yang valid.'], 422);
    }
}

function eventBySlug(PDO $pdo, string $slug): ?array
{
    $statement = $pdo->prepare(
        'SELECT events.*, event_categories.name AS category
         FROM events
         JOIN event_categories ON event_categories.id = events.category_id
         WHERE events.slug = ?
         LIMIT 1'
    );
    $statement->execute([$slug]);
    $event = $statement->fetch();
    return $event ?: null;
}

function eventParticipants(PDO $pdo, int $eventId): array
{
    $statement = $pdo->prepare(
        'SELECT members.id, members.nim, members.name, event_divisions.name AS event_division
         FROM event_participants
         JOIN members ON members.id = event_participants.member_id
         LEFT JOIN event_divisions ON event_divisions.id = event_participants.event_division_id
         WHERE event_participants.event_id = ?
         ORDER BY members.name'
    );
    $statement->execute([$eventId]);
    return array_map(static function (array $member): array {
        $parts = explode(' ', $member['name']);
        $initial = strtoupper(substr($parts[0] ?? '', 0, 1) . substr($parts[1] ?? '', 0, 1));
        return [
            'id' => (int) $member['id'],
            'nim' => $member['nim'],
            'name' => $member['name'],
            'eventDivision' => $member['event_division'],
            'initial' => $initial,
        ];
    }, $statement->fetchAll());
}


function formatEvent(PDO $pdo, array $event): array
{
    $lateAfter = date('H:i', strtotime($event['start_time'] . ' +' . (int) $event['late_tolerance_minutes'] . ' minutes'));
    $participants = eventParticipants($pdo, (int) $event['id']);
    $meetings = eventMeetings($pdo, (int) $event['id']);

    return [
        'id' => $event['slug'],
        'databaseId' => (int) $event['id'],
        'title' => $event['title'],
        'category' => $event['category'],
        'status' => uiStatus($event['status']),
        'date' => indoDate($event['event_date']),
        'eventDate' => $event['event_date'],
        'time' => substr($event['start_time'], 0, 5) . ' - ' . substr($event['end_time'], 0, 5) . ' WIB',
        'startTime' => substr($event['start_time'], 0, 5),
        'endTime' => substr($event['end_time'], 0, 5),
        'lateAfter' => $lateAfter,
        'lateTolerance' => (int) $event['late_tolerance_minutes'],
        'place' => $event['location'],
        'participantCount' => (int) $event['participant_quota'],
        'rule' => 'QR pribadi anggota, toleransi terlambat ' . (int) $event['late_tolerance_minutes'] . ' menit',
        'participants' => array_column($participants, 'nim'),
        'participantDetails' => $participants,
        'meetings' => $meetings,
    ];
}

function attendanceRows(PDO $pdo, int $eventId, ?int $meetingId = null): array
{
    $where = $meetingId ? 'attendances.meeting_id = ?' : 'attendances.event_id = ?';
    $param = $meetingId ?: $eventId;
    $statement = $pdo->prepare(
        "SELECT members.nim, members.name, event_divisions.name AS event_division, attendances.scanned_at, attendances.status, attendances.note
         FROM attendances
         JOIN members ON members.id = attendances.member_id
         LEFT JOIN event_participants ON event_participants.member_id = members.id AND event_participants.event_id = attendances.event_id
         LEFT JOIN event_divisions ON event_divisions.id = event_participants.event_division_id
         WHERE $where
         ORDER BY attendances.scanned_at DESC"
    );
    $statement->execute([$param]);

    return array_map(static function (array $row): array {
        $parts = explode(' ', $row['name']);
        return [
            'name' => $row['name'],
            'nim' => $row['nim'],
            'eventDivision' => $row['event_division'],
            'time' => date('H:i:s', strtotime($row['scanned_at'])) . ' WIB',
            'status' => strtoupper($row['status']),
            'note' => $row['note'] ?: '',
            'initial' => strtoupper(substr($parts[0] ?? '', 0, 1) . substr($parts[1] ?? '', 0, 1)),
        ];
    }, $statement->fetchAll());
}

function activeSession(PDO $pdo, int $eventId, ?int $meetingId = null): ?array
{
    if ($meetingId) {
        $statement = $pdo->prepare(
            'SELECT * FROM attendance_sessions WHERE meeting_id = ? AND status = "aktif" ORDER BY started_at DESC LIMIT 1'
        );
        $statement->execute([$meetingId]);
    } else {
        $statement = $pdo->prepare(
            'SELECT * FROM attendance_sessions WHERE event_id = ? AND status = "aktif" ORDER BY started_at DESC LIMIT 1'
        );
        $statement->execute([$eventId]);
    }
    $session = $statement->fetch();

    if (!$session) {
        return null;
    }

    return [
        'id' => (int) $session['id'],
        'active' => true,
        'eventId' => (int) $session['event_id'],
        'meetingId' => $session['meeting_id'] ? (int) $session['meeting_id'] : null,
        'startedAt' => $session['started_at'],
        'endedAt' => $session['ended_at'],
    ];
}

function eventMeetings(PDO $pdo, int $eventId): array
{
    $statement = $pdo->prepare(
        'SELECT m.*,
                (SELECT COUNT(*) FROM attendances a WHERE a.meeting_id = m.id AND a.status IN ("hadir","telat")) AS present_count,
                (SELECT COUNT(*) FROM attendances a WHERE a.meeting_id = m.id) AS total_scanned
         FROM meetings m
         WHERE m.event_id = ?
         ORDER BY m.sort_order, m.meeting_date, m.start_time'
    );
    $statement->execute([$eventId]);

    return array_map(static function (array $m): array {
        $lateAfter = date('H:i', strtotime($m['start_time'] . ' +' . (int) $m['late_tolerance_minutes'] . ' minutes'));
        return [
            'id' => (int) $m['id'],
            'title' => $m['title'],
            'date' => indoDate($m['meeting_date']),
            'meetingDate' => $m['meeting_date'],
            'time' => substr($m['start_time'], 0, 5) . ' - ' . substr($m['end_time'], 0, 5) . ' WIB',
            'startTime' => substr($m['start_time'], 0, 5),
            'endTime' => substr($m['end_time'], 0, 5),
            'lateAfter' => $lateAfter,
            'lateTolerance' => (int) $m['late_tolerance_minutes'],
            'place' => $m['location'],
            'attendanceMode' => meetingAttendanceMode($m['attendance_mode'] ?? null, $m['location'] ?? null),
            'status' => uiStatus($m['status']),
            'presentCount' => (int) $m['present_count'],
            'totalScanned' => (int) $m['total_scanned'],
        ];
    }, $statement->fetchAll());
}

function ensureCategory(PDO $pdo, string $name): int
{
    $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $name), '-')) ?: 'lainnya';
    $statement = $pdo->prepare('INSERT INTO event_categories (slug, name) VALUES (?, ?) ON DUPLICATE KEY UPDATE name = VALUES(name)');
    $statement->execute([$slug, $name]);

    $statement = $pdo->prepare('SELECT id FROM event_categories WHERE slug = ? LIMIT 1');
    $statement->execute([$slug]);
    return (int) $statement->fetchColumn();
}

function makeSlug(string $title): string
{
    $slug = strtolower(trim(preg_replace('/[^a-z0-9]+/i', '-', $title), '-'));
    return $slug !== '' ? $slug . '-' . time() : 'kegiatan-' . time();
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

function ensureApprovedMemberForUser(PDO $pdo, array $targetUser): array
{
    $statement = $pdo->prepare('SELECT id, nim FROM members WHERE nim = ? LIMIT 1');
    $statement->execute([$targetUser['nim_p']]);
    $member = $statement->fetch();

    if ($member) {
        $memberNim = trim((string) ($targetUser['nim_p'] ?? '')) ?: $member['nim'];
        $statement = $pdo->prepare(
            'UPDATE members
             SET nim = ?, name = ?, status = "aktif", approved = "approved", joined_at = COALESCE(joined_at, CURDATE())
             WHERE id = ?'
        );
        $statement->execute([$memberNim, $targetUser['name'], $member['id']]);

        return [
            'id' => (int) $member['id'],
            'nim' => $member['nim'],
            'name' => $targetUser['name'],
            'nimP' => $targetUser['nim_p'],
        ];
    }

    $nimValue = trim((string) ($targetUser['nim_p'] ?? '')) ?: makeUniqueMemberNim($pdo);
    $qrToken = 'QR-PRESENPRO-' . $nimValue;
    $statement = $pdo->prepare(
        'INSERT INTO members (nim, name, qr_token, status, approved, joined_at)
         VALUES (?, ?, ?, "aktif", "approved", CURDATE())'
    );
    $statement->execute([$nimValue, $targetUser['name'], $qrToken]);

    return [
        'id' => (int) $pdo->lastInsertId(),
        'nim' => $nimValue,
        'name' => $targetUser['name'],
        'nimP' => $targetUser['nim_p'],
    ];
}

function finalizeExpiredMeetings(PDO $pdo): void
{
    $now = date('Y-m-d H:i:s');
    $statement = $pdo->prepare(
        'SELECT m.id, m.event_id, m.meeting_date, m.start_time, m.end_time, e.created_by
         FROM meetings m
         JOIN events e ON e.id = m.event_id
         WHERE e.status = "selesai"
            OR m.status = "selesai"
            OR CONCAT(m.meeting_date, " ", m.end_time) <= ?'
    );
    $statement->execute([$now]);
    $meetings = $statement->fetchAll();

    foreach ($meetings as $meeting) {
        try {
            $pdo->beginTransaction();

            $sessionStatement = $pdo->prepare(
                'SELECT * FROM attendance_sessions WHERE meeting_id = ? ORDER BY id DESC LIMIT 1'
            );
            $sessionStatement->execute([(int) $meeting['id']]);
            $session = $sessionStatement->fetch();

            if (!$session) {
                $insertSession = $pdo->prepare(
                    'INSERT INTO attendance_sessions
                        (event_id, meeting_id, started_by, started_at, ended_at, status)
                     VALUES (?, ?, ?, ?, ?, "selesai")'
                );
                $insertSession->execute([
                    (int) $meeting['event_id'],
                    (int) $meeting['id'],
                    (int) $meeting['created_by'],
                    $meeting['meeting_date'] . ' ' . $meeting['start_time'],
                    $meeting['meeting_date'] . ' ' . $meeting['end_time'],
                ]);
                $sessionId = (int) $pdo->lastInsertId();
            } else {
                $sessionId = (int) $session['id'];
                $closeSession = $pdo->prepare(
                    'UPDATE attendance_sessions SET status = "selesai", ended_at = COALESCE(ended_at, ?) WHERE id = ?'
                );
                $closeSession->execute([
                    $meeting['meeting_date'] . ' ' . $meeting['end_time'],
                    $sessionId,
                ]);
            }

            $insertAbsent = $pdo->prepare(
                'INSERT IGNORE INTO attendances
                    (session_id, event_id, meeting_id, member_id, scanned_by, scanned_at, status, qr_payload, note)
                 SELECT ?, ?, ?, ep.member_id, ?, ?, "alpa", "SYSTEM-ALPA", "Tidak melakukan absensi sampai jadwal selesai"
                 FROM event_participants ep
                 LEFT JOIN attendances a ON a.meeting_id = ? AND a.member_id = ep.member_id
                 WHERE ep.event_id = ? AND a.id IS NULL'
            );
            $insertAbsent->execute([
                $sessionId,
                (int) $meeting['event_id'],
                (int) $meeting['id'],
                (int) $meeting['created_by'],
                $meeting['meeting_date'] . ' ' . $meeting['end_time'],
                $sessionId,
                (int) $meeting['event_id'],
            ]);

            $updateMeeting = $pdo->prepare('UPDATE meetings SET status = "selesai" WHERE id = ? AND status <> "selesai"');
            $updateMeeting->execute([(int) $meeting['id']]);
            $pdo->commit();
        } catch (Throwable $error) {
            if ($pdo->inTransaction()) $pdo->rollBack();
            throw $error;
        }
    }

    $updateEvents = $pdo->prepare(
        'UPDATE events e
         SET status = "selesai"
         WHERE e.status <> "selesai"
           AND EXISTS (SELECT 1 FROM meetings m1 WHERE m1.event_id = e.id)
           AND NOT EXISTS (
               SELECT 1 FROM meetings m2
               WHERE m2.event_id = e.id
                 AND CONCAT(m2.meeting_date, " ", m2.end_time) > ?
           )'
    );
    $updateEvents->execute([$now]);
}

$method = $_SERVER['REQUEST_METHOD'];
$path = routePath();
$segments = array_values(array_filter(explode('/', trim($path, '/'))));

try {
    if ($path === '/health') {
        jsonResponse(['ok' => true, 'app' => 'PresenPRO API']);
    }

    if ($method === 'POST' && $path === '/auth/register') {
        $input = readJson();
        $name = trim((string) ($input['name'] ?? ''));
        $nimP = strtoupper(trim((string) ($input['nimP'] ?? $input['nim_p'] ?? '')));
        $password = (string) ($input['password'] ?? '');

        if ($name === '' || $nimP === '' || $password === '') {
            jsonResponse(['message' => 'Nama lengkap, NIM-P, dan password wajib diisi.'], 422);
        }

        if (!preg_match('/^\d{7}-\d{4}\.[IVXLCDM]+$/i', $nimP)) {
            jsonResponse(['message' => 'Format NIM-P harus seperti 2406411-1031.XVIII.'], 422);
        }

        if (strlen($password) < 6) {
            jsonResponse(['message' => 'Password minimal 6 karakter.'], 422);
        }

        $statement = $pdo->prepare('SELECT id FROM users WHERE nim_p = ? LIMIT 1');
        $statement->execute([$nimP]);
        if ($statement->fetchColumn()) {
            jsonResponse(['message' => 'NIM-P sudah terdaftar.'], 409);
        }

        $statement = $pdo->prepare('SELECT id FROM members WHERE nim = ? LIMIT 1');
        $statement->execute([$nimP]);
        if ($statement->fetchColumn()) {
            jsonResponse(['message' => 'NIM-P sudah terdaftar sebagai anggota.'], 409);
        }

        $statement = $pdo->prepare('SELECT id FROM roles WHERE name = "anggota" LIMIT 1');
        $statement->execute();
        $roleId = $statement->fetchColumn();

        if (!$roleId) {
            jsonResponse(['message' => 'Role anggota belum tersedia.'], 500);
        }

        try {
            $statement = $pdo->prepare(
                'INSERT INTO users (role_id, name, nim_p, password_hash, status, approved)
                 VALUES (?, ?, ?, ?, "aktif", "pending")'
            );
            $statement->execute([(int) $roleId, $name, $nimP, password_hash($password, PASSWORD_DEFAULT)]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                jsonResponse(['message' => 'NIM-P sudah terdaftar.'], 409);
            }
            throw $e;
        }

        jsonResponse(['message' => 'Registrasi berhasil dikirim. Akun Anda menunggu persetujuan.'], 201);
    }

    if ($method === 'POST' && $path === '/auth/login') {
        $input = readJson();
        $identifier = strtoupper(trim((string) ($input['identifier'] ?? $input['nimP'] ?? '')));
        $statement = $pdo->prepare(
            'SELECT users.*, roles.name AS role_name, roles.label AS role_label
             FROM users
             JOIN roles ON roles.id = users.role_id
             WHERE users.nim_p = ? AND users.status = "aktif"
             LIMIT 1'
        );
        $statement->execute([$identifier]);
        $user = $statement->fetch();

        if (!$user || !password_verify((string) ($input['password'] ?? ''), $user['password_hash'])) {
            jsonResponse(['message' => 'NIM-P atau password tidak sesuai.'], 422);
        }

        // Check approval status
        if (($user['approved'] ?? 'pending') === 'pending') {
            jsonResponse(['message' => 'Akun Anda belum disetujui.'], 403);
        }
        if (($user['approved'] ?? '') === 'rejected') {
            jsonResponse(['message' => 'Akun Anda telah ditolak. Silakan hubungi Ketua Bidang.'], 403);
        }

        jsonResponse([
            'token' => makeToken($user, $secret),
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'nimP' => $user['nim_p'],
                'roleName' => $user['role_name'],
                'role' => $user['role_label'],
            ],
        ]);
    }

    $user = currentUser($pdo, $secret);
    if (!$user) {
        jsonResponse(['message' => 'Unauthorized.'], 401);
    }

    // Sesi online harus bisa dibuka pengelola tepat di akhir rapat sebelum
    // proses otomatis menutup pertemuan dan membuat status alpa.
    $isStartingSession = $method === 'POST' && preg_match('#^/events/[^/]+/meetings/\d+/sessions/start$#', $path);
    if (!$isStartingSession) {
        finalizeExpiredMeetings($pdo);
    }

    if ($method === 'GET' && $path === '/auth/me') {
        jsonResponse([
            'user' => [
                'id' => (int) $user['id'],
                'name' => $user['name'],
                'nimP' => $user['nim_p'],
                'roleName' => $user['role_name'],
                'role' => $user['role_label'],
            ],
        ]);
    }

    if ($method === 'PATCH' && $path === '/profile') {
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $name = trim($body['name'] ?? '');
        $nim = trim($body['nim'] ?? '');
        $phone = trim($body['phone'] ?? '');
        $faculty = trim($body['faculty'] ?? '');
        $angkatan = trim($body['angkatan'] ?? '');
        $password = $body['password'] ?? '';

        if (!$name) {
            jsonResponse(['message' => 'Nama lengkap wajib diisi.'], 400);
        }

        $userId = $user['id'];

        $nim = $nim !== '' ? strtoupper($nim) : (string) $user['nim_p'];
        if (!preg_match('/^\d{7}-\d{4}\.[IVXLCDM]+$/i', $nim)) {
            jsonResponse(['message' => 'Format NIM-P harus seperti 2406411-1031.XVIII.'], 422);
        }
        $nimStatement = $pdo->prepare('SELECT id FROM users WHERE nim_p = ? AND id <> ? LIMIT 1');
        $nimStatement->execute([$nim, $userId]);
        if ($nimStatement->fetchColumn()) {
            jsonResponse(['message' => 'NIM-P sudah digunakan akun lain.'], 409);
        }
        
        $memberId = null;
        $memberStatement = $pdo->prepare('SELECT id, nim FROM members WHERE nim = ? LIMIT 1');
        $memberStatement->execute([$user['nim_p']]);
        $member = $memberStatement->fetch();
        if ($member) {
            $memberId = (int) $member['id'];
            $nim = $nim !== '' ? $nim : (string) $member['nim'];
            $nimStatement = $pdo->prepare('SELECT id FROM members WHERE nim = ? AND id <> ? LIMIT 1');
            $nimStatement->execute([$nim, $memberId]);
            if ($nimStatement->fetchColumn()) {
                    jsonResponse(['message' => 'NIM-P sudah digunakan anggota lain.'], 409);
            }
        }

        $pdo->beginTransaction();

        try {
            if ($password) {
                $hashed = password_hash($password, PASSWORD_DEFAULT);
                $stmt = $pdo->prepare('UPDATE users SET name = ?, nim_p = ?, password_hash = ? WHERE id = ?');
                $stmt->execute([$name, $nim, $hashed, $userId]);
            } else {
                $stmt = $pdo->prepare('UPDATE users SET name = ?, nim_p = ? WHERE id = ?');
                $stmt->execute([$name, $nim, $userId]);
            }

            if ($memberId) {
                $cohortYear = $angkatan !== '' ? (int) $angkatan : null;
                $stmt = $pdo->prepare('UPDATE members SET name = ?, nim = ?, phone = ?, faculty = ?, cohort_year = ? WHERE id = ?');
                $stmt->execute([$name, $nim, $phone !== '' ? $phone : null, $faculty !== '' ? $faculty : null, $cohortYear, $memberId]);
            } else {
                $cohortYear = $angkatan !== '' ? (int) $angkatan : null;
                $qrToken = 'QR-PRESENPRO-' . $nim;
                $stmt = $pdo->prepare(
                    'INSERT INTO members (nim, name, phone, faculty, cohort_year, qr_token, status, approved, joined_at)
                     VALUES (?, ?, ?, ?, ?, ?, "aktif", "approved", CURDATE())'
                );
                $stmt->execute([$nim, $name, $phone !== '' ? $phone : null, $faculty !== '' ? $faculty : null, $cohortYear, $qrToken]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        jsonResponse(['message' => 'Profil berhasil diperbarui.']);
    }

    if ($method === 'GET' && $path === '/dashboard') {
        // 1. Total Anggota (Aktif)
        $stmt = $pdo->query('SELECT COUNT(*) FROM members WHERE status = "aktif"');
        $totalMembers = (int) $stmt->fetchColumn();

        // 2. Kegiatan Aktif (yang event_date >= today atau masih berjalan)
        $stmt = $pdo->query('SELECT COUNT(*) FROM events WHERE status != "selesai"');
        $activeEvents = (int) $stmt->fetchColumn();

        // 3. Hadir Hari Ini
        $stmt = $pdo->query('SELECT COUNT(*) FROM attendances WHERE DATE(scanned_at) = CURDATE() AND status IN ("hadir", "telat")');
        $presentToday = (int) $stmt->fetchColumn();

        // 4. Tingkat Kehadiran Keseluruhan
        $stmt = $pdo->query('SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ("hadir", "telat") THEN 1 ELSE 0 END) as present FROM attendances');
        $attRow = $stmt->fetch();
        $attPercent = ($attRow['total'] > 0) ? round(($attRow['present'] / $attRow['total']) * 100, 1) : 0;

        // Recent Activities
        $stmt = $pdo->query('
            SELECT e.title, e.status, e.event_date as date, e.start_time as time,
                   (SELECT COUNT(*) FROM event_participants WHERE event_id = e.id) as max_attendees,
                   (SELECT COUNT(DISTINCT member_id) FROM attendances WHERE event_id = e.id AND status IN ("hadir", "telat")) as present_attendees
            FROM events e
            ORDER BY e.created_at DESC
            LIMIT 5
        ');
        $recentActivities = array_map(function($row) {
            return [
                'title' => $row['title'],
                'status' => strtoupper($row['status']),
                'date' => date('d M Y', strtotime($row['date'])),
                'time' => substr($row['time'], 0, 5),
                'attendees' => $row['present_attendees'] . '/' . $row['max_attendees']
            ];
        }, $stmt->fetchAll());

        // Chart Data (Mingguan default)
        // Let's generate a simple weekly summary of the past 4 weeks
        $charts = ['Mingguan' => []];
        for ($i = 3; $i >= 0; $i--) {
            $start = date('Y-m-d', strtotime("-{$i} weeks monday this week"));
            $end = date('Y-m-d', strtotime("-{$i} weeks sunday this week"));
            
            $stmt = $pdo->prepare('
                SELECT 
                    SUM(CASE WHEN status IN ("hadir", "telat") THEN 1 ELSE 0 END) as hadir,
                    SUM(CASE WHEN status = "izin" THEN 1 ELSE 0 END) as izin,
                    SUM(CASE WHEN status = "alpa" THEN 1 ELSE 0 END) as alpa
                FROM attendances
                WHERE DATE(scanned_at) BETWEEN ? AND ?
            ');
            $stmt->execute([$start, $end]);
            $row = $stmt->fetch();
            
            $charts['Mingguan'][] = [
                'label' => 'M' . (4 - $i),
                'hadir' => (int) $row['hadir'],
                'izin' => (int) $row['izin'],
                'alpa' => (int) $row['alpa']
            ];
        }

        jsonResponse([
            'stats' => [
                'totalMembers' => $totalMembers,
                'activeEvents' => $activeEvents,
                'presentToday' => $presentToday,
                'attendancePercent' => $attPercent
            ],
            'recentActivities' => $recentActivities,
            'charts' => $charts
        ]);
    }

    if ($method === 'GET' && $path === '/events') {
        $statement = $pdo->query(
            'SELECT events.*, event_categories.name AS category
             FROM events
             JOIN event_categories ON event_categories.id = events.category_id
             ORDER BY events.event_date DESC, events.start_time DESC'
        );
        $events = array_map(fn (array $event): array => formatEvent($pdo, $event), $statement->fetchAll());
        jsonResponse(['events' => $events]);
    }

    if ($method === 'GET' && $path === '/members') {
        $statement = $pdo->query(
            'SELECT members.id, members.nim, members.name, members.status, members.approved
             FROM members
             WHERE members.approved = "approved"
             ORDER BY members.name'
        );
        // Compute attendance rate per member
        $rows = $statement->fetchAll();
        $stmt = $pdo->prepare('SELECT COUNT(*) AS total, SUM(CASE WHEN status IN ("hadir", "telat") THEN 1 ELSE 0 END) AS present FROM attendances WHERE member_id = ?');
        foreach ($rows as &$row) {
            $stmt->execute([$row['id']]);
            $att = $stmt->fetch();
            $row['attendance'] = ($att['total'] > 0) ? round(($att['present'] / $att['total']) * 100) : 0;
            $row['status'] = $row['status'] === 'aktif' ? 'Aktif' : 'Nonaktif';
            // Normalize approved
            $row['approved'] = ucfirst($row['approved']);
        }
        jsonResponse(['members' => $rows]);
    }



    if ($method === 'GET' && $path === '/division-templates') {
        $statement = $pdo->query('SELECT id, name FROM division_templates ORDER BY name');
        jsonResponse(['divisionTemplates' => $statement->fetchAll()]);
    }

    if ($method === 'POST' && $path === '/division-templates') {
        $input = readJson();
        $name = trim((string) ($input['name'] ?? ''));
        if ($name === '') {
            jsonResponse(['message' => 'Nama divisi wajib diisi.'], 422);
        }
        $statement = $pdo->prepare('INSERT IGNORE INTO division_templates (name) VALUES (?)');
        $statement->execute([$name]);
        $statement = $pdo->query('SELECT id, name FROM division_templates ORDER BY name');
        jsonResponse(['divisionTemplates' => $statement->fetchAll()]);
    }

    // ── User Management ──

    // GET /users — list all users
    if ($method === 'GET' && $path === '/users') {
        $statement = $pdo->query(
            'SELECT users.id, users.name, users.nim_p, users.status, users.approved,
                    roles.name AS role_name, roles.label AS role_label,
                    members.nim
             FROM users
             JOIN roles ON roles.id = users.role_id
             LEFT JOIN members ON members.nim = users.nim_p
             ORDER BY users.name'
        );
        $rows = array_map(static function (array $row): array {
            $parts = explode(' ', $row['name']);
            return [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'nimP' => $row['nim_p'] ?: ($row['nim'] ?: '-'),
                'nim' => $row['nim'] ?: '-',
                'roleName' => $row['role_name'],
                'role' => $row['role_label'],
                'status' => $row['status'] === 'aktif' ? 'Aktif' : 'Nonaktif',
                'approved' => ucfirst($row['approved'] ?? 'pending'),
                'initial' => strtoupper(substr($parts[0] ?? '', 0, 1) . substr($parts[1] ?? '', 0, 1)),
            ];
        }, $statement->fetchAll());
        jsonResponse(['users' => $rows]);
    }

    // POST /users — only creates user record, member is created on approval
    if ($method === 'POST' && $path === '/users') {
        $input = readJson();
        $name = trim((string) ($input['name'] ?? ''));
        $nimP = strtoupper(trim((string) ($input['nimP'] ?? $input['nim_p'] ?? '')));
        $password = (string) ($input['password'] ?? '');
        $roleName = trim((string) ($input['role'] ?? 'anggota')); // Default Personel

        if ($name === '' || $nimP === '' || $password === '') {
            jsonResponse(['message' => 'Nama lengkap, NIM-P, dan password wajib diisi.'], 422);
        }

        if (!preg_match('/^\d{7}-\d{4}\.[IVXLCDM]+$/i', $nimP)) {
            jsonResponse(['message' => 'Format NIM-P tidak valid.'], 422);
        }

        // Get role id
        $statement = $pdo->prepare('SELECT id FROM roles WHERE name = ? LIMIT 1');
        $statement->execute([$roleName]);
        $roleRow = $statement->fetch();
        if (!$roleRow) {
            jsonResponse(['message' => 'Role tidak valid.'], 422);
        }

        // Create user only (pending approval)
        $passwordHash = password_hash($password, PASSWORD_DEFAULT);
        try {
            $statement = $pdo->prepare('INSERT INTO users (role_id, name, nim_p, password_hash, status, approved) VALUES (?, ?, ?, ?, "aktif", "pending")');
            $statement->execute([$roleRow['id'], $name, $nimP, $passwordHash]);
        } catch (PDOException $e) {
            if ($e->getCode() === '23000') {
                jsonResponse(['message' => 'NIM-P sudah digunakan.'], 409);
            }
            throw $e;
        }

        // Refetch users
        $statement = $pdo->query(
            'SELECT users.id, users.name, users.nim_p, users.status, users.approved,
                    roles.name AS role_name, roles.label AS role_label,
                    members.nim
             FROM users
             JOIN roles ON roles.id = users.role_id
             LEFT JOIN members ON members.nim = users.nim_p
             ORDER BY users.name'
        );
        $rows = array_map(static function (array $row): array {
            $parts = explode(' ', $row['name']);
            return [
                'id' => (int) $row['id'],
                'name' => $row['name'],
                'nimP' => $row['nim_p'] ?: ($row['nim'] ?: '-'),
                'nim' => $row['nim'] ?: '-',
                'roleName' => $row['role_name'],
                'role' => $row['role_label'],
                'status' => $row['status'] === 'aktif' ? 'Aktif' : 'Nonaktif',
                'approved' => ucfirst($row['approved'] ?? 'pending'),
                'initial' => strtoupper(substr($parts[0] ?? '', 0, 1) . substr($parts[1] ?? '', 0, 1)),
            ];
        }, $statement->fetchAll());
        jsonResponse(['users' => $rows, 'message' => 'Pengguna berhasil ditambahkan.']);
    }

    // PATCH /users/{id}/toggle-approval
    if ($method === 'PATCH' && ($segments[0] ?? '') === 'users' && isset($segments[1]) && is_numeric($segments[1]) && ($segments[2] ?? '') === 'toggle-approval') {
        $targetId = (int) $segments[1];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $action = $body['action'] ?? '';

        if (!in_array($action, ['approved', 'rejected'])) {
            jsonResponse(['message' => 'Aksi tidak valid.'], 400);
        }

        $statement = $pdo->prepare('SELECT id, name, nim_p, password_hash FROM users WHERE id = ? LIMIT 1');
        $statement->execute([$targetId]);
        $targetUser = $statement->fetch();
        if (!$targetUser) {
            jsonResponse(['message' => 'Pengguna tidak ditemukan.'], 404);
        }

        $pdo->beginTransaction();
        $member = null;

        try {
            $statement = $pdo->prepare('UPDATE users SET approved = ? WHERE id = ?');
            $statement->execute([$action, $targetId]);

            if ($action === 'approved') {
                $member = ensureApprovedMemberForUser($pdo, $targetUser);
            }

            if ($action === 'rejected') {
                $stmt = $pdo->prepare('UPDATE members SET approved = "rejected" WHERE nim = ?');
                $stmt->execute([$targetUser['nim_p']]);
            }

            $pdo->commit();
        } catch (Throwable $e) {
            if ($pdo->inTransaction()) {
                $pdo->rollBack();
            }
            throw $e;
        }

        $label = $action === 'approved' ? 'Approved' : 'Rejected';
        jsonResponse(['message' => "Pengguna berhasil di-{$label}.", 'newApproval' => $label, 'member' => $member]);
    }

    // PATCH /users/{id}/role
    if ($method === 'PATCH' && ($segments[0] ?? '') === 'users' && isset($segments[1]) && is_numeric($segments[1]) && ($segments[2] ?? '') === 'role') {
        $targetId = (int) $segments[1];
        $body = json_decode(file_get_contents('php://input'), true) ?? [];
        $roleName = $body['role'] ?? '';

        $statement = $pdo->prepare('SELECT id, label FROM roles WHERE name = ? LIMIT 1');
        $statement->execute([$roleName]);
        $roleRow = $statement->fetch();
        if (!$roleRow) {
            jsonResponse(['message' => 'Role tidak valid.'], 422);
        }

        $statement = $pdo->prepare('UPDATE users SET role_id = ? WHERE id = ?');
        $statement->execute([$roleRow['id'], $targetId]);

        jsonResponse(['message' => 'Role pengguna berhasil diubah.', 'newRole' => $roleRow['label']]);
    }

    // PATCH /users/{id}/reset-password
    if ($method === 'PATCH' && ($segments[0] ?? '') === 'users' && isset($segments[1]) && is_numeric($segments[1]) && ($segments[2] ?? '') === 'reset-password') {
        $targetId = (int) $segments[1];
        if (($user['role_name'] ?? '') !== 'super_admin') {
            jsonResponse(['message' => 'Hanya Ketua Bidang yang bisa mereset password.'], 403);
        }

        $statement = $pdo->prepare('SELECT id FROM users WHERE id = ? LIMIT 1');
        $statement->execute([$targetId]);
        if (!$statement->fetch()) {
            jsonResponse(['message' => 'Pengguna tidak ditemukan.'], 404);
        }

        $temporaryPassword = 'Presen' . random_int(100000, 999999);
        $hashed = password_hash($temporaryPassword, PASSWORD_DEFAULT);
        
        $statement = $pdo->prepare('UPDATE users SET password_hash = ? WHERE id = ?');
        $statement->execute([$hashed, $targetId]);

        jsonResponse([
            'message' => 'Password berhasil direset. Berikan password sementara ini ke pengguna.',
            'temporaryPassword' => $temporaryPassword,
        ]);
    }

    // DELETE /users/{id}
    if ($method === 'DELETE' && ($segments[0] ?? '') === 'users' && isset($segments[1]) && is_numeric($segments[1])) {
        $targetId = (int) $segments[1];

        // Prevent self-delete
        if ($targetId === (int) $user['id']) {
            jsonResponse(['message' => 'Anda tidak dapat menghapus akun Anda sendiri.'], 422);
        }
        if ($targetId === 1) {
            jsonResponse(['message' => 'Admin Utama tidak dapat dihapus.'], 403);
        }

        $statement = $pdo->prepare('DELETE FROM users WHERE id = ?');
        $statement->execute([$targetId]);

        jsonResponse(['message' => 'Pengguna berhasil dihapus.']);
    }

    // PATCH /users/{id}/toggle-status
    if ($method === 'PATCH' && ($segments[0] ?? '') === 'users' && isset($segments[1]) && is_numeric($segments[1]) && ($segments[2] ?? '') === 'toggle-status') {
        $targetId = (int) $segments[1];

        $statement = $pdo->prepare('SELECT status FROM users WHERE id = ? LIMIT 1');
        $statement->execute([$targetId]);
        $targetUser = $statement->fetch();
        if (!$targetUser) {
            jsonResponse(['message' => 'Pengguna tidak ditemukan.'], 404);
        }

        $newStatus = $targetUser['status'] === 'aktif' ? 'nonaktif' : 'aktif';
        $statement = $pdo->prepare('UPDATE users SET status = ? WHERE id = ?');
        $statement->execute([$newStatus, $targetId]);

        jsonResponse(['message' => 'Status pengguna berhasil diubah.', 'newStatus' => $newStatus === 'aktif' ? 'Aktif' : 'Nonaktif']);
    }

    // GET /members/search?q=... — search members for user creation autocomplete
    if ($method === 'GET' && $path === '/members/search') {
        $q = trim((string) ($_GET['q'] ?? ''));
        if (strlen($q) < 2) {
            jsonResponse(['members' => []]);
        }

        $statement = $pdo->prepare(
            'SELECT m.id, m.nim, m.name
             FROM members m
             WHERE m.status = "aktif"
               AND (m.name LIKE ? OR m.nim LIKE ?)
               AND NOT EXISTS (SELECT 1 FROM users u2 WHERE u2.nim_p = m.nim)
             ORDER BY m.name
             LIMIT 10'
        );
        $like = '%' . $q . '%';
        $statement->execute([$like, $like]);
        $rows = array_map(static function (array $row): array {
            $parts = explode(' ', $row['name']);
            return [
                'id' => (int) $row['id'],
                'nim' => $row['nim'],
                'name' => $row['name'],
                'nimP' => $row['nim'],
                'initial' => strtoupper(substr($parts[0] ?? '', 0, 1) . substr($parts[1] ?? '', 0, 1)),
            ];
        }, $statement->fetchAll());
        jsonResponse(['members' => $rows]);
    }



    if ($method === 'POST' && $path === '/events') {
        $input = readJson();
        $categoryId = ensureCategory($pdo, trim((string) ($input['category'] ?? 'Rapat')));
        $title = trim((string) ($input['title'] ?? ''));

        if ($title === '') {
            jsonResponse(['message' => 'Nama kegiatan wajib diisi.'], 422);
        }

        $pdo->beginTransaction();

        try {
            $statement = $pdo->prepare(
                'INSERT INTO events
                 (category_id, created_by, slug, title, event_date, start_time, end_time, location, participant_quota, late_tolerance_minutes, status)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $statement->execute([
                $categoryId,
                (int) $user['id'],
                makeSlug($title),
                $title,
                $input['eventDate'] ?? date('Y-m-d'),
                ($input['startTime'] ?? '09:00') . ':00',
                ($input['endTime'] ?? '12:00') . ':00',
                trim((string) ($input['place'] ?? '-')),
                (int) ($input['participantLimit'] ?? 0),
                (int) ($input['lateTolerance'] ?? 15),
                dbStatus((string) ($input['status'] ?? 'Aktif')),
            ]);

            $eventId = (int) $pdo->lastInsertId();

            $eventDate = $input['eventDate'] ?? date('Y-m-d');
            $startTime = ($input['startTime'] ?? '09:00') . ':00';
            $endTime = ($input['endTime'] ?? '12:00') . ':00';
            $location = trim((string) ($input['place'] ?? '-'));
            $lateTolerance = (int) ($input['lateTolerance'] ?? 15);
            $attendanceMode = meetingAttendanceMode($input['attendanceMode'] ?? 'offline');
            validateMeetingLocation($attendanceMode, $location);

            $statement = $pdo->prepare(
                'INSERT INTO meetings (event_id, title, meeting_date, start_time, end_time, location, attendance_mode, late_tolerance_minutes, status, sort_order)
                 VALUES (?, "Pertemuan Utama", ?, ?, ?, ?, ?, ?, "aktif", 1)'
            );
            $statement->execute([$eventId, $eventDate, $startTime, $endTime, $location, $attendanceMode, $lateTolerance]);

            $insertDivision = $pdo->prepare('INSERT INTO event_divisions (event_id, name, sort_order) VALUES (?, ?, ?)');
            $insertParticipant = $pdo->prepare('INSERT IGNORE INTO event_participants (event_id, member_id, event_division_id) VALUES (?, ?, ?)');

            $divisions = is_array($input['divisions'] ?? null) ? $input['divisions'] : [];
            $sortOrder = 1;
            
            foreach ($divisions as $divisionData) {
                $divName = trim((string) ($divisionData['name'] ?? ''));
                if ($divName === '') continue;

                $insertDivision->execute([$eventId, $divName, $sortOrder++]);
                $divId = (int) $pdo->lastInsertId();

                $members = is_array($divisionData['members'] ?? null) ? $divisionData['members'] : [];
                foreach ($members as $memberId) {
                    $insertParticipant->execute([$eventId, (int) $memberId, $divId]);
                }
            }

            $pdo->commit();
        } catch (Throwable $e) {
            $pdo->rollBack();
            throw $e;
        }

        $statement = $pdo->prepare(
            'SELECT events.*, event_categories.name AS category
             FROM events
             JOIN event_categories ON event_categories.id = events.category_id
             WHERE events.id = ?'
        );
        $statement->execute([$eventId]);
        jsonResponse(['event' => formatEvent($pdo, $statement->fetch())], 201);
    }

    if (($segments[0] ?? '') === 'events' && isset($segments[1])) {
        $event = eventBySlug($pdo, $segments[1]);
        if (!$event) {
            jsonResponse(['message' => 'Kegiatan tidak ditemukan.'], 404);
        }

        $eventDbId = (int) $event['id'];

        // GET /events/{slug} — detail kegiatan + daftar pertemuan
        if ($method === 'GET' && count($segments) === 2) {
            jsonResponse([
                'event' => formatEvent($pdo, $event),
            ]);
        }

        if ($method === 'PATCH' && count($segments) === 2) {
            $input = readJson();
            $categoryId = ensureCategory($pdo, trim((string) ($input['category'] ?? $event['category'] ?? 'Rapat')));
            $title = trim((string) ($input['title'] ?? $event['title']));

            if ($title === '') {
                jsonResponse(['message' => 'Nama kegiatan wajib diisi.'], 422);
            }

            $eventDate = $input['eventDate'] ?? $event['event_date'];
            $startTime = substr((string) ($input['startTime'] ?? $event['start_time']), 0, 5) . ':00';
            $endTime = substr((string) ($input['endTime'] ?? $event['end_time']), 0, 5) . ':00';
            $location = trim((string) ($input['place'] ?? $event['location'])) ?: '-';
            $lateTolerance = (int) ($input['lateTolerance'] ?? $event['late_tolerance_minutes']);
            $participantLimit = (int) ($input['participantLimit'] ?? $event['participant_quota']);
            $status = dbStatus((string) ($input['status'] ?? uiStatus($event['status'])));
            $attendanceMode = meetingAttendanceMode($input['attendanceMode'] ?? null, $location);
            validateMeetingLocation($attendanceMode, $location);

            $pdo->beginTransaction();

            try {
                $statement = $pdo->prepare(
                    'UPDATE events
                     SET category_id = ?, title = ?, event_date = ?, start_time = ?, end_time = ?, location = ?, participant_quota = ?, late_tolerance_minutes = ?, status = ?
                     WHERE id = ?'
                );
                $statement->execute([
                    $categoryId,
                    $title,
                    $eventDate,
                    $startTime,
                    $endTime,
                    $location,
                    $participantLimit,
                    $lateTolerance,
                    $status,
                    $eventDbId,
                ]);

                $statement = $pdo->prepare('DELETE FROM event_participants WHERE event_id = ?');
                $statement->execute([$eventDbId]);

                $statement = $pdo->prepare('DELETE FROM event_divisions WHERE event_id = ?');
                $statement->execute([$eventDbId]);

                $insertDivision = $pdo->prepare('INSERT INTO event_divisions (event_id, name, sort_order) VALUES (?, ?, ?)');
                $insertParticipant = $pdo->prepare('INSERT IGNORE INTO event_participants (event_id, member_id, event_division_id) VALUES (?, ?, ?)');

                $divisions = is_array($input['divisions'] ?? null) ? $input['divisions'] : [];
                $sortOrder = 1;

                foreach ($divisions as $divisionData) {
                    $divName = trim((string) ($divisionData['name'] ?? ''));
                    if ($divName === '') continue;

                    $members = is_array($divisionData['members'] ?? null) ? $divisionData['members'] : [];
                    if (count($members) === 0) continue;

                    $insertDivision->execute([$eventDbId, $divName, $sortOrder++]);
                    $divisionId = (int) $pdo->lastInsertId();

                    foreach ($members as $memberId) {
                        $insertParticipant->execute([$eventDbId, (int) $memberId, $divisionId]);
                    }
                }

                $statement = $pdo->prepare('UPDATE meetings SET attendance_mode = ? WHERE event_id = ? ORDER BY sort_order, id LIMIT 1');
                $statement->execute([$attendanceMode, $eventDbId]);

                $pdo->commit();
            } catch (Throwable $e) {
                if ($pdo->inTransaction()) {
                    $pdo->rollBack();
                }
                throw $e;
            }

            if ($status === 'selesai') {
                finalizeExpiredMeetings($pdo);
            }

            $statement = $pdo->prepare(
                'SELECT events.*, event_categories.name AS category
                 FROM events
                 JOIN event_categories ON event_categories.id = events.category_id
                 WHERE events.id = ?'
            );
            $statement->execute([$eventDbId]);
            jsonResponse(['message' => 'Kegiatan berhasil diperbarui.', 'event' => formatEvent($pdo, $statement->fetch())]);
        }

        if ($method === 'DELETE' && count($segments) === 2) {
            $statement = $pdo->prepare('DELETE FROM events WHERE id = ?');
            $statement->execute([$eventDbId]);

            jsonResponse(['message' => 'Kegiatan berhasil dihapus.']);
        }

        // POST /events/{slug}/meetings — buat pertemuan baru
        if ($method === 'POST' && ($segments[2] ?? '') === 'meetings' && count($segments) === 3) {
            $input = readJson();
            $title = trim((string) ($input['title'] ?? ''));
            if ($title === '') {
                jsonResponse(['message' => 'Judul pertemuan wajib diisi.'], 422);
            }

            $meetingDate = $input['meetingDate'] ?? date('Y-m-d');
            $startTime = ($input['startTime'] ?? '09:00') . ':00';
            $endTime = ($input['endTime'] ?? '12:00') . ':00';
            $location = trim((string) ($input['place'] ?? $event['location']));
            $lateTolerance = (int) ($input['lateTolerance'] ?? $event['late_tolerance_minutes']);
            $attendanceMode = meetingAttendanceMode($input['attendanceMode'] ?? 'offline', $location);
            validateMeetingLocation($attendanceMode, $location);

            // Get next sort order
            $statement = $pdo->prepare('SELECT COALESCE(MAX(sort_order), 0) + 1 FROM meetings WHERE event_id = ?');
            $statement->execute([$eventDbId]);
            $sortOrder = (int) $statement->fetchColumn();

            $statement = $pdo->prepare(
                'INSERT INTO meetings (event_id, title, meeting_date, start_time, end_time, location, attendance_mode, late_tolerance_minutes, status, sort_order)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, "aktif", ?)'
            );
            $statement->execute([$eventDbId, $title, $meetingDate, $startTime, $endTime, $location, $attendanceMode, $lateTolerance, $sortOrder]);

            jsonResponse(['meetings' => eventMeetings($pdo, $eventDbId)], 201);
        }

        // Routes for specific meeting: /events/{slug}/meetings/{meetingId}/...
        if (($segments[2] ?? '') === 'meetings' && isset($segments[3]) && is_numeric($segments[3])) {
            $meetingId = (int) $segments[3];

            // Verify meeting belongs to this event
            $statement = $pdo->prepare('SELECT * FROM meetings WHERE id = ? AND event_id = ?');
            $statement->execute([$meetingId, $eventDbId]);
            $meeting = $statement->fetch();
            if (!$meeting) {
                jsonResponse(['message' => 'Pertemuan tidak ditemukan.'], 404);
            }

            if ($method === 'PATCH' && count($segments) === 4) {
                $input = readJson();
                $title = trim((string) ($input['title'] ?? $meeting['title']));

                if ($title === '') {
                    jsonResponse(['message' => 'Judul pertemuan wajib diisi.'], 422);
                }

                $meetingDate = $input['meetingDate'] ?? $meeting['meeting_date'];
                $startTime = substr((string) ($input['startTime'] ?? $meeting['start_time']), 0, 5) . ':00';
                $endTime = substr((string) ($input['endTime'] ?? $meeting['end_time']), 0, 5) . ':00';
                $location = trim((string) ($input['place'] ?? $meeting['location'])) ?: $event['location'];
                $lateTolerance = (int) ($input['lateTolerance'] ?? $meeting['late_tolerance_minutes']);
                $status = dbStatus((string) ($input['status'] ?? uiStatus($meeting['status'])));
                $attendanceMode = meetingAttendanceMode($input['attendanceMode'] ?? ($meeting['attendance_mode'] ?? null), $location);
                validateMeetingLocation($attendanceMode, $location);

                $statement = $pdo->prepare(
                    'UPDATE meetings
                     SET title = ?, meeting_date = ?, start_time = ?, end_time = ?, location = ?, attendance_mode = ?, late_tolerance_minutes = ?, status = ?
                     WHERE id = ? AND event_id = ?'
                );
                $statement->execute([$title, $meetingDate, $startTime, $endTime, $location, $attendanceMode, $lateTolerance, $status, $meetingId, $eventDbId]);

                jsonResponse(['message' => 'Pertemuan berhasil diperbarui.', 'meetings' => eventMeetings($pdo, $eventDbId)]);
            }

            if ($method === 'DELETE' && count($segments) === 4) {
                $statement = $pdo->prepare('DELETE FROM meetings WHERE id = ? AND event_id = ?');
                $statement->execute([$meetingId, $eventDbId]);

                jsonResponse(['message' => 'Pertemuan berhasil dihapus.', 'meetings' => eventMeetings($pdo, $eventDbId)]);
            }

            // POST /events/{slug}/meetings/{id}/permit
            if ($method === 'POST' && ($segments[4] ?? '') === 'permit') {
                if ($meeting['status'] === 'selesai' || $event['status'] === 'selesai') {
                    jsonResponse(['message' => 'Pengajuan izin sudah ditutup karena pertemuan selesai.'], 422);
                }

                $input = readJson();
                $note = trim((string) ($input['note'] ?? ''));
                if ($note === '') {
                    jsonResponse(['message' => 'Alasan izin wajib diisi.'], 422);
                }

                $statement = $pdo->prepare('SELECT id FROM members WHERE nim = ? AND status = "aktif" LIMIT 1');
                $statement->execute([$user['nim_p']]);
                $memberId = (int) $statement->fetchColumn();
                if (!$memberId) {
                    jsonResponse(['message' => 'Akun Anda belum terhubung dengan data anggota.'], 422);
                }

                $statement = $pdo->prepare('SELECT COUNT(*) FROM event_participants WHERE event_id = ? AND member_id = ?');
                $statement->execute([$eventDbId, $memberId]);
                if ((int) $statement->fetchColumn() === 0) {
                    jsonResponse(['message' => 'Anda tidak terdaftar sebagai peserta kegiatan ini.'], 422);
                }

                $statement = $pdo->prepare('SELECT id FROM attendances WHERE meeting_id = ? AND member_id = ? LIMIT 1');
                $statement->execute([$meetingId, $memberId]);
                if ($statement->fetchColumn()) {
                    jsonResponse(['message' => 'Absensi untuk pertemuan ini sudah tercatat.'], 409);
                }

                $statement = $pdo->prepare('SELECT * FROM attendance_sessions WHERE meeting_id = ? ORDER BY id DESC LIMIT 1');
                $statement->execute([$meetingId]);
                $session = $statement->fetch();
                if (!$session) {
                    $statement = $pdo->prepare(
                        'INSERT INTO attendance_sessions (event_id, meeting_id, started_by, started_at, status) VALUES (?, ?, ?, NOW(), "aktif")'
                    );
                    $statement->execute([$eventDbId, $meetingId, (int) $user['id']]);
                    $sessionId = (int) $pdo->lastInsertId();
                } else {
                    $sessionId = (int) $session['id'];
                }

                $statement = $pdo->prepare(
                    'INSERT INTO attendances (session_id, event_id, meeting_id, member_id, scanned_by, scanned_at, status, qr_payload, note)
                     VALUES (?, ?, ?, ?, ?, NOW(), "izin", "SELF-PERMIT", ?)'
                );
                $statement->execute([$sessionId, $eventDbId, $meetingId, $memberId, (int) $user['id'], substr($note, 0, 255)]);

                jsonResponse([
                    'message' => 'Pengajuan izin berhasil dicatat.',
                    'attendances' => attendanceRows($pdo, $eventDbId, $meetingId),
                ], 201);
            }

            // GET /events/{slug}/meetings/{id}/attendance
            if ($method === 'GET' && ($segments[4] ?? '') === 'attendance') {
                jsonResponse([
                    'session' => activeSession($pdo, $eventDbId, $meetingId),
                    'attendances' => attendanceRows($pdo, $eventDbId, $meetingId),
                ]);
            }

            // POST /events/{slug}/meetings/{id}/sessions/start
            if ($method === 'POST' && ($segments[4] ?? '') === 'sessions' && ($segments[5] ?? '') === 'start') {
                $existing = activeSession($pdo, $eventDbId, $meetingId);
                if ($existing) {
                    jsonResponse(['session' => $existing]);
                }

                $statement = $pdo->prepare(
                    'INSERT INTO attendance_sessions (event_id, meeting_id, started_by, started_at, status) VALUES (?, ?, ?, NOW(), "aktif")'
                );
                $statement->execute([$eventDbId, $meetingId, (int) $user['id']]);
                jsonResponse(['session' => activeSession($pdo, $eventDbId, $meetingId)], 201);
            }

            // POST /events/{slug}/meetings/{id}/sessions/end
            if ($method === 'POST' && ($segments[4] ?? '') === 'sessions' && ($segments[5] ?? '') === 'end') {
                $session = activeSession($pdo, $eventDbId, $meetingId);
                if (!$session) {
                    jsonResponse([
                        'session' => null,
                        'attendances' => attendanceRows($pdo, $eventDbId, $meetingId),
                    ]);
                }

                try {
                    $pdo->beginTransaction();
                    // Menutup scanner tidak menentukan alpa. Alpa dibuat oleh finalizeExpiredMeetings()
                    // setelah jadwal selesai atau kegiatan/pertemuan berstatus selesai.
                    $statement = $pdo->prepare('UPDATE attendance_sessions SET status = "selesai", ended_at = NOW() WHERE id = ? AND status = "aktif"');
                    $statement->execute([(int) $session['id']]);
                    $pdo->commit();
                } catch (Throwable $error) {
                    if ($pdo->inTransaction()) $pdo->rollBack();
                    throw $error;
                }

                jsonResponse([
                    'session' => null,
                    'attendances' => attendanceRows($pdo, $eventDbId, $meetingId),
                ]);
            }

            // POST /events/{slug}/meetings/{id}/scan
            if ($method === 'POST' && ($segments[4] ?? '') === 'scan') {
                if (meetingAttendanceMode($meeting['attendance_mode'] ?? null, $meeting['location'] ?? null) === 'online') {
                    jsonResponse(['message' => 'Pertemuan online menggunakan tombol Hadir Saya, bukan scan QR.'], 422);
                }

                $input = readJson();
                $session = activeSession($pdo, $eventDbId, $meetingId);
                if (!$session) {
                    jsonResponse(['message' => 'Sesi absensi belum aktif.'], 422);
                }

                $payload = trim((string) ($input['qrPayload'] ?? ''));
                $prefix = 'QR-PRESENPRO-';
                $nimCandidates = [$payload];
                if (str_starts_with($payload, $prefix)) {
                    $nimCandidates[] = substr($payload, strlen($prefix));
                } else {
                    preg_match('/\d{7}-\d{4}\.[IVXLCDM]+/i', $payload, $nimMatches);
                    if (!empty($nimMatches[0])) {
                        $nimCandidates[] = strtoupper($nimMatches[0]);
                    }
                    preg_match('/\d{4,}/', $payload, $numberMatches);
                    if (!empty($numberMatches[0])) {
                        $nimCandidates[] = $numberMatches[0];
                    }
                }
                $nimCandidates = array_values(array_unique(array_filter(array_map('trim', $nimCandidates))));

                $placeholders = implode(',', array_fill(0, count($nimCandidates), '?'));
                $statement = $pdo->prepare("SELECT members.* FROM members WHERE (nim IN ({$placeholders}) OR qr_token = ?) AND status = 'aktif' LIMIT 1");
                $statement->execute([...$nimCandidates, $payload]);
                $member = $statement->fetch();
                if (!$member) {
                    jsonResponse(['message' => 'QR tidak valid atau anggota tidak terdaftar.'], 422);
                }

                if ($member['nim'] === $user['nim_p']) {
                    jsonResponse(['message' => 'Anda tidak dapat memindai QR Anda sendiri. Silakan gunakan tombol "Hadir Saya" sebelum mulai absensi.'], 422);
                }

                $statement = $pdo->prepare('SELECT COUNT(*) FROM event_participants WHERE event_id = ? AND member_id = ?');
                $statement->execute([$eventDbId, (int) $member['id']]);
                if ((int) $statement->fetchColumn() === 0) {
                    jsonResponse(['message' => 'Anggota tidak terdaftar sebagai peserta kegiatan.'], 422);
                }

                $scanTime = date('Y-m-d H:i:s');
                $lateLimit = strtotime($meeting['meeting_date'] . ' ' . $meeting['start_time'] . ' +' . (int) $meeting['late_tolerance_minutes'] . ' minutes');
                $status = time() > $lateLimit ? 'telat' : 'hadir';

                $statement = $pdo->prepare(
                    'INSERT INTO attendances (session_id, event_id, meeting_id, member_id, scanned_by, scanned_at, status, qr_payload)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                );

                try {
                    $statement->execute([(int) $session['id'], $eventDbId, $meetingId, (int) $member['id'], (int) $user['id'], $scanTime, $status, $payload]);
                } catch (PDOException $exception) {
                    if ($exception->getCode() === '23000') {
                        jsonResponse(['message' => $member['name'] . ' sudah melakukan absensi pada pertemuan ini.'], 409);
                    }
                    throw $exception;
                }

                jsonResponse([
                    'message' => 'Absensi berhasil dicatat.',
                    'attendances' => attendanceRows($pdo, $eventDbId, $meetingId),
                ], 201);
            }
            
            // POST /events/{slug}/meetings/{id}/scan-self
            if ($method === 'POST' && ($segments[4] ?? '') === 'scan-self') {
                if (meetingAttendanceMode($meeting['attendance_mode'] ?? null, $meeting['location'] ?? null) !== 'online') {
                    jsonResponse(['message' => 'Pertemuan offline menggunakan scan QR oleh Sekre atau Ketua Bidang.'], 422);
                }

                $session = activeSession($pdo, $eventDbId, $meetingId);

                if (!$session) {
                    jsonResponse(['message' => 'Absensi belum dibuka oleh Sekre atau Ketua Bidang.'], 422);
                }
                
                $statement = $pdo->prepare('SELECT members.* FROM members WHERE nim = ? AND status = "aktif" LIMIT 1');
                $statement->execute([$user['nim_p']]);
                $member = $statement->fetch();
                
                if (!$member) {
                    jsonResponse(['message' => 'Akun Anda tidak terhubung dengan data anggota.'], 422);
                }

                if (empty($member['phone']) || empty($member['faculty']) || empty($member['cohort_year'])) {
                    jsonResponse(['message' => 'Lengkapi nomor HP, fakultas, dan angkatan di profil sebelum melakukan absensi.'], 422);
                }

                $statement = $pdo->prepare('SELECT COUNT(*) FROM event_participants WHERE event_id = ? AND member_id = ?');
                $statement->execute([$eventDbId, (int) $member['id']]);
                if ((int) $statement->fetchColumn() === 0) {
                    jsonResponse(['message' => 'Anda tidak terdaftar sebagai peserta kegiatan ini.'], 422);
                }

                $scanTime = date('Y-m-d H:i:s');
                $lateLimit = strtotime($meeting['meeting_date'] . ' ' . $meeting['start_time'] . ' +' . (int) $meeting['late_tolerance_minutes'] . ' minutes');
                $status = time() > $lateLimit ? 'telat' : 'hadir';

                $statement = $pdo->prepare(
                    'INSERT INTO attendances (session_id, event_id, meeting_id, member_id, scanned_by, scanned_at, status, qr_payload)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
                );

                try {
                    $statement->execute([(int) $session['id'], $eventDbId, $meetingId, (int) $member['id'], (int) $user['id'], $scanTime, $status, 'SELF-SCAN']);
                } catch (PDOException $exception) {
                    if ($exception->getCode() === '23000') {
                        jsonResponse(['message' => 'Anda sudah melakukan absensi pada pertemuan ini.'], 409);
                    }
                    throw $exception;
                }

                jsonResponse([
                    'message' => 'Absensi Anda berhasil dicatat.',
                    'attendances' => attendanceRows($pdo, $eventDbId, $meetingId),
                    'session' => $session
                ], 201);
            }
        }
    }

    // GET /reports/attendance?event=SLUG&meeting=ID
    if ($method === 'GET' && $path === '/reports/attendance') {
        $eventSlug = $_GET['event'] ?? '';
        $meetingIdFilter = $_GET['meeting'] ?? '';

        // Build dynamic query
        $conditions = [];
        $params = [];

        if ($eventSlug !== '' && $eventSlug !== 'all') {
            $eventRow = eventBySlug($pdo, $eventSlug);
            if (!$eventRow) {
                jsonResponse(['message' => 'Kegiatan tidak ditemukan.'], 404);
            }
            $conditions[] = 'a.event_id = ?';
            $params[] = (int) $eventRow['id'];
        }

        if ($meetingIdFilter !== '' && $meetingIdFilter !== 'all' && is_numeric($meetingIdFilter)) {
            $conditions[] = 'a.meeting_id = ?';
            $params[] = (int) $meetingIdFilter;
        }

        $where = count($conditions) > 0 ? 'WHERE ' . implode(' AND ', $conditions) : '';

        $sql = "SELECT
                    m.nim,
                    m.name,
                    SUM(CASE WHEN a.status = 'hadir' THEN 1 ELSE 0 END) AS present,
                    SUM(CASE WHEN a.status = 'telat' THEN 1 ELSE 0 END) AS late,
                    SUM(CASE WHEN a.status = 'izin' THEN 1 ELSE 0 END) AS permit,
                    SUM(CASE WHEN a.status = 'alpa' THEN 1 ELSE 0 END) AS absent
                FROM attendances a
                JOIN members m ON m.id = a.member_id
                $where
                GROUP BY m.id, m.nim, m.name
                ORDER BY m.name";

        $statement = $pdo->prepare($sql);
        $statement->execute($params);
        $rows = $statement->fetchAll();

        $reportRows = array_map(static function (array $row): array {
            $parts = explode(' ', $row['name']);
            $initial = strtoupper(substr($parts[0] ?? '', 0, 1) . substr($parts[1] ?? '', 0, 1));
            $present = (int) $row['present'];
            $late = (int) $row['late'];
            $permit = (int) $row['permit'];
            $absent = (int) $row['absent'];
            $total = $present + $late + $permit + $absent;
            return [
                'nim' => $row['nim'],
                'name' => $row['name'],
                'initial' => $initial,
                'present' => $present,
                'late' => $late,
                'permit' => $permit,
                'absent' => $absent,
                'total' => $total,
                'percentage' => $total > 0 ? round((($present + $late) / $total) * 100) : 0,
            ];
        }, $rows);

        $totalPresent = array_sum(array_column($reportRows, 'present'));
        $totalLate = array_sum(array_column($reportRows, 'late'));
        $totalPermit = array_sum(array_column($reportRows, 'permit'));
        $totalAbsent = array_sum(array_column($reportRows, 'absent'));
        $avgPercentage = count($reportRows) > 0
            ? round(array_sum(array_column($reportRows, 'percentage')) / count($reportRows))
            : 0;

        jsonResponse([
            'rows' => $reportRows,
            'summary' => [
                'totalPresent' => $totalPresent,
                'totalLate' => $totalLate,
                'totalPermit' => $totalPermit,
                'totalAbsent' => $totalAbsent,
                'avgPercentage' => $avgPercentage,
                'memberCount' => count($reportRows),
            ],
        ]);
    }

    // GET /profile
    if ($method === 'GET' && $path === '/profile') {
        $profile = [
            'name' => $user['name'],
            'nimP' => $user['nim_p'],
            'nim' => '-',
            'phone' => '-',
            'faculty' => '-',
            'angkatan' => '-',
            'profileComplete' => false,
            'qrToken' => '',
            'qrPayload' => '',
            'joined_at' => !empty($user['created_at']) ? indoDate($user['created_at']) : '-',
            'stats' => ['present' => 0, 'permit' => 0, 'absent' => 0, 'percentage' => 0]
        ];

        if ($user['nim_p']) {
            $stmt = $pdo->prepare('SELECT * FROM members WHERE nim = ? LIMIT 1');
            $stmt->execute([$user['nim_p']]);
            $member = $stmt->fetch();

            if ($member) {
                $profile['nim'] = $member['nim'];
                $profile['name'] = $member['name'];
                $profile['phone'] = $member['phone'] ?: '-';
                $profile['faculty'] = $member['faculty'] ?: '-';
                $profile['angkatan'] = $member['cohort_year'] ? (string) $member['cohort_year'] : '-';
                $profile['profileComplete'] = !empty($member['phone']) && !empty($member['faculty']) && !empty($member['cohort_year']);
                if ($profile['profileComplete']) {
                    $profile['qrToken'] = $member['qr_token'] ?: '';
                    $profile['qrPayload'] = 'QR-PRESENPRO-' . $member['nim'];
                }

                if (empty($user['created_at']) && !empty($member['joined_at'])) {
                    $joinedAtDate = new DateTime($member['joined_at']);
                    if (class_exists('IntlDateFormatter')) {
                        $formatter = new IntlDateFormatter('id_ID', IntlDateFormatter::LONG, IntlDateFormatter::NONE);
                        $profile['joined_at'] = $formatter->format($joinedAtDate);
                    } else {
                        $profile['joined_at'] = indoDate($member['joined_at']);
                    }
                }

                // Get attendance stats
                $statStmt = $pdo->prepare(
                    'SELECT 
                        SUM(CASE WHEN status IN ("hadir", "telat") THEN 1 ELSE 0 END) as present,
                        SUM(CASE WHEN status = "izin" THEN 1 ELSE 0 END) as permit,
                        SUM(CASE WHEN status = "alpa" THEN 1 ELSE 0 END) as absent
                     FROM attendances WHERE member_id = ?'
                );
                $statStmt->execute([$member['id']]);
                $stats = $statStmt->fetch();

                if ($stats) {
                    $present = (int) $stats['present'];
                    $permit = (int) $stats['permit'];
                    $absent = (int) $stats['absent'];
                    $total = $present + $permit + $absent;
                    $percentage = $total > 0 ? round(($present / $total) * 100) : 0;
                    
                    $profile['stats'] = [
                        'present' => $present,
                        'permit' => $permit,
                        'absent' => $absent,
                        'percentage' => $percentage
                    ];
                }
            }
        }
        jsonResponse($profile);
    }

    jsonResponse(['message' => 'Endpoint tidak ditemukan.'], 404);
} catch (Throwable $error) {
    jsonResponse(['message' => 'Server error.', 'detail' => $error->getMessage()], 500);
}
