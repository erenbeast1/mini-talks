<?php
// /minitalks-api/profile/me.php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

require_once '../config/db.php';

// Varsayılan profil
$defaultProfile = [
    'user_id' => 1,
    'email' => 'parent@example.com',
    'name' => 'Parent',
    'role' => 'parent',
    'minis' => [
        [
            'mini_id' => 4,
            'mini_name' => 'Demo Mini',
            'avatar_url' => null
        ]
    ]
];

try {
    // Token veya session'dan user bilgisi al
    $authHeader = isset($_SERVER['HTTP_AUTHORIZATION']) ? $_SERVER['HTTP_AUTHORIZATION'] : '';
    $token = str_replace('Bearer ', '', $authHeader);
    
    // Eğer token yoksa veya geçersizse varsayılan profil döndür
    if (empty($token)) {
        echo json_encode([
            'success' => true,
            'data' => $defaultProfile
        ]);
        exit;
    }
    
    $profile = $defaultProfile;
    
    try {
        // Token'dan user_id al
        $stmt = $pdo->prepare("SELECT user_id FROM user_sessions WHERE token = ? AND expires_at > NOW()");
        $stmt->execute([$token]);
        $session = $stmt->fetch();
        
        if ($session) {
            $userId = $session['user_id'];
            
            // User bilgilerini al
            $userStmt = $pdo->prepare("SELECT id as user_id, email, name, role FROM users WHERE id = ?");
            $userStmt->execute([$userId]);
            $user = $userStmt->fetch();
            
            if ($user) {
                $profile = $user;
                
                // Eğer parent ise, mini'lerini al
                if ($user['role'] === 'parent') {
                    $miniStmt = $pdo->prepare("SELECT mini_id, mini_name, avatar_url FROM minis WHERE parent_id = ?");
                    $miniStmt->execute([$userId]);
                    $profile['minis'] = $miniStmt->fetchAll();
                }
            }
        }
    } catch (Exception $e) {
        // Tablo yoksa varsayılanları kullan
    }
    
    echo json_encode([
        'success' => true,
        'data' => $defaultProfile
    ]);
    
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
