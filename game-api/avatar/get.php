<?php
// /minitalks-api/avatar/get.php
// Dashboard 3D LEGO avatar bilgisini getirir.
// GET: ?user_id=...&role=parent|expert|builder|mini
// Dönüş: { success, data: { avatar_url, config, version } } veya boş (kayıt yoksa).

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

function avatarRoleColumn($role) {
    switch ($role) {
        case 'parent':  return 'parent_id';
        case 'expert':  return 'expert_id';
        case 'builder': return 'builder_id';
        case 'mini':
        case 'child':   return 'mini_id';
        default:        return null;
    }
}

try {
    $user_id = isset($_GET['user_id']) ? intval($_GET['user_id']) : 0;
    $role    = isset($_GET['role']) ? strtolower(trim($_GET['role'])) : '';

    if ($user_id === 0) {
        throw new Exception('user_id is required');
    }

    $roleCol = avatarRoleColumn($role);
    if ($roleCol === null) {
        throw new Exception('Invalid role');
    }

    // Sistem genelinde *_id kolonları doğrudan user_id tutuyor (FK kaldırıldı).
    $stmt = $pdo->prepare("
        SELECT avatar_id, avatar_data, avatar_url, version
        FROM avatars
        WHERE {$roleCol} = ? AND (is_active = 1 OR is_active IS NULL)
        ORDER BY avatar_id DESC
        LIMIT 1
    ");
    $stmt->execute([$user_id]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$row) {
        // Kayıt yok - boş ama başarılı dön (editör default'la açılır)
        echo json_encode([
            'success' => true,
            'data' => [
                'avatar_url' => null,
                'config'     => null,
                'version'    => 0
            ]
        ]);
        exit(0);
    }

    $config = null;
    if (!empty($row['avatar_data'])) {
        $decoded = json_decode($row['avatar_data'], true);
        if (is_array($decoded)) {
            $config = $decoded;
        }
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'avatar_id'  => (int)$row['avatar_id'],
            'avatar_url' => $row['avatar_url'],
            'config'     => $config,
            'version'    => (int)$row['version']
        ]
    ]);

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>