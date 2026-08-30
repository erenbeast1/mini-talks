<?php if (!defined('ABSPATH')) exit; ?>
<?php if (is_user_logged_in()): ?>
<script>window.location.href="<?php echo esc_url(mf_get_forum_url());?>";</script>
<?php return; endif; ?>

<div class="mt-joinus">
  <div class="mt-joinus-inner">

    <div class="mt-joinus-title"><h2>Join Us!</h2></div>
    <div id="mf-join-error" class="mf-auth-error" style="max-width:700px;margin:0 auto 20px"></div>

    <!-- STEP 1 — Role Selection (open by default) -->
    <div class="mt-ju-step" id="ju-step1">
      <div class="mt-ju-num"><span style="color:#E52828">1</span></div>
      <div class="mt-ju-card">
        <div class="mt-ju-card-box mt-ju-card-red">
          <div class="mt-ju-card-inner">
            <h3>Choose Your Area <span>(Select one)</span></h3>
            <div class="mt-ju-roles">
              <div class="mt-ju-role" data-value="Mini-Family" onclick="mfJuSelect(this)">
                <img src="https://mini-talks.org/wp-content/uploads/2026/03/17_mini_families_3D.png" alt="" />
                <div><strong>Mini-Families</strong><span>For families supporting a child's communication journey, or adults (18+) with lived experience.</span></div>
              </div>
              <div class="mt-ju-role" data-value="Mini-Expert" onclick="mfJuSelect(this)">
                <img src="https://mini-talks.org/wp-content/uploads/2026/03/20_mini_experts_3D.png" alt="" />
                <div><strong>Mini-Experts</strong><span>For professionals and educators working in communication and selective mutism.</span></div>
              </div>
              <div class="mt-ju-role" data-value="Mini-Volunteer" onclick="mfJuSelect(this)">
                <img src="https://mini-talks.org/wp-content/uploads/2026/03/18_mini_volunteers_3D-e1772736794933.png" alt="" />
                <div><strong>Mini-Volunteers</strong><span>For individuals who want to support children and families in their communication journey.</span></div>
              </div>
              <div class="mt-ju-role" data-value="Talk-Spot" onclick="mfJuSelect(this)">
                <img src="https://mini-talks.org/wp-content/uploads/2026/03/19_talk_spots_3D.png" alt="" />
                <div><strong>Talk-Spots</strong><span>For venues and organizations that want to create safe and supportive spaces for communication.</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- STEP 2 — Account Details (revealed after role pick) -->
    <div class="mt-ju-step is-hidden" id="ju-step2">
      <div class="mt-ju-num"><span style="color:#0055BF">2</span></div>
      <div class="mt-ju-card">
        <div class="mt-ju-card-box mt-ju-card-blue">
          <div class="mt-ju-card-inner">
            <div class="mt-ju-formrow">
              <div class="mt-ju-formfield"><label>Full Name:</label><span class="mt-ju-sub">(Not displayed in forum)</span><input type="text" id="ju-fullname" class="bdr-red" /></div>
              <div class="mt-ju-formfield"><label>Password:</label><span class="mt-ju-sub">(At least 8 characters)</span><input type="password" id="ju-password" class="bdr-blue" /></div>
              <div class="mt-ju-formfield"><label>Email Address:</label><span class="mt-ju-sub">(Used for login)</span><input type="email" id="ju-email" class="bdr-green" /></div>
            </div>
            <div class="mt-ju-formrow">
              <div class="mt-ju-formfield"><label>City:</label><span class="mt-ju-sub">(Optional)</span><input type="text" id="ju-city" class="bdr-red" /></div>
              <div class="mt-ju-formfield"><label>Country:</label><span class="mt-ju-sub">(Optional)</span><input type="text" id="ju-country" class="bdr-green" /></div>
              <div class="mt-ju-formfield"><label>Nickname:</label><span class="mt-ju-sub">(Displayed in forum)</span><input type="text" id="ju-nickname" class="bdr-yellow" /></div>
            </div>
            <div id="ju-dynamic-fields"></div>
            <div class="mt-ju-formrow">
              <div class="mt-ju-formfield" style="flex:1!important"><label>Additional Info:</label><span class="mt-ju-sub">(Optional)</span><textarea id="ju-extra" placeholder="Add a short note if you'd like..."></textarea></div>
            </div>
            <div class="mt-ju-step-actions">
              <button type="button" class="mt-ju-continue mt-ju-continue-blue" onclick="mfJuStep2Continue()">Continue</button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- STEP 3 — Consent (revealed after step 2 continue) -->
    <div class="mt-ju-step is-hidden" id="ju-step3">
      <div class="mt-ju-num"><span style="color:#FFCC00">3</span></div>
      <div class="mt-ju-card">
        <div class="mt-ju-card-box mt-ju-card-yellow">
          <div class="mt-ju-card-inner">
            <h3>Acknowledgment & Consent</h3>
            <label class="mt-ju-consent">
              <input type="checkbox" id="ju-consent" />
              <span>I have read and accept the Mini-Community Guidelines and Terms of Participation.</span>
            </label>
            <a href="/mini-community/guidelines/" target="_blank" class="mt-ju-guidelines-link">View Guidelines and Terms of Participation</a>
            <p class="mt-ju-info">
              Mini-Community does not provide treatment, referrals, or child-specific evaluations.<br>
              All shared content is based on personal experience and awareness.<br>
              Personal information is kept confidential and never shared without consent.
            </p>
            <div style="text-align:center;padding:20px 0 12px">
              <button class="mt-ju-btn" type="button" onclick="mfJuSubmit()">
                <div class="mt-ju-btn-stud"></div>
                <div class="mt-ju-btn-topbar"></div>
                <div class="mt-ju-btn-inner"><img class="mt-ju-btn-heart" src="https://mini-talks.org/wp-content/uploads/2026/05/17-removebg-preview.png" alt="" /><span class="mt-ju-btn-label">Join</span></div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

  </div>
</div>

<script>
(function($){
  var selectedRole='';

  // STEP 1 → role pick, reveal STEP 2
  window.mfJuSelect=function(el){
    $('.mt-ju-role').removeClass('active');
    $(el).addClass('active');
    selectedRole=$(el).data('value');

    // Build dynamic fields based on role (rendered inside step 2)
    var html='';
    if(selectedRole==='Mini-Family'){
      html='<div class="mt-ju-formrow"><div class="mt-ju-formfield"><label>Child\'s age group</label><select id="ju-extra1" class="mt-ju-select"><option value="">Select...</option><option>4–6</option><option>7–9</option><option>10–12</option><option>13–17</option></select></div></div>';
    } else if(selectedRole==='Mini-Expert'){
      html='<div class="mt-ju-formrow"><div class="mt-ju-formfield"><label>Your field</label><select id="ju-extra1" class="mt-ju-select"><option value="">Select...</option><option>Educator</option><option>Therapist</option><option>Psychologist</option><option>Researcher</option><option>Speech & Language Therapist</option><option>Other</option></select></div><div class="mt-ju-formfield"><label>Organization</label><input type="text" id="ju-extra2" placeholder="School, clinic..." /></div></div>';
    } else if(selectedRole==='Mini-Volunteer'){
      html='<div class="mt-ju-formrow"><div class="mt-ju-formfield"><label>How would you prefer to contribute?</label><select id="ju-extra1" class="mt-ju-select"><option value="">Select...</option><option>In person</option><option>Online</option><option>Hybrid</option><option>Not sure yet</option></select></div></div>';
    } else if(selectedRole==='Talk-Spot'){
      html='<div class="mt-ju-formrow"><div class="mt-ju-formfield"><label>Organization Name</label><input type="text" id="ju-extra1" placeholder="Name of your venue" /></div><div class="mt-ju-formfield"><label>Type of Space</label><input type="text" id="ju-extra2" placeholder="café, clinic, school..." /></div></div>';
    }
    $('#ju-dynamic-fields').html(html);

    var $s2=$('#ju-step2');
    if($s2.hasClass('is-hidden')){
      $s2.removeClass('is-hidden').hide().css('opacity',0).slideDown(350,function(){
        $s2.animate({opacity:1},250);
        $('html,body').animate({scrollTop:$s2.offset().top-40},400);
      });
    }
  };

  // STEP 2 → validate, reveal STEP 3
  window.mfJuStep2Continue=function(){
    var $err=$('#mf-join-error');$err.hide();
    var fullname=$('#ju-fullname').val().trim(),
        email   =$('#ju-email').val().trim(),
        pass    =$('#ju-password').val(),
        nick    =$('#ju-nickname').val().trim();

    if(!fullname||!email||!pass||!nick){
      $err.text('Please fill in Full Name, Email, Password, and Nickname.').show();
      window.scrollTo({top:0,behavior:'smooth'});return;
    }
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){
      $err.text('Please enter a valid email address.').show();
      window.scrollTo({top:0,behavior:'smooth'});return;
    }
    if(pass.length<8){
      $err.text('Password must be at least 8 characters.').show();
      window.scrollTo({top:0,behavior:'smooth'});return;
    }

    var $s3=$('#ju-step3');
    if($s3.hasClass('is-hidden')){
      $s3.removeClass('is-hidden').hide().css('opacity',0).slideDown(350,function(){
        $s3.animate({opacity:1},250);
        $('html,body').animate({scrollTop:$s3.offset().top-40},400);
      });
    } else {
      $('html,body').animate({scrollTop:$s3.offset().top-40},400);
    }
  };

  // STEP 3 → submit
  window.mfJuSubmit=function(){
    var $err=$('#mf-join-error');$err.hide();
    if(!selectedRole){$err.text('Please select an area.').show();window.scrollTo({top:0,behavior:'smooth'});return;}
    var fullname=$('#ju-fullname').val().trim(),email=$('#ju-email').val().trim(),pass=$('#ju-password').val(),nick=$('#ju-nickname').val().trim();
    if(!fullname||!email||!pass||!nick){$err.text('Please fill in Full Name, Email, Password, and Nickname.').show();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$err.text('Please enter a valid email address.').show();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(pass.length<8){$err.text('Password must be at least 8 characters.').show();window.scrollTo({top:0,behavior:'smooth'});return;}
    if(!$('#ju-consent').is(':checked')){$err.text('Please accept the guidelines.').show();window.scrollTo({top:0,behavior:'smooth'});return;}

    var $btn=$('.mt-ju-btn');var $label=$btn.find('.mt-ju-btn-label');var origLabel=$label.text();
    $label.text('Submitting...');$btn.css('opacity',.6).prop('disabled',true);
    $.post(mf_ajax.url,{
      action:'mf_register',nonce:mf_ajax.nonce,
      fullname:fullname,nickname:nick,email:email,password:pass,
      roles:[selectedRole],country:$('#ju-country').val().trim(),city:$('#ju-city').val().trim(),
      extra1:$('#ju-extra1').val()||'',extra2:$('#ju-extra2').val()||''
    },function(res){
      if(res.success) {
        if(res.data && res.data.pending) {
          // Pending-approval flow: hide steps 1+2, replace step 3 with thanks card
          $('#ju-step1,#ju-step2').slideUp(250);
          $('#ju-step3 .mt-ju-card-inner').html(
            '<div class="mt-ju-success-card">' +
              '<img src="https://mini-talks.org/wp-content/uploads/2026/05/17-removebg-preview.png" alt="" class="mt-ju-success-icon" />' +
              '<h3>Thanks for joining Mini-Talks!</h3>' +
              '<p>Your application is now in <strong>pending review</strong>. ' +
              'We have sent a confirmation email to <strong>' + email + '</strong>.</p>' +
              '<p class="mt-ju-success-sub">You will receive another email once your account is approved.</p>' +
            '</div>'
          );
          $('html,body').animate({scrollTop:$('#ju-step3').offset().top-40},400);
        } else if(res.data && res.data.redirect) {
          window.location.href = res.data.redirect;
        } else {
          window.location.href = mf_ajax.forum_url;
        }
      }
      else{
        $label.text(origLabel);$btn.css('opacity',1).prop('disabled',false);
        $err.text(res.data.message).show();window.scrollTo({top:0,behavior:'smooth'});
      }
    }).fail(function(){
      $label.text(origLabel);$btn.css('opacity',1).prop('disabled',false);
      $err.text('Something went wrong.').show();
    });
  };
})(jQuery);
</script>
