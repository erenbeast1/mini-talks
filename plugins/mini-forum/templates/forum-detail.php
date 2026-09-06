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
  <?php mf_block('forum.post.detail', array(
    'border_class' => $bc,
    'badge_class'  => $bgc,
    'type_label'   => esc_html($tl),
    'meta'         => ($ts || $tag)
        ? '<span class="mf-meta-secondary">' . esc_html(implode(' · ', array_filter(array($ts, $tag)))) . '</span>' : '',
    'title'        => esc_html($post->post_title),
    'body'         => wpautop(esc_html($post->post_content)),
    'avatar'       => mf_avatar_html($aid, 'sm'),
    'author'       => esc_html($nick),
    'role_class'   => $rbc,
    'role'         => esc_html($role),
    'replies'      => (int) $rc,
    'when'         => esc_html($ta),
  )); ?>

  <!-- Replies Title -->
  <h2 class="mf-section-title mf-title-contour" style="font-size:clamp(20px,2.2vw,32px)">Replies</h2>

  <!-- Replies Frame — blue border around everything -->
  <div class="mf-replies-frame">
    <?php if(empty($parents)):?>
    <p class="mf-no-replies">No responses yet. Be the first to share a supportive thought.</p>
    <?php else: foreach($parents as $r): ?>
    <?php
    /* One design for a reply, used for a top-level one and for each reply to
       it — so there is a single place to change how a reply looks. */
    if (!function_exists('mf_render_reply')) {
      function mf_render_reply($r, $emojis, $react_map, $my_reacts, $subs_html = '') {
        $rn  = mf_get_nickname($r->user_id);
        $rr  = mf_get_user_role($r->user_id);
        $rrc = ['Family'=>'rb-blue','Expert'=>'rb-green','Volunteer'=>'rb-yellow','Talk-Spot'=>'rb-red'][$rr] ?? 'rb-blue';
        $mine_map = $my_reacts[$r->id] ?? [];
        $counts   = $react_map[$r->id] ?? [];

        $reactions = '';
        foreach ($emojis as $em) {
          $cnt  = $counts[$em] ?? 0;
          $mine = isset($mine_map[$em]);
          $reactions .= '<button class="mf-react-btn' . ($mine ? ' active' : '') . '"' .
                        ' data-mf-action="react" data-reply-id="' . (int)$r->id . '"' .
                        ' data-emoji="' . esc_attr($em) . '" title="' . esc_attr($em) . '">' . esc_html($em) .
                        ($cnt ? '<span class="mf-react-count">' . (int)$cnt . '</span>' : '') . '</button>';
        }
        $reply_btn = is_user_logged_in()
          ? '<button class="mf-reply-btn" data-mf-action="subreply" data-reply-id="' . (int)$r->id . '">↩ Reply</button>'
          : '';

        mf_block('forum.reply.card', array(
          'id'           => (int)$r->id,
          'avatar'       => mf_avatar_html($r->user_id, 'sm'),
          'author'       => esc_html($rn),
          'role_class'   => $rrc,
          'role'         => esc_html($rr),
          'when'         => mf_time_ago($r->created_at),
          'message'      => nl2br(esc_html($r->content)),
          'reactions'    => $reactions,
          'reply_button' => $reply_btn,
          'sub_replies'  => $subs_html,
        ));
      }
    }

    ob_start();
    if (!empty($children[$r->id])) {
      echo '<div class="mf-sub-replies">';
      foreach ($children[$r->id] as $sr) { mf_render_reply($sr, $emojis, $react_map, $my_reacts); }
      echo '</div>';
    }
    $mf_subs = ob_get_clean();
    mf_render_reply($r, $emojis, $react_map, $my_reacts, $mf_subs);
    ?>
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
