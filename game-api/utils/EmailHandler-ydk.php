<?php
// utils/EmailHandler.php

class EmailHandler {
    // Gmail ayarları
    private $use_smtp = true;  // Gmail için SMTP gerekli
    private $smtp_host = 'smtp.gmail.com';
    private $smtp_port = 465;  // TLS için 587, SSL için 465
    private $smtp_username = 'noreply@mini-talks.org';  // ← Gmail adresiniz
    private $smtp_password = 'SET-IN-YOUR-OWN-CONFIG';     // ← Gmail App Password (16 haneli)
    
    private $from_email = 'noreply@mini-talks.org';  // ← Gmail adresiniz
    private $from_name = 'Mini-Talks';
    private $site_url = 'https://mini-talks.org';  // ← Kendi domain'iniz

    /**
     * Email verification email gönder
     */
    public function sendVerificationEmail($to_email, $verification_token, $user_name = '') {
        $verify_url = $this->site_url . "/verify-email?token=" . urlencode($verification_token);
        
        $subject = "Verify Your Mini-Talks Account";
        
        $message = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; }
                .header { background: #C91A09; color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 32px; font-weight: 900; }
                .content { padding: 40px 30px; }
                .button { display: inline-block; padding: 16px 40px; background: #00852B; color: white !important; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; margin: 20px 0; }
                .link-box { background: #f9f9f9; padding: 15px; border: 2px solid #ddd; border-radius: 8px; word-break: break-all; margin: 20px 0; font-size: 14px; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background: #f9f9f9; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>🎮 Mini-Talks</h1>
                </div>
                <div class='content'>
                    <h2 style='color: #000; font-size: 28px; margin-bottom: 20px;'>Welcome to Mini-Talks" . ($user_name ? ", $user_name" : "") . "!</h2>
                    <p style='font-size: 16px; line-height: 1.8;'>Thank you for creating your Mini-Talks account. We're excited to have you join our community!</p>
                    <p style='font-size: 16px; line-height: 1.8;'>To complete your registration and start your journey, please verify your email address by clicking the button below:</p>
                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='$verify_url' class='button'>Verify My Email</a>
                    </div>
                    <p style='font-size: 14px; color: #666;'>Or copy and paste this link into your browser:</p>
                    <div class='link-box'>$verify_url</div>
                    <p style='font-size: 14px; color: #999; margin-top: 30px;'><strong>This link will expire in 24 hours.</strong></p>
                    <p style='font-size: 14px; color: #999;'>If you didn't create this account, you can safely ignore this email.</p>
                </div>
                <div class='footer'>
                    <p>LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.</p>
                    <p>&copy; " . date('Y') . " Mini-Talks. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        ";

        return $this->sendEmail($to_email, $subject, $message);
    }

    /**
     * Parent approval email gönder (Child kayıt olduğunda)
     */
    public function sendParentApprovalEmail($parent_email, $child_name, $child_email) {
        $login_url = $this->site_url . "/login";
        
        $subject = "Your Child Wants to Join Mini-Talks!";
        
        $message = "
        <html>
        <head>
            <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f5f5f5; }
                .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 16px; overflow: hidden; }
                .header { background: #0055BF; color: white; padding: 30px; text-align: center; }
                .header h1 { margin: 0; font-size: 32px; font-weight: 900; }
                .content { padding: 40px 30px; }
                .info-box { background: #f0f7ff; padding: 20px; border-left: 4px solid #0055BF; margin: 20px 0; border-radius: 8px; }
                .button { display: inline-block; padding: 16px 40px; background: #00852B; color: white !important; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 18px; margin: 20px 0; }
                .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; background: #f9f9f9; }
                ol { line-height: 1.8; }
            </style>
        </head>
        <body>
            <div class='container'>
                <div class='header'>
                    <h1>👨‍👩‍👧 Parent Notification</h1>
                </div>
                <div class='content'>
                    <h2 style='color: #000; font-size: 28px; margin-bottom: 20px;'>Your child wants to join Mini-Talks!</h2>
                    <p style='font-size: 16px;'>Hello,</p>
                    <p style='font-size: 16px; line-height: 1.8;'><strong>$child_name</strong> has requested to create a Mini-Talks account and listed you as their parent/guardian.</p>
                    
                    <div class='info-box'>
                        <p style='margin: 0; font-weight: bold; font-size: 16px;'>Child's Information:</p>
                        <p style='margin: 10px 0 0 0;'><strong>Name:</strong> $child_name<br><strong>Email:</strong> $child_email</p>
                    </div>

                    <h3 style='color: #0055BF; font-size: 20px; margin-top: 30px;'>What is Mini-Talks?</h3>
                    <p style='font-size: 16px; line-height: 1.8;'>Mini-Talks is a safe, educational platform where children practice speech and communication skills through fun LEGO-themed activities.</p>

                    <h3 style='color: #0055BF; font-size: 20px; margin-top: 30px;'>To approve this account:</h3>
                    <ol style='font-size: 16px;'>
                        <li>Create a Parent account if you don't have one</li>
                        <li>Log in to your account</li>
                        <li>Approve your child's Mini account from your dashboard</li>
                    </ol>

                    <div style='text-align: center; margin: 30px 0;'>
                        <a href='$login_url' class='button'>Go to Mini-Talks</a>
                    </div>

                    <p style='color: #999; font-size: 14px; margin-top: 30px;'><em>If you didn't expect this email or don't know this child, please ignore this message.</em></p>
                </div>
                <div class='footer'>
                    <p>LEGO® is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.</p>
                    <p>&copy; " . date('Y') . " Mini-Talks. All rights reserved.</p>
                </div>
            </div>
        </body>
        </html>
        ";

        return $this->sendEmail($parent_email, $subject, $message);
    }

    /**
     * Email gönder - Gmail SMTP kullanarak
     */
    private function sendEmail($to_email, $subject, $html_message) {
        if (!$this->use_smtp) {
            // Fallback: PHP mail()
            $headers = [
                'MIME-Version: 1.0',
                'Content-type: text/html; charset=UTF-8',
                'From: ' . $this->from_name . ' <' . $this->from_email . '>',
                'Reply-To: ' . $this->from_email,
                'X-Mailer: PHP/' . phpversion()
            ];
            return mail($to_email, $subject, $html_message, implode("\r\n", $headers));
        }

        // Gmail SMTP ile gönder
        try {
            // Socket bağlantısı
            $smtp = fsockopen($this->smtp_host, $this->smtp_port, $errno, $errstr, 30);
            
            if (!$smtp) {
                error_log("SMTP connection failed: $errstr ($errno)");
                return false;
            }

            // SMTP yanıtını oku
            $response = fgets($smtp, 515);
            if (substr($response, 0, 3) != '220') {
                error_log("SMTP error: $response");
                fclose($smtp);
                return false;
            }

            // EHLO
            fputs($smtp, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
            $response = fgets($smtp, 515);

            // STARTTLS
            fputs($smtp, "STARTTLS\r\n");
            $response = fgets($smtp, 515);
            
            stream_socket_enable_crypto($smtp, true, STREAM_CRYPTO_METHOD_TLS_CLIENT);

            // EHLO tekrar (TLS sonrası)
            fputs($smtp, "EHLO " . $_SERVER['SERVER_NAME'] . "\r\n");
            $response = fgets($smtp, 515);

            // AUTH LOGIN
            fputs($smtp, "AUTH LOGIN\r\n");
            $response = fgets($smtp, 515);

            fputs($smtp, base64_encode($this->smtp_username) . "\r\n");
            $response = fgets($smtp, 515);

            fputs($smtp, base64_encode($this->smtp_password) . "\r\n");
            $response = fgets($smtp, 515);
            
            if (substr($response, 0, 3) != '235') {
                error_log("SMTP authentication failed: $response");
                fclose($smtp);
                return false;
            }

            // MAIL FROM
            fputs($smtp, "MAIL FROM: <" . $this->from_email . ">\r\n");
            $response = fgets($smtp, 515);

            // RCPT TO
            fputs($smtp, "RCPT TO: <$to_email>\r\n");
            $response = fgets($smtp, 515);

            // DATA
            fputs($smtp, "DATA\r\n");
            $response = fgets($smtp, 515);

            // Email headers ve body
            $headers = "From: " . $this->from_name . " <" . $this->from_email . ">\r\n";
            $headers .= "Reply-To: " . $this->from_email . "\r\n";
            $headers .= "To: $to_email\r\n";
            $headers .= "Subject: $subject\r\n";
            $headers .= "MIME-Version: 1.0\r\n";
            $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
            $headers .= "\r\n";

            fputs($smtp, $headers . $html_message . "\r\n.\r\n");
            $response = fgets($smtp, 515);

            // QUIT
            fputs($smtp, "QUIT\r\n");
            fclose($smtp);

            return true;

        } catch (Exception $e) {
            error_log("Email send failed: " . $e->getMessage());
            return false;
        }
    }
}