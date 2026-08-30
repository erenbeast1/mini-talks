/**
 * Mini-Forum Auth JS — Global (multi-step register)
 */
(function($){
  'use strict';

  var selectedRoles = [];

  window.mfOpenAuth = function(mode){
    if(mf_ajax.is_logged_in==1){window.location.href=mf_ajax.profile_url;return;}
    $('#mf-auth-error').hide();
    if(mode==='login') mfShowLogin(); else mfShowRegister();
    $('#mf-auth-overlay').css({display:'flex',opacity:0}).animate({opacity:1},200);
    document.body.style.overflow='hidden';
  };
  window.mtOpenAuth = function(mode){ window.mfOpenAuth(mode); };
  window.mfRequireAuth = function(e){if(e)e.preventDefault();if(mf_ajax.is_logged_in==1)return true;mfOpenAuth();return false;};
  window.mfCloseAuth = function(){$('#mf-auth-overlay').animate({opacity:0},200,function(){$(this).css('display','none');});document.body.style.overflow='';};

  window.mfShowLogin = function(){$('#mf-auth-step1,#mf-auth-step2,#mf-auth-step3').hide();$('#mf-auth-login').show();$('#mf-auth-error').hide();};
  window.mfShowRegister = function(){$('#mf-auth-login,#mf-auth-step2,#mf-auth-step3').hide();$('#mf-auth-step1').show();$('#mf-auth-error').hide();selectedRoles=[];$('.mf-role-option').removeClass('selected').css({borderColor:'#ebebeb',color:'#1a1a1a'});};

  window.mfToggleRole = function(el){
    // Single select for role
    $('.mf-role-option').removeClass('selected').css({borderColor:'#ebebeb',color:'#1a1a1a'});
    var $el=$(el),c=$el.data('color'),r=$el.data('role');
    $el.addClass('selected').css({borderColor:c,color:c});
    selectedRoles=[r];
  };

  window.mfRegStep2 = function(){
    if(selectedRoles.length===0){$('#mf-auth-error').text('Please select a role.').show();return;}
    $('#mf-auth-error').hide();
    var role=selectedRoles[0];
    $('#mf-reg-title').text(role.replace('Mini-','')+ ' Registration');
    $('#mf-auth-step1').hide();$('#mf-auth-step2').show();
  };

  window.mfRegStep3 = function(){
    var fullname=$('#mf-reg-fullname').val().trim(),
        nick=$('#mf-reg-nickname').val().trim(),
        email=$('#mf-reg-email').val().trim(),
        pass=$('#mf-reg-password').val(),
        pass2=$('#mf-reg-password2').val();
    if(!fullname||!nick||!email||!pass){$('#mf-auth-error').text('Please fill in all fields.').show();return;}
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){$('#mf-auth-error').text('Please enter a valid email address.').show();return;}
    if(pass.length<8){$('#mf-auth-error').text('Password must be at least 8 characters.').show();return;}
    if(pass!==pass2){$('#mf-auth-error').text('Passwords do not match.').show();return;}
    $('#mf-auth-error').hide();
    // Build dynamic fields based on role
    var role=selectedRoles[0], html='';
    if(role==='Mini-Family'){
      html='<div class="mf-field-group"><label>Child\'s age group</label><select id="mf-reg-extra1"><option value="">Select...</option><option>4–6</option><option>7–9</option><option>10–12</option><option>13–17</option></select></div>';
    } else if(role==='Mini-Expert'){
      html='<div class="mf-field-group"><label>Your field</label><select id="mf-reg-extra1"><option value="">Select...</option><option>Educator</option><option>Therapist</option><option>Psychologist</option><option>Researcher</option><option>Speech & Language Therapist</option><option>Other</option></select></div>';
      html+='<div class="mf-field-group"><label>Organization / Affiliation</label><input type="text" id="mf-reg-extra2" placeholder="School, clinic, university..." /></div>';
    } else if(role==='Mini-Volunteer'){
      html='<div class="mf-field-group"><label>How would you prefer to contribute?</label><select id="mf-reg-extra1"><option value="">Select...</option><option>In person</option><option>Online</option><option>Hybrid</option><option>Not sure yet</option></select></div>';
    } else if(role==='Talk-Spot'){
      html='<div class="mf-field-group"><label>Organization Name</label><input type="text" id="mf-reg-extra1" placeholder="Name of your venue" /></div>';
      html+='<div class="mf-field-group"><label>Type of Space</label><input type="text" id="mf-reg-extra2" placeholder="e.g. café, clinic, school" /></div>';
    }
    $('#mf-reg-dynamic').html(html);
    $('#mf-auth-step2').hide();$('#mf-auth-step3').show();
  };

  window.mfBackToStep2 = function(){
    $('#mf-auth-error').hide();
    $('#mf-auth-step3').hide();$('#mf-auth-step2').show();
  };

  window.mfBackToStep1 = function(){
    $('#mf-auth-error').hide();
    $('#mf-auth-step2').hide();$('#mf-auth-step1').show();
  };

  window.mfSubmitRegister = function(){
    var fullname=$('#mf-reg-fullname').val().trim(),
        email=$('#mf-reg-email').val().trim(),
        pass=$('#mf-reg-password').val(),
        pass2=$('#mf-reg-password2').val(),
        nick=$('#mf-reg-nickname').val().trim(),
        country=$('#mf-reg-country').val().trim(),
        city=$('#mf-reg-city').val().trim(),
        consent=$('#mf-reg-consent').is(':checked');

    if(!fullname||!email||!pass||!nick){$('#mf-auth-error').text('Please fill in all required fields.').show();return;}
    if(pass.length<8){$('#mf-auth-error').text('Password must be at least 8 characters.').show();return;}
    if(pass!==pass2){$('#mf-auth-error').text('Passwords do not match.').show();return;}
    if(!consent){$('#mf-auth-error').text('Please accept the guidelines to continue.').show();return;}

    var $btn=$('#mf-auth-step2 .mf-btn-green');
    $btn.text('Creating...').css('opacity',.6);

    $.post(mf_ajax.url,{
      action:'mf_register',nonce:mf_ajax.nonce,
      fullname:fullname,nickname:nick,email:email,password:pass,
      roles:selectedRoles,country:country,city:city,
      extra1:$('#mf-reg-extra1').val()||'',
      extra2:$('#mf-reg-extra2').val()||''
    },function(res){
      if(res.success) window.location.reload();
      else{$btn.text('Create Account').css('opacity',1);$('#mf-auth-error').text(res.data.message).show();}
    }).fail(function(){$btn.text('Create Account').css('opacity',1);$('#mf-auth-error').text('Something went wrong.').show();});
  };

  window.mfSubmitLogin = function(){
    var email=$('#mf-login-email').val().trim(),pass=$('#mf-login-password').val();
    if(!email||!pass){$('#mf-auth-error').text('All fields are required.').show();return;}
    var $btn=$('#mf-auth-login .mf-btn-blue');
    $btn.text('Logging in...').css('opacity',.6);
    $.post(mf_ajax.url,{action:'mf_login',nonce:mf_ajax.nonce,email:email,password:pass},function(res){
      if(res.success) window.location.reload();
      else{$btn.text('Sign In').css('opacity',1);$('#mf-auth-error').text(res.data.message).show();}
    }).fail(function(){$btn.text('Sign In').css('opacity',1);$('#mf-auth-error').text('Something went wrong.').show();});
  };

  // Toggle password field visibility (the eye button)
  window.mfTogglePwd=function(inputId, btn){
    var $i=$('#'+inputId); var $btn=$(btn);
    var isPwd=$i.attr('type')==='password';
    $i.attr('type', isPwd ? 'text' : 'password');
    $btn.find('.mf-eye-on').toggle(!isPwd);
    $btn.find('.mf-eye-off').toggle(isPwd);
    $btn.attr('aria-label', isPwd ? 'Hide password' : 'Show password');
  };

  $(document).ready(function(){
    $(document).on('click','.mf-overlay',function(e){if(e.target===this)mfCloseAuth();});
    $(document).on('keydown',function(e){if(e.key==='Escape')mfCloseAuth();});
    $(document).on('keydown','#mf-login-password',function(e){if(e.key==='Enter')mfSubmitLogin();});
  });
})(jQuery);
