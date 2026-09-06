<?php if (!defined('ABSPATH')) exit; if (is_user_logged_in()) return; ?>
<div id="mf-auth-overlay" class="mf-overlay" style="display:none;">
  <div class="mf-popup-wrapper">
    <!-- Stud top border (CSS background) -->
    <div class="mf-popup-studs"></div>
    <!-- Red modal -->
    <div class="mf-popup-modal">
      <div class="mf-popup-inner">
        <button class="mf-popup-close" data-mf-action="auth-close">&times;</button>

        <!-- STEP 1: Role Selection -->
  <?php mf_block('popup.auth.step1'); ?>
        <!-- STEP 2: Account Basics -->
  <?php mf_block('popup.auth.step2'); ?>
        <!-- STEP 3: Location & Details -->
  <?php mf_block('popup.auth.step3'); ?>
        <!-- LOGIN -->
        <?php mf_block('popup.auth.login', array('lost_password_url' => esc_url(wp_lostpassword_url()))); ?>
        <div id="mf-auth-error" class="mf-auth-error"></div>
      </div>
    </div>
  </div>
</div>
