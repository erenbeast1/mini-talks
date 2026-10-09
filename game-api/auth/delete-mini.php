<?php
// auth/delete-mini.php
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: POST, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

try {
    $raw = file_get_contents('php://input');
    $data = json_decode($raw, true);

    $parent_id = $data['parent_id'] ?? null;
    $mini_id = $data['mini_id'] ?? null;

    // Validation
    if (!$parent_id || !$mini_id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Parent ID and Mini ID are required'
        ]);
        exit;
    }

    // Parent kontrolu - bu mini bu parent'a ait mi?
    $stmt = $pdo->prepare("
        SELECT mp.mini_id, mp.mini_name, mp.user_id
        FROM mini_profiles mp
        WHERE mp.mini_id = ? AND mp.parent_id = ?
    ");
    $stmt->execute([$mini_id, $parent_id]);
    $mini = $stmt->fetch();

    if (!$mini) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Mini not found or you do not have permission to delete it'
        ]);
        exit;
    }

    // Foreign key check'i gecici olarak kapat
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 0");

    // mini_id iceren tum tablolardan sil (veritabanindaki gercek tablolar)
    $tablesToDelete = [
        // Reward & Progress
        'mini_rewards',
        'mini_rewards_log',
        
        // Missions
        'mission_completions',
        'mission_assignments',
        'mission_settings',
        
        // Motivation
        'motivation_usage_log',
        'motivation_history',
        'motivation_messages',
        'motivation_settings',
        
        // Recordings & Activity
        'mini_recordings',
        'mini_daily_activity',
        
        // Customizations
        'mini_customizations',
        'customized_minis',
        
        // Scene & Level Progress
        'mini_scene_levels',
        
        // Missions (mini_missions)
        'mini_missions',
        
        // Connections
        'expert_mini_connections',
        'parent_mini_connections',
        'parent_expert_connections',
        
        // Approval
        'mini_approval_requests',
        
        // Avatars
        'avatars',
        
        // Settings
        'reward_settings',
        'streak_settings',
        'recording_settings'
    ];

    $deletedFrom = [];

    foreach ($tablesToDelete as $table) {
        try {
            $stmt = $pdo->prepare("DELETE FROM `$table` WHERE mini_id = ?");
            $stmt->execute([$mini_id]);
            $count = $stmt->rowCount();
            if ($count > 0) {
                $deletedFrom[] = "$table ($count)";
            }
        } catch (PDOException $e) {
            // Tablo yoksa veya hata varsa devam et
            error_log("Delete from $table skipped: " . $e->getMessage());
        }
    }

    // mini_profiles tablosundan sil (en son)
    $stmt = $pdo->prepare("DELETE FROM mini_profiles WHERE mini_id = ?");
    $stmt->execute([$mini_id]);

    // Eger mini'nin user_id'si varsa, users tablosundan da sil
    if (!empty($mini['user_id'])) {
        try {
            $stmt = $pdo->prepare("DELETE FROM users WHERE user_id = ?");
            $stmt->execute([$mini['user_id']]);
            $deletedFrom[] = "users (1)";
        } catch (PDOException $e) {
            error_log("User delete skipped: " . $e->getMessage());
        }
    }

    // Foreign key check'i tekrar ac
    $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Mini deleted successfully',
        'data' => [
            'mini_id' => (int)$mini_id,
            'mini_name' => $mini['mini_name'],
            'deleted_from' => $deletedFrom
        ]
    ]);

} catch (Throwable $e) {
    // Foreign key check'i tekrar ac (hata durumunda)
    try {
        $pdo->exec("SET FOREIGN_KEY_CHECKS = 1");
    } catch (Exception $ex) {}
    
    error_log('DELETE MINI ERROR: ' . $e->getMessage() . ' | Line: ' . $e->getLine());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error while deleting mini'
    ]);
}