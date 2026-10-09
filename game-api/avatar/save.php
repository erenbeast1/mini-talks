<?php
// /minitalks-api/avatar/save.php
// Dashboard 3D LEGO avatar kaydı.
// POST JSON: { user_id, role, config (object), image (data:image/png;base64,...) }
// role: 'parent' | 'expert' | 'builder' | 'mini' (veya 'child' -> mini)
//
// avatars tablosuna upsert eder; PNG'yi uploads/avatars/ altına yazar.
// WordPress nonce YOK; kimlik user_id + role ile (sistemler henüz bağlı değil).

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

date_default_timezone_set('Europe/Istanbul');
require_once '../config/db.php';

/**
 * role -> avatars tablosundaki ilgili id kolonu
 */
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
    $input = json_decode(file_get_contents('php://input'), true);
    if (!is_array($input)) {
        throw new Exception('Invalid JSON body');
    }

    $user_id = isset($input['user_id']) ? intval($input['user_id']) : 0;
    $role    = isset($input['role']) ? strtolower(trim($input['role'])) : '';
    $config  = isset($input['config']) ? $input['config'] : null;
    $image   = isset($input['image']) ? $input['image'] : '';

    if ($user_id === 0) {
        throw new Exception('user_id is required');
    }

    $roleCol = avatarRoleColumn($role);
    if ($roleCol === null) {
        throw new Exception('Invalid role');
    }
    // child -> mini normalize (DB'de mini_id kullanılıyor)
    if ($role === 'child') $role = 'mini';

    // NOT: Tüm builder/parent/expert/mini sistemi *_id kolonlarında doğrudan
    // users.user_id değerini kullanıyor. avatars FK'ları kaldırıldığı için
    // burada da doğrudan user_id yazıyoruz (resolveProfileId YOK).
    $profileId = $user_id;

    // ── Config (zorunlu, geçerli JSON) ──
    if (!is_array($config)) {
        // string olarak gelmiş olabilir
        if (is_string($config)) {
            $decoded = json_decode($config, true);
            if (is_array($decoded)) {
                $config = $decoded;
            }
        }
    }
    if (!is_array($config)) {
        throw new Exception('Missing or invalid config');
    }
    $configJson = json_encode($config);

    // ── Image (zorunlu, data:image/png;base64,) ──
    if (!$image || strpos($image, 'data:image/png;base64,') !== 0) {
        throw new Exception('Invalid image (expected data:image/png;base64,)');
    }
    $img_b64 = substr($image, strlen('data:image/png;base64,'));
    $img_bin = base64_decode($img_b64, true);
    if ($img_bin === false || strlen($img_bin) < 100) {
        throw new Exception('Image decode failed');
    }
    // Hard cap: 2MB
    if (strlen($img_bin) > 2 * 1024 * 1024) {
        throw new Exception('Image too large (max 2MB)');
    }

    // ── Mevcut avatar kaydı var mı? (rol + user_id) ──
    $existingStmt = $pdo->prepare("
        SELECT avatar_id, version
        FROM avatars
        WHERE {$roleCol} = ?
        ORDER BY avatar_id DESC
        LIMIT 1
    ");
    $existingStmt->execute([$profileId]);
    $existing = $existingStmt->fetch(PDO::FETCH_ASSOC);

    $version = $existing ? ((int)$existing['version'] + 1) : 1;

    // ── PNG dosyasını yaz ──
    $upload_dir = __DIR__ . '/../uploads/avatars/';
    if (!file_exists($upload_dir)) {
        mkdir($upload_dir, 0755, true);
    }
    $filename = sprintf('%s_%d_v%d_%s.png', $role, $profileId, $version, substr(md5(uniqid('', true)), 0, 8));
    $filepath = $upload_dir . $filename;
    $fileurl  = 'https://mini-talks.org/minitalks-api/uploads/avatars/' . $filename;

    if (file_put_contents($filepath, $img_bin) === false) {
        throw new Exception('File write failed');
    }

    // ── Eski PNG'leri temizle (sadece son 2 versiyonu tut) ──
    $oldFiles = glob($upload_dir . sprintf('%s_%d_v*.png', $role, $profileId));
    if (is_array($oldFiles) && count($oldFiles) > 2) {
        // Yeni->eski sırala, ilk 2'yi koru
        usort($oldFiles, function ($a, $b) { return filemtime($b) - filemtime($a); });
        foreach (array_slice($oldFiles, 2) as $old) {
            @unlink($old);
        }
    }

    // ── DB upsert ──
    if ($existing) {
        $upd = $pdo->prepare("
            UPDATE avatars
            SET avatar_data = ?, avatar_url = ?, version = ?, role = ?, is_active = 1, updated_at = NOW()
            WHERE avatar_id = ?
        ");
        $upd->execute([$configJson, $fileurl, $version, $role, $existing['avatar_id']]);
        $avatarId = (int)$existing['avatar_id'];
    } else {
        $ins = $pdo->prepare("
            INSERT INTO avatars ({$roleCol}, role, avatar_data, avatar_url, version, is_active, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, 1, NOW(), NOW())
        ");
        $ins->execute([$profileId, $role, $configJson, $fileurl, $version]);
        $avatarId = (int)$pdo->lastInsertId();
    }

    echo json_encode([
        'success' => true,
        'data' => [
            'avatar_id'  => $avatarId,
            'avatar_url' => $fileurl,
            'version'    => $version,
            'config'     => $config,
            'role'       => $role
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