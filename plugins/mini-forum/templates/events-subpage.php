<?php
if (!defined('ABSPATH')) exit;
$eurl = function_exists('mf_get_events_url') ? mf_get_events_url() : get_permalink();
$view = sanitize_text_field($_GET['view'] ?? '');

if ($view === 'updates') {
    include MF_PATH . 'templates/events-updates.php';
    return;
}

if (in_array($view, ['workshops','meetups','experts'], true)) {
    include MF_PATH . 'templates/events-eventtype.php';
    return;
}

if ($view === 'special-days') {
    include MF_PATH . 'templates/events-special-days.php';
    return;
}

if ($view === 'host') {
    include MF_PATH . 'templates/events-host.php';
    return;
}

$titles = [
  'workshops'     => ['title'=>'Mini Workshops',         'sub'=>'Find a session near you',                     'accent'=>'blue'],
  'meetups'       => ['title'=>'Mini-Families Meetups',  'sub'=>'Find a meetup near you',                      'accent'=>'red'],
  'experts'       => ['title'=>'Mini-Expert Sessions',   'sub'=>'Learn from shared experience and guidance',   'accent'=>'green'],
  'special-days'  => ['title'=>'Special Days',           'sub'=>'Meaningful dates across the year',            'accent'=>'red'],
  'host'          => ['title'=>'Host an Event',          'sub'=>'Propose a workshop, meetup or session',       'accent'=>'blue'],
];
$t = $titles[$view] ?? ['title'=>'Mini-Events','sub'=>'','accent'=>''];
$accent_class = $t['accent'] ? ' '.$t['accent'] : '';
?>

<div class="mf-container">
  <div style="display:flex;align-items:center;gap:14px;margin:30px 0 16px">
    <a href="<?php echo esc_url($eurl); ?>" class="mfe-back">‹ Mini-Events</a>
  </div>
  <div class="mf-hero-new">
    <div class="mf-hero-left">
      <h1 class="mf-title-contour<?php echo $accent_class; ?>"><?php echo esc_html($t['title']); ?></h1>
      <div class="mf-hero-bars">
        <span style="background:var(--mf-red)"></span>
        <span style="background:var(--mf-yellow)"></span>
        <span style="background:var(--mf-blue)"></span>
        <span style="background:var(--mf-green)"></span>
      </div>
      <p class="mf-hero-desc"><?php echo esc_html($t['sub']); ?></p>
    </div>
    <div class="mf-hero-face">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="Mini-Talks" />
    </div>
  </div>

  <div class="mfe-frame-card" style="margin-top:40px;max-width:600px;margin-left:auto;margin-right:auto">
    <div class="mfe-frame-studs mfe-stud-yellow"></div>
    <div class="mfe-frame-body mfe-frame-yellow">
      <div class="mfe-frame-inner" style="padding:36px 28px;text-align:center">
        <h3 style="font-family:'Montserrat',sans-serif;font-weight:900;font-size:22px;color:#1D1D1B;margin:0 0 10px">Coming soon</h3>
        <p style="font-weight:700;font-size:14px;color:#1D1D1B;margin:0 0 20px;line-height:1.6">This page is being prepared. In the meantime, explore the Mini-Events hub.</p>
        <a href="<?php echo esc_url($eurl); ?>" class="mfe-explore-btn mfe-btn-blue">Back to Mini-Events</a>
      </div>
    </div>
  </div>
</div>
