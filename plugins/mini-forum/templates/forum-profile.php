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
      <div class="mf-avatar-col">
        <div class="mf-avatar-lg mf-av-editable" role="button" tabindex="0" aria-label="Edit your avatar">
          <?php echo mf_avatar_html($uid, 'lg'); ?>
          <span class="mf-av-edit-overlay">Edit</span>
        </div>
        <button type="button" class="mf-av-edit-btn" aria-label="Customize your avatar">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
          Customize Avatar
        </button>
      </div>
      <div class="mf-profile-info">
        <h1><?php echo esc_html($nick);?></h1>
        <div class="mf-profile-roles">
          <?php if(!empty($roles)): foreach($roles as $r):$l=str_replace('Mini-','',$r);$bc=$rbm[$l]??'rb-blue';?>
          <span class="mf-role-badge <?php echo $bc;?>"><?php echo esc_html($l);?></span>
          <?php endforeach; else: $bc=$rbm[$role]??'rb-blue';?>
          <span class="mf-role-badge <?php echo $bc;?>"><?php echo esc_html($role);?></span>
          <?php endif;?>
        </div>
        <p class="mf-profile-community">Part of the Mini-Talks community</p>
        <div class="mf-stats-row">
          <div class="mf-stat-box">Posts: <?php echo $pc;?></div>
          <div class="mf-stat-box">Events: 0</div>
          <div class="mf-stat-box" id="mf-stat-kits">Kits: 0</div>
        </div>
      </div>
      <div class="mf-profile-settings">
        <button type="button" class="mf-settings-btn" onclick="mfOpenSettings()" aria-label="Open account settings">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.36.44.63.81.76H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
          Settings
        </button>
      </div>
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
    <h3>My Posts</h3>
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
      <a href="<?php echo esc_url($du);?>" class="mf-post-card <?php echo $bc;?>">
        <div class="mf-pc-inner">
          <div style="flex:1">
            <div class="mf-post-meta">
              <span class="mf-type-badge <?php echo $bgc;?>"><?php echo mf_type_label($pt);?></span>
              <?php if($pts2||$ptg):?><span class="mf-meta-secondary"><?php echo esc_html(implode(' · ',array_filter([$pts2,$ptg])));?></span><?php endif;?>
            </div>
            <div class="mf-pc-title"><?php the_title();?></div>
            <div class="mf-pc-preview"><?php echo wp_trim_words(get_the_content(),30);?></div>
          </div>
          <div class="mf-pc-right">
            <div class="mf-pc-user">
              <?php echo mf_avatar_html($uid, 'sm'); ?>
              <div><div class="mf-pc-user-name"><?php echo esc_html($nick);?></div><span class="mf-role-badge <?php echo $rbm[$role]??'rb-blue';?>"><?php echo esc_html($role);?></span></div>
            </div>
            <span class="mf-meta-light"><?php echo mf_get_reply_count($pid);?> replies · <?php echo mf_time_ago(get_the_date('Y-m-d H:i:s'));?></span>
            <span class="mf-pc-arrow">›</span>
          </div>
        </div>
      </a>
      <?php endwhile;wp_reset_postdata();?>
    </div>
    <?php else:?><p class="mf-empty-note">No posts yet.</p><?php endif;?>
  </div>
  </div><!-- /panel: forum -->

  <!-- ══ PANEL: Mini-Kits ══ -->
  <!-- Mini-Devices renders the kit shelf through mf_profile_kits_panel. -->
  <div class="mf-profile-panel" data-mf-panel-id="kits" hidden>
    <?php if (has_action('mf_profile_kits_panel')): ?>
      <?php do_action('mf_profile_kits_panel'); ?>
    <?php else: ?>
      <div class="mf-profile-section">
        <h3>Mini-Kits</h3>
        <p class="mf-empty-note">Your Mini-Talks kits will appear here once the Mini-Devices plugin is active.</p>
      </div>
    <?php endif; ?>
  </div><!-- /panel: kits -->

  <!-- ══ PANEL: App &amp; Studio ══ -->
  <div class="mf-profile-panel" data-mf-panel-id="studio" hidden>
    <div class="mf-profile-section">
      <h3>App &amp; Studio</h3>
      <p class="mf-empty-note">Coming soon.</p>
    </div>
  </div><!-- /panel: studio -->
</div>

<?php include MF_PATH . 'templates/settings-popup.php'; ?>
