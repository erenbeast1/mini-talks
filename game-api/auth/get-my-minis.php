<?php
// auth/get-my-minis.php
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
    // Parent user_id al (gerçek uygulamada session/JWT'den gelecek)
    $parent_id = $_GET['parent_id'] ?? null;

    if (!$parent_id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Parent ID required'
        ]);
        exit;
    }

    // Parent kontrolü
    $stmt = $pdo->prepare("
        SELECT u.user_id, r.role_name
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id
        WHERE u.user_id = ? AND r.role_name = 'parent'
    ");
    $stmt->execute([$parent_id]);
    $parent = $stmt->fetch();

    if (!$parent) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Only parents can access this endpoint'
        ]);
        exit;
    }

    // Parent'ın email'ini al
    $stmt = $pdo->prepare("SELECT email FROM users WHERE user_id = ?");
    $stmt->execute([$parent_id]);
    $parentUser = $stmt->fetch();
    $parentEmail = $parentUser['email'];

    // 1. Parent tarafından oluşturulan Mini'ler
    $stmt = $pdo->prepare("
        SELECT 
            mp.mini_id,
            mp.mini_name,
            mp.age_range,
            mp.email,
            mp.parent_approval_status,
            mp.created_at,
            u.user_id,
            u.is_email_verified,
            'parent_created' as creation_type
        FROM mini_profiles mp
        LEFT JOIN users u ON mp.user_id = u.user_id
        WHERE mp.parent_id = ?
        ORDER BY mp.created_at DESC
    ");
    $stmt->execute([$parent_id]);
    $parentCreatedMinis = $stmt->fetchAll();

    // 2. Child'ın kendi oluşturduğu ama parent email'i bu parent'ın email'i olan Mini'ler
    $stmt = $pdo->prepare("
        SELECT 
            mp.mini_id,
            mp.mini_name,
            mp.age_range,
            mp.email,
            mp.parent_email,
            mp.parent_approval_status,
            mp.created_at,
            u.user_id,
            u.email as user_email,
            u.is_email_verified,
            'self_created' as creation_type
        FROM mini_profiles mp
        JOIN users u ON mp.user_id = u.user_id
        WHERE mp.parent_email = ? AND mp.parent_id IS NULL
        ORDER BY mp.created_at DESC
    ");
    $stmt->execute([$parentEmail]);
    $selfCreatedMinis = $stmt->fetchAll();

    // Birleştir
    $allMinis = array_merge($parentCreatedMinis, $selfCreatedMinis);

    // Pending approval olanları ayır
    $pendingMinis = array_filter($allMinis, function($mini) {
        return $mini['parent_approval_status'] === 'pending';
    });

    $approvedMinis = array_filter($allMinis, function($mini) {
        return $mini['parent_approval_status'] === 'approved';
    });

    $rejectedMinis = array_filter($allMinis, function($mini) {
        return $mini['parent_approval_status'] === 'rejected';
    });

    http_response_code(200);
    echo json_encode([
        'success' => true,
        'data' => [
            'all_minis' => array_values($allMinis),
            'pending' => array_values($pendingMinis),
            'approved' => array_values($approvedMinis),
            'rejected' => array_values($rejectedMinis),
            'counts' => [
                'total' => count($allMinis),
                'pending' => count($pendingMinis),
                'approved' => count($approvedMinis),
                'rejected' => count($rejectedMinis)
            ]
        ]
    ]);

} catch (Throwable $e) {
    error_log('GET MY MINIS ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
