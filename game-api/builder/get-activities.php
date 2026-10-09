<?php
// /minitalks-api/builder/get-activities.php
// Builder Hub - Son aktiviteler
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

try {
    $activities = [];
    
    // Get recent mini creations
    try {
        $stmt = $pdo->query("
            SELECT 
                mp.mini_id as id,
                'new_mini' as type,
                CONCAT('New mini \"', mp.mini_name, '\" created') as message,
                mp.created_at as date,
                COALESCE(pp.full_name, 'Parent') as user
            FROM mini_profiles mp
            LEFT JOIN parent_profiles pp ON mp.parent_id = pp.parent_id
            ORDER BY mp.created_at DESC
            LIMIT 5
        ");
        $activities = array_merge($activities, $stmt->fetchAll());
    } catch (Exception $e) {}
    
    // Get recent recordings
    try {
        $stmt = $pdo->query("
            SELECT 
                mr.recording_id as id,
                'recording' as type,
                CONCAT('Recording completed in ', COALESCE(s.scene_name, 'Unknown')) as message,
                mr.created_at as date,
                CONCAT('Mini ', COALESCE(mp.mini_name, 'Unknown')) as user
            FROM mini_recordings mr
            LEFT JOIN scenes s ON mr.scene_id = s.scene_id
            LEFT JOIN mini_profiles mp ON mr.mini_id = mp.mini_id
            ORDER BY mr.created_at DESC
            LIMIT 5
        ");
        $activities = array_merge($activities, $stmt->fetchAll());
    } catch (Exception $e) {}
    
    // Get recent streak achievements
    try {
        $stmt = $pdo->query("
            SELECT 
                sh.id as id,
                'streak' as type,
                CONCAT(sh.streak_days, ' day streak achieved') as message,
                sh.achieved_at as date,
                CONCAT('Mini ', COALESCE(mp.mini_name, 'Unknown')) as user
            FROM streak_history sh
            LEFT JOIN mini_profiles mp ON sh.mini_id = mp.mini_id
            WHERE sh.streak_days >= 7
            ORDER BY sh.achieved_at DESC
            LIMIT 5
        ");
        $activities = array_merge($activities, $stmt->fetchAll());
    } catch (Exception $e) {}
    
    // Get recent parent registrations
    try {
        $stmt = $pdo->query("
            SELECT 
                pp.parent_id as id,
                'new_parent' as type,
                'New parent account created' as message,
                pp.created_at as date,
                CONCAT('Parent ', COALESCE(pp.full_name, 'Unknown')) as user
            FROM parent_profiles pp
            ORDER BY pp.created_at DESC
            LIMIT 3
        ");
        $activities = array_merge($activities, $stmt->fetchAll());
    } catch (Exception $e) {}
    
    // Get recent rewards
    try {
        $stmt = $pdo->query("
            SELECT 
                mrl.log_id as id,
                'reward' as type,
                CONCAT(mrl.reward_type, ' earned: ', mrl.reward_name) as message,
                mrl.earned_at as date,
                CONCAT('Mini ', COALESCE(mp.mini_name, 'Unknown')) as user
            FROM mini_rewards_log mrl
            LEFT JOIN mini_profiles mp ON mrl.mini_id = mp.mini_id
            ORDER BY mrl.earned_at DESC
            LIMIT 5
        ");
        $activities = array_merge($activities, $stmt->fetchAll());
    } catch (Exception $e) {}
    
    // Sort by date descending
    usort($activities, function($a, $b) {
        return strtotime($b['date']) - strtotime($a['date']);
    });
    
    // Return top 10
    $activities = array_slice($activities, 0, 10);
    
    echo json_encode([
        'success' => true,
        'data' => $activities
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
