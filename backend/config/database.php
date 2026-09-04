<?php

declare(strict_types=1);

$localConfigPath = __DIR__ . '/database.local.php';
$localConfig = file_exists($localConfigPath) ? require $localConfigPath : [];

$host = $localConfig['host'] ?? (getenv('DB_HOST') ?: '127.0.0.1');
$port = $localConfig['port'] ?? (getenv('DB_PORT') ?: '3306');
$database = $localConfig['database'] ?? (getenv('DB_DATABASE') ?: 'presenpro');
$username = $localConfig['username'] ?? (getenv('DB_USERNAME') ?: 'root');
$password = $localConfig['password'] ?? (getenv('DB_PASSWORD') ?: '');

$dsn = "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4";

$pdo = new PDO($dsn, $username, $password, [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES => false,
]);

return $pdo;
