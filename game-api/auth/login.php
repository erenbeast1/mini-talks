<?php
// auth/login.php
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

    $emailOrUsername = trim($data['emailOrUsername'] ?? $data['email'] ?? '');
    $password = $data['password'] ?? '';

    // Validation
    if (empty($emailOrUsername) || empty($password)) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Email/username and password are required'
        ]);
        exit;
    }

    // Kullanıcıyı bul - önce email ile dene
    $stmt = $pdo->prepare("
        SELECT 
            u.user_id, 
            u.email, 
            u.password_hash, 
            u.role_id,
            u.is_active,
            u.is_email_verified,
            r.role_name
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id
        WHERE u.email = ?
        LIMIT 1
    ");
    $stmt->execute([$emailOrUsername]);
    $user = $stmt->fetch();

    // Email ile bulunamadıysa, username ile ara (profile tablolarından)
    if (!$user) {
        // Builder username kontrolü
        $stmt = $pdo->prepare("
            SELECT 
                u.user_id, 
                u.email, 
                u.password_hash, 
                u.role_id,
                u.is_active,
                u.is_email_verified,
                r.role_name
            FROM users u
            JOIN user_roles r ON u.role_id = r.role_id
            JOIN builder_profiles bp ON u.user_id = bp.user_id
            WHERE bp.username = ?
            LIMIT 1
        ");
        $stmt->execute([$emailOrUsername]);
        $user = $stmt->fetch();
    }

    // Expert username kontrolü
    if (!$user) {
        $stmt = $pdo->prepare("
            SELECT 
                u.user_id, 
                u.email, 
                u.password_hash, 
                u.role_id,
                u.is_active,
                u.is_email_verified,
                r.role_name
            FROM users u
            JOIN user_roles r ON u.role_id = r.role_id
            JOIN expert_profiles ep ON u.user_id = ep.user_id
            WHERE ep.username = ?
            LIMIT 1
        ");
        $stmt->execute([$emailOrUsername]);
        $user = $stmt->fetch();
    }

    // Mini (child) username kontrolü - mini_name ile
    if (!$user) {
        $stmt = $pdo->prepare("
            SELECT 
                u.user_id, 
                u.email, 
                u.password_hash, 
                u.role_id,
                u.is_active,
                u.is_email_verified,
                r.role_name
            FROM users u
            JOIN user_roles r ON u.role_id = r.role_id
            JOIN mini_profiles mp ON u.user_id = mp.user_id
            WHERE mp.mini_name = ?
            LIMIT 1
        ");
        $stmt->execute([$emailOrUsername]);
        $user = $stmt->fetch();
    }

    if (!$user) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email/username or password'
        ]);
        exit;
    }

    // Şifre kontrolü
    if (!password_verify($password, $user['password_hash'])) {
        http_response_code(401);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid email/username or password'
        ]);
        exit;
    }

    // Hesap aktif mi?
    if ($user['is_active'] != 1) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Your account has been deactivated. Please contact support.'
        ]);
        exit;
    }

    // Email verified mi?
    if ($user['is_email_verified'] != 1) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Please verify your email address before logging in.',
            'email_not_verified' => true
        ]);
        exit;
    }

    // Child ise parent approval kontrolü
    if ($user['role_name'] === 'child') {
        $stmt = $pdo->prepare("
            SELECT parent_approval_status 
            FROM mini_profiles 
            WHERE user_id = ?
        ");
        $stmt->execute([$user['user_id']]);
        $miniProfile = $stmt->fetch();

        if ($miniProfile && $miniProfile['parent_approval_status'] === 'pending') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Waiting for parent approval. Please ask your parent to approve your account.',
                'parent_approval_pending' => true
            ]);
            exit;
        }

        if ($miniProfile && $miniProfile['parent_approval_status'] === 'rejected') {
            http_response_code(403);
            echo json_encode([
                'success' => false,
                'message' => 'Your parent has not approved this account.',
                'parent_approval_rejected' => true
            ]);
            exit;
        }
    }

    // Profil bilgilerini al (role'e göre)
    $profile = null;
    
    if ($user['role_name'] === 'parent') {
        $stmt = $pdo->prepare("SELECT full_name FROM parent_profiles WHERE user_id = ?");
        $stmt->execute([$user['user_id']]);
        $profile = $stmt->fetch();
    } elseif ($user['role_name'] === 'builder') {
        $stmt = $pdo->prepare("SELECT full_name, username FROM builder_profiles WHERE user_id = ?");
        $stmt->execute([$user['user_id']]);
        $profile = $stmt->fetch();
        
        // =============================================
        // BUILDER: Streak + Daily Brick + Daily Mission
        // =============================================
        $builder_id = $user['user_id'];
        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        
        // 1. STREAK GÜNCELLEME
        $stmtStreak = $pdo->prepare("SELECT * FROM builder_streaks WHERE builder_id = ?");
        $stmtStreak->execute([$builder_id]);
        $streak = $stmtStreak->fetch(PDO::FETCH_ASSOC);
        
        $currentStreak = 0;
        $longestStreak = 0;
        $streakStartDate = $today;
        
        if ($streak) {
            $lastActivity = $streak['last_activity_date'];
            $currentStreak = intval($streak['current_streak']);
            $longestStreak = intval($streak['longest_streak']);
            $streakStartDate = $streak['streak_start_date'] ?: $today;
            
            if ($lastActivity === $today) {
                // Bugün zaten giriş yapmış
            } elseif ($lastActivity === $yesterday) {
                // Streak devam
                $currentStreak++;
            } else {
                // Streak kırıldı
                $currentStreak = 1;
                $streakStartDate = $today;
            }
            
            if ($currentStreak > $longestStreak) {
                $longestStreak = $currentStreak;
            }
            
            $updateStmt = $pdo->prepare("
                UPDATE builder_streaks 
                SET current_streak = ?, longest_streak = ?, last_activity_date = ?, streak_start_date = ?, updated_at = NOW()
                WHERE builder_id = ?
            ");
            $updateStmt->execute([$currentStreak, $longestStreak, $today, $streakStartDate, $builder_id]);
        } else {
            $currentStreak = 1;
            $longestStreak = 1;
            $insertStmt = $pdo->prepare("
                INSERT INTO builder_streaks (builder_id, current_streak, longest_streak, last_activity_date, streak_start_date, updated_at)
                VALUES (?, ?, ?, ?, ?, NOW())
            ");
            $insertStmt->execute([$builder_id, $currentStreak, $longestStreak, $today, $today]);
        }
        
        // 2. DAILY BRICK (günde 1 kez)
        $checkBrick = $pdo->prepare("
            SELECT COUNT(*) FROM builder_rewards_log 
            WHERE builder_id = ? AND reward_name = 'daily_brick' AND DATE(earned_at) = ?
        ");
        $checkBrick->execute([$builder_id, $today]);
        
        if (intval($checkBrick->fetchColumn()) === 0) {
            $pdo->prepare("
                INSERT INTO builder_rewards_log (builder_id, reward_type, reward_name, reward_amount, notes, earned_at)
                VALUES (?, 'brick', 'daily_brick', 1, 'Daily login reward', NOW())
            ")->execute([$builder_id]);
            
            $pdo->prepare("
                INSERT INTO builder_rewards (builder_id, total_bricks, total_medals, total_cups, updated_at)
                VALUES (?, 1, 0, 0, NOW())
                ON DUPLICATE KEY UPDATE total_bricks = total_bricks + 1, updated_at = NOW()
            ")->execute([$builder_id]);
        }
        
        // 3. DAILY 2 RANDOM MISSION (günde 1 kez)
        $checkMission = $pdo->prepare("
            SELECT COUNT(*) FROM builder_missions WHERE builder_id = ? AND mission_date = ?
        ");
        $checkMission->execute([$builder_id, $today]);
        
        if (intval($checkMission->fetchColumn()) === 0) {
            // Random 2 mission seç (mission_presets tablosundan)
            $presetStmt = $pdo->query("SELECT id, mission_text FROM mission_presets ORDER BY RAND() LIMIT 2");
            $randomMissions = $presetStmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($randomMissions as $mission) {
                // mission_id PRIMARY KEY + AUTO_INCREMENT olduğundan INSERT'e yazılmaz.
                // Preset id'sini PK'ya yazmak duplicate key hatasına ve mission'ın
                // hiç oluşmamasına yol açıyordu. mission_text kopyalanması yeterli.
                $insertMission = $pdo->prepare("
                    INSERT INTO builder_missions (builder_id, mission_text, mission_date, is_completed, created_at)
                    VALUES (?, ?, ?, 0, NOW())
                ");
                $insertMission->execute([$builder_id, $mission['mission_text'], $today]);
            }
        }
    } elseif ($user['role_name'] === 'child') {
        $stmt = $pdo->prepare("SELECT mini_name, age_range FROM mini_profiles WHERE user_id = ?");
        $stmt->execute([$user['user_id']]);
        $profile = $stmt->fetch();
    } elseif ($user['role_name'] === 'expert') {
        $stmt = $pdo->prepare("SELECT full_name, username, organization FROM expert_profiles WHERE user_id = ?");
        $stmt->execute([$user['user_id']]);
        $profile = $stmt->fetch();
    }

    // Session token oluştur (basit versiyon - production'da JWT kullan)
    $sessionToken = bin2hex(random_bytes(32));

    // Response
    http_response_code(200);
    echo json_encode([
        'success' => true,
        'message' => 'Login successful',
        'user' => [
            'user_id' => $user['user_id'],
            'email' => $user['email'],
            'role' => $user['role_name'],
            'profile' => $profile,
            'session_token' => $sessionToken
        ]
    ]);

} catch (Throwable $e) {
    error_log('LOGIN ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error during login. Please try again later.'
    ]);
}