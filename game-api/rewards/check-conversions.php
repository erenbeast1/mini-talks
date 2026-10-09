<?php
/**
 * Check and Apply Reward Conversions
 * Brick -> Medal ve Medal -> Cup donusumlerini kontrol eder ve NET degerleri hesaplar
 * 
 * Mantik:
 * - 79 brick, 10:1 rate = 7 medal + 9 brick kalir (70 brick harcanir)
 * - Net Brick = Total Brick - (Conversion Medal x brick_to_medal rate)
 * - Net Medal = Total Medal - (Conversion Cup x medal_to_cup rate)
 * 
 * GET: /rewards/check-conversions.php?mini_id=X
 * POST: /rewards/check-conversions.php (body: { mini_id })
 */

/**
 * Conversion islemini yapan ana fonksiyon
 * @param PDO $pdo Database connection
 * @param int $mini_id Mini ID
 * @param bool $recalculate Rate degisti mi? (true ise eski conversion'lari sil ve yeniden hesapla)
 * @return array Conversion sonuclari
 */
function checkAndApplyConversions($pdo, $mini_id, $recalculate = false) {
    $conversions = [];
    
    // 1. Reward settings'i al
    $stmt = $pdo->prepare("SELECT brick_to_medal, medal_to_cup FROM reward_settings WHERE mini_id = ?");
    $stmt->execute([$mini_id]);
    $settings = $stmt->fetch(PDO::FETCH_ASSOC);
    
    // Default degerler
    $brickToMedal = $settings ? intval($settings['brick_to_medal']) : 10;
    $medalToCup = $settings ? intval($settings['medal_to_cup']) : 10;
    
    // 2. Recalculate modunda eski conversion'lari sil
    if ($recalculate) {
        $pdo->prepare("DELETE FROM mini_rewards WHERE mini_id = ? AND reward_type IN ('conversion_medal', 'conversion_cup')")->execute([$mini_id]);
    }
    
    // 3. Toplam KAZANILAN brick sayisi (conversion olmayan tum brick'ler)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM mini_rewards 
        WHERE mini_id = ? AND reward_category = 'brick'
    ");
    $stmt->execute([$mini_id]);
    $totalEarnedBricks = intval($stmt->fetch(PDO::FETCH_ASSOC)['total']);
    
    // 4. Mevcut conversion medal sayisi
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM mini_rewards 
        WHERE mini_id = ? AND reward_type = 'conversion_medal'
    ");
    $stmt->execute([$mini_id]);
    $existingConversionMedals = intval($stmt->fetch(PDO::FETCH_ASSOC)['count']);
    
    // 5. Olmasi gereken conversion medal sayisi
    $shouldHaveConversionMedals = floor($totalEarnedBricks / $brickToMedal);
    $newMedals = $shouldHaveConversionMedals - $existingConversionMedals;
    
    // 6. Yeni medal'lar olustur
    if ($newMedals > 0) {
        $stmt = $pdo->prepare("
            INSERT INTO mini_rewards (mini_id, reward_type, reward_category, earned_at, notes)
            VALUES (?, 'conversion_medal', 'medal', NOW(), ?)
        ");
        
        for ($i = 0; $i < $newMedals; $i++) {
            $stmt->execute([$mini_id, "Converted from {$brickToMedal} bricks"]);
        }
        
        $conversions[] = [
            'type' => 'brick_to_medal',
            'count' => $newMedals,
            'rate' => $brickToMedal
        ];
    }
    
    // 7. Toplam KAZANILAN medal sayisi (tum medal'lar - conversion dahil)
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as total 
        FROM mini_rewards 
        WHERE mini_id = ? AND reward_category = 'medal'
    ");
    $stmt->execute([$mini_id]);
    $totalEarnedMedals = intval($stmt->fetch(PDO::FETCH_ASSOC)['total']);
    
    // 8. Mevcut conversion cup sayisi
    $stmt = $pdo->prepare("
        SELECT COUNT(*) as count 
        FROM mini_rewards 
        WHERE mini_id = ? AND reward_type = 'conversion_cup'
    ");
    $stmt->execute([$mini_id]);
    $existingConversionCups = intval($stmt->fetch(PDO::FETCH_ASSOC)['count']);
    
    // 9. Olmasi gereken conversion cup sayisi
    $shouldHaveConversionCups = floor($totalEarnedMedals / $medalToCup);
    $newCups = $shouldHaveConversionCups - $existingConversionCups;
    
    // 10. Yeni cup'lar olustur
    if ($newCups > 0) {
        $stmt = $pdo->prepare("
            INSERT INTO mini_rewards (mini_id, reward_type, reward_category, earned_at, notes)
            VALUES (?, 'conversion_cup', 'cup', NOW(), ?)
        ");
        
        for ($i = 0; $i < $newCups; $i++) {
            $stmt->execute([$mini_id, "Converted from {$medalToCup} medals"]);
        }
        
        $conversions[] = [
            'type' => 'medal_to_cup',
            'count' => $newCups,
            'rate' => $medalToCup
        ];
    }
    
    // 11. Guncel conversion sayilarini al (yeni eklenenler dahil)
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM mini_rewards WHERE mini_id = ? AND reward_type = 'conversion_medal'");
    $stmt->execute([$mini_id]);
    $totalConversionMedals = intval($stmt->fetch(PDO::FETCH_ASSOC)['count']);
    
    $stmt = $pdo->prepare("SELECT COUNT(*) as count FROM mini_rewards WHERE mini_id = ? AND reward_type = 'conversion_cup'");
    $stmt->execute([$mini_id]);
    $totalConversionCups = intval($stmt->fetch(PDO::FETCH_ASSOC)['count']);
    
    // 12. NET degerleri hesapla (GOSTERILECEK DEGERLER)
    // Net Brick = Toplam Kazanilan Brick - (Conversion Medal x Rate)
    // Net Medal = Toplam Kazanilan Medal - (Conversion Cup x Rate)
    $netBricks = $totalEarnedBricks - ($totalConversionMedals * $brickToMedal);
    $netMedals = $totalEarnedMedals - ($totalConversionCups * $medalToCup);
    
    // Toplam cup'lar (conversion_cup'lar + direkt kazanilan cup'lar)
    $stmt = $pdo->prepare("SELECT COUNT(*) as total FROM mini_rewards WHERE mini_id = ? AND reward_category = 'cup'");
    $stmt->execute([$mini_id]);
    $totalCups = intval($stmt->fetch(PDO::FETCH_ASSOC)['total']);
    
    // 13. mini_profiles tablosunu NET degerlerle guncelle
    $stmt = $pdo->prepare("
        UPDATE mini_profiles 
        SET total_bricks = ?, total_medals = ?, total_cups = ?, updated_at = NOW()
        WHERE mini_id = ?
    ");
    $stmt->execute([$netBricks, $netMedals, $totalCups, $mini_id]);
    
    return [
        'conversions' => $conversions,
        'totals' => [
            'bricks' => $netBricks,      // Kalan brick (harcanmamis)
            'medals' => $netMedals,      // Kalan medal (harcanmamis)
            'cups' => $totalCups         // Toplam cup
        ],
        'earned' => [
            'bricks' => $totalEarnedBricks,   // Toplam kazanilan brick
            'medals' => $totalEarnedMedals,   // Toplam kazanilan medal
            'cups' => $totalCups
        ],
        'settings' => [
            'brick_to_medal' => $brickToMedal,
            'medal_to_cup' => $medalToCup
        ]
    ];
}

// API olarak cagrildiginda
if (basename(__FILE__) === basename($_SERVER['SCRIPT_FILENAME'])) {
    header('Content-Type: application/json');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    
    if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
        exit(0);
    }
    
    require_once '../config/db.php';
    
    try {
        // GET veya POST'tan mini_id al
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $mini_id = isset($_GET['mini_id']) ? intval($_GET['mini_id']) : 0;
            $recalculate = isset($_GET['recalculate']) && $_GET['recalculate'] === '1';
        } else {
            $input = json_decode(file_get_contents('php://input'), true);
            $mini_id = isset($input['mini_id']) ? intval($input['mini_id']) : 0;
            $recalculate = isset($input['recalculate']) && $input['recalculate'];
        }
        
        if (!$mini_id) {
            throw new Exception('mini_id is required');
        }
        
        $result = checkAndApplyConversions($pdo, $mini_id, $recalculate);
        
        echo json_encode([
            'success' => true,
            'message' => 'Conversion check completed',
            'data' => $result
        ]);
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
}
?>