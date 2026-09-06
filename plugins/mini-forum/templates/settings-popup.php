<?php
/**
 * Settings popup — same LEGO shell as the auth popup:
 * stud strip → red brick → white inner.
 * Rendered only on the profile view, for logged-in users.
 */
if (!defined('ABSPATH')) exit;
if (!is_user_logged_in()) return;
?>
<div id="mf-settings-overlay" class="mf-overlay" style="display:none;">
  <div class="mf-popup-wrapper">
    <div class="mf-popup-studs"></div>
    <div class="mf-popup-modal">
      <div class="mf-popup-inner">
        <button class="mf-popup-close" type="button" data-mf-action="settings-close" aria-label="Close settings">&times;</button>

        <?php mf_block('popup.settings', array('lost_password_url' => esc_url(wp_lostpassword_url()))); ?>
      </div>
    </div>
  </div>
</div>
