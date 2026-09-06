<?php
if (!defined('ABSPATH')) exit;
if(!is_user_logged_in()){echo '<div class="mf-container"><p>Please log in.</p></div>';return;}
$uid=get_current_user_id();$nick=mf_get_nickname($uid);$role=mf_get_user_role($uid);
$roles=get_user_meta($uid,'mf_roles',true)?:[];
global $wpdb;$rt=$wpdb->prefix.'mf_replies';
$pc=(int)(new WP_Query(['post_type'=>'mf_post','author'=>$uid,'posts_per_page'=>-1,'fields'=>'ids']))->found_posts;
$rcc=(int)$wpdb->get_var($wpdb->prepare("SELECT COUNT(*) FROM $rt WHERE user_id=%d",$uid));
$my_posts=new WP_Query(['post_type'=>'mf_post','author'=>$uid,'posts_per_page'=>3,'orderby'=>'date','order'=>'DESC']);
$fu=mf_get_forum_url();$eu=mf_get_events_url();$rbm=['Family'=>'rb-blue','Expert'=>'rb-green','Volunteer'=>'rb-yellow','Talk-Spot'=>'rb-red'];
?>
<div class="mf-container">
  <!-- Profile Header Frame — blue border -->
  <div class="mf-profile-header-frame">
    <div class="mf-profile-header" data-mf-current-user="1">
      <?php
      ob_start(); ?>
        <?php if(!empty($roles)): foreach($roles as $r):$l=str_replace('Mini-','',$r);$bc=$rbm[$l]??'rb-blue';?>
        <span class="mf-role-badge <?php echo $bc;?>"><?php echo esc_html($l);?></span>
        <?php endforeach; else: $bc=$rbm[$role]??'rb-blue';?>
        <span class="mf-role-badge <?php echo $bc;?>"><?php echo esc_html($role);?></span>
        <?php endif;
      $mf_badges = ob_get_clean();

      $mf_stats = '<div class="mf-stat-box">Posts: ' . (int)$pc . '</div>'
                . '<div class="mf-stat-box">Events: 0</div>'
                . '<div class="mf-stat-box" id="mf-stat-kits">Kits: 0</div>';

      mf_block('profile.header', array(
        'avatar'        => mf_avatar_html($uid, 'lg'),
        'edit_icon'     => MF_PENCIL_SVG,
        'nickname'      => esc_html($nick),
        'badges'        => $mf_badges,
        'stats'         => $mf_stats,
        'settings_icon' => MF_COG_SVG,
      )); ?>
    </div>
  </div>

  <!-- Stud — sits between white and grey -->
  <div class="mf-studs-profile"></div>

  <!-- Grey area — full page width -->
  <div class="mf-profile-grey">
    <div class="mf-profile-tabs-area" style="width:100%">
      <div class="mf-profile-tabs" role="tablist">
        <button type="button" class="mf-profile-tab tab-yellow" data-mf-panel="forum" role="tab" aria-selected="true"><span class="tab-dot" style="background:var(--mf-yellow)"></span> Mini-Forum</button>
        <a class="mf-profile-tab tab-blue" href="<?php echo esc_url($eu);?>"><span class="tab-dot" style="background:var(--mf-blue)"></span> Mini-Events</a>
        <button type="button" class="mf-profile-tab tab-green" data-mf-panel="kits" role="tab" aria-selected="false"><span class="tab-dot" style="background:var(--mf-green)"></span> Mini-Kits</button>
        <button type="button" class="mf-profile-tab tab-red" data-mf-panel="studio" role="tab" aria-selected="false"><span class="tab-dot" style="background:var(--mf-red)"></span> App &amp; Studio</button>
      </div>
    </div>
  </div>

  <!-- ══ PANEL: Mini-Forum ══ -->
  <div class="mf-profile-panel" data-mf-panel-id="forum">
  <div class="mf-profile-section">
    <h3><?php mf_block('profile.posts.title'); ?></h3>
    <?php if($my_posts->have_posts()):?>
    <div class="mf-posts-list">
      <?php while($my_posts->have_posts()):$my_posts->the_post();
        $pid=get_the_ID();$pt=get_post_meta($pid,'_mf_type',true)?:'question';
        $ptg=get_post_meta($pid,'_mf_tag',true)?:'';
        $pts=wp_get_object_terms($pid,'mf_topic',['fields'=>'names']);$pto=!empty($pts)?$pts[0]:'';
        $pts2=str_replace(['With Family & Close Circle','At School','In Social Settings','Mini-Talks Experiences'],['Family','School','Social','Mini-Talks'],$pto);
        $bc='border-'.(['question'=>'red','experience'=>'yellow','idea'=>'blue','reflection'=>'green'][$pt]??'red');
        $bgc='bg-'.(['question'=>'red','experience'=>'yellow','idea'=>'blue','reflection'=>'green'][$pt]??'red');
        $du=add_query_arg('post_id',$pid,$fu);
      ?>
      <?php mf_block('forum.post.card', array(
        'url'          => esc_url($du),
        'border_class' => $bc,
        'badge_class'  => $bgc,
        'type_label'   => mf_type_label($pt),
        'meta'         => ($pts2 || $ptg)
            ? '<span class="mf-meta-secondary">' . esc_html(implode(' · ', array_filter(array($pts2, $ptg)))) . '</span>' : '',
        'title'        => get_the_title(),
        'preview'      => wp_trim_words(get_the_content(), 30),
        'avatar'       => mf_avatar_html($uid, 'sm'),
        'author'       => esc_html($nick),
        'role_class'   => isset($rbm[$role]) ? $rbm[$role] : 'rb-blue',
        'role'         => esc_html($role),
        'replies'      => mf_get_reply_count($pid),
        'when'         => mf_time_ago(get_the_date('Y-m-d H:i:s')),
      )); ?>
      <?php endwhile;wp_reset_postdata();?>
    </div>
    <?php else:?><p class="mf-empty-note"><?php mf_block('profile.posts.empty'); ?></p><?php endif;?>
  </div>
  </div><!-- /panel: forum -->

  <!-- ══ PANEL: Mini-Kits ══ -->
  <!-- Mini-Devices renders the kit shelf through mf_profile_kits_panel. -->
  <div class="mf-profile-panel" data-mf-panel-id="kits" hidden>
    <?php if (has_action('mf_profile_kits_panel')): ?>
      <?php do_action('mf_profile_kits_panel'); ?>
    <?php else: ?>
      <div class="mf-profile-section">
        <h3><?php mf_block('profile.kits.title'); ?></h3>
        <p class="mf-empty-note"><?php mf_block('profile.kits.empty'); ?></p>
      </div>
    <?php endif; ?>
  </div><!-- /panel: kits -->

  <!-- ══ PANEL: App &amp; Studio ══ -->
  <div class="mf-profile-panel" data-mf-panel-id="studio" hidden>
    <div class="mf-profile-section">
      <h3><?php mf_block('profile.studio.title'); ?></h3>
      <p class="mf-empty-note"><?php mf_block('profile.studio.empty'); ?></p>
    </div>
  </div><!-- /panel: studio -->
</div>

<?php include MF_PATH . 'templates/settings-popup.php'; ?>
