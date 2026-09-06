<?php if (!defined('ABSPATH')) exit; ?>

<?php if (!is_user_logged_in()): ?>
<!-- ═══ GUEST LANDING PAGE ═══ -->
<div class="mf-container">
  <?php mf_block('forum.guest.hero', array('logo' => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png')); ?>
</div>

<div style="width:100%;height:1px;background:#e5e5e5;margin:10px 0 40px"></div>

<div class="mf-container">
  <!-- Guidelines section (title removed, grey box + text + color bars kept) -->
  <?php mf_block('forum.guest.guidelines'); ?>
</div>

<div style="width:100%;height:1px;background:#e5e5e5;margin:30px 0 40px"></div>

<div class="mf-container">
  <!-- Forum Access -->
  <div class="mf-guest-access">
    <?php mf_block('forum.guest.access', array(
      'join_url'   => esc_url('/mini-community/join-us/'),
      'studs_red'  => esc_url('https://mini-talks.org/wp-content/uploads/2026/04/yeni_kirmizi_studs_4.png'),
      'studs_blue' => esc_url('https://mini-talks.org/wp-content/uploads/2026/04/yeni_mavi_studs_4.png'),
    )); ?>

    <?php mf_block('forum.guest.notice'); ?>
  </div>
</div>

<?php else: ?>
<!-- ═══ LOGGED-IN FORUM ═══ -->
<div class="mf-container">
  <?php mf_block('forum.hero', array('logo' => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png')); ?>

  <?php mf_block('forum.hero.center'); ?>

  <?php
  $acts = array(
    array('question','Ask a Question','Ask about everyday situations and hear what helped others','red'),
    array('experience','Share an Experience','Share what happened in a simple and supportive way','yellow'),
    array('idea','Share an Idea','Share an idea, resource, or small strategy that others might find helpful','blue'),
    array('reflection','Event Reflections','Reflect on a Mini-Talks moment and what it meant to you','green'),
  );
  $mf_cards = '';
  foreach ($acts as $a) {
    $mf_cards .= '<a href="' . esc_url(add_query_arg(array('view'=>'create','type'=>$a[0]), mf_get_forum_url())) .
      '" class="mf-action-card"><div class="mf-studs mf-studs-' . esc_attr($a[3]) . '"></div>' .
      '<div class="mf-action-body bg-' . esc_attr($a[3]) . '"><div class="mf-action-icon"></div>' .
      '<div><h4>' . esc_html($a[1]) . '</h4><p>' . esc_html($a[2]) . '</p></div></div></a>';
  }
  mf_block('forum.actions', array('cards' => $mf_cards)); ?>

  <?php mf_block('forum.list.header'); ?>
  <div id="mf-posts-list" class="mf-posts-list"><div class="mf-loading">Loading...</div></div>

  <?php
  $mf_items = '';
  foreach (array('Share in a general and comfortable way','Avoid names or personal identifiers',
                 'Focus on experiences, not advice-giving','Be kind, patient, and respectful',
                 'Avoid comparing children or progress','This is not a space for medical advice',
                 'Reflect before applying shared suggestions','Keep posts positive and non-overwhelming') as $g) {
    $mf_items .= '<div class="mf-guideline-item"><div class="mf-guideline-icon"></div>' . esc_html($g) . '</div>';
  }
  mf_block('forum.guidelines', array('items' => $mf_items)); ?>
</div>
<?php endif; ?>
