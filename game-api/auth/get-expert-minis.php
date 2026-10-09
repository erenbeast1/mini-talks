<?php
// auth/get-expert-minis.php
// Expert'in bağlı olduğu mini'leri ve bekleyen istekleri listeler
// Parent hesabı olmayan durumu da destekler
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
    $expert_user_id = $_GET['expert_id'] ?? null;

    if (!$expert_user_id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Expert ID is required'
        ]);
        exit;
    }

    // Expert profile'ı bul (user_id ile)
    $stmt = $pdo->prepare("
        SELECT ep.expert_id, ep.full_name, ep.organization
        FROM expert_profiles ep
        JOIN users u ON ep.user_id = u.user_id
        JOIN user_roles r ON u.role_id = r.role_id
        WHERE ep.user_id = ? AND r.role_name = 'expert'
    ");
    $stmt->execute([$expert_user_id]);
    $expert = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$expert) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid expert account'
        ]);
        exit;
    }

    $expert_id = $expert['expert_id'];

    // Onaylanmış bağlantıları çek
    // Parent hesabı olmayanlar için parent_id NULL olabilir - LEFT JOIN kullan
    $stmt = $pdo->prepare("
        SELECT 
            mp.mini_id,
            mp.mini_name,
            mp.age_range,
            mp.parent_id,
            mp.parent_email as mini_parent_email,
            emc.connection_id,
            emc.parent_approval_status,
            emc.requested_by,
            emc.created_at as connected_at,
            pp.full_name as parent_name,
            u.email as parent_email,
            ss.current_streak,
            ss.longest_streak
        FROM expert_mini_connections emc
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
        LEFT JOIN users u ON mp.parent_id = u.user_id
        LEFT JOIN parent_profiles pp ON mp.parent_id = pp.user_id
        LEFT JOIN streak_summary ss ON mp.mini_id = ss.mini_id
        WHERE emc.expert_id = ? AND emc.parent_approval_status = 'approved'
        ORDER BY mp.mini_name ASC
    ");
    $stmt->execute([$expert_id]);
    $approvedMinis = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Her mini için rewards bilgisi ekle ve parent bilgisini düzelt
    foreach ($approvedMinis as &$mini) {
        // Parent name - hesap varsa oradan, yoksa email'den
        if (empty($mini['parent_name'])) {
            $mini['parent_name'] = $mini['parent_email'] ?: $mini['mini_parent_email'] ?: 'N/A';
        }
        
        // Rewards
        $stmt = $pdo->prepare("
            SELECT 
                COALESCE(SUM(CASE WHEN reward_type = 'brick' THEN amount ELSE 0 END), 0) as bricks,
                COALESCE(SUM(CASE WHEN reward_type = 'medal' THEN amount ELSE 0 END), 0) as medals,
                COALESCE(SUM(CASE WHEN reward_type = 'cup' THEN amount ELSE 0 END), 0) as cups
            FROM mini_rewards_log
            WHERE mini_id = ?
        ");
        $stmt->execute([$mini['mini_id']]);
        $rewards = $stmt->fetch(PDO::FETCH_ASSOC);
        $mini['rewards'] = $rewards;
        
        // Gereksiz alanları temizle
        unset($mini['mini_parent_email']);
    }

    // Bekleyen bağlantı isteklerini çek (Parent gönderdi, Expert onaylayacak)
    $stmt = $pdo->prepare("
        SELECT 
            mp.mini_id,
            mp.mini_name,
            mp.age_range,
            mp.parent_id,
            mp.parent_email as mini_parent_email,
            emc.connection_id,
            emc.parent_approval_status,
            emc.requested_by,
            emc.created_at as requested_at,
            pp.full_name as parent_name,
            u.email as parent_email
        FROM expert_mini_connections emc
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
        LEFT JOIN users u ON mp.parent_id = u.user_id
        LEFT JOIN parent_profiles pp ON mp.parent_id = pp.user_id
        WHERE emc.expert_id = ? 
          AND emc.parent_approval_status = 'pending'
          AND emc.requested_by = 'parent'
        ORDER BY emc.created_at DESC
    ");
    $stmt->execute([$expert_id]);
    $pendingConnections = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parent name düzelt
    foreach ($pendingConnections as &$conn) {
        if (empty($conn['parent_name'])) {
            $conn['parent_name'] = $conn['parent_email'] ?: $conn['mini_parent_email'] ?: 'N/A';
        }
        unset($conn['mini_parent_email']);
    }

    // Expert'in gönderdiği bekleyen istekler (bilgi amaçlı)
    $stmt = $pdo->prepare("
        SELECT 
            mp.mini_id,
            mp.mini_name,
            mp.age_range,
            mp.parent_id,
            mp.parent_email as mini_parent_email,
            emc.connection_id,
            emc.parent_approval_status,
            emc.requested_by,
            emc.created_at as requested_at,
            pp.full_name as parent_name,
            u.email as parent_email
        FROM expert_mini_connections emc
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
        LEFT JOIN users u ON mp.parent_id = u.user_id
        LEFT JOIN parent_profiles pp ON mp.parent_id = pp.user_id
        WHERE emc.expert_id = ? 
          AND emc.parent_approval_status = 'pending'
          AND emc.requested_by = 'expert'
        ORDER BY emc.created_at DESC
    ");
    $stmt->execute([$expert_id]);
    $sentRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parent name düzelt
    foreach ($sentRequests as &$req) {
        if (empty($req['parent_name'])) {
            $req['parent_name'] = $req['parent_email'] ?: $req['mini_parent_email'] ?: 'N/A';
        }
        unset($req['mini_parent_email']);
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'minis' => $approvedMinis,
            'pending_connections' => $pendingConnections,
            'sent_requests' => $sentRequests,
            'total_minis' => count($approvedMinis),
            'total_pending' => count($pendingConnections),
            'total_sent' => count($sentRequests)
        ]
    ]);

} catch (Throwable $e) {
    error_log('GET EXPERT MINIS ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}