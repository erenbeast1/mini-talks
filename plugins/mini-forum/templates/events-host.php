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
  <?php mf_block('host.hero', array('logo' => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png')); ?>
</div>

<!-- ═══ HOST FORM (yellow band, brick button, no heart) ═══ -->
<div class="mfe-host-form">
  <div class="mfe-host-inner">

    <div class="mfe-host-title-wrap">
      <h2 class="mf-title-contour"><?php mf_block('host.form.title'); ?></h2>
    </div>

    <div class="mfe-host-subtitle">
      <p>Tell us about the event you would like to organize.<br>All requests go to admin review — nothing publishes automatically.</p>
    </div>

    <?php
    $mf_types = '';
    foreach (array(
      array('workshop','Mini-Workshop','Structured, guided session','blue'),
      array('meetup','Mini-Families Meetup','Open family gathering','red'),
      array('expert_session','Expert Session','Knowledge-sharing session','green'),
      array('talkspot','Talk-Spot Venue','Offer space, host as a venue','yellow'),
    ) as $i => $t) {
      $mf_types .= '<label class="mfe-host-typecard mfe-host-tc-' . esc_attr($t[3]) . '">' .
        '<input type="radio" name="event_type" value="' . esc_attr($t[0]) . '"' . ($i === 0 ? ' checked' : '') . ' />' .
        '<div class="mfe-host-tc-body"><span class="mfe-host-tc-title">' . esc_html($t[1]) . '</span>' .
        '<span class="mfe-host-tc-desc">' . esc_html($t[2]) . '</span></div></label>';
    }
    mf_block('host.form', array(
      'type_cards'    => $mf_types,
      'prefill_name'  => esc_attr($prefill_name),
      'prefill_email' => esc_attr($prefill_email),
    )); ?>
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
