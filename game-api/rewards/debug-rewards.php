<?php
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

require_once '../config/db.php';

$mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 4;

echo "Step 1: DB connected\n";

// Test 1: mini_profiles
$stmt = $pdo->prepare("SELECT * FROM mini_profiles WHERE mini_id = ?");
$stmt->execute([$mini_id]);
$profile = $stmt->fetch(PDO::FETCH_ASSOC);
echo "Step 2: Profile found: " . json_encode($profile) . "\n";

// Test 2: mini_rewards tablosu var mı?
$stmt = $pdo->query("SHOW TABLES LIKE 'mini_rewards'");
$tableExists = $stmt->fetch();
echo "Step 3: mini_rewards table exists: " . ($tableExists ? "YES" : "NO") . "\n";

// Test 3: mini_rewards kolonları
if ($tableExists) {
    $stmt = $pdo->query("DESCRIBE mini_rewards");
    $columns = $stmt->fetchAll(PDO::FETCH_COLUMN);
    echo "Step 4: Columns: " . json_encode($columns) . "\n";
    
    // Test 4: Veri var mı?
    $stmt = $pdo->prepare("SELECT * FROM mini_rewards WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $rewards = $stmt->fetchAll(PDO::FETCH_ASSOC);
    echo "Step 5: Rewards count: " . count($rewards) . "\n";
    echo "Step 6: Rewards: " . json_encode($rewards) . "\n";
}
