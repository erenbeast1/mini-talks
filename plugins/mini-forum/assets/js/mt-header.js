/*
 * Mini-Talks site header — the account pill and the mobile menu.
 *
 * Lifted out of the Elementor HTML widget along with the stylesheet; see
 * mt-header.css for why. The widget now holds markup only.
 */

(function(){

  var DEFAULT_AVATAR =
    'https://mini-talks.org/wp-content/uploads/2026/04/7476b5816f4628ed55648a07eca5eb231b3fe5a4.png';


  /* Every copy of the header, not the first one an id lookup finds. A site
     can carry two — a sticky one, or a separate mobile one — and only one of
     them is the one somebody is looking at. */
  function renderAuth(){

    var wraps = document.querySelectorAll('.mt-auth-wrap');
    if(!wraps.length) return;

    var loggedIn =
      typeof mf_ajax !== 'undefined' &&
      mf_ajax.is_logged_in == 1 &&
      mf_ajax.user;

    var html;

    if(loggedIn){

      var u = mf_ajax.user;

      var img =
        (
          u.avatar_url ||
          mf_ajax.default_avatar ||
          DEFAULT_AVATAR
        );

      html =

        '<div class="mt-auth-box" style="position:relative">' +

          '<button type="button" class="mt-auth-pill">' +

            '<img class="mt-auth-avatar-img" src="' +
            img +
            '" alt="" onerror="this.src=\'' +
            DEFAULT_AVATAR +
            '\'" />' +

            '<span class="mt-auth-pill-text">' +
            u.nickname +
            '</span>' +

          '</button>' +

          '<div class="mt-auth-dropdown">' +

            '<a href="' +
            mf_ajax.profile_url +
            '" class="mt-auth-dd-item">My Profile</a>' +

            '<a href="/mini-community/mini-forum/" class="mt-auth-dd-item">Mini-Forum</a>' +

            '<div class="mt-auth-dd-divider"></div>' +

            '<a href="' +
            mf_ajax.forum_url.replace(/\/$/, '') +
            '/?logout=1" class="mt-auth-dd-item mt-auth-dd-logout">Log Out</a>' +

          '</div>' +

        '</div>';

    }

    else {

      var defImg =
        (
          typeof mf_ajax !== 'undefined' &&
          mf_ajax.default_avatar
        )
        ?
        mf_ajax.default_avatar
        :
        DEFAULT_AVATAR;

      html =

        '<button type="button" class="mt-auth-pill mt-auth-signin">' +

          '<img class="mt-auth-avatar-img" src="' +
          defImg +
          '" alt="" onerror="this.src=\'' +
          DEFAULT_AVATAR +
          '\'" />' +

          '<span class="mt-auth-pill-text">' +
          'Sign in / up' +
          '</span>' +

        '</button>';

    }

    wraps.forEach(function(w){
      if(w.getAttribute('data-mt-state') === (loggedIn ? 'in' : 'out')) return;
      w.setAttribute('data-mt-state', loggedIn ? 'in' : 'out');
      w.innerHTML = html;
    });

  }


  if(
    document.readyState === 'loading'
  ){

    document.addEventListener(
      'DOMContentLoaded',
      renderAuth
    );

  }

  else {

    renderAuth();

  }


  setTimeout(
    renderAuth,
    500
  );


  /* ============================================
     HAMBURGER MENU

     Everything below is delegated from the document and scoped to the
     .mt-header the tap happened in, rather than bound to elements looked
     up by id when this file runs. Three reasons, all of them things that
     happen inside Elementor:

       - A header can end up on the page more than once — a sticky copy, a
         separate mobile header. getElementById finds the first one, which
         may not be the one on screen, and then the visible button is
         wired to nothing. This is the one that makes a hamburger look
         dead.
       - The widget's markup is not always in the document when its script
         runs; Elementor moves and re-renders it.
       - ids have to be unique and these are not, once there are two.

     Delegation sidesteps all three: there is nothing to look up in
     advance, and a second copy works exactly as well as the first.
  ============================================= */

  var OPEN = 'mt-open';

  function headerOf(el){
    return el ? el.closest('.mt-header') : null;
  }

  function partsOf(header){
    if(!header) return null;
    return {
      burger : header.querySelector('.mt-hamburger'),
      menu   : header.querySelector('.mt-mobile-menu'),
      overlay: header.querySelector('.mt-mobile-overlay')
    };
  }

  var previousOverflow = '';

  function isOpen(header){
    var m = header && header.querySelector('.mt-mobile-menu');
    return !!m && m.classList.contains(OPEN);
  }

  function openMenu(header){

    var q = partsOf(header);
    if(!q || !q.menu || !q.overlay || !q.burger) return;

    previousOverflow = document.body.style.overflow;

    q.menu.classList.add(OPEN);
    q.overlay.classList.add(OPEN);
    q.burger.classList.add('active');
    q.burger.setAttribute('aria-expanded','true');

    document.body.style.overflow = 'hidden';

    var close = header.querySelector('.mt-mobile-close');
    if(close) setTimeout(function(){ close.focus(); }, 0);

  }

  function closeMenu(header){

    var q = partsOf(header);
    if(!q || !q.menu || !q.overlay || !q.burger) return;

    q.menu.classList.remove(OPEN);
    q.overlay.classList.remove(OPEN);
    q.burger.classList.remove('active');
    q.burger.setAttribute('aria-expanded','false');

    document.body.style.overflow = previousOverflow;
    q.burger.focus();

    header.querySelectorAll('.mt-mobile-sub').forEach(function(sub){
      sub.style.setProperty('max-height','0','important');
      sub.classList.remove('mt-sub-open');
    });

    header.querySelectorAll('.mt-mobile-toggle').forEach(function(b){
      b.setAttribute('aria-expanded','false');
      var a = b.querySelector('.mt-arrow');
      if(a) a.style.transform = 'rotate(0deg)';
    });

  }


  /* Only the first copy of this script wires the document up. The handlers
     below are delegated and find their own header, so one set serves every
     copy — and two sets would undo each other: each tap would open the menu
     and then close it again, which is a hamburger that looks broken. */
  if(window.mtHeaderWired) return;
  window.mtHeaderWired = true;


  document.addEventListener('click', function(e){

    if(!e.target || !e.target.closest) return;


    /* the account pill, and its menu */
    var pill = e.target.closest('.mt-auth-pill');
    if(pill){
      if(pill.classList.contains('mt-auth-signin')){
        if(typeof mtOpenAuth === 'function') mtOpenAuth();
        else window.location.href = '/mini-community/join-us/';
        return;
      }
      var box = pill.closest('.mt-auth-box');
      var dd  = box && box.querySelector('.mt-auth-dropdown');
      document.querySelectorAll('.mt-auth-dropdown').forEach(function(d){
        if(d !== dd) d.classList.remove('open');
      });
      if(dd) dd.classList.toggle('open');
      return;
    }

    if(!e.target.closest('.mt-auth-dropdown')){
      document.querySelectorAll('.mt-auth-dropdown.open').forEach(function(d){
        d.classList.remove('open');
      });
    }


    /* the hamburger */
    var burger = e.target.closest('.mt-hamburger');
    if(burger){
      e.preventDefault();
      var h = headerOf(burger);
      if(isOpen(h)) closeMenu(h); else openMenu(h);
      return;
    }


    /* the X, and the backdrop behind the panel */
    var shut = e.target.closest('.mt-mobile-close, .mt-mobile-overlay');
    if(shut){
      e.preventDefault();
      closeMenu(headerOf(shut));
      return;
    }


    /* a section in the mobile menu */
    var toggle = e.target.closest('.mt-mobile-toggle');
    if(toggle){

      e.preventDefault();

      var header = headerOf(toggle);
      if(!header) return;

      var panel = header.querySelector('#' + toggle.getAttribute('data-target'))
               || document.getElementById(toggle.getAttribute('data-target'));
      if(!panel) return;

      var wasOpen = panel.classList.contains('mt-sub-open');

      header.querySelectorAll('.mt-mobile-sub').forEach(function(sub){
        sub.style.setProperty('max-height','0','important');
        sub.classList.remove('mt-sub-open');
      });

      header.querySelectorAll('.mt-mobile-toggle').forEach(function(b){
        b.setAttribute('aria-expanded','false');
        var a = b.querySelector('.mt-arrow');
        if(a) a.style.transform = 'rotate(0deg)';
      });

      if(!wasOpen){
        panel.classList.add('mt-sub-open');
        panel.style.setProperty('max-height', panel.scrollHeight + 'px', 'important');
        toggle.setAttribute('aria-expanded','true');
        var arrow = toggle.querySelector('.mt-arrow');
        if(arrow) arrow.style.transform = 'rotate(90deg)';
      }

      return;
    }

  });


  document.addEventListener('keydown', function(e){

    if(e.key === 'Escape'){
      document.querySelectorAll('.mt-header').forEach(function(h){
        if(isOpen(h)) closeMenu(h);
      });
      document.querySelectorAll('.mt-auth-dropdown.open').forEach(function(d){
        d.classList.remove('open');
      });
    }

    if(e.key === 'Tab'){

      var header = null;
      document.querySelectorAll('.mt-header').forEach(function(h){
        if(isOpen(h)) header = h;
      });
      if(!header) return;

      var menu = header.querySelector('.mt-mobile-menu');
      var focusables = Array.prototype.slice
        .call(menu.querySelectorAll('button, a[href]'))
        .filter(function(el){ return getComputedStyle(el).visibility !== 'hidden'; });
      if(!focusables.length) return;

      var first = focusables[0], last = focusables[focusables.length - 1];
      if(e.shiftKey && document.activeElement === first){ e.preventDefault(); last.focus(); }
      else if(!e.shiftKey && document.activeElement === last){ e.preventDefault(); first.focus(); }

    }

  });


  window.addEventListener('resize', function(){
    if(window.innerWidth <= 1024) return;
    document.querySelectorAll('.mt-header').forEach(function(h){
      if(isOpen(h)) closeMenu(h);
    });
  });

})();
