<?php
// auth/get-builder-dashboard.php
// Builder'ın kendi dashboard verilerini getirir

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Access-Control-Allow-Methods: GET, OPTIONS');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/db.php';

try {
    $builder_user_id = $_GET['builder_id'] ?? null;

    if (!$builder_user_id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Builder ID required']);
        exit;
    }

    // Builder kontrolü
    $stmt = $pdo->prepare("
        SELECT u.user_id, u.email, u.created_at as account_created,
               bp.builder_id, bp.full_name, bp.username, bp.age_range, r.role_name
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id
        JOIN builder_profiles bp ON u.user_id = bp.user_id
        WHERE u.user_id = ? AND r.role_name = 'builder'
    ");
    $stmt->execute([$builder_user_id]);
    $builder = $stmt->fetch();

    if (!$builder) {
        http_response_code(403);
        echo json_encode(['success' => false, 'message' => 'Only builders can access this endpoint']);
        exit;
    }

    // Builder'ın avatar'ını al
    $stmt = $pdo->prepare("SELECT avatar_data FROM avatars WHERE builder_id = ?");
    $stmt->execute([$builder['builder_id']]);
    $avatar = $stmt->fetch();

    // Toplam sistem istatistikleri (Builder'ın görebileceği genel bilgiler)
    $stmt = $pdo->query("SELECT COUNT(*) as total FROM mini_profiles WHERE parent_approval_status = 'approved'");
    $totalMinis = $stmt->fetch()['total'];

    $stmt = $pdo->query("SELECT COUNT(*) as total FROM scene_recordings");
    $totalRecordings = $stmt->fetch()['total'];

    $stmt = $pdo->query("SELECT COUNT(*) as total FROM scenes WHERE is_active = 1");
    $totalScenes = $stmt->fetch()['total'];

    $stmt = $pdo->query("SELECT COUNT(*) as total FROM customized_minis");
    $totalCustomizations = $stmt->fetch()['total'];

    // Bugün aktif olan Mini sayısı
    $stmt = $pdo->query("
        SELECT COUNT(DISTINCT mini_id) as today_active
        FROM mini_daily_activity
        WHERE activity_date = CURDATE() AND has_activity = 1
    ");
    $todayActive = $stmt->fetch()['today_active'];

    // Son 7 günlük aktivite trendi
    $stmt = $pdo->query("
        SELECT 
            activity_date,
            COUNT(DISTINCT mini_id) as active_minis,
            SUM(recordings_count) as total_recordings
        FROM mini_daily_activity
        WHERE activity_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY) AND has_activity = 1
        GROUP BY activity_date
        ORDER BY activity_date DESC
    ");
    $weeklyTrend = $stmt->fetchAll();

    // En aktif sahneler
    $stmt = $pdo->query("
        SELECT 
            s.scene_id, s.scene_name, s.scene_image,
            COUNT(sr.recording_id) as recording_count
        FROM scenes s
        LEFT JOIN scene_recordings sr ON s.scene_id = sr.scene_id
        WHERE s.is_active = 1
        GROUP BY s.scene_id
        ORDER BY recording_count DESC
        LIMIT 5
    ");
    $topScenes = $stmt->fetchAll();

    // Streak liderleri (top 5)
    $stmt = $pdo->query("
        SELECT 
            mp.mini_name,
            COALESCE(ss.current_streak, 0) as current_streak,
            COALESCE(ss.longest_streak, 0) as longest_streak
        FROM mini_profiles mp
        LEFT JOIN streak_summary ss ON mp.mini_id = ss.mini_id
        WHERE mp.parent_approval_status = 'approved'
        ORDER BY current_streak DESC
        LIMIT 5
    ");
    $streakLeaders = $stmt->fetchAll();

    echo json_encode([
        'success' => true,
        'data' => [
            'builder' => [
                'builder_id' => $builder['builder_id'],
                'user_id' => $builder['user_id'],
                'full_name' => $builder['full_name'],
                'username' => $builder['username'],
                'email' => $builder['email'],
                'age_range' => $builder['age_range'],
                'account_created' => $builder['account_created'],
                'avatar_data' => $avatar ? json_decode($avatar['avatar_data'], true) : null
            ],
            'community_stats' => [
                'total_minis' => (int)$totalMinis,
                'total_recordings' => (int)$totalRecordings,
                'total_scenes' => (int)$totalScenes,
                'total_customizations' => (int)$totalCustomizations,
                'today_active' => (int)$todayActive
            ],
            'weekly_trend' => $weeklyTrend,
            'top_scenes' => $topScenes,
            'streak_leaders' => $streakLeaders
        ]
    ]);

} catch (Throwable $e) {
    error_log('GET BUILDER DASHBOARD ERROR: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode(['success' => false, 'message' => 'Server error']);
}
