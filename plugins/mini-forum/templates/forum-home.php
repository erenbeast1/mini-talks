<?php if (!defined('ABSPATH')) exit; ?>

<?php if (!is_user_logged_in()): ?>
<!-- ═══ GUEST LANDING PAGE ═══ -->
<div class="mf-container">
  <div class="mf-hero-new">
    <div class="mf-hero-left">
      <h1 class="mf-title-contour">Forum</h1>
      <div class="mf-hero-bars"><span style="background:var(--mf-red)"></span><span style="background:var(--mf-yellow)"></span><span style="background:var(--mf-blue)"></span><span style="background:var(--mf-green)"></span></div>
      <p class="mf-hero-desc">A safe space where Mini-Community members can share their experiences and feel that they are not alone.</p>
    </div>
    <div class="mf-hero-face">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="Mini-Talks" />
    </div>
  </div>
</div>

<div style="width:100%;height:1px;background:#e5e5e5;margin:10px 0 40px"></div>

<div class="mf-container">
  <!-- Guidelines section (title removed, grey box + text + color bars kept) -->
  <div class="mf-guest-what">
    <div class="mf-guest-what-flex">
      <div class="mf-guest-what-img"></div>
      <div class="mf-guest-what-text">
        <p><strong>Guidelines:</strong></p>
        <p>• Posts are shared using nicknames.<br>
        • Avoid sharing personal or sensitive details.<br>
        • Share experiences, not advice or direction.<br>
        • Medical content and treatment advice are not allowed.<br>
        • Do not compare children or their progress.<br>
        • Keep comments simple, respectful, and non-judgmental.</p>
      </div>
    </div>
    <div class="mf-guest-colorbars">
      <span style="background:var(--mf-red)"></span><span style="background:var(--mf-blue)"></span><span style="background:var(--mf-yellow)"></span><span style="background:var(--mf-green)"></span>
    </div>
  </div>
</div>

<div style="width:100%;height:1px;background:#e5e5e5;margin:30px 0 40px"></div>

<div class="mf-container">
  <!-- Forum Access -->
  <div class="mf-guest-access">
    <h2 class="mf-title-contour" style="text-align:center;font-size:clamp(24px,2.8vw,42px);margin-bottom:10px">Forum Access</h2>
    <p class="mf-guest-access-sub">Forum is part of Mini-Community. To access the Forum, you must first be an approved Mini-Community member.</p>

    <div class="mf-guest-cards">
      <div class="mf-guest-card">
        <div class="mf-guest-card-studs" style="background-image:url('https://mini-talks.org/wp-content/uploads/2026/04/yeni_kirmizi_studs_4.png')"></div>
        <div class="mf-guest-card-body" style="background:var(--mf-red)">
          <h3>Not a Mini-Community<br>Member Yet</h3>
          <div class="mf-guest-card-inner">
            <p>To access the Forum, you first need to join Mini-Community.</p>
            <a href="/mini-community/join-us/" class="mf-guest-card-btn" style="color:var(--mf-red)">Join Us</a>
          </div>
        </div>
      </div>
      <div class="mf-guest-card">
        <div class="mf-guest-card-studs" style="background-image:url('https://mini-talks.org/wp-content/uploads/2026/04/yeni_mavi_studs_4.png')"></div>
        <div class="mf-guest-card-body" style="background:var(--mf-blue)">
          <h3>I'm a Mini-Community<br>Member</h3>
          <div class="mf-guest-card-inner">
            <p>You can sign in with your email address and password.</p>
            <button class="mf-guest-card-btn" style="color:var(--mf-blue)" onclick="mtOpenAuth('login')">Sign In</button>
          </div>
        </div>
      </div>
    </div>

    <div class="mf-guest-notice">Real names are not visible in the forum. | Posts are shared using nicknames only.</div>
  </div>
</div>

<?php else: ?>
<!-- ═══ LOGGED-IN FORUM ═══ -->
<div class="mf-container">
  <div class="mf-hero-new">
    <div class="mf-hero-left">
      <h1 class="mf-title-contour">Mini-Forum</h1>
      <div class="mf-hero-bars"><span style="background:var(--mf-red)"></span><span style="background:var(--mf-yellow)"></span><span style="background:var(--mf-blue)"></span><span style="background:var(--mf-green)"></span></div>
      <p class="mf-hero-desc">Share. Connect. Support.</p>
      <p class="mf-hero-desc">A safe space for families, experts, and volunteers.</p>
    </div>
    <div class="mf-hero-face">
      <img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="Mini-Talks" />
    </div>
  </div>

  <div class="mf-hero-center">
    <h2 class="mf-title-contour">Mini-Forum</h2>
    <p>A calm space to share questions, experiences, and small moments.</p>
  </div>

  <div class="mf-actions-grid">
    <?php $acts=[['question','Ask a Question','Ask about everyday situations and hear what helped others','red'],['experience','Share an Experience','Share what happened in a simple and supportive way','yellow'],['idea','Share an Idea','Share an idea, resource, or small strategy that others might find helpful','blue'],['reflection','Event Reflections','Reflect on a Mini-Talks moment and what it meant to you','green']];
    foreach($acts as $a):$url=add_query_arg(['view'=>'create','type'=>$a[0]],mf_get_forum_url());?>
    <a href="<?php echo esc_url($url);?>" class="mf-action-card">
      <div class="mf-studs mf-studs-<?php echo $a[3];?>"></div>
      <div class="mf-action-body bg-<?php echo $a[3];?>"><div class="mf-action-icon"></div><div><h4><?php echo $a[1];?></h4><p><?php echo $a[2];?></p></div></div>
    </a>
    <?php endforeach;?>
  </div>

  <div class="mf-filter-row">
    <div class="mf-filter-chips">
      <button class="mf-chip active" data-filter="all">All</button>
      <button class="mf-chip" data-filter="family"><span class="mf-chip-dot" style="background:var(--mf-red)"></span> Family</button>
      <button class="mf-chip" data-filter="school"><span class="mf-chip-dot" style="background:var(--mf-yellow)"></span> School</button>
      <button class="mf-chip" data-filter="social"><span class="mf-chip-dot" style="background:var(--mf-blue)"></span> Social</button>
      <button class="mf-chip" data-filter="mini-talks"><span class="mf-chip-dot" style="background:var(--mf-green)"></span> Mini-Talks</button>
    </div>
    <div class="mf-search-wrap"><span class="mf-search-icon">⌕</span><input type="text" id="mf-search" placeholder="Search posts..." /></div>
  </div>

  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:18px;flex-wrap:wrap;gap:12px">
    <h2 class="mf-section-title" style="font-weight:900;margin:0!important">Recent Posts</h2>
    <div class="mf-pagination"><span style="font-size:12px;font-weight:700;color:var(--mf-soft)">Page<br>Section</span><span class="mf-page-num" id="mf-page-num">1</span><button class="mf-page-next" id="mf-page-next" onclick="mfLoadMore()" style="display:none">›</button></div>
  </div>
  <div id="mf-posts-list" class="mf-posts-list"><div class="mf-loading">Loading...</div></div>

  <div class="mf-guidelines-card">
    <div class="mf-guidelines-studs"></div>
    <div class="mf-guidelines-frame">
      <div class="mf-guidelines-body">
        <h3>A calm space for sharing</h3>
        <p>Mini-Forum is a safe and supportive space. Here are a few simple guidelines:</p>
        <div class="mf-guidelines-grid">
          <?php foreach(['Share in a general and comfortable way','Avoid names or personal identifiers','Focus on experiences, not advice-giving','Be kind, patient, and respectful','Avoid comparing children or progress','This is not a space for medical advice','Reflect before applying shared suggestions','Keep posts positive and non-overwhelming'] as $g):?>
          <div class="mf-guideline-item"><div class="mf-guideline-icon"></div><?php echo esc_html($g);?></div>
          <?php endforeach;?>
        </div>
      </div>
    </div>
  </div>
</div>
<?php endif; ?>
