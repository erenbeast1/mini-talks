<?php
if (!defined('ABSPATH')) exit;
$eurl = function_exists('mf_get_events_url') ? mf_get_events_url() : get_permalink();

$cu = is_user_logged_in() ? wp_get_current_user() : null;
$prefill_name = $cu ? $cu->display_name : '';
$prefill_email = $cu ? $cu->user_email : '';
?>

<div class="mf-container">
  <div style="display:flex;align-items:center;gap:14px;margin:30px 0 16px">
    <a href="<?php echo esc_url($eurl); ?>" class="mfe-back">‹ Mini-Events</a>
  </div>
  <div class="mf-hero-new">
    <div class="mf-hero-left">
      <h1 class="mf-title-contour blue">Host an Event</h1>
      <div class="mf-hero-bars">
        <span style="background:var(--mf-red)"></span>
        <span style="background:var(--mf-yellow)"></span>
        <span style="background:var(--mf-blue)"></span>
        <span style="background:var(--mf-green)"></span>
      </div>
      <p class="mf-hero-desc">Want to organize a workshop, meetup or expert session?</p>
      <p class="mf-hero-desc">Tell us a little — admin will review and get back to you.</p>
    </div>
    <div class="mf-hero-face">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="Mini-Talks" />
    </div>
  </div>
</div>

<!-- ═══ HOST FORM (yellow band, brick button, no heart) ═══ -->
<div class="mfe-host-form">
  <div class="mfe-host-inner">

    <div class="mfe-host-title-wrap">
      <h2 class="mf-title-contour">Host a Mini-Event</h2>
    </div>

    <div class="mfe-host-subtitle">
      <p>Tell us about the event you would like to organize.<br>All requests go to admin review — nothing publishes automatically.</p>
    </div>

    <form class="mfe-host-fields" id="mfe-host-form" novalidate>

      <!-- Event Type -->
      <div class="mfe-host-typegrid">
        <?php
        $types = [
          ['workshop','Mini Workshop',     'Small guided session',           'blue'],
          ['meetup','Mini-Families Meetup','Open family gathering',          'red'],
          ['expert_session','Expert Session','Knowledge-sharing session',    'green'],
          ['talkspot','Talk-Spot Venue',   'Offer space, host as a venue',   'yellow'],
        ];
        foreach ($types as $i => $t):
          $checked = $i === 0 ? 'checked' : '';
        ?>
        <label class="mfe-host-typecard mfe-host-tc-<?php echo esc_attr($t[3]); ?>">
          <input type="radio" name="event_type" value="<?php echo esc_attr($t[0]); ?>" <?php echo $checked; ?> />
          <div class="mfe-host-tc-body">
            <span class="mfe-host-tc-title"><?php echo esc_html($t[1]); ?></span>
            <span class="mfe-host-tc-desc"><?php echo esc_html($t[2]); ?></span>
          </div>
        </label>
        <?php endforeach; ?>
      </div>

      <!-- Row 1: Name, Email -->
      <div class="mfe-host-row">
        <div class="mfe-host-field">
          <label>Full Name <span class="req">*</span></label>
          <input type="text" name="full_name" class="inp-red" required value="<?php echo esc_attr($prefill_name); ?>" />
        </div>
        <div class="mfe-host-field">
          <label>Email <span class="req">*</span></label>
          <input type="email" name="email" class="inp-blue" required value="<?php echo esc_attr($prefill_email); ?>" />
        </div>
      </div>

      <!-- Row 2: City, Preferred Date -->
      <div class="mfe-host-row">
        <div class="mfe-host-field">
          <label>City</label>
          <input type="text" name="city" class="inp-green" placeholder="e.g. Izmir" />
        </div>
        <div class="mfe-host-field">
          <label>Preferred Date</label>
          <input type="date" name="preferred_date" class="inp-yellow" />
        </div>
      </div>

      <!-- Location -->
      <div class="mfe-host-field full">
        <label>Location / Venue</label>
        <input type="text" name="location_name" class="inp-red" placeholder="Venue name or address" />
      </div>

      <!-- Description -->
      <div class="mfe-host-field full">
        <label>Brief Description <span class="req">*</span></label>
        <textarea name="proposal_text" required placeholder="What would you like to organize? Who is it for? Any details that help us understand."></textarea>
      </div>

      <!-- Talk-Spot conditional -->
      <div class="mfe-host-talkspot" style="display:none">
        <div class="mfe-host-row">
          <div class="mfe-host-field">
            <label>Venue Type</label>
            <input type="text" name="venue_type" class="inp-yellow" placeholder="cafe, school, community center..." />
          </div>
        </div>
        <div class="mfe-host-field full">
          <label>Space Notes</label>
          <textarea name="space_notes" placeholder="Indoor/outdoor, capacity, accessibility, etc."></textarea>
        </div>
      </div>

      <!-- Submit (mw-btn-brick pattern, no heart) -->
      <div class="mfe-host-btnwrap">
        <button class="mfe-host-brick-btn" type="submit">
          <span class="mfe-host-brick-stud" aria-hidden="true"></span>
          <div class="mfe-host-brick-topbar"></div>
          <div class="mfe-host-brick-inner">
            <span>Send Request</span>
          </div>
        </button>
      </div>

      <div class="mfe-host-status" id="mfe-host-status"></div>

      <div class="mfe-host-disclaimer">
        <p>Mini-Talks reviews each request before publishing.<br>
        We will reach out by email when a decision is made.</p>
      </div>
    </form>
  </div>
</div>

<script>
(function(){
  var typeRadios = document.querySelectorAll('.mfe-host-typegrid input[type="radio"]');
  var talkspotBlock = document.querySelector('.mfe-host-talkspot');
  function syncTalkspot(){
    var v = document.querySelector('.mfe-host-typegrid input[type="radio"]:checked');
    if (!v || !talkspotBlock) return;
    talkspotBlock.style.display = (v.value === 'talkspot') ? 'block' : 'none';
  }
  typeRadios.forEach(function(r){ r.addEventListener('change', syncTalkspot); });
  syncTalkspot();

  var form = document.getElementById('mfe-host-form');
  var statusBox = document.getElementById('mfe-host-status');
  if (!form || typeof mf_ajax === 'undefined') return;

  form.addEventListener('submit', function(e){
    e.preventDefault();
    statusBox.className = 'mfe-host-status';
    statusBox.textContent = 'Sending...';
    var data = new FormData(form);
    data.append('action', 'mfe_submit_host');
    data.append('nonce',  mf_ajax.nonce);

    fetch(mf_ajax.url, { method:'POST', body:data, credentials:'same-origin' })
      .then(function(r){ return r.json(); })
      .then(function(res){
        if (res && res.success){
          statusBox.className = 'mfe-host-status mfe-host-status-ok';
          statusBox.textContent = res.data.message || 'Request sent.';
          form.reset();
          syncTalkspot();
        } else {
          statusBox.className = 'mfe-host-status mfe-host-status-err';
          statusBox.textContent = (res && res.data && res.data.message) ? res.data.message : 'Something went wrong.';
        }
      })
      .catch(function(){
        statusBox.className = 'mfe-host-status mfe-host-status-err';
        statusBox.textContent = 'Network error. Please try again.';
      });
  });
})();
</script>
