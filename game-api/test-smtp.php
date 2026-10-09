<?php
// SMTP Test Script
// mini-talks.org/minitalks-api/test-smtp.php

error_reporting(E_ALL);
ini_set('display_errors', 1);

echo "<h2>SMTP Test</h2>";
echo "<pre>";

// EmailHandler yükle
require_once 'utils/EmailHandler.php';

echo "1. EmailHandler sınıfı yüklendi ✓\n\n";

// Instance oluştur
try {
    $handler = new EmailHandler();
    echo "2. EmailHandler instance oluşturuldu ✓\n\n";
} catch (Exception $e) {
    echo "❌ HATA: " . $e->getMessage() . "\n";
    exit;
}

// Test email gönder
echo "3. Test email gönderiliyor...\n";
echo "   To: orangeman160@gmail.com\n";
echo "   From: noreply@mini-talks.org\n\n";

try {
    $result = $handler->sendVerificationEmail(
        'orangeman160@gmail.com',
        'test-token-123456',
        'Test User'
    );
    
    if ($result) {
        echo "✅ SUCCESS!\n";
        echo "Email başarıyla gönderildi.\n";
        echo "Inbox'ınızı kontrol edin (spam dahil).\n";
    } else {
        echo "❌ FAILED!\n";
        echo "Email gönderilemedi.\n";
        echo "\nError log'a bakın:\n";
        echo "tail -50 /var/www/vhosts/mini-talks.org/logs/error_log\n";
    }
} catch (Exception $e) {
    echo "❌ EXCEPTION: " . $e->getMessage() . "\n";
    echo "Trace: " . $e->getTraceAsString() . "\n";
}

echo "</pre>";
?>