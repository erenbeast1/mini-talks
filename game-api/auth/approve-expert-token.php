<?php
// auth/approve-expert-token.php
// Parent hesabı olmayan kullanıcılar için email'den onaylama
// GET parametreleri: token, action (approve/reject)
header('Content-Type: text/html; charset=utf-8');

require_once __DIR__ . '/../config/db.php';

$token = $_GET['token'] ?? null;
$action = $_GET['action'] ?? null;

// HTML template fonksiyonu
function renderPage($title, $message, $success = true) {
    $bgColor = $success ? '#00852B' : '#C91A09';
    $icon = $success ? '✓' : '✕';
    
    return "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>$title - Mini-Talks</title>
        <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
                font-family: Arial, sans-serif; 
                background: #f5f5f5; 
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                padding: 20px;
            }
            .container {
                max-width: 500px;
                width: 100%;
                background: white;
                border-radius: 24px;
                overflow: hidden;
                box-shadow: 0 10px 40px rgba(0,0,0,0.15);
            }
            .header {
                background: $bgColor;
                color: white;
                padding: 40px;
                text-align: center;
            }
            .icon {
                font-size: 60px;
                margin-bottom: 15px;
            }
            .header h1 {
                font-size: 28px;
                font-weight: 900;
            }
            .content {
                padding: 40px;
                text-align: center;
            }
            .content p {
                font-size: 16px;
                line-height: 1.8;
                color: #333;
                margin-bottom: 20px;
            }
            .button {
                display: inline-block;
                padding: 16px 40px;
                background: #0055BF;
                color: white;
                text-decoration: none;
                border-radius: 12px;
                font-weight: bold;
                font-size: 16px;
                margin-top: 20px;
            }
            .button:hover {
                background: #004494;
            }
            .footer {
                text-align: center;
                padding: 20px;
                font-size: 12px;
                color: #666;
                background: #f9f9f9;
            }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <div class='icon'>$icon</div>
                <h1>$title</h1>
            </div>
            <div class='content'>
                <p>$message</p>
                <a href='https://mini-talks.org' class='button'>Go to Mini-Talks</a>
            </div>
            <div class='footer'>
                <p>LEGO® is a trademark of the LEGO Group which does not sponsor, authorize or endorse this site.</p>
                <p>© 2025 Mini-Talks. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>";
}

// Validation
if (!$token) {
    echo renderPage('Invalid Link', 'The approval link is invalid or missing. Please check your email and try again.', false);
    exit;
}

if (!in_array($action, ['approve', 'reject'])) {
    echo renderPage('Invalid Action', 'The action is invalid. Please use the approve or reject buttons in your email.', false);
    exit;
}

try {
    // Token'ı bul
    $stmt = $pdo->prepare("
        SELECT 
            emc.connection_id,
            emc.expert_id,
            emc.mini_id,
            emc.parent_approval_status,
            emc.approval_token_expires,
            ep.full_name as expert_name,
            ep.organization as expert_organization,
            mp.mini_name,
            mp.parent_email
        FROM expert_mini_connections emc
        JOIN expert_profiles ep ON emc.expert_id = ep.expert_id
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
        WHERE emc.approval_token = ?
    ");
    $stmt->execute([$token]);
    $connection = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$connection) {
        echo renderPage('Link Not Found', 'This approval link was not found. It may have already been used or expired.', false);
        exit;
    }

    // Token süresi dolmuş mu?
    if ($connection['approval_token_expires'] && strtotime($connection['approval_token_expires']) < time()) {
        echo renderPage('Link Expired', 'This approval link has expired. Please ask the expert to send a new connection request.', false);
        exit;
    }

    // Zaten işlenmiş mi?
    if ($connection['parent_approval_status'] !== 'pending') {
        $statusText = $connection['parent_approval_status'] === 'approved' ? 'approved' : 'rejected';
        echo renderPage('Already Processed', "This connection request has already been $statusText.", false);
        exit;
    }

    // Aynı parent_email ile tüm pending istekleri bul (aynı expert'ten)
    $stmt = $pdo->prepare("
        SELECT emc.connection_id, mp.mini_name
        FROM expert_mini_connections emc
        JOIN mini_profiles mp ON emc.mini_id = mp.mini_id
        WHERE emc.expert_id = ?
          AND mp.parent_email = ?
          AND emc.parent_approval_status = 'pending'
          AND emc.approval_token IS NOT NULL
    ");
    $stmt->execute([$connection['expert_id'], $connection['parent_email']]);
    $relatedConnections = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // Status'u güncelle
    $newStatus = ($action === 'approve') ? 'approved' : 'rejected';
    
    // Tüm ilgili bağlantıları güncelle
    $updatedMinis = [];
    foreach ($relatedConnections as $rel) {
        $stmt = $pdo->prepare("
            UPDATE expert_mini_connections 
            SET 
                parent_approval_status = ?,
                parent_approval_date = NOW(),
                approval_token = NULL,
                approval_token_expires = NULL
            WHERE connection_id = ?
        ");
        $stmt->execute([$newStatus, $rel['connection_id']]);
        $updatedMinis[] = $rel['mini_name'];
    }

    $miniList = implode(', ', $updatedMinis);

    if ($action === 'approve') {
        $message = "<strong>{$connection['expert_name']}</strong>";
        if ($connection['expert_organization']) {
            $message .= " from <strong>{$connection['expert_organization']}</strong>";
        }
        $message .= " has been approved to view progress for: <strong>$miniList</strong>.<br><br>";
        $message .= "The expert can now see your child's activities, recordings, and achievements.";
        
        echo renderPage('Expert Approved!', $message, true);
    } else {
        $message = "The connection request from <strong>{$connection['expert_name']}</strong> has been rejected.<br><br>";
        $message .= "The expert will not have access to your child's Mini-Talks data.";
        
        echo renderPage('Request Rejected', $message, false);
    }

} catch (Throwable $e) {
    error_log('APPROVE EXPERT TOKEN ERROR: ' . $e->getMessage());
    echo renderPage('Error', 'An error occurred while processing your request. Please try again later.', false);
}
