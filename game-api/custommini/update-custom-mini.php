<?php
// /minitalks-api/custommini/update-custom-mini.php
// Hide/unhide, order güncelleme, silme işlemleri

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once '../config/db.php';

$input = json_decode(file_get_contents('php://input'), true);

$custom_mini_id = isset($input['custom_mini_id']) ? intval($input['custom_mini_id']) : 0;
$action = isset($input['action']) ? $input['action'] : ''; // hide, unhide, delete, update_order, bulk_update_order
$new_order = isset($input['new_order']) ? intval($input['new_order']) : null;

// Bulk update order - sürükle bırak için
if ($action === 'bulk_update_order') {
    $updates = isset($input['updates']) ? $input['updates'] : [];
    
    if (empty($updates)) {
        echo json_encode(['success' => false, 'error' => 'No updates provided']);
        exit;
    }
    
    try {
        $pdo->beginTransaction();
        
        $stmt = $pdo->prepare("UPDATE customized_minis SET display_order = ?, updated_at = NOW() WHERE id = ?");
        
        foreach ($updates as $update) {
            $id = isset($update['custom_mini_id']) ? intval($update['custom_mini_id']) : 0;
            $order = isset($update['new_order']) ? intval($update['new_order']) : 0;
            
            if ($id > 0 && $order > 0) {
                $stmt->execute([$order, $id]);
            }
        }
        
        $pdo->commit();
        
        echo json_encode([
            'success' => true,
            'action' => 'bulk_update_order',
            'message' => 'Order updated for ' . count($updates) . ' items'
        ]);
    } catch (PDOException $e) {
        $pdo->rollBack();
        echo json_encode(['success' => false, 'error' => $e->getMessage()]);
    }
    exit;
}

if (!$custom_mini_id || !$action) {
    echo json_encode(['success' => false, 'error' => 'custom_mini_id and action required']);
    exit;
}

try {
    switch ($action) {
        case 'hide':
            $stmt = $pdo->prepare("UPDATE customized_minis SET is_hidden = 1, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$custom_mini_id]);
            $message = 'Mini hidden';
            break;
            
        case 'unhide':
            $stmt = $pdo->prepare("UPDATE customized_minis SET is_hidden = 0, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$custom_mini_id]);
            $message = 'Mini unhidden';
            break;
            
        case 'delete':
            // Önce görsel dosyasını sil
            $imgStmt = $pdo->prepare("SELECT image_url, mini_id, scene_id FROM customized_minis WHERE id = ?");
            $imgStmt->execute([$custom_mini_id]);
            $miniData = $imgStmt->fetch(PDO::FETCH_ASSOC);
            
            if ($miniData && $miniData['image_url']) {
                $filepath = '..' . $miniData['image_url'];
                if (file_exists($filepath)) {
                    unlink($filepath);
                }
            }
            
            // Veritabanından sil
            $stmt = $pdo->prepare("DELETE FROM customized_minis WHERE id = ?");
            $stmt->execute([$custom_mini_id]);
            
            // minis_customized sayısını azalt
            if ($miniData) {
                $pdo->prepare("
                    UPDATE mini_scene_levels 
                    SET minis_customized = GREATEST(0, minis_customized - 1)
                    WHERE mini_id = ? AND scene_id = ?
                ")->execute([$miniData['mini_id'], $miniData['scene_id']]);
            }
            
            $message = 'Mini deleted';
            break;
            
        case 'update_order':
            if ($new_order === null) {
                echo json_encode(['success' => false, 'error' => 'new_order required for update_order action']);
                exit;
            }
            $stmt = $pdo->prepare("UPDATE customized_minis SET display_order = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$new_order, $custom_mini_id]);
            $message = 'Order updated';
            break;
            
        case 'update_levels':
            $levels_used = isset($input['levels_used']) ? $input['levels_used'] : '';
            $stmt = $pdo->prepare("UPDATE customized_minis SET levels_used = ?, updated_at = NOW() WHERE id = ?");
            $stmt->execute([$levels_used, $custom_mini_id]);
            $message = 'Levels updated';
            break;
            
        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            exit;
    }
    
    echo json_encode([
        'success' => true,
        'action' => $action,
        'message' => $message
    ]);
    
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}