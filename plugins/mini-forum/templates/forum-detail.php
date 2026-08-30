<?php
if (!defined('ABSPATH')) exit;
$post_id=intval($_GET['post_id']??0);
if(!$post_id){echo '<div class="mf-container"><p>Post not found.</p></div>';return;}
$post=get_post($post_id);
if(!$post||$post->post_type!=='mf_post'){echo '<div class="mf-container"><p>Post not found.</p></div>';return;}
$type=get_post_meta($post_id,'_mf_type',true)?:'question';
$tag=get_post_meta($post_id,'_mf_tag',true)?:'';
$topics=wp_get_object_terms($post_id,'mf_topic',['fields'=>'names']);
$topic=!empty($topics)?$topics[0]:'';
$ts=str_replace(['With Family & Close Circle','At School','In Social Settings','Mini-Talks Experiences'],['Family','School','Social','Mini-Talks'],$topic);
$aid=$post->post_author;$nick=mf_get_nickname($aid);$role=mf_get_user_role($aid);
$tl=mf_type_label($type);$bc_map=['question'=>'border-red','experience'=>'border-yellow','idea'=>'border-blue','reflection'=>'border-green'];
$bg_map=['question'=>'bg-red','experience'=>'bg-yellow','idea'=>'bg-blue','reflection'=>'bg-green'];
$bc=$bc_map[$type]??'border-red';$bgc=$bg_map[$type]??'bg-red';
$rbc=['Family'=>'rb-blue','Expert'=>'rb-green','Volunteer'=>'rb-yellow','Talk-Spot'=>'rb-red'][$role]??'rb-blue';
$rc=mf_get_reply_count($post_id);$ta=mf_time_ago($post->post_date);
global $wpdb;$replies=$wpdb->get_results($wpdb->prepare("SELECT * FROM {$wpdb->prefix}mf_replies WHERE post_id=%d AND status='approved' ORDER BY created_at ASC",$post_id));
$parents=[];$children=[];
foreach($replies as $r){
  $pid_r=isset($r->parent_id)?(int)$r->parent_id:0;
  if($pid_r===0)$parents[]=$r;else $children[$pid_r][]=$r;
}
$react_table=$wpdb->prefix.'mf_reactions';
$react_map=[];$my_reacts=[];
$reply_ids=array_map(function($r){return $r->id;},$replies);
if(!empty($reply_ids)){
  $ids_str=implode(',',$reply_ids);
  $all_r=$wpdb->get_results("SELECT reply_id,emoji,COUNT(*) as cnt FROM $react_table WHERE reply_id IN($ids_str) GROUP BY reply_id,emoji");
  foreach($all_r as $ar){$react_map[$ar->reply_id][$ar->emoji]=(int)$ar->cnt;}
  if(is_user_logged_in()){
    $uid_c=get_current_user_id();
    $my_rows=$wpdb->get_results($wpdb->prepare("SELECT reply_id,emoji FROM $react_table WHERE user_id=%d AND reply_id IN($ids_str)",$uid_c));
    foreach($my_rows as $mr){$my_reacts[$mr->reply_id][$mr->emoji]=true;}
  }
}
$emojis=['❤️','👍','🤗','💡'];
?>
<div class="mf-container">
  <a href="<?php echo esc_url(mf_get_forum_url());?>" class="mf-back">← Back to <strong>Mini-Forum</strong></a>

  <!-- Main Post Card — colored border, thick bottom, NO studs -->
  <div class="mf-detail-card <?php echo $bc;?>">
    <div class="mf-detail-inner">
      <div class="mf-post-meta">
        <span class="mf-type-badge <?php echo $bgc;?>"><?php echo esc_html($tl);?></span>
        <?php if($ts||$tag):?><span class="mf-meta-secondary"><?php echo esc_html(implode(' · ',array_filter([$ts,$tag])));?></span><?php endif;?>
      </div>
      <h1><?php echo esc_html($post->post_title);?></h1>
      <div class="mf-detail-body"><?php echo wpautop(esc_html($post->post_content));?></div>
      <div class="mf-detail-author">
        <?php echo mf_avatar_html($aid, 'sm'); ?>
        <strong><?php echo esc_html($nick);?></strong>
        <span class="mf-role-badge <?php echo $rbc;?>"><?php echo esc_html($role);?></span>
        <span class="mf-meta-light"><?php echo $rc;?> replies · <?php echo esc_html($ta);?></span>
      </div>
    </div>
  </div>

  <!-- Replies Title -->
  <h2 class="mf-section-title mf-title-contour" style="font-size:clamp(20px,2.2vw,32px)">Replies</h2>

  <!-- Replies Frame — blue border around everything -->
  <div class="mf-replies-frame">
    <?php if(empty($parents)):?>
    <p class="mf-no-replies">No responses yet. Be the first to share a supportive thought.</p>
    <?php else: foreach($parents as $r):
      $rn=mf_get_nickname($r->user_id);$rr=mf_get_user_role($r->user_id);
      $rrc=['Family'=>'rb-blue','Expert'=>'rb-green','Volunteer'=>'rb-yellow','Talk-Spot'=>'rb-red'][$rr]??'rb-blue';
      $r_reacts=$react_map[$r->id]??[];$r_mine=$my_reacts[$r->id]??[];
    ?>
    <div class="mf-reply-card" id="reply-<?php echo $r->id;?>">
      <div class="mf-reply-top">
        <div class="mf-reply-user">
          <?php echo mf_avatar_html($r->user_id, 'sm'); ?>
          <strong><?php echo esc_html($rn);?></strong>
          <span class="mf-role-badge <?php echo $rrc;?>"><?php echo esc_html($rr);?></span>
        </div>
        <span class="mf-meta-light"><?php echo mf_time_ago($r->created_at);?></span>
      </div>
      <p><?php echo nl2br(esc_html($r->content));?></p>
      <div class="mf-reactions" data-reply-id="<?php echo $r->id;?>">
        <?php foreach($emojis as $em):$cnt=$r_reacts[$em]??0;$mine=isset($r_mine[$em]);?>
        <button class="mf-react-btn<?php echo $mine?' active':'';?>" onclick="mfToggleReaction(<?php echo $r->id;?>,'<?php echo $em;?>')" title="<?php echo $em;?>"><?php echo $em;?><?php if($cnt):?><span class="mf-react-count"><?php echo $cnt;?></span><?php endif;?></button>
        <?php endforeach;?>
        <?php if(is_user_logged_in()):?>
        <button class="mf-reply-btn" onclick="mfShowSubReply(<?php echo $r->id;?>)">↩ Reply</button>
        <?php endif;?>
      </div>
      <?php if(!empty($children[$r->id])):?>
      <div class="mf-sub-replies">
        <?php foreach($children[$r->id] as $sr):
          $srn=mf_get_nickname($sr->user_id);$srr=mf_get_user_role($sr->user_id);
          $srrc=['Family'=>'rb-blue','Expert'=>'rb-green','Volunteer'=>'rb-yellow','Talk-Spot'=>'rb-red'][$srr]??'rb-blue';
          $sr_reacts=$react_map[$sr->id]??[];$sr_mine=$my_reacts[$sr->id]??[];
        ?>
        <div class="mf-sub-reply-card" id="reply-<?php echo $sr->id;?>">
          <div class="mf-reply-top">
            <div class="mf-reply-user">
              <?php echo mf_avatar_html($sr->user_id, 'xs'); ?>
              <strong style="font-size:13px"><?php echo esc_html($srn);?></strong>
              <span class="mf-role-badge <?php echo $srrc;?>" style="font-size:10px;padding:2px 8px"><?php echo esc_html($srr);?></span>
            </div>
            <span class="mf-meta-light" style="font-size:11px"><?php echo mf_time_ago($sr->created_at);?></span>
          </div>
          <p style="font-size:13px"><?php echo nl2br(esc_html($sr->content));?></p>
          <div class="mf-reactions" data-reply-id="<?php echo $sr->id;?>">
            <?php foreach($emojis as $em):$cnt=$sr_reacts[$em]??0;$mine=isset($sr_mine[$em]);?>
            <button class="mf-react-btn<?php echo $mine?' active':'';?>" onclick="mfToggleReaction(<?php echo $sr->id;?>,'<?php echo $em;?>')" title="<?php echo $em;?>"><?php echo $em;?><?php if($cnt):?><span class="mf-react-count"><?php echo $cnt;?></span><?php endif;?></button>
            <?php endforeach;?>
          </div>
        </div>
        <?php endforeach;?>
      </div>
      <?php endif;?>
      <?php if(is_user_logged_in()):?>
      <div class="mf-sub-reply-input" id="sub-reply-<?php echo $r->id;?>" style="display:none">
        <textarea placeholder="Write a reply..." rows="1"></textarea>
        <button class="mf-btn mf-btn-blue" onclick="mfSubmitSubReply(<?php echo $post_id;?>,<?php echo $r->id;?>)">Send</button>
      </div>
      <?php endif;?>
    </div>
    <?php endforeach;endif;?>

    <!-- Reply Input — inside the frame -->
    <?php if(is_user_logged_in()):?>
    <div class="mf-reply-input-row">
      <textarea id="mf-reply-content" placeholder="Write a reply..." rows="2"></textarea>
      <button class="mf-btn mf-btn-blue" onclick="mfSubmitReply(<?php echo $post_id;?>)">Send</button>
    </div>
    <?php endif;?>

    <!-- Safety Note — inside the frame -->
    <div class="mf-safety-note-v2">
      <div class="mf-safety-shield">🛡</div>
      <span>Please keep things general and avoid personal details.</span>
    </div>
  </div>

  <?php if(!is_user_logged_in()):?>
  <div class="mf-login-prompt">
    <p>Join the community to share a response.</p>
    <button class="mf-btn mf-btn-blue" onclick="mtOpenAuth()">Join Us</button>
  </div>
  <?php endif;?>
</div>
