<?php
if (!defined('ABSPATH')) exit;
$eurl = function_exists('mf_get_events_url') ? mf_get_events_url() : get_permalink();

global $wpdb;
$tu = $wpdb->prefix . 'mf_community_updates';

$sort = isset($_GET['sort']) && $_GET['sort'] === 'oldest' ? 'ASC' : 'DESC';
$page     = max(1, intval($_GET['p'] ?? 1));
$per_page = 30;
$offset   = ($page - 1) * $per_page;
$total    = (int)$wpdb->get_var("SELECT COUNT(*) FROM $tu WHERE status='published'");
$pages    = max(1, (int)ceil($total / $per_page));

$updates = $wpdb->get_results("
    SELECT * FROM $tu
    WHERE status='published'
    ORDER BY visible_date $sort
    LIMIT $per_page OFFSET $offset
");

// Group updates by Year-Month
$grouped = [];
foreach ($updates as $u) {
    $ym = date('Y-m', strtotime($u->visible_date));
    if (!isset($grouped[$ym])) $grouped[$ym] = [];
    $grouped[$ym][] = $u;
}

function mfe_short_day_u($dt){ return ucfirst(strtolower(date('D', strtotime($dt)))); }
function mfe_short_mon_u($dt){ return ucfirst(strtolower(date('M', strtotime($dt)))); }
function mfe_day_num_u($dt) { return date('d', strtotime($dt)); }
function mfe_month_label_u($ym){
    $names = ['01'=>'January','02'=>'February','03'=>'March','04'=>'April','05'=>'May','06'=>'June',
              '07'=>'July','08'=>'August','09'=>'September','10'=>'October','11'=>'November','12'=>'December'];
    list($y, $m) = explode('-', $ym);
    return $names[$m] . ' ' . $y;
}
?>

<div class="mf-container">
  <div style="display:flex;align-items:center;gap:14px;margin:30px 0 16px">
    <a href="<?php echo esc_url($eurl); ?>" class="mfe-back">‹ Mini-Events</a>
  </div>
  <?php mf_block('events.updates.hero', array('logo' => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png')); ?>

  <!-- Sort bar -->
  <?php if (!empty($grouped)): ?>
  <?php mf_block('events.updates.monthbar', array(
    'newest_url'   => esc_url(add_query_arg(array('view'=>'updates','sort'=>'newest'), $eurl)),
    'newest_class' => $sort === 'DESC' ? '' : 'mfe-sd-fl-outline',
    'oldest_url'   => esc_url(add_query_arg(array('view'=>'updates','sort'=>'oldest'), $eurl)),
    'oldest_class' => $sort === 'ASC' ? '' : 'mfe-sd-fl-outline',
  )); ?>
  <?php endif; ?>

  <?php if (!empty($grouped)): ?>
    <?php foreach ($grouped as $ym => $items): ?>
    <section class="mfe-sd-month" id="upd-month-<?php echo esc_attr($ym); ?>" style="margin-top:50px">
      <?php mf_block('events.month.heading', array('month' => esc_html(mfe_month_label_u($ym)), 'colour' => 'green')); ?>
      <div class="mfe-updates-fullgrid">
        <?php foreach ($items as $u):
          $day = mfe_short_day_u($u->visible_date);
          $num = mfe_day_num_u($u->visible_date);
          $mon = mfe_short_mon_u($u->visible_date);
        ?>
        <?php
        ob_start();
        if (!empty($u->user_id)) { echo mf_avatar_html((int) $u->user_id, 'md'); }
        else { printf('<img class="mf-av mf-av-md" src="%s" alt="@%s" width="54" height="54" loading="lazy" />',
                      esc_url(Mini_Forum_Avatar::$default_avatar_url), esc_attr($u->nickname)); }
        $mf_av = ob_get_clean();

        mf_block('events.update.card', array(
          'avatar'   => $mf_av,
          'day'      => esc_html($day),
          'date'     => esc_html($num),
          'month'    => esc_html($mon),
          'nickname' => esc_html($u->nickname),
          'message'  => esc_html($u->message),
        )); ?>
        <?php endforeach; ?>
      </div>
    </section>
    <?php endforeach; ?>
  <?php else: ?>
    <p style="text-align:center;padding:60px 0;font-weight:700;color:#888">No updates yet.</p>
  <?php endif; ?>

  <?php if ($pages > 1): ?>
  <div style="display:flex;justify-content:center;align-items:center;gap:8px;margin:50px 0 30px">
    <?php if ($page > 1): ?>
    <a href="<?php echo esc_url(add_query_arg(['view'=>'updates','p'=>$page-1,'sort'=>$sort==='ASC'?'oldest':'newest'], $eurl)); ?>" class="mfe-explore-btn mfe-btn-green">‹ Prev</a>
    <?php endif; ?>
    <span style="font-weight:800;color:var(--mf-text);padding:0 16px">Page <?php echo $page; ?> of <?php echo $pages; ?></span>
    <?php if ($page < $pages): ?>
    <a href="<?php echo esc_url(add_query_arg(['view'=>'updates','p'=>$page+1,'sort'=>$sort==='ASC'?'oldest':'newest'], $eurl)); ?>" class="mfe-explore-btn mfe-btn-green">Next ›</a>
    <?php endif; ?>
  </div>
  <?php endif; ?>
</div>

<style>
.mfe-updates-fullgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
@media (max-width:900px){.mfe-updates-fullgrid{grid-template-columns:1fr 1fr}}
@media (max-width:560px){.mfe-updates-fullgrid{grid-template-columns:1fr}}
</style>
