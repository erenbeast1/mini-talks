<?php if (!defined('ABSPATH')) exit; ?>
<?php if (is_user_logged_in()): ?>
<script>window.location.href="<?php echo esc_url(mf_get_forum_url());?>";</script>
<?php return; endif; ?>

<div class="mt-joinus">
  <div class="mt-joinus-inner">

    <div class="mt-joinus-title"><h2><?php mf_block('join.title'); ?></h2></div>
    <div id="mf-join-error" class="mf-auth-error" style="max-width:700px;margin:0 auto 20px"></div>

    <!-- STEP 1 — Role Selection (open by default) -->
    <?php mf_block('join.step1', array(
      'img_family'    => esc_url('https://mini-talks.org/wp-content/uploads/2026/03/17_mini_families_3D.png'),
      'img_expert'    => esc_url('https://mini-talks.org/wp-content/uploads/2026/03/20_mini_experts_3D.png'),
      'img_volunteer' => esc_url('https://mini-talks.org/wp-content/uploads/2026/03/18_mini_volunteers_3D-e1772736794933.png'),
      'img_talkspot'  => esc_url('https://mini-talks.org/wp-content/uploads/2026/03/19_talk_spots_3D.png'),
    )); ?>

    <!-- STEP 2 — Account Details (revealed after role pick) -->
    <?php mf_block('join.step2'); ?>

    <!-- STEP 3 — Consent (revealed after step 2 continue) -->
    <?php mf_block('join.step3', array('img_heart' => esc_url('https://mini-talks.org/wp-content/uploads/2026/05/17-removebg-preview.png'))); ?>

  </div>
</div>

<script>
(function($){
  var selectedRole='';

  /* The three steps are editable HTML, and saving strips onclick, so the
     buttons bind on data-mf-action instead. Rearrange the markup however you
     like; keep the attribute and it still works. */
  $(document).on('click', '[data-mf-action="ju-role"]',     function(){ window.mfJuSelect(this); });
  $(document).on('click', '[data-mf-action="ju-continue"]', function(){ window.mfJuStep2Continue(); });
  $(document).on('click', '[data-mf-action="ju-submit"]',   function(){ window.mfJuSubmit(); });

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
