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
  <?php mf_block('events.subpage.hero', array(
    'accent'      => $accent_class,
    'title'       => esc_html($t['title']),
    'description' => esc_html($t['sub']),
    'logo'        => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png',
  )); ?>

  <div class="mfe-frame-card" style="margin-top:40px;max-width:600px;margin-left:auto;margin-right:auto">
    <div class="mfe-frame-studs mfe-stud-yellow"></div>
    <div class="mfe-frame-body mfe-frame-yellow">
      <?php mf_block('events.soon', array('events_url' => esc_url($eurl))); ?>
    </div>
  </div>
</div>
