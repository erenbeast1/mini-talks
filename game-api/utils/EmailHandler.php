<?php
// utils/EmailHandler.php
// LEGO Brick Style Email Templates — Mini-Talks
// PHPMailer ile Gmail SMTP - Port 465 (SSL)

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\Exception;

require_once __DIR__ . '/../vendor/autoload.php';

class EmailHandler {
    private $smtp_host = 'smtp.gmail.com';
    private $smtp_port = 465;
    
    private $smtp_username = 'noreply@mini-talks.org';
    private $smtp_password = 'SET-IN-YOUR-OWN-CONFIG';
    
    private $from_email = 'noreply@mini-talks.org';
    private $from_name = 'Mini-Talks';
    private $api_url = 'https://mini-talks.org';
    private $app_url = 'https://mini-talks.com';
    private $assets_url;

    public function __construct() {
        $this->assets_url = $this->api_url . '/minitalks-api/utils/email-assets';
    }

    // ===================================================================
    //  SHARED TEMPLATE PARTS (100% table-based, no divs)
    // ===================================================================

    private function emailOpen() {
        return "<html>
<head><meta charset='UTF-8'><meta name='viewport' content='width=device-width, initial-scale=1.0'></head>
<body style='margin:0; padding:0; background:#ffffff; -webkit-text-size-adjust:100%;'>
<table width='100%' cellpadding='0' cellspacing='0' border='0' style='background:#ffffff;'>
<tr><td align='center' style='padding:30px 16px;'>";
    }

    private function emailClose() {
        return "</td></tr></table></body></html>";
    }

    private function emailHeader() {
        $logo = $this->assets_url . '/mini-talks-white-logo.png';
        $studs = $this->assets_url . '/email-stud-border.png';
        
        return "
<!--[if mso]><table width='560' align='center'><tr><td><![endif]-->
<table cellpadding='0' cellspacing='0' border='0' align='center' style='max-width:560px; width:100%; border-collapse:separate;'>

<!-- STUD BORDER (radius on img like LoginPage lp-brick-border) -->
<tr><td style='font-size:0; line-height:0; padding:0;'>
    <img src='{$studs}' alt='' width='560' style='width:100%; height:auto; display:block; border-radius:15px 15px 0 0;' />
</td></tr>

<!-- RED AREA: logo (like lp-header) -->
<tr><td align='center' style='background:#E52828; padding:20px 20px 16px;border-radius:15px 15px 0 0;'>
    <img src='{$logo}' alt='Mini-Talks' height='48' style='height:48px; width:auto;' />
</td></tr>

<!-- RED AREA: white card inside (like lp-content inside lp-modal) -->
<tr><td style='background:#E52828; padding:0 8px 0 8px; font-size:0;'>
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='border-collapse:separate;'>
    <tr><td style='background:#FFFFFF; border-radius:18px; padding:0;'>
    <table width='100%' cellpadding='0' cellspacing='0' border='0'>";
    }

    private function emailTitle($title) {
        return "
    <tr><td style='padding:28px 28px 8px;'>
        <h1 style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:30px; font-weight:900; color:#000; margin:0 0 6px; text-align:center;'>{$title}</h1>
        <table cellpadding='0' cellspacing='0' border='0' align='center'><tr><td style='width:60px; height:3px; background:#E52828; border-radius:2px; font-size:0; line-height:0;'>&nbsp;</td></tr></table>
    </td></tr>";
    }

    private function emailFooter() {
        return "
    <!-- FOOTER -->
    <tr><td style='padding:20px 28px 24px; border-top:1px solid #eee;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:11px; color:#aaa; text-align:center; line-height:1.5; margin:0;'>
            LEGO&reg; is a trademark of the LEGO Group of companies which does not sponsor, authorize or endorse this site.<br>
            &copy; 2025 Mini-Talks. All rights reserved.
        </p>
    </td></tr>

    </table>
    </td></tr>
    </table><!-- /white card -->

</td></tr>

<!-- RED BOTTOM (like lp-modal bottom border-radius:15px) -->
<tr><td style='background:#E52828; height:8px; font-size:0; line-height:0; border-radius:0 0 15px 15px;'>&nbsp;</td></tr>

</table>
<!--[if mso]></td></tr></table><![endif]-->";
    }

    private function imageButton($img_name, $url, $alt = 'Button') {
        $img_url = $this->assets_url . '/' . $img_name;
        return "
    <tr><td align='center' style='padding:8px 28px 16px;'>
        <a href='{$url}' target='_blank' style='text-decoration:none;'>
            <img src='{$img_url}' alt='{$alt}' height='48' style='height:48px; width:auto; display:inline-block;' />
        </a>
    </td></tr>";
    }

    private function redInfoBox($label, $value) {
        return "
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='border-collapse:separate; border-radius:12px; overflow:hidden; margin-bottom:12px;'>
    <tr><td style='background:#E52828; padding:16px 20px; border-radius:12px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:16px; color:#FFF; margin:0;'>
            <strong style=\"color:#FFD700;\">{$label}:</strong> {$value}
        </p>
    </td></tr>
    </table>";
    }

    private function blueInfoBox($label, $value) {
        return "
    <table width='100%' cellpadding='0' cellspacing='0' border='0' style='border-collapse:separate; border-radius:12px; overflow:hidden; margin-bottom:16px;'>
    <tr><td style='background:#0055BF; padding:16px 20px; border-radius:12px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:16px; color:#FFF; margin:0;'>
            <strong style=\"color:#FFD700;\">{$label}:</strong> {$value}
        </p>
    </td></tr>
    </table>";
    }

    private function linkBox($url) {
        return "
    <tr><td style='padding:4px 28px 8px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:13px; color:#888; margin:0 0 6px;'>Or copy this link:</p>
        <table width='100%' cellpadding='0' cellspacing='0' border='0'>
        <tr><td style='background:#F5F5F5; border:2px solid #E0E0E0; border-radius:10px; padding:10px 12px; word-break:break-all; overflow:hidden;'>
            <p style='font-family:Arial,Helvetica,sans-serif; font-size:13px; color:#666; margin:0; line-height:1.4; word-break:break-all; overflow-wrap:break-word;'>{$url}</p>
        </td></tr>
        </table>
    </td></tr>";
    }

    private function warningNote($text) {
        return "
    <tr><td style='padding:12px 28px 4px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:13px; color:#999; margin:0; padding-top:12px; border-top:1px solid #eee;'>
            ⚠️ {$text}
        </p>
    </td></tr>";
    }

    private function expertCapabilities($child_label = "Mini's") {
        return "
    <tr><td style='padding:0 28px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:16px; color:#333; font-weight:700; margin:0 0 10px;'>What can experts do?</p>
        <table cellpadding='0' cellspacing='0' border='0' style='margin-bottom:8px;'>
            <tr><td style='padding:3px 0; font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:15px; color:#555;'>🟡 View your {$child_label} progress and activities</td></tr>
            <tr><td style='padding:3px 0; font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:15px; color:#555;'>🟡 Track recordings and achievements</td></tr>
            <tr><td style='padding:3px 0; font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:15px; color:#555;'>🟡 Monitor streak and reward data</td></tr>
        </table>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:13px; color:#999; margin:0 0 16px;'>
            Note: Experts cannot modify settings or manage your {$child_label} account.
        </p>
    </td></tr>";
    }

    // ===================================================================
    //  1. VERIFICATION EMAIL
    // ===================================================================

    public function sendVerificationEmail($to_email, $verification_token, $user_name = '') {
        $verify_url = $this->api_url . "/minitalks-api/auth/verify-email.php?token=" . urlencode($verification_token);
        $subject = "Verify Your Mini-Talks Account";
        $greeting = $user_name ? "Welcome to Mini-Talks, {$user_name}!" : "Welcome to Mini-Talks!";

        $html_body = $this->emailOpen()
            . $this->emailHeader()
            . $this->emailTitle('Verify Your Email')
            . "
    <tr><td style='padding:0 28px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:18px; color:#333; line-height:1.7; margin:0 0 8px;'><strong>{$greeting}</strong></p>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:16px; color:#555; line-height:1.7; margin:0 0 12px;'>Thank you for creating your account. To complete your registration, please verify your email address:</p>
    </td></tr>"
            . $this->imageButton('verify_my_email_btn.png', $verify_url, 'Verify My Email')
            . $this->linkBox($verify_url)
            . "
    <tr><td style='padding:12px 28px 8px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:14px; color:#999; margin:0;'>⏱️ This link expires in <strong>24 hours</strong>.</p>
    </td></tr>"
            . $this->emailFooter()
            . $this->emailClose();

        $plain_body = "{$greeting}\n\nTo verify your email: {$verify_url}\n\nExpires in 24 hours.\n\nMini-Talks Team";
        return $this->sendEmail($to_email, $subject, $html_body, $plain_body);
    }

    // ===================================================================
    //  2. PARENT APPROVAL EMAIL
    // ===================================================================

    public function sendParentApprovalEmail($parent_email, $child_name, $child_email) {
        $subject = "Your Child Wants to Join Mini-Talks!";

        $html_body = $this->emailOpen()
            . $this->emailHeader()
            . $this->emailTitle('Your Child Wants to Join!')
            . "
    <tr><td style='padding:0 28px;'>
        " . $this->redInfoBox('Child', $child_name) . "
        " . $this->blueInfoBox('Email', $child_email) . "
    </td></tr>
    <tr><td style='padding:0 28px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:16px; color:#333; line-height:1.7; margin:0 0 12px;'>
            <strong>What is Mini-Talks?</strong><br>
            <span style='color:#555;'>A safe, creative platform where children practice communication skills through LEGO-themed activities.</span>
        </p>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:16px; color:#333; font-weight:700; margin:0 0 8px;'>What happens next?</p>
        <table cellpadding='0' cellspacing='0' border='0' style='margin-bottom:16px;'>
            <tr><td style='padding:4px 0; font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:15px; color:#555;'>
                <span style='display:inline-block; width:24px; height:24px; background:#FFD700; color:#000; font-weight:900; text-align:center; line-height:24px; border-radius:6px; margin-right:10px; font-size:12px;'>1</span>
                Create your Parent account
            </td></tr>
            <tr><td style='padding:4px 0; font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:15px; color:#555;'>
                <span style='display:inline-block; width:24px; height:24px; background:#FFD700; color:#000; font-weight:900; text-align:center; line-height:24px; border-radius:6px; margin-right:10px; font-size:12px;'>2</span>
                Review and approve your child's account
            </td></tr>
            <tr><td style='padding:4px 0; font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:15px; color:#555;'>
                <span style='display:inline-block; width:24px; height:24px; background:#FFD700; color:#000; font-weight:900; text-align:center; line-height:24px; border-radius:6px; margin-right:10px; font-size:12px;'>3</span>
                Your child can start playing safely!
            </td></tr>
        </table>
    </td></tr>"
            . $this->imageButton('go_to_minitalks_btn.png', $this->app_url, 'Go to Mini-Talks')
            . $this->warningNote('If you did not expect this email, you can safely ignore it.')
            . $this->emailFooter()
            . $this->emailClose();

        $plain_body = "Your Child Wants to Join Mini-Talks!\n\nChild: {$child_name}\nEmail: {$child_email}\n\n1. Create your Parent account\n2. Approve your child\n3. Start playing!\n\nVisit: {$this->app_url}\n\nMini-Talks Team";
        return $this->sendEmail($parent_email, $subject, $html_body, $plain_body);
    }

    // ===================================================================
    //  3. EXPERT CONNECTION REQUEST (Parent has account)
    // ===================================================================

    public function sendExpertConnectionRequestEmail($parent_email, $parent_name, $expert_name, $expert_organization, $mini_name) {
        $subject = "Expert Connection Request for {$mini_name}";
        $org_text = !empty($expert_organization) ? " from {$expert_organization}" : "";

        $html_body = $this->emailOpen()
            . $this->emailHeader()
            . $this->emailTitle('Expert Request')
            . "
    <tr><td style='padding:0 28px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:18px; color:#333; line-height:1.7; margin:0 0 6px;'><strong>Hello {$parent_name}!</strong></p>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:16px; color:#555; line-height:1.7; margin:0 0 16px;'>An expert wants to connect with your Mini to help track their progress.</p>
    </td></tr>
    <tr><td style='padding:0 28px;'>
        " . $this->redInfoBox('Expert', "{$expert_name}{$org_text}") . "
        " . $this->blueInfoBox('Mini', $mini_name) . "
    </td></tr>"
            . $this->expertCapabilities("Mini's")
            . $this->imageButton('review_request_btn.png', $this->app_url, 'Review Request')
            . "
    <tr><td style='padding:0 28px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:15px; color:#333; text-align:center; margin:0 0 6px;'>
            Log in to your account to <strong style='color:#00852B;'>approve</strong> or <strong style='color:#C91A09;'>decline</strong> this request.
        </p>
    </td></tr>"
            . $this->warningNote("If you don't recognize this expert, you can safely decline.")
            . $this->emailFooter()
            . $this->emailClose();

        $plain_body = "Hello {$parent_name}!\n\nExpert: {$expert_name}{$org_text}\nMini: {$mini_name}\n\nLog in to approve or decline: {$this->app_url}\n\nMini-Talks Team";
        return $this->sendEmail($parent_email, $subject, $html_body, $plain_body);
    }

    // ===================================================================
    //  4. EXPERT CONNECTION WITH TOKEN (Parent has no account)
    // ===================================================================

    public function sendExpertConnectionRequestWithTokenEmail($parent_email, $expert_name, $expert_organization, $mini_names, $token) {
        $subject = "Expert Connection Request for Your Child";
        
        $approve_url = $this->api_url . "/minitalks-api/auth/approve-expert-token.php?token=" . urlencode($token) . "&action=approve";
        $reject_url = $this->api_url . "/minitalks-api/auth/approve-expert-token.php?token=" . urlencode($token) . "&action=reject";
        $org_text = !empty($expert_organization) ? " from {$expert_organization}" : "";

        $approve_img = $this->assets_url . '/approve_btn.png';
        $reject_img = $this->assets_url . '/reject_btn.png';

        $html_body = $this->emailOpen()
            . $this->emailHeader()
            . $this->emailTitle('Expert Request')
            . "
    <tr><td style='padding:0 28px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:18px; color:#333; line-height:1.7; margin:0 0 6px;'><strong>Hello!</strong></p>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:16px; color:#555; line-height:1.7; margin:0 0 16px;'>An expert wants to connect with your child's Mini-Talks account to help track their progress.</p>
    </td></tr>
    <tr><td style='padding:0 28px;'>
        " . $this->redInfoBox('Expert', "{$expert_name}{$org_text}") . "
        " . $this->blueInfoBox('Mini(s)', $mini_names) . "
    </td></tr>"
            . $this->expertCapabilities("child's")
            . "
    <!-- APPROVE / REJECT BUTTONS -->
    <tr><td align='center' style='padding:8px 28px 16px;'>
        <table cellpadding='0' cellspacing='0' border='0'><tr>
            <td style='padding:0 6px;'>
                <a href='{$approve_url}' target='_blank' style='text-decoration:none;'>
                    <img src='{$approve_img}' alt='Approve' height='48' style='height:48px; width:auto;' />
                </a>
            </td>
            <td style='padding:0 6px;'>
                <a href='{$reject_url}' target='_blank' style='text-decoration:none;'>
                    <img src='{$reject_img}' alt='Reject' height='48' style='height:48px; width:auto;' />
                </a>
            </td>
        </tr></table>
    </td></tr>
    <tr><td style='padding:0 28px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:13px; color:#999; text-align:center; margin:0;'>⏱️ This approval link expires in <strong>7 days</strong>.</p>
    </td></tr>"
            . $this->warningNote("If you don't recognize this expert, you can safely reject or ignore this email.")
            . $this->emailFooter()
            . $this->emailClose();

        $plain_body = "Hello!\n\nExpert: {$expert_name}{$org_text}\nMini(s): {$mini_names}\n\nAPPROVE: {$approve_url}\nREJECT: {$reject_url}\n\nExpires in 7 days.\n\nMini-Talks Team";
        return $this->sendEmail($parent_email, $subject, $html_body, $plain_body);
    }

    // ===================================================================
    //  5. PASSWORD RESET EMAIL
    // ===================================================================

    public function sendPasswordResetEmail($to_email, $reset_token) {
        $reset_url = $this->app_url . "/reset-password?token=" . urlencode($reset_token);
        $subject = "Reset Your Mini-Talks Password";

        $html_body = $this->emailOpen()
            . $this->emailHeader()
            . $this->emailTitle('Reset Your Password')
            . "
    <tr><td style='padding:0 28px;'>
        <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:16px; color:#555; line-height:1.7; margin:0 0 12px;'>We received a request to reset your Mini-Talks password. Click below to create a new one:</p>
    </td></tr>"
            . $this->imageButton('change_password_btn.png', $reset_url, 'Change Password')
            . $this->linkBox($reset_url)
            . "
    <!-- Warning Box -->
    <tr><td style='padding:12px 28px 0;'>
        <table width='100%' cellpadding='0' cellspacing='0' border='0' style='border-collapse:separate;'>
        <tr><td style='background:#FFF8E1; border-radius:10px; border-left:4px solid #FFD700; padding:12px 16px;'>
            <p style='font-family:Montserrat,Arial,Helvetica,sans-serif; font-size:14px; color:#856404; margin:0; font-weight:600;'>⏱️ This link expires in <strong>1 hour</strong>.</p>
        </td></tr>
        </table>
    </td></tr>"
            . $this->warningNote("If you didn't request this, you can safely ignore this email. Your password won't change.")
            . $this->emailFooter()
            . $this->emailClose();

        $plain_body = "Reset Your Mini-Talks Password\n\nVisit: {$reset_url}\n\nExpires in 1 hour.\n\nMini-Talks Team";
        return $this->sendEmail($to_email, $subject, $html_body, $plain_body);
    }

    // ===================================================================
    //  SEND EMAIL (PHPMailer)
    // ===================================================================

    private function sendEmail($to_email, $subject, $html_body, $plain_body) {
        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host       = $this->smtp_host;
            $mail->SMTPAuth   = true;
            $mail->Username   = $this->smtp_username;
            $mail->Password   = $this->smtp_password;
            $mail->SMTPSecure = PHPMailer::ENCRYPTION_SMTPS;
            $mail->Port       = $this->smtp_port;
            
            $mail->SMTPDebug = 0;
            $mail->Debugoutput = function($str, $level) {
                error_log("SMTP: $str");
            };

            $mail->setFrom($this->from_email, $this->from_name);
            $mail->addAddress($to_email);
            $mail->addReplyTo($this->from_email, $this->from_name);

            $mail->isHTML(true);
            $mail->Subject = $subject;
            $mail->Body    = $html_body;
            $mail->AltBody = $plain_body;
            $mail->CharSet = 'UTF-8';

            $result = $mail->send();
            if ($result) {
                error_log("Email sent successfully to: $to_email");
            }
            return $result;
            
        } catch (Exception $e) {
            error_log("Email send failed: " . $mail->ErrorInfo);
            error_log("Exception: " . $e->getMessage());
            return false;
        }
    }
}