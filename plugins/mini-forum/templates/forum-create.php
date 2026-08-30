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
    <div class="mf-create-frame" style="background:<?php echo $c['frame']; ?>">
    <div class="mf-create-body">
      <!-- Side color bars (behind card) -->
      <div class="mf-create-sides left" style="background:#E52828"></div>
      <div class="mf-create-sides right" style="background:#0055BF"></div>

      <input type="hidden" id="mf-create-type" value="<?php echo esc_attr($type); ?>" />

      <div class="mf-field-group">
        <label>Title</label>
        <input type="text" id="mf-create-title" placeholder="<?php echo esc_attr($c['ph']); ?>" />
      </div>

      <div class="mf-field-group">
        <label>What would you like to share?</label>
        <textarea id="mf-create-content" rows="5" placeholder="<?php echo esc_attr($c['body']); ?>"></textarea>
      </div>

      <!-- Topic — dropdown/select style -->
      <div class="mf-field-group">
        <label>Choose a topic <span class="mf-optional">(optional)</span></label>
        <select id="mf-create-topic" class="mf-topic-select">
          <option value="">Select a topic...</option>
          <option value="family">With Family</option>
          <option value="school">At School</option>
          <option value="social">In Social Settings</option>
          <option value="mini-talks">Mini-Talks</option>
        </select>
      </div>

      <!-- Emotional tags -->
      <div class="mf-field-group">
        <label>How would you describe this moment? <span class="mf-optional">(optional)</span></label>
        <div class="mf-tag-chips">
          <?php foreach($c['tags'] as $tag): ?>
          <button type="button" class="mf-tag-chip" data-value="<?php echo esc_attr($tag); ?>">
            <span class="chip-dot" style="background:#ccc"></span> <?php echo esc_html($tag); ?>
          </button>
          <?php endforeach; ?>
        </div>
      </div>

      <!-- Safety Note -->
      <div class="mf-safety-note-v2">
        <div class="mf-safety-shield">🛡</div>
        <span><strong>Safety Note:</strong> Feel free to keep things general — no need to share personal details.</span>
      </div>

      <div id="mf-create-error" class="mf-auth-error"></div>

      <div class="mf-form-actions">
        <a href="<?php echo esc_url(mf_get_forum_url()); ?>" class="mf-btn mf-btn-cancel">Cancel</a>
        <button class="mf-btn mf-btn-blue" onclick="mfSubmitPost()">Share</button>
      </div>
    </div>


  </div>
</div>
