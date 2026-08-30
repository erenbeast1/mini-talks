<?php if (!defined('ABSPATH')) exit; if (is_user_logged_in()) return; ?>
<div id="mf-auth-overlay" class="mf-overlay" style="display:none;">
  <div class="mf-popup-wrapper">
    <!-- Stud top border (CSS background) -->
    <div class="mf-popup-studs"></div>
    <!-- Red modal -->
    <div class="mf-popup-modal">
      <div class="mf-popup-inner">
        <button class="mf-popup-close" onclick="mfCloseAuth()">&times;</button>

        <!-- STEP 1: Role Selection -->
        <div id="mf-auth-step1" class="mf-popup-step">
          <h2>Join Mini-Talks</h2>
          <p class="mf-popup-sub">How would you like to be part of Mini-Talks?</p>
          <div class="mf-roles-list">
            <button class="mf-role-option" data-role="Mini-Family" data-color="#0055BF" onclick="mfToggleRole(this)">
              <span class="mf-role-check"></span>
              <div><strong>Mini-Family</strong><br><small>For families supporting a child's communication journey, or adults (18+) with lived experience.</small></div>
            </button>
            <button class="mf-role-option" data-role="Mini-Expert" data-color="#237841" onclick="mfToggleRole(this)">
              <span class="mf-role-check"></span>
              <div><strong>Mini-Expert</strong><br><small>For professionals and educators working in communication and selective mutism.</small></div>
            </button>
            <button class="mf-role-option" data-role="Mini-Volunteer" data-color="#D4A017" onclick="mfToggleRole(this)">
              <span class="mf-role-check"></span>
              <div><strong>Mini-Volunteer</strong><br><small>For individuals who want to support children and families in their communication journey.</small></div>
            </button>
            <button class="mf-role-option" data-role="Talk-Spot" data-color="#E52828" onclick="mfToggleRole(this)">
              <span class="mf-role-check"></span>
              <div><strong>Talk-Spot</strong><br><small>For venues and organizations that want to create safe and supportive spaces for communication.</small></div>
            </button>
          </div>
          <button class="mf-btn mf-btn-blue mf-btn-full" onclick="mfRegStep2()">Continue</button>
          <p class="mf-popup-switch">Already have an account? <a href="#" onclick="mfShowLogin();return false;">Sign in</a></p>
        </div>

        <!-- STEP 2: Account Basics -->
        <div id="mf-auth-step2" class="mf-popup-step" style="display:none;">
          <h2 id="mf-reg-title">Create Account</h2>
          <p class="mf-popup-sub">Step 1 of 2 — Your account details</p>
          <div class="mf-popup-form" id="mf-reg-form">
            <div class="mf-field-group"><label>Full Name <small>(not displayed in forum or posts)</small></label><input type="text" id="mf-reg-fullname" placeholder="Your full name" /></div>
            <div class="mf-field-group"><label>Nickname <small>(displayed in forum and community)</small></label><input type="text" id="mf-reg-nickname" placeholder="Choose a nickname" /></div>
            <div class="mf-field-group"><label>Email Address <small>(used for login, updates)</small></label><input type="email" id="mf-reg-email" placeholder="your@email.com" /></div>
            <div class="mf-field-group">
              <label>Password <small>(at least 8 characters)</small></label>
              <div class="mf-pwd-wrap">
                <input type="password" id="mf-reg-password" placeholder="Create a password" />
                <button type="button" class="mf-pwd-toggle" onclick="mfTogglePwd('mf-reg-password', this)" aria-label="Show password">
                  <svg class="mf-eye-on"  viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg class="mf-eye-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:none"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.79 19.79 0 0 1 5.17-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.16 4.19"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>
            <div class="mf-field-group">
              <label>Confirm Password</label>
              <div class="mf-pwd-wrap">
                <input type="password" id="mf-reg-password2" placeholder="Confirm your password" />
                <button type="button" class="mf-pwd-toggle" onclick="mfTogglePwd('mf-reg-password2', this)" aria-label="Show password">
                  <svg class="mf-eye-on"  viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg class="mf-eye-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:none"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.79 19.79 0 0 1 5.17-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.16 4.19"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>
            <div style="display:flex;gap:10px">
              <button class="mf-btn mf-btn-cancel" style="flex:1" onclick="mfBackToStep1()">← Back</button>
              <button class="mf-btn mf-btn-blue" style="flex:2" onclick="mfRegStep3()">Continue</button>
            </div>
            <p class="mf-popup-switch">Already have an account? <a href="#" onclick="mfShowLogin();return false;">Sign in</a></p>
          </div>
        </div>

        <!-- STEP 3: Location & Details -->
        <div id="mf-auth-step3" class="mf-popup-step" style="display:none;">
          <h2>Almost there!</h2>
          <p class="mf-popup-sub">Step 2 of 2 — A few more details</p>
          <div class="mf-popup-form">
            <div id="mf-reg-dynamic"></div>
            <div class="mf-field-group"><label>Country <small>(personalize local experiences)</small></label><input type="text" id="mf-reg-country" placeholder="Your country" /></div>
            <div class="mf-field-group"><label>City <small>(connect with nearby activities)</small></label><input type="text" id="mf-reg-city" placeholder="Your city" /></div>
            <div class="mf-consent-row">
              <input type="checkbox" id="mf-reg-consent" />
              <label for="mf-reg-consent">I have read and accept the <a href="/mini-community/guidelines/" target="_blank">Mini-Community Guidelines and Terms of Participation</a>.</label>
            </div>
            <div class="mf-consent-notes">
              <span>Mini-Community does not provide treatment, referrals, or child-specific evaluations.</span>
              <span>All shared content is based on personal experience and awareness.</span>
              <span>Personal information is kept confidential and never shared without consent.</span>
            </div>
            <div style="display:flex;gap:10px">
              <button class="mf-btn mf-btn-cancel" style="flex:1" onclick="mfBackToStep2()">← Back</button>
              <button class="mf-btn mf-btn-green" style="flex:2" onclick="mfSubmitRegister()">Create Account</button>
            </div>
          </div>
        </div>

        <!-- LOGIN -->
        <div id="mf-auth-login" class="mf-popup-step" style="display:none;">
          <h2>Sign in</h2>
          <div class="mf-popup-form">
            <div class="mf-field-group"><label>Email or Username</label><input type="text" id="mf-login-email" placeholder="email@example.com or username" /></div>
            <div class="mf-field-group">
              <label>Password</label>
              <div class="mf-pwd-wrap">
                <input type="password" id="mf-login-password" placeholder="Your password" />
                <button type="button" class="mf-pwd-toggle" onclick="mfTogglePwd('mf-login-password', this)" aria-label="Show password">
                  <svg class="mf-eye-on"  viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                  <svg class="mf-eye-off" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" style="display:none"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-11-8-11-8a19.79 19.79 0 0 1 5.17-5.94"/><path d="M9.9 4.24A10.94 10.94 0 0 1 12 4c7 0 11 8 11 8a19.86 19.86 0 0 1-3.16 4.19"/><path d="M14.12 14.12a3 3 0 0 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                </button>
              </div>
            </div>
            <div class="mf-pwd-extras">
              <a href="<?php echo esc_url(wp_lostpassword_url()); ?>" class="mf-forgot-link">Forgot password?</a>
            </div>
            <button class="mf-btn mf-btn-blue mf-btn-full" onclick="mfSubmitLogin()">Sign in</button>
            <p class="mf-popup-switch">Don't have an account yet? <a href="#" onclick="mfShowRegister();return false;">Sign up</a></p>
          </div>
        </div>

        <div id="mf-auth-error" class="mf-auth-error"></div>
      </div>
    </div>
  </div>
</div>
