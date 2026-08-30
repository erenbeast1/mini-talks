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
  <div class="mf-hero-new">
    <div class="mf-hero-left">
      <h1 class="mf-title-contour green">Mini-Community Updates</h1>
      <div class="mf-hero-bars">
        <span style="background:var(--mf-red)"></span>
        <span style="background:var(--mf-yellow)"></span>
        <span style="background:var(--mf-blue)"></span>
        <span style="background:var(--mf-green)"></span>
      </div>
      <p class="mf-hero-desc">News, stories, and milestones from across the Mini-Talks community — families, volunteers, Talk-Spots, and experts around the world.</p>
    </div>
    <div class="mf-hero-face">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="Mini-Talks" />
    </div>
  </div>

  <!-- Sort bar -->
  <?php if (!empty($grouped)): ?>
  <div class="mfe-sd-monthbar" style="margin-top:30px">
    <div class="mfe-sd-monthwrap">
      <button class="mfe-sd-monthselect" type="button" id="mfe-upd-monthbtn">
        <span class="mfe-sd-monthselect-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>
        </span>
        <span class="mfe-sd-monthbtn-label">Month Selection</span>
      </button>
    </div>
    <div class="mfe-sd-monthnav">
      <a href="<?php echo esc_url(add_query_arg(['view'=>'updates','sort'=>'newest'], $eurl)); ?>" class="mfe-sd-fl-chip <?php echo $sort==='DESC'?'':'mfe-sd-fl-outline'; ?>">
        <span class="mfe-sd-fl-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 9l7-7 7 7M12 2v20"/></svg>
        </span>
        From Latest
      </a>
      <a href="<?php echo esc_url(add_query_arg(['view'=>'updates','sort'=>'oldest'], $eurl)); ?>" class="mfe-sd-fl-chip <?php echo $sort==='ASC'?'':'mfe-sd-fl-outline'; ?>">
        <span class="mfe-sd-fl-ico" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 15l7 7 7-7M12 22V2"/></svg>
        </span>
        From Oldest
      </a>
    </div>
  </div>
  <?php endif; ?>

  <?php if (!empty($grouped)): ?>
    <?php foreach ($grouped as $ym => $items): ?>
    <section class="mfe-sd-month" id="upd-month-<?php echo esc_attr($ym); ?>" style="margin-top:50px">
      <div class="mfe-sd-monthhead-wide" style="margin:30px 0 24px">
        <div class="mfe-sd-bars-left">
          <span class="l1-bar-red"></span>
          <span class="l1-bar-yellow"></span>
          <span class="l1-bar-blue"></span>
          <span class="l1-bar-green"></span>
        </div>
        <h2 class="mf-title-contour green mfe-sd-monthtitle"><?php echo esc_html(mfe_month_label_u($ym)); ?></h2>
        <div class="mfe-sd-bars-right">
          <span class="l1-bar-red"></span>
          <span class="l1-bar-yellow"></span>
          <span class="l1-bar-blue"></span>
          <span class="l1-bar-green"></span>
        </div>
      </div>
      <div class="mfe-updates-fullgrid">
        <?php foreach ($items as $u):
          $day = mfe_short_day_u($u->visible_date);
          $num = mfe_day_num_u($u->visible_date);
          $mon = mfe_short_mon_u($u->visible_date);
        ?>
        <div class="mfe-upd-card">
          <div class="mfe-upd-studs"></div>
          <div class="mfe-upd-frame">
            <div class="mfe-upd-inner">
              <div class="mfe-datebox mfe-db-green">
                <span class="mfe-d-day"><?php echo esc_html($day); ?></span>
                <span class="mfe-d-num"><?php echo esc_html($num); ?></span>
                <span class="mfe-d-mon"><?php echo esc_html($mon); ?></span>
              </div>
              <div class="mfe-upd-avatar">
                <?php if (!empty($u->user_id)): ?>
                  <?php echo mf_avatar_html((int)$u->user_id, 'md'); ?>
                <?php else: ?>
                  <img class="mf-av mf-av-md" src="<?php echo esc_url(Mini_Forum_Avatar::$default_avatar_url); ?>" alt="@<?php echo esc_attr($u->nickname); ?>" width="54" height="54" loading="lazy" />
                <?php endif; ?>
              </div>
              <div class="mfe-upd-text">
                <div class="mfe-upd-user">@<?php echo esc_html($u->nickname); ?></div>
                <div class="mfe-upd-msg"><?php echo esc_html($u->message); ?></div>
              </div>
            </div>
          </div>
        </div>
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
