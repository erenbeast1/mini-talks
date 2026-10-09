<?php
// get-viewer-role.php
// Mini ID ve User ID'ye göre viewerRole döndürür

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once '../config/db.php';

try {
    $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;

    if (!$mini_id || !$user_id) {
        echo json_encode([
            'success' => false,
            'error' => 'mini_id and user_id required',
            'viewer_role' => 'parent' // Default
        ]);
        exit;
    }

    // Mini bilgisini al
    $stmt = $pdo->prepare("
        SELECT mini_id, user_id, parent_id 
        FROM mini_profiles 
        WHERE mini_id = ?
    ");
    $stmt->execute([$mini_id]);
    $mini = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$mini) {
        echo json_encode([
            'success' => false,
            'error' => 'Mini not found',
            'viewer_role' => 'parent'
        ]);
        exit;
    }

    // 1. Mini kendi hesabıyla mı giriş yapmış?
    if ($mini['user_id'] && $mini['user_id'] == $user_id) {
        echo json_encode([
            'success' => true,
            'viewer_role' => 'child',
            'reason' => 'User is the mini owner'
        ]);
        exit;
    }

    // 2. Parent mi?
    if ($mini['parent_id'] && $mini['parent_id'] == $user_id) {
        echo json_encode([
            'success' => true,
            'viewer_role' => 'parent',
            'reason' => 'User is the parent'
        ]);
        exit;
    }

    // 3. Expert bağlantısı var mı?
    $stmt = $pdo->prepare("
        SELECT e.expert_id 
        FROM expert_mini_connections emc
        JOIN expert_profiles e ON emc.expert_id = e.expert_id
        WHERE emc.mini_id = ? AND e.user_id = ? AND emc.parent_approval_status = 'approved'
    ");
    $stmt->execute([$mini_id, $user_id]);
    $expertConnection = $stmt->fetch();

    if ($expertConnection) {
        echo json_encode([
            'success' => true,
            'viewer_role' => 'expert',
            'reason' => 'User is an approved expert'
        ]);
        exit;
    }

    // Default: unknown/guest
    echo json_encode([
        'success' => true,
        'viewer_role' => 'guest',
        'reason' => 'No relationship found'
    ]);

} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'viewer_role' => 'parent'
    ]);
}
