<?php
// config/db.php

$host    = 'localhost';      // <<< BURAYI public IP yerine localhost yap
$port    = 3306;             // Plesk’te farklıysa (3307 gibi) onu yaz
$db      = 'minitalks';
$user    = 'admin_mini';
$pass    = 'SET-IN-YOUR-OWN-CONFIG';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;port=$port;dbname=$db;charset=$charset";

$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,  // Hata olursa exception fırlat
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
} catch (Throwable $e) {
    http_response_code(500);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode([
        'success' => false,
        'message' => 'Database connection failed.',
        'error'   => $e->getMessage(), // istersen canlıda bunu silebilirsin
    ]);
    exit;
}
