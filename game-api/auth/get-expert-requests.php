<?php
// auth/get-expert-requests.php
// Parent'ın mini'lerine gelen expert isteklerini listeler
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
    $parent_id = $_GET['parent_id'] ?? null;

    if (!$parent_id) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'message' => 'Parent ID is required'
        ]);
        exit;
    }

    // Parent kontrolü
    $stmt = $pdo->prepare("
        SELECT u.user_id
        FROM users u
        JOIN user_roles r ON u.role_id = r.role_id
        WHERE u.user_id = ? AND r.role_name = 'parent'
    ");
    $stmt->execute([$parent_id]);
    
    if (!$stmt->fetch()) {
        http_response_code(403);
        echo json_encode([
            'success' => false,
            'message' => 'Invalid parent account'
        ]);
        exit;
    }

    // Bekleyen istekler - SADECE requested_by = 'expert' olanları göster
    // (Expert gönderdi, Parent onaylayacak)
    $stmt = $pdo->prepare("
        SELECT 
            emc.connection_id,
            emc.expert_id,
            emc.mini_id,
            emc.parent_approval_status,
            emc.requested_by,
            emc.created_at,
            ep.full_name as expert_name,
            ep.organization as expert_organization,
            ep.profession as expert_profession,
            u.email as expert_email,
            u.user_id as expert_user_id,   -- the id an expert's avatar is keyed by

            mp.mini_name,
            mp.age_range
        FROM expert_mini_connections emc
        JOIN expert_profiles ep ON emc.expert_id = ep.expert_id
        JOIN users u ON ep.user_id = u.user_id
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
        WHERE mp.parent_id = ?
          AND emc.parent_approval_status = 'pending'
          AND emc.requested_by = 'expert'
        ORDER BY emc.created_at DESC
    ");
    $stmt->execute([$parent_id]);
    $pending = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Onaylanmış bağlantılar
    $stmt = $pdo->prepare("
        SELECT 
            emc.connection_id,
            emc.expert_id,
            emc.mini_id,
            emc.parent_approval_status,
            emc.requested_by,
            emc.created_at,
            emc.parent_approval_date,
            ep.full_name as expert_name,
            ep.organization as expert_organization,
            ep.profession as expert_profession,
            u.email as expert_email,
            u.user_id as expert_user_id,   -- the id an expert's avatar is keyed by

            mp.mini_name,
            mp.age_range
        FROM expert_mini_connections emc
        JOIN expert_profiles ep ON emc.expert_id = ep.expert_id
        JOIN users u ON ep.user_id = u.user_id
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
        WHERE mp.parent_id = ?
          AND emc.parent_approval_status = 'approved'
        ORDER BY emc.parent_approval_date DESC
    ");
    $stmt->execute([$parent_id]);
    $approved = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Parent'ın gönderdiği ve bekleyen istekler (bilgi amaçlı)
    $stmt = $pdo->prepare("
        SELECT 
            emc.connection_id,
            emc.expert_id,
            emc.mini_id,
            emc.parent_approval_status,
            emc.requested_by,
            emc.created_at,
            ep.full_name as expert_name,
            ep.organization as expert_organization,
            ep.profession as expert_profession,
            u.email as expert_email,
            u.user_id as expert_user_id,   -- the id an expert's avatar is keyed by

            mp.mini_name,
            mp.age_range
        FROM expert_mini_connections emc
        JOIN expert_profiles ep ON emc.expert_id = ep.expert_id
        JOIN users u ON ep.user_id = u.user_id
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
        WHERE mp.parent_id = ?
          AND emc.parent_approval_status = 'pending'
          AND emc.requested_by = 'parent'
        ORDER BY emc.created_at DESC
    ");
    $stmt->execute([$parent_id]);
    $sentRequests = $stmt->fetchAll(PDO::FETCH_ASSOC);

    echo json_encode([
        'success' => true,
        'data' => [
            'pending' => $pending,              // Expert'in gönderdiği, Parent onaylayacak
            'approved' => $approved,            // Onaylanmış bağlantılar
            'sent_requests' => $sentRequests,   // Parent'ın gönderdiği, Expert onaylayacak
            'total_pending' => count($pending),
            'total_approved' => count($approved),
            'total_sent' => count($sentRequests)
        ]
    ]);

} catch (Throwable $e) {
    error_log('GET EXPERT REQUESTS ERROR: ' . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => 'Server error'
    ]);
}
