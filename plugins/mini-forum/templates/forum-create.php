<?php
if (!defined('ABSPATH')) exit;
if (!is_user_logged_in()) { echo '<div class="mf-container"><p>Please log in to create a post.</p></div>'; return; }
$type = sanitize_text_field($_GET['type'] ?? 'question');
$configs = [
  'question'=>['title'=>'Ask a Question','ph'=>"A question about something you're experiencing...",'body'=>"You can ask about a situation, something you're unsure about, or what others have tried...",'tags'=>['Looking for ideas','Not sure','Trying something new','Struggling'],'color'=>'red','frame'=>'#E52828','contour'=>'red'],
  'experience'=>['title'=>'Share an Experience','ph'=>"A small moment you'd like to share...",'body'=>"You can describe what happened, how it felt, or anything you noticed in that moment...",'tags'=>['Small Win','Struggling','Not sure','Trying something new'],'color'=>'yellow','frame'=>'#FFCC00','contour'=>'yellow'],
  'idea'=>['title'=>'Share an Idea','ph'=>"An idea, tool, or resource that helped...",'body'=>"You can share a tool, activity, resource, or simple approach and how it worked for you...",'tags'=>['Worked well','Still exploring','Not sure','Worth trying'],'color'=>'blue','frame'=>'#0055BF','contour'=>'blue'],
  'reflection'=>['title'=>'Event Reflections','ph'=>"A Mini-Talks moment you'd like to reflect on...",'body'=>"You can share what happened during a Mini-Talks moment, what you noticed, or what it meant to you...",'tags'=>['Small Win','Not sure','Meaningful moment','Still exploring'],'color'=>'green','frame'=>'#237841','contour'=>'green'],
];
$c = $configs[$type] ?? $configs['question'];

?>
<div class="mf-container">
  <a href="<?php echo esc_url(mf_get_forum_url()); ?>" class="mf-back">← Back to <strong>Mini-Forum</strong></a>

  <div class="mf-create-hero">
    <?php $cc=["red"=>"#E52828","yellow"=>"#E2B400","blue"=>"#0055BF","green"=>"#237841"][$c["contour"]]??"#E52828"; ?>
    <h1 class="mf-title-contour" style="-webkit-text-stroke-color:<?php echo $cc;?>!important;text-shadow:3px 3px 0 <?php echo $cc;?>,-3px -3px 0 <?php echo $cc;?>,3px -3px 0 <?php echo $cc;?>,-3px 3px 0 <?php echo $cc;?>,0 3px 0 <?php echo $cc;?>,0 -3px 0 <?php echo $cc;?>,3px 0 <?php echo $cc;?>,-3px 0 <?php echo $cc;?>!important"><?php echo esc_html($c['title']); ?></h1>
  </div>

  <div class="mf-create-card">
    <!-- Studs match type color -->
    <div class="mf-studs mf-studs-<?php echo $c['color']; ?>"></div>

    <!-- Yellow frame + white interior (smb-card style) -->
    <?php
    ob_start(); foreach ($c['tags'] as $tag): ?>
      <button type="button" class="mf-tag-chip" data-value="<?php echo esc_attr($tag); ?>">
        <span class="chip-dot" style="background:#ccc"></span> <?php echo esc_html($tag); ?>
      </button>
    <?php endforeach; $mf_tags = ob_get_clean();

    mf_block('forum.create.form', array(
      'frame_colour'      => esc_attr($c['frame']),
      'type'              => esc_attr($type),
      'title_placeholder' => esc_attr($c['ph']),
      'body_placeholder'  => esc_attr($c['body']),
      'tags'              => $mf_tags,
      'forum_url'         => esc_url(mf_get_forum_url()),
    )); ?>
  </div>
</div>
