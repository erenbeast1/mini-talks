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
        <button class="mf-popup-close" type="button" onclick="mfCloseSettings()" aria-label="Close settings">&times;</button>

        <div class="mf-popup-step">
          <h2>Settings</h2>
          <p class="mf-popup-sub">Manage your Mini-Talks account</p>

          <div class="mf-settings-section">
            <h3 class="mf-settings-heading">
              <span class="mf-settings-brick"></span> Change password
            </h3>

            <div class="mf-popup-form">
              <div class="mf-field-group">
                <label for="mf-set-current">Current password</label>
                <div class="mf-pwd-wrap">
                  <input type="password" id="mf-set-current" autocomplete="current-password" placeholder="Your current password" />
                  <button type="button" class="mf-pwd-toggle" onclick="mfTogglePwd('mf-set-current', this)" aria-label="Show password">
                    <svg class="mf-eye-on" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg class="mf-eye-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:none"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.79 19.79 0 0 1 5.17-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.16 4.19"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                </div>
              </div>

              <div class="mf-field-group">
                <label for="mf-set-new">New password <small>(at least 8 characters)</small></label>
                <div class="mf-pwd-wrap">
                  <input type="password" id="mf-set-new" autocomplete="new-password" placeholder="Create a new password" />
                  <button type="button" class="mf-pwd-toggle" onclick="mfTogglePwd('mf-set-new', this)" aria-label="Show password">
                    <svg class="mf-eye-on" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg class="mf-eye-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:none"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.79 19.79 0 0 1 5.17-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.16 4.19"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                </div>
                <div class="mf-pwd-meter" id="mf-pwd-meter" aria-hidden="true"><span></span></div>
              </div>

              <div class="mf-field-group">
                <label for="mf-set-new2">Confirm new password</label>
                <div class="mf-pwd-wrap">
                  <input type="password" id="mf-set-new2" autocomplete="new-password" placeholder="Repeat the new password" />
                  <button type="button" class="mf-pwd-toggle" onclick="mfTogglePwd('mf-set-new2', this)" aria-label="Show password">
                    <svg class="mf-eye-on" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                    <svg class="mf-eye-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:none"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.79 19.79 0 0 1 5.17-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.16 4.19"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  </button>
                </div>
              </div>

              <button class="mf-btn mf-btn-green mf-btn-full" type="button" id="mf-set-save" onclick="mfSubmitPassword()">Update password</button>

              <p class="mf-settings-hint">
                Forgot your current password?
                <a href="<?php echo esc_url(wp_lostpassword_url()); ?>">Reset it by email</a>.
              </p>
            </div>
          </div>

          <div id="mf-settings-msg" class="mf-settings-msg" role="status"></div>
        </div>
      </div>
    </div>
  </div>
</div>
