<?php
if (!defined('ABSPATH')) exit;
$eurl = function_exists('mf_get_events_url') ? mf_get_events_url() : get_permalink();

global $wpdb;
$tsd = $wpdb->prefix . 'mf_special_days';

$days = $wpdb->get_results("
  SELECT * FROM $tsd
  WHERE status='published'
  ORDER BY month_number ASC, day_date ASC
");

// Group by month
$grouped = [];
foreach ($days as $d) {
  $grouped[(int)$d->month_number][] = $d;
}

$month_names = [
  1=>'January',2=>'February',3=>'March',4=>'April',5=>'May',6=>'June',
  7=>'July',8=>'August',9=>'September',10=>'October',11=>'November',12=>'December'
];

function mfe_sd_short_day($dt){ return ucfirst(strtolower(date('D', strtotime($dt)))); }
function mfe_sd_day_num($dt){ return date('d', strtotime($dt)); }
function mfe_sd_short_mon($dt){ return ucfirst(strtolower(date('M', strtotime($dt)))); }
?>

<!-- ═══ HERO ═══ -->
<div class="mf-container">
  <div style="display:flex;align-items:center;gap:14px;margin:30px 0 16px">
    <a href="<?php echo esc_url($eurl); ?>" class="mfe-back">‹ Mini-Events</a>
  </div>
  <?php mf_block('events.specialdays.hero', array('logo' => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png')); ?>
</div>

<!-- ═══ MONTH NAVIGATION ═══ -->
<?php $today_month_int = (int)date('n'); $auto_month = $today_month_int; ?>
<div class="mf-container" style="margin-top:30px">
  <?php mf_block('events.specialdays.monthbar', array('auto_month' => (int) $auto_month)); ?>
</div>

<!-- ═══ MONTHS LIST ═══ -->
<?php $today_month = (int)date('n'); ?>
<div class="mf-container mfe-sd-list-wrap" style="margin-top:40px">
  <?php foreach ($month_names as $mn => $mname):
    $items = $grouped[$mn] ?? [];
    $is_empty = empty($items);
    $is_past = $mn < $today_month;
    $section_classes = 'mfe-sd-month';
    if ($is_past) $section_classes .= ' mfe-sd-month-past';
    if ($is_empty) $section_classes .= ' mfe-sd-month-empty';
  ?>
  <section class="<?php echo esc_attr($section_classes); ?>" id="month-<?php echo $mn; ?>" data-month-num="<?php echo $mn; ?>">
    <?php mf_block('events.month.heading', array('month' => esc_html($mname . ' ' . date('Y')), 'colour' => '')); ?>
    <div class="mfe-sd-list">
      <?php if ($is_empty): ?>
        <div class="mfe-sd-empty-card">No special days for this month yet.</div>
      <?php else: foreach ($items as $d):
        $accent = in_array($d->accent_color, ['blue','red','yellow','green','orange'], true) ? $d->accent_color : 'orange';
      ?>
      <?php
      $mf_imgs = array();
      if (!empty($d->images)) {
        $decoded = json_decode($d->images, true);
        if (is_array($decoded)) $mf_imgs = $decoded;
      }
      $mf_photos = '';
      if ($mf_imgs) {
        $mf_photos = '<div class="mfe-sd-photos">';
        foreach ($mf_imgs as $img_url) {
          $mf_photos .= '<span class="mfe-sd-photo" style="background-image:url(\'' . esc_url($img_url) .
                        '\');background-size:cover;background-position:center"></span>';
        }
        $mf_photos .= '</div>';
      }

      mf_block('events.specialday.card', array(
        'accent'      => esc_attr($accent),
        'day'         => esc_html(mfe_sd_short_day($d->day_date)),
        'date'        => esc_html(mfe_sd_day_num($d->day_date)),
        'month'       => esc_html(mfe_sd_short_mon($d->day_date)),
        'title'       => esc_html($d->title),
        'description' => wp_kses_post($d->description),
        'photos'      => $mf_photos,
      )); ?>
      <?php endforeach; endif; ?>
    </div>
  </section>
  <?php endforeach; ?>
</div>
