(function($){
  'use strict';
  var cFilter='all',cPage=1,maxP=1,sTO=null;
  var typeBC={question:'border-red',experience:'border-yellow',idea:'border-blue',reflection:'border-green'};
  var typeSC={question:'mf-studs-red',experience:'mf-studs-yellow',idea:'mf-studs-blue',reflection:'mf-studs-green'};
  var typeBG={question:'bg-red',experience:'bg-yellow',idea:'bg-blue',reflection:'bg-green'};
  var roleBC={Family:'rb-blue',Expert:'rb-green',Volunteer:'rb-yellow','Talk-Spot':'rb-red'};

  $(document).ready(function(){
    if($('#mf-posts-list').length) mfLoadPosts();
    $(document).on('click','.mf-filter-chips .mf-chip',function(){$('.mf-filter-chips .mf-chip').removeClass('active');$(this).addClass('active');cFilter=$(this).data('filter');cPage=1;mfLoadPosts();});
    $('#mf-search').on('input',function(){clearTimeout(sTO);sTO=setTimeout(function(){cPage=1;mfLoadPosts();},400);});
    
    $(document).on('click','.mf-tag-chip',function(){var w=$(this).hasClass('selected');$('.mf-tag-chip').removeClass('selected');if(!w)$(this).addClass('selected');});
  });

  window.mfLoadPosts=function(){
    var $l=$('#mf-posts-list');if(!$l.length)return;
    if(cPage===1)$l.html('<div class="mf-loading">Loading...</div>');
    $.post(mf_ajax.url,{action:'mf_load_posts',filter:cFilter,search:$('#mf-search').val()||'',page:cPage},function(r){
      if(!r.success)return;
      var h='',posts=r.data.posts;maxP=r.data.max_pages;
      if(!posts.length&&cPage===1)h='<div class="mf-loading">No posts yet. Be the first to share.</div>';
      posts.forEach(function(p){
        var url=mf_ajax.forum_url+(mf_ajax.forum_url.indexOf('?')>-1?'&':'?')+'post_id='+p.id;
        var bc=typeBC[p.type]||'border-red', sc=typeSC[p.type]||'mf-studs-red', bg=typeBG[p.type]||'bg-red';
        var rbc=roleBC[p.role]||'rb-blue';
        h+='<a href="'+url+'" class="mf-post-card '+bc+'">';
        
        h+='<div class="mf-pc-inner"><div style="flex:1">';
        h+='<div class="mf-post-meta"><span class="mf-type-badge '+bg+'">'+p.type_label+'</span>';
        if(p.topic||p.tag) h+='<span class="mf-meta-secondary">'+[p.topic,p.tag].filter(Boolean).join(' · ')+'</span>';
        h+='</div>';
        h+='<div class="mf-pc-title">'+esc(p.title)+'</div>';
        h+='<div class="mf-pc-preview">'+esc(p.preview)+'</div>';
        h+='</div><div class="mf-pc-right">';
        h+='<div class="mf-pc-user"><span class="mf-avatar-sm" style="background:'+p.role_color+';color:#fff">'+p.user.charAt(0).toUpperCase()+'</span>';
        h+='<div><div class="mf-pc-user-name">'+esc(p.user)+'</div><span class="mf-role-badge '+rbc+'">'+p.role+'</span></div></div>';
        h+='<span class="mf-meta-light">'+p.replies+' replies · '+p.time+'</span>';
        h+='<span class="mf-pc-arrow">›</span>';
        h+='</div></div></a>';
      });
      if(cPage===1)$l.html(h);else $l.append(h);
      
      var $pn=$('#mf-page-num');if($pn.length)$pn.text(cPage);
      var $pb=$('#mf-page-next');if($pb.length)$pb.toggle(cPage<maxP);
    });
  };
  window.mfLoadMore=function(){cPage++;mfLoadPosts();};

  window.mfSubmitPost=function(){
    var t=$('#mf-create-title').val().trim(),c=$('#mf-create-content').val().trim(),
        tp=$('#mf-create-type').val(),topic=$('#mf-create-topic').val()||'',
        tag=$('.mf-tag-chip.selected').data('value')||'';
    if(!t||!c){$('#mf-create-error').text('Please add a title and some text.').show();return;}
    var $b=$('.mf-form-actions .mf-btn-blue');$b.text('Sharing...').css('opacity',.6);
    $.post(mf_ajax.url,{action:'mf_create_post',nonce:mf_ajax.nonce,title:t,content:c,post_type:tp,topic:topic,tag:tag},function(r){
      if(r.success) window.location.href=mf_ajax.forum_url;
      else{$b.text('Share').css('opacity',1);$('#mf-create-error').text(r.data.message).show();}
    });
  };

  window.mfSubmitReply=function(pid){
    var c=$('#mf-reply-content').val().trim();if(!c)return;
    var $b=$('.mf-reply-input-row .mf-btn');$b.text('Sending...').css('opacity',.6);
    $.post(mf_ajax.url,{action:'mf_create_reply',nonce:mf_ajax.nonce,post_id:pid,content:c,parent_id:0},function(r){
      if(r.success) window.location.reload();
    });
  };

  window.mfShowSubReply=function(replyId){
    var $el=$('#sub-reply-'+replyId);
    $('.mf-sub-reply-input').not($el).hide();
    $el.toggle();
    if($el.is(':visible'))$el.find('textarea').focus();
  };

  window.mfSubmitSubReply=function(postId,parentId){
    var $wrap=$('#sub-reply-'+parentId);
    var c=$wrap.find('textarea').val().trim();if(!c)return;
    var $b=$wrap.find('.mf-btn');$b.text('...').css('opacity',.6);
    $.post(mf_ajax.url,{action:'mf_create_reply',nonce:mf_ajax.nonce,post_id:postId,content:c,parent_id:parentId},function(r){
      if(r.success) window.location.reload();
    });
  };

  window.mfToggleReaction=function(replyId,emoji){
    if(typeof mf_ajax==='undefined'||mf_ajax.is_logged_in!=1){if(typeof mfOpenAuth==='function')mfOpenAuth();return;}
    $.post(mf_ajax.url,{action:'mf_toggle_reaction',nonce:mf_ajax.nonce,reply_id:replyId,emoji:emoji},function(r){
      if(!r.success)return;
      var $row=$('.mf-reactions[data-reply-id="'+replyId+'"]');
      ['❤️','👍','🤗','💡'].forEach(function(em){
        var rd=r.data.reactions[em];
        var $btn=$row.find('.mf-react-btn[title="'+em+'"]');
        if(!$btn.length)return;
        $btn.find('.mf-react-count').remove();
        if(rd&&rd.count>0){
          $btn.append('<span class="mf-react-count">'+rd.count+'</span>');
          if(rd.mine)$btn.addClass('active');else $btn.removeClass('active');
        } else { $btn.removeClass('active'); }
      });
    });
  };

  function esc(s){var d=document.createElement('div');d.textContent=s;return d.innerHTML;}
})(jQuery);


/* ═══════════════════════════════════════════════════════════
   MINI-EVENTS — Calendar (real data + leading/trailing days) +
   Updates Carousel (3×2 grid, outside arrows, square dots)
═══════════════════════════════════════════════════════════ */
(function($){
  var $cal = $('#mfe-cal-grid');
  if ($cal.length) { // calendar exists only on events home page

  /* ── Calendar ── */
  var MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  var initialEvents = {};
  try { initialEvents = JSON.parse($cal.attr('data-events') || '{}'); } catch(e){ initialEvents = {}; }
  var curY = parseInt($cal.attr('data-init-year'), 10);
  var curM = parseInt($cal.attr('data-init-month'), 10);
  var initialY = curY, initialM = curM;
  var today = new Date();
  var isFetching = false;

  // Client-side cache so visited months render instantly the second time
  var monthCache = {};
  monthCache[initialY + '-' + initialM] = initialEvents;

  function pad(n){return n<10?'0'+n:''+n;}

  function fetchMonth(year, month0){
    var key = year + '-' + month0;
    if (monthCache[key]) return $.Deferred().resolve(monthCache[key]).promise();
    if (typeof mf_ajax === 'undefined') { monthCache[key] = {}; return $.Deferred().resolve({}).promise(); }
    return $.post(mf_ajax.url, {
      action: 'mfe_get_calendar',
      nonce:  mf_ajax.nonce,
      year:   year,
      month:  month0 + 1
    }).then(function(res){
      var data = (res && res.success && res.data) ? res.data : {};
      monthCache[key] = data;
      return data;
    }, function(){ monthCache[key] = {}; return {}; });
  }

  function renderCalendar(events){
    $cal.empty();

    var firstDay = new Date(curY, curM, 1);
    var startDay = (firstDay.getDay() + 6) % 7; // Mon-based
    var daysInMonth = new Date(curY, curM+1, 0).getDate();

    // Trailing days from previous month (lighter grey, with stud)
    var prevMonthDays = new Date(curY, curM, 0).getDate();
    for (var i = startDay; i > 0; i--){
      var d = prevMonthDays - i + 1;
      $cal.append('<div class="mfe-cal-day mfe-other-month" aria-hidden="true">'+ d +'</div>');
    }

    // Current month days (darker grey, with stud)
    for (var d = 1; d <= daysInMonth; d++){
      var key = curY + '-' + pad(curM+1) + '-' + pad(d);
      var evList = events[key];
      var cls = 'mfe-cal-day';
      var label = MONTH_NAMES[curM] + ' ' + d + ', ' + curY;
      var titles = null;
      if (evList && evList.length){
        cls += ' mfe-event ' + evList[0].cls;
        label += ', ' + evList.length + ' event' + (evList.length>1?'s':'');
        titles = [];
        for (var k = 0; k < evList.length; k++) titles.push(String(evList[k].title || ''));
      }
      var isToday = (curY === today.getFullYear() && curM === today.getMonth() && d === today.getDate());
      if (isToday) cls += ' mfe-cal-today';
      var $brick = $('<div role="gridcell"></div>')
        .attr('class', cls)
        .attr('data-date', key)
        .attr('aria-label', label)
        .text(d);
      if (titles) $brick.attr('data-event-titles', JSON.stringify(titles));
      $cal.append($brick);
    }

    // Leading days from next month (light grey)
    var totalCells = startDay + daysInMonth;
    var trailing = (7 - (totalCells % 7)) % 7;
    for (var i = 1; i <= trailing; i++){
      $cal.append('<div class="mfe-cal-day mfe-other-month" aria-hidden="true">'+ i +'</div>');
    }
  }

  function changeMonth(delta){
    if (isFetching) return; // ignore mashed clicks
    curM += delta;
    if (curM < 0){ curM = 11; curY--; }
    if (curM > 11){ curM = 0; curY++; }
    // Update title IMMEDIATELY so the click feels instant
    $('#mfe-cal-title').text(MONTH_NAMES[curM] + ' ' + curY);
    // Expose latest month so other widgets (event sliders) can sync on init/load
    window.mfeCalCurY = curY; window.mfeCalCurM = curM;
    isFetching = true;
    fetchMonth(curY, curM).always(function(events){
      renderCalendar(events || {});
      isFetching = false;
      // Filter the Updates carousel to match the new month
      if (typeof window.mfeUpdatesFilterMonth === 'function') {
        window.mfeUpdatesFilterMonth(curY, curM);
      }
      // Filter the Special Days section to match the new month
      if (typeof window.mfeSpecialDaysFilterMonth === 'function') {
        window.mfeSpecialDaysFilterMonth(curY, curM);
      }
      // Filter the event-type sliders (workshops/meetups/experts) to match the new month
      if (typeof window.mfeEvSecFilterMonth === 'function') {
        window.mfeEvSecFilterMonth(curY, curM);
      }
      // Prefetch the next adjacent month silently so the next click is instant too
      var nY = curY, nM = curM + delta;
      if (nM < 0){ nM = 11; nY--; }
      if (nM > 11){ nM = 0; nY++; }
      if (!monthCache[nY + '-' + nM]) fetchMonth(nY, nM);
    });
  }

  $('#mfe-cal-prev').on('click', function(){ changeMonth(-1); });
  $('#mfe-cal-next').on('click', function(){ changeMonth(+1); });

  // Initial render + warm cache for adjacent months in the background
  $('#mfe-cal-title').text(MONTH_NAMES[curM] + ' ' + curY);
  // Expose initial month so widgets that init later can sync without waiting for first click
  window.mfeCalCurY = curY; window.mfeCalCurM = curM;
  renderCalendar(initialEvents);
  (function warmAdjacent(){
    var ny=curY,nm=curM+1; if(nm>11){nm=0;ny++;} fetchMonth(ny,nm);
    var py=curY,pm=curM-1; if(pm<0){pm=11;py--;} fetchMonth(py,pm);
  })();

  /* ── Brick hover tooltip — shows event titles on event-bearing days ── */
  var $tip = $('#mfe-cal-tip');
  if (!$tip.length) {
    $tip = $('<div id="mfe-cal-tip" role="tooltip" aria-hidden="true"><div class="mfe-cal-tip-inner"></div><span class="mfe-cal-tip-arrow"></span></div>');
    $('body').append($tip);
  }
  var $tipInner = $tip.find('.mfe-cal-tip-inner');

  function showTip($brick){
    var raw = $brick.attr('data-event-titles');
    if (!raw) return;
    var titles;
    try { titles = JSON.parse(raw); } catch(e){ return; }
    if (!titles || !titles.length) return;
    // Build content
    $tipInner.empty();
    for (var i = 0; i < titles.length; i++){
      var $row = $('<div class="mfe-cal-tip-row"></div>').text(titles[i]);
      $tipInner.append($row);
    }
    $tip.attr('aria-hidden','false').addClass('is-visible');
    positionTip($brick);
  }
  function hideTip(){
    $tip.attr('aria-hidden','true').removeClass('is-visible');
  }
  function positionTip($brick){
    var r = $brick[0].getBoundingClientRect();
    var sx = window.pageXOffset || document.documentElement.scrollLeft;
    var sy = window.pageYOffset || document.documentElement.scrollTop;
    // Default: above the brick, horizontally centered
    var tipW = $tip.outerWidth();
    var tipH = $tip.outerHeight();
    var top = r.top + sy - tipH - 10;
    var left = r.left + sx + (r.width / 2) - (tipW / 2);
    var aboveCutoff = (r.top - tipH - 10) < 0;
    if (aboveCutoff) {
      // Flip below if no room above
      top = r.top + sy + r.height + 10;
      $tip.addClass('is-below');
    } else {
      $tip.removeClass('is-below');
    }
    // Clamp horizontally to viewport
    var minLeft = sx + 8;
    var maxLeft = sx + document.documentElement.clientWidth - tipW - 8;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    $tip.css({ top: top + 'px', left: left + 'px' });
  }

  $cal.on('mouseenter focusin', '.mfe-cal-day.mfe-event', function(){ showTip($(this)); });
  $cal.on('mouseleave focusout', '.mfe-cal-day.mfe-event', function(){ hideTip(); });
  // Tap on touch devices: toggle
  $cal.on('click', '.mfe-cal-day.mfe-event', function(e){
    var $b = $(this);
    if ($tip.hasClass('is-visible') && $tip.data('forBrick') === this) {
      hideTip();
      $tip.removeData('forBrick');
    } else {
      showTip($b);
      $tip.data('forBrick', this);
    }
  });
  $(document).on('click', function(e){
    if (!$(e.target).closest('.mfe-cal-day.mfe-event, #mfe-cal-tip').length) hideTip();
  });
  $(window).on('scroll resize', function(){ if ($tip.hasClass('is-visible')) hideTip(); });

  } // end calendar block

  /* ── Updates carousel (3×2 grid → page = 6 cards) ── */
  var $track = $('#mfe-updates-track');
  if ($track.length) { // carousel exists only on events home page

  var totalCards = $track.children().length;
  var $dots = $('#mfe-upd-dots');
  var curPage = 0;

  function getCardsPerPage(){
    var w = window.innerWidth;
    if (w < 560) return 2;   // 1 col × 2 rows
    if (w < 900) return 4;   // 2 cols × 2 rows
    return 6;                // 3 cols × 2 rows
  }
  function getColsPerPage(){
    var w = window.innerWidth;
    if (w < 560) return 1;
    if (w < 900) return 2;
    return 3;
  }

  function totalPages(){
    var cpp = getCardsPerPage();
    return Math.max(1, Math.ceil(totalCards / cpp));
  }

  function renderDots(){
    $dots.empty();
    var n = totalPages();
    for (var i = 0; i < n; i++){
      $dots.append('<button class="mfe-dot'+(i===curPage?' mfe-dot-active':'')+'" data-page="'+i+'" aria-label="Page '+(i+1)+'"></button>');
    }
  }

  function applyShift(){
    var cols = getColsPerPage();
    var pages = totalPages();
    if (curPage > pages - 1) curPage = pages - 1;
    if (curPage < 0) curPage = 0;
    var $first = $track.children().first();
    if (!$first.length) return;
    // Move by full page (cols × card width + gap × cols)
    var cardW = $first.outerWidth();
    var gap = 20;
    var shift = curPage * (cols * cardW + cols * gap);
    $track.css('transform', 'translateX(' + (-shift) + 'px)');
    $('#mfe-upd-prev').prop('disabled', curPage === 0);
    $('#mfe-upd-next').prop('disabled', curPage >= pages - 1);
    renderDots();
  }

  $('#mfe-upd-prev').on('click', function(){ curPage--; applyShift(); });
  $('#mfe-upd-next').on('click', function(){ curPage++; applyShift(); });
  $dots.on('click', '.mfe-dot', function(){ curPage = parseInt($(this).data('page'),10) || 0; applyShift(); });

  var rt;
  $(window).on('resize', function(){
    clearTimeout(rt);
    rt = setTimeout(applyShift, 120);
  });

  applyShift();

  // Snapshot all original cards once (raw DOM clones) so filter is fully reversible
  var allUpdateCards = [];
  $track.children('.mfe-upd-card').each(function(){
    var d = $(this).attr('data-date') || '';
    var y = -1, mo = -1;
    if (d.length >= 7) {
      y  = parseInt(d.substr(0,4), 10);
      mo = parseInt(d.substr(5,2), 10) - 1;
    }
    allUpdateCards.push({ year: y, month: mo, html: this.outerHTML });
  });

  // Filter cards by year/month — called by calendar block when month changes
  window.mfeUpdatesFilterMonth = function(year, month){
    // Build new HTML containing only matching cards
    var matches = [];
    for (var i = 0; i < allUpdateCards.length; i++){
      var c = allUpdateCards[i];
      if (c.year === year && c.month === month) matches.push(c.html);
    }

    // Wipe and refill the track from scratch — most robust against any prior state
    $track.empty();

    var $empty = $('#mfe-upd-empty-month');
    if (!matches.length) {
      if (!$empty.length) {
        $empty = $('<div id="mfe-upd-empty-month" style="text-align:center;padding:40px 20px;color:#888;font-weight:700;font-family:var(--mf-font),sans-serif;font-size:14px"></div>');
        $track.parent().prepend($empty);
      }
      $empty.text('No updates for this month yet.').show();
      $track.css('visibility','hidden');
      $('#mfe-upd-prev,#mfe-upd-next,#mfe-upd-dots').css('visibility','hidden');
      totalCards = 0;
    } else {
      if ($empty.length) $empty.hide();
      $track.css('visibility','');
      $('#mfe-upd-prev,#mfe-upd-next,#mfe-upd-dots').css('visibility','');
      $track.html(matches.join(''));
      totalCards = matches.length;
    }
    curPage = 0;
    applyShift();
  };

  // Initial filter: if calendar exists on this page, sync to its current month
  if (typeof curY !== 'undefined' && typeof curM !== 'undefined') {
    window.mfeUpdatesFilterMonth(curY, curM);
  }

  } // end carousel block

  /* ── Special Days & Campaigns filter (home page) ── */
  var $sdGrid = $('#mfe-sd-grid-home');
  if ($sdGrid.length) {
    // Save original card list so re-filtering is reversible
    var $sdAll = $sdGrid.children('.mfe-sd-card').detach();

    window.mfeSpecialDaysFilterMonth = function(year, month){
      // month is 0-11; data-month is 1-12
      var monthNum = month + 1;
      var $match = $sdAll.filter(function(){
        return parseInt($(this).attr('data-month'), 10) === monthNum;
      });

      // Clear and re-fill grid
      $sdGrid.empty();
      var $emptyMsg = $('#mfe-sd-empty-month');
      if (!$match.length) {
        if (!$emptyMsg.length) {
          $emptyMsg = $('<div id="mfe-sd-empty-month" style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#888;font-weight:700;font-family:var(--mf-font),sans-serif;font-size:14px"></div>');
        }
        $emptyMsg.text('No special days for this month yet.');
        $sdGrid.append($emptyMsg);
      } else {
        $sdGrid.append($match);
      }
    };

    // Initial filter: sync to current calendar month if calendar exists, else current real month
    var initY = (typeof curY !== 'undefined') ? curY : new Date().getFullYear();
    var initM = (typeof curM !== 'undefined') ? curM : new Date().getMonth();
    window.mfeSpecialDaysFilterMonth(initY, initM);
  }

  /* ── Updates: sort dropdown (Newest / Oldest first) ── */
  var $sortBtn = $('#mfe-upd-sortbtn');
  if ($sortBtn.length) {
    var $sortWrap = $sortBtn.closest('.mfe-upd-sortwrap');
    var $sortDd = $('<div class="mfe-sd-monthdd mfe-upd-sortdd" hidden></div>');
    var sortOpts = [
      { key: 'newest', label: 'Newest First' },
      { key: 'oldest', label: 'Oldest First' }
    ];
    sortOpts.forEach(function(o){
      $sortDd.append('<a href="#" class="mfe-sd-monthdd-item mfe-upd-sortopt" data-sort="'+o.key+'">'+o.label+'</a>');
    });
    $sortWrap.append($sortDd);

    function applyUpdateSort(mode){
      if (typeof $track === 'undefined' || !$track || !$track.length) return;
      var $cards = $track.children('.mfe-upd-card').get();
      $cards.sort(function(a,b){
        var da = a.getAttribute('data-date') || '';
        var db = b.getAttribute('data-date') || '';
        if (mode === 'newest') return db.localeCompare(da);
        return da.localeCompare(db);
      });
      $.each($cards, function(i, el){ $track.append(el); });
      $sortBtn.find('.mfe-upd-sort-label').text(mode === 'newest' ? 'Newest First' : 'Oldest First');
      $sortDd.find('.mfe-upd-sortopt').removeClass('active');
      $sortDd.find('.mfe-upd-sortopt[data-sort="'+mode+'"]').addClass('active');
      // Reset carousel to first page
      curPage = 0;
      if (typeof applyShift === 'function') applyShift();
    }

    $sortBtn.on('click', function(e){
      e.stopPropagation();
      if ($sortDd.attr('hidden')) $sortDd.removeAttr('hidden');
      else $sortDd.attr('hidden','hidden');
    });
    $(document).on('click', function(){ $sortDd.attr('hidden','hidden'); });
    $sortDd.on('click', 'a.mfe-upd-sortopt', function(e){
      e.preventDefault();
      applyUpdateSort($(this).data('sort'));
      $sortDd.attr('hidden','hidden');
    });
    // Mark default active
    $sortDd.find('.mfe-upd-sortopt[data-sort="newest"]').addClass('active');
  }

  /* ── Special Days: smart Month dropdown with sort options ── */
  var $monthBtn = $('#mfe-sd-monthbtn');
  if ($monthBtn.length) {
    var $months = $('section.mfe-sd-month');
    if ($months.length) {
      // Wrap button so dropdown anchors reliably to it (button is already wrapped server-side)
      var $wrap = $monthBtn.closest('.mfe-sd-monthwrap');
      if (!$wrap.length) {
        $monthBtn.wrap('<div class="mfe-sd-monthwrap"></div>');
        $wrap = $monthBtn.parent();
      }
      var $btnLabel = $monthBtn.find('.mfe-sd-monthbtn-label');
      var defaultLabel = $btnLabel.text() || 'Month Selection';

      // Build dropdown — only months that have content (skip empty ones)
      var $dd = $('<div class="mfe-sd-monthdd" hidden></div>');
      $months.each(function(){
        var $m = $(this);
        // Skip months marked as empty (no special days defined for them)
        if ($m.hasClass('mfe-sd-month-empty')) return;
        var name = $.trim($m.find('.mfe-sd-monthtitle').text());
        var id = $m.attr('id');
        var monthNum = parseInt($m.attr('data-month-num'), 10);
        $dd.append('<a href="#'+id+'" class="mfe-sd-monthdd-item" data-month-id="'+id+'" data-month-num="'+monthNum+'">'+name+'</a>');
      });
      $wrap.append($dd);

      // ── Mode handling ──
      // 'this'  → show only this-month onward (CSS hides past via .mfe-sd-month-past)
      // 'first' → show all months
      // 'pick'  → show ONLY a single picked month (everything else hidden by JS)
      function applyMode(mode, targetId, doScroll){
        // Clear any previous "pick" state
        $months.removeClass('mfe-sd-month-hidden-by-pick mfe-sd-month-picked');
        $('body').removeClass('mfe-sd-pick-mode');

        if (mode === 'pick' && targetId) {
          // Body-level marker so CSS can override everything in this mode
          $('body').addClass('mfe-sd-pick-mode').removeClass('mfe-sd-show-all');
          // Hide every month except the picked one
          $months.each(function(){
            if ($(this).attr('id') !== targetId) {
              $(this).addClass('mfe-sd-month-hidden-by-pick');
            } else {
              $(this).addClass('mfe-sd-month-picked');
            }
          });
          // Update button label to picked month name
          var $picked = $months.filter('#' + targetId);
          if ($picked.length) {
            var pickedName = $.trim($picked.find('.mfe-sd-monthtitle').text());
            $btnLabel.text(pickedName);
          }
          $('a.mfe-sd-mode').removeClass('is-active');
        } else {
          // Reset to default label
          $btnLabel.text(defaultLabel);
          if (mode === 'first') {
            $('body').addClass('mfe-sd-show-all');
          } else {
            $('body').removeClass('mfe-sd-show-all');
          }
        }

        // Smooth-scroll to the first VISIBLE month section
        if (doScroll) {
          var $top = $months.filter(function(){ return $(this).css('display') !== 'none'; }).first();
          if ($top.length) {
            $('html,body').animate({ scrollTop: $top.offset().top - 100 }, 380);
          }
        }
      }

      // Default mode = this (auto-anchored to today's month) — no scroll on initial load
      applyMode('this', null, false);

      $monthBtn.on('click', function(e){
        e.stopPropagation();
        e.preventDefault();
        if ($dd.is('[hidden]')) $dd.removeAttr('hidden');
        else $dd.attr('hidden','hidden');
      });
      $(document).on('click', function(){ $dd.attr('hidden','hidden'); });

      // Picking a specific month from the dropdown → only that month, scroll to it
      $dd.on('click', 'a.mfe-sd-monthdd-item', function(e){
        e.preventDefault();
        e.stopPropagation();
        var id = $(this).attr('data-month-id');
        applyMode('pick', id, true);
        $dd.attr('hidden','hidden');
      });

      // From This / First Month chip buttons cancel any picked-month filter
      $(document).on('click', 'a.mfe-sd-mode', function(e){
        e.preventDefault();
        e.stopPropagation();
        applyMode($(this).attr('data-mode'), null, true);
      });
    }
  }

  /* ── Join / Leave event button ── */
  $(document).on('click', '.mfe-join-btn', function(e){
    e.preventDefault();
    var $btn = $(this);
    if ($btn.prop('disabled') || $btn.hasClass('is-loading')) return;
    var eventId = parseInt($btn.attr('data-event-id'), 10);
    if (!eventId || typeof mf_ajax === 'undefined') return;

    if (!mf_ajax.is_logged_in) {
      // Not logged in — show a friendly prompt that explains and links to Join Us
      mfShowLoginPrompt();
      return;
    }

    $btn.addClass('is-loading');
    $.post(mf_ajax.url, {
      action:   'mfe_toggle_join',
      nonce:    mf_ajax.nonce,
      event_id: eventId
    }).done(function(res){
      if (!res || !res.success) {
        var msg = (res && res.data && res.data.message) || '';
        // If the server says login required, show the friendly prompt instead of an alert
        if (/login\s*required|not\s*logged|please\s*log/i.test(msg)) {
          mfShowLoginPrompt();
          return;
        }
        alert(msg || 'Could not update your join status.');
        return;
      }
      var data = res.data;
      var joined = (data.action === 'joined');
      $btn.toggleClass('is-joined', joined);
      // Use button's OWN data-default-label first, then card-context fallback
      var ownLabel = $btn.attr('data-default-label');
      var fallback = $btn.closest('.mfe-frame-card,.mfe-upcoming-card').find('.mfe-evcard-btn').first().attr('data-default-label');
      $btn.text(joined ? 'Joined ✓' : (ownLabel || fallback || 'Join'));

      // Update count + avatars in the surrounding card OR popup
      var $card = $btn.closest('.mfe-frame-card,.mfe-upcoming-card,#mfe-detail-content');
      var $av = $card.find('.mfe-evcard-avatars,.mfe-detail-counts');
      // For card context: rebuild avatars
      var $cardAv = $card.find('.mfe-evcard-avatars');
      if ($cardAv.length) {
        $cardAv.find('.mfe-evcard-av,.mfe-evcard-av-more').remove();
        var $countEl = $cardAv.find('.mfe-evcard-count-num');
        $countEl.text(data.count);
        var avatars = data.avatars || [];
        var extra = Math.max(0, data.count - avatars.length);
        var avHtml = '';
        avatars.forEach(function(a){
          avHtml += '<span class="mfe-evcard-av" title="'+(a.name||'')+'" style="background-image:url(\''+a.url+'\');background-size:cover;background-position:center"></span>';
        });
        if (extra > 0) avHtml += '<span class="mfe-evcard-av-more">+'+extra+'</span>';
        $cardAv.prepend(avHtml);
      }
      // For popup context: just update the count
      var $popupCount = $card.find('.mfe-detail-counts strong');
      if ($popupCount.length) $popupCount.text(data.count);

      // Sync the same event button across the page (card AND popup if both visible)
      $('.mfe-join-btn[data-event-id="'+(parseInt($btn.attr('data-event-id'),10))+'"]').not($btn).each(function(){
        var $other = $(this);
        $other.toggleClass('is-joined', joined);
        var oLabel = $other.attr('data-default-label');
        var oFb = $other.closest('.mfe-frame-card,.mfe-upcoming-card').find('.mfe-evcard-btn').first().attr('data-default-label');
        $other.text(joined ? 'Joined ✓' : (oLabel || oFb || 'Join'));
      });
    }).fail(function(xhr){
      // 401/403 = auth issue. Status 0 often = blocked nonce or network.
      // Also inspect response body for "Login required" / "not logged in" hints.
      var bodyMsg = '';
      try {
        var parsed = (xhr && xhr.responseJSON) ? xhr.responseJSON
                   : (xhr && xhr.responseText ? JSON.parse(xhr.responseText) : null);
        if (parsed && parsed.data && parsed.data.message) bodyMsg = String(parsed.data.message);
      } catch(e){}
      if (xhr.status === 401 || xhr.status === 403 ||
          /login\s*required|not\s*logged|please\s*log/i.test(bodyMsg)) {
        mfShowLoginPrompt();
      } else {
        alert('Network error — please try again.');
      }
    }).always(function(){
      $btn.removeClass('is-loading');
    });
  });

  /* ── Updates inner page: same dropdown wiring ── */
  var $updMonthBtn = $('#mfe-upd-monthbtn');
  if ($updMonthBtn.length) {
    var $updMonths = $('section.mfe-sd-month');
    var $updWrap = $updMonthBtn.closest('.mfe-sd-monthwrap');
    if ($updMonths.length && $updWrap.length) {
      var $updDd = $('<div class="mfe-sd-monthdd" hidden></div>');
      $updMonths.each(function(){
        var $m = $(this);
        var name = $.trim($m.find('.mfe-sd-monthtitle').text());
        var id = $m.attr('id');
        $updDd.append('<a href="#'+id+'" class="mfe-sd-monthdd-item">'+name+'</a>');
      });
      $updWrap.append($updDd);

      $updMonthBtn.on('click', function(e){
        e.stopPropagation();
        e.preventDefault();
        if ($updDd.is('[hidden]')) $updDd.removeAttr('hidden');
        else $updDd.attr('hidden','hidden');
      });
      $(document).on('click', function(){ $updDd.attr('hidden','hidden'); });
      $updDd.on('click', 'a', function(){ $updDd.attr('hidden','hidden'); });
    }
  }

  // Smooth scroll for any same-page anchor with #month-N
  $(document).on('click', 'a[href^="#month-"]', function(e){
    var target = $(this).attr('href');
    var $t = $(target);
    if ($t.length) {
      e.preventDefault();
      $('html,body').animate({ scrollTop: $t.offset().top - 80 }, 380);
      if (history && history.replaceState) history.replaceState(null, '', target);
    }
  });

  /* ═══════════════════════════════════════════════════════════
     EVENT-TYPE PAGE FILTER — Updates-style month dropdown + city chips
  ═══════════════════════════════════════════════════════════ */
  var $etForm = $('#mfe-eventtype-filter');
  if ($etForm.length) {
    var $etMonthBtn = $('#mfe-et-monthbtn');
    var $etMonthDd  = $('#mfe-et-monthdd');

    // Toggle dropdown
    $etMonthBtn.on('click', function(e){
      e.preventDefault();
      e.stopPropagation();
      if ($etMonthDd.is('[hidden]')) $etMonthDd.removeAttr('hidden');
      else $etMonthDd.attr('hidden', 'hidden');
    });
    $(document).on('click', function(){ $etMonthDd.attr('hidden', 'hidden'); });
    $etMonthDd.on('click', function(e){ e.stopPropagation(); });

    // Pick month → update hidden input + submit
    $etMonthDd.on('click', '.mfe-sd-monthdd-item', function(e){
      e.preventDefault();
      var ym = $(this).attr('data-month') || '';
      $('#mfe-et-month-input').val(ym);
      $etForm.submit();
    });

    // City chip click → update hidden input + submit
    $etForm.on('click', '.mfe-et-city', function(e){
      e.preventDefault();
      $('#mfe-et-city-input').val($(this).attr('data-city'));
      $etForm.submit();
    });
  }

  /* ═══════════════════════════════════════════════════════════
     DEBUG HELPER — open console, run: mfeDebug()
  ═══════════════════════════════════════════════════════════ */
  window.mfeDebug = function(){
    var sliders = $('.mfe-evsec-slider');
    var info = {
      sliderCount: sliders.length,
      sliders: [],
      detailButtons: $('.mfe-detail-btn').length,
      overlayPresent: $('#mfe-detail-overlay').length > 0,
      mfAjaxDefined: (typeof mf_ajax !== 'undefined'),
      ajaxUrl: (typeof mf_ajax !== 'undefined') ? mf_ajax.url : 'NONE',
      nonce: (typeof mf_ajax !== 'undefined') ? mf_ajax.nonce : 'NONE'
    };
    sliders.each(function(){
      var $s = $(this);
      info.sliders.push({
        section: $s.attr('data-section'),
        cardCount: $s.find('.mfe-frame-card').length,
        trackHeight: $s.find('.mfe-evsec-track').height(),
        cardsHidden: $s.find('.mfe-frame-card').filter(function(){return $(this).is(':hidden');}).length
      });
    });
    console.table(info.sliders);
    console.log('mini-events debug:', info);
    return info;
  };

  /* ═══════════════════════════════════════════════════════════
     SECTION SLIDERS — events home page (workshops/meetups/experts)
     Pre-renders ALL events (upcoming ASC + past DESC) per type.
     Calendar month change calls window.mfeEvSecFilterMonth(year,month) which
     applies a 3-tier filter client-side (selected month → other upcoming → past).
  ═══════════════════════════════════════════════════════════ */
  function _pad2(n){ return (n < 10 ? '0' : '') + n; }
  function _todayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + _pad2(d.getMonth()+1) + '-' + _pad2(d.getDate());
  }

  $('.mfe-evsec-slider').each(function(){
    var $slider = $(this);
    var $track = $slider.find('.mfe-evsec-track');
    var $vp = $slider.find('.mfe-evsec-viewport');
    var $prev = $slider.find('.mfe-evsec-prev');
    var $next = $slider.find('.mfe-evsec-next');
    var page = 0;

    // ── Snapshot ALL cards (detached) so we can re-filter on month change ──
    var $allCards = $track.children('.mfe-frame-card').detach();
    var allMeta = [];
    $allCards.each(function(){
      var $c = $(this);
      allMeta.push({
        $node:      $c,
        monthKey:   $c.attr('data-month-key')   || '',
        dateKey:    $c.attr('data-date-key')    || '',
        isUpcoming: $c.attr('data-is-upcoming') === '1'
      });
    });
    // Initial: append all back so first render shows everything (filter syncs after)
    $allCards.each(function(){ $track.append(this); });

    function colsPerPage(){
      var w = window.innerWidth;
      if (w < 560) return 1;
      if (w < 900) return 2;
      return 3;
    }
    function shift(){
      var cols = colsPerPage();
      var total = $track.children().length;
      var pages = Math.max(1, Math.ceil(total / cols));
      if (page > pages - 1) page = pages - 1;
      if (page < 0) page = 0;
      var $first = $track.children().first();
      if (!$first.length){
        $prev.prop('disabled', true);
        $next.prop('disabled', true);
        $track.css('transform', 'translateX(0)');
        return;
      }
      var cardW = $first.outerWidth();
      var gap = 20;
      var s = page * (cols * cardW + cols * gap);
      $track.css('transform', 'translateX(' + (-s) + 'px)');
      $prev.prop('disabled', page === 0);
      $next.prop('disabled', page >= pages - 1);
    }

    // Apply 3-tier filter for a given (year, month-0-indexed)
    function filterToMonth(year, monthIdx){
      var monthKey = year + '-' + _pad2(monthIdx + 1);
      var todayKey = _todayKey();
      var min = 3, max = 12;
      var picked = [];
      var usedIdx = {};

      // ── Tier 1: ALL events whose month matches selected — past OR future ──
      // (For a past month, these will be past events; for a future month, future
      //  events; for the current month, both. Sorted ASC chronologically so the
      //  user sees the month's timeline in natural order.)
      var tier1Items = [];
      for (var i = 0; i < allMeta.length; i++){
        if (allMeta[i].monthKey === monthKey){
          tier1Items.push({ idx: i, meta: allMeta[i] });
        }
      }
      tier1Items.sort(function(a,b){
        if (a.meta.dateKey < b.meta.dateKey) return -1;
        if (a.meta.dateKey > b.meta.dateKey) return 1;
        return 0;
      });
      for (var t1 = 0; t1 < tier1Items.length && picked.length < max; t1++){
        picked.push(tier1Items[t1].meta);
        usedIdx[tier1Items[t1].idx] = true;
      }

      // ── Tier 2: Other months' UPCOMING events (closest future first) ──
      // allMeta is already sorted upcoming-ASC at the head, so iterating in order
      // naturally gives closest-future-first.
      for (var j = 0; j < allMeta.length && picked.length < max; j++){
        if (usedIdx[j]) continue;
        if (allMeta[j].dateKey >= todayKey){
          picked.push(allMeta[j]);
          usedIdx[j] = true;
        }
      }

      // ── Tier 3: Past events from other months (closest past first) ──
      // allMeta past portion is sorted DESC at the tail.
      for (var k = 0; k < allMeta.length && picked.length < min; k++){
        if (usedIdx[k]) continue;
        if (allMeta[k].dateKey < todayKey){
          picked.push(allMeta[k]);
          usedIdx[k] = true;
        }
      }

      // Re-render track with only picked cards
      $track.children().detach();
      var $emptyMsg = $slider.find('.mfe-evsec-empty-month');
      if (!picked.length){
        if (!$emptyMsg.length){
          $emptyMsg = $('<div class="mfe-evsec-empty-month" style="grid-column:1/-1;text-align:center;padding:40px 20px;color:#888;font-weight:700;font-family:var(--mf-font),sans-serif;font-size:14px">No events to show for this period.</div>');
          $track.append($emptyMsg);
        } else {
          $track.append($emptyMsg);
        }
      } else {
        if ($emptyMsg.length) $emptyMsg.remove();
        for (var n = 0; n < picked.length; n++){
          $track.append(picked[n].$node);
        }
      }
      page = 0;
      shift();
    }

    // Expose
    $slider.data('mfeFilterToMonth', filterToMonth);
    $slider.data('mfeReset', function(){ page = 0; shift(); });

    $prev.on('click', function(){ page--; shift(); });
    $next.on('click', function(){ page++; shift(); });
    var rt;
    $(window).on('resize', function(){ clearTimeout(rt); rt = setTimeout(shift, 80); });
    shift();
  });

  // Public: called by calendar block on month change
  window.mfeEvSecFilterMonth = function(year, monthIdx){
    $('.mfe-evsec-slider').each(function(){
      var fn = $(this).data('mfeFilterToMonth');
      if (typeof fn === 'function') fn(year, monthIdx);
    });
  };

  // Initial sync to whatever month the calendar is showing
  if (typeof window.mfeEvSecFilterMonth === 'function'){
    var _now = new Date();
    var _initY = (typeof window.mfeCalCurY === 'number') ? window.mfeCalCurY : _now.getFullYear();
    var _initM = (typeof window.mfeCalCurM === 'number') ? window.mfeCalCurM : _now.getMonth();
    window.mfeEvSecFilterMonth(_initY, _initM);
  }

  /* ═══════════════════════════════════════════════════════════
     EVENT DETAIL POPUP
  ═══════════════════════════════════════════════════════════ */
  function openDetail(eventId, eventType){
    var $detailOverlay = $('#mfe-detail-overlay');
    var $detailContent = $('#mfe-detail-content');
    var $detailWrapper = $detailOverlay.find('.mfe-detail-wrapper');

    if (!$detailOverlay.length) {
      console.warn('[mini-events] detail overlay element missing in DOM');
      return;
    }

    // Set color theme
    $detailWrapper.removeClass('mfe-detail-type-workshop mfe-detail-type-meetup mfe-detail-type-expert mfe-detail-type-specialday');
    var classToken = 'workshop';
    if (eventType === 'meetup')      classToken = 'meetup';
    else if (eventType === 'expert' || eventType === 'expert_session') classToken = 'expert';
    else if (eventType === 'specialday') classToken = 'specialday';
    $detailWrapper.addClass('mfe-detail-type-' + classToken);

    // Loading state — open the popup IMMEDIATELY so the user sees feedback
    $detailContent.html('<div style="padding:80px 20px;text-align:center;color:#888;font-weight:700">Loading...</div>');
    // Lock background scroll WITHOUT losing the user's current scroll position.
    // Trick: store scrollY, then position:fixed the body with a negative top.
    var savedScrollY = window.scrollY || window.pageYOffset || 0;
    $('body').data('mfe-saved-scroll', savedScrollY);
    $('body').css({position:'fixed', top:(-savedScrollY)+'px', left:0, right:0, width:'100%'});
    $('html,body').addClass('mfe-detail-open');
    $detailOverlay.addClass('is-open');

    if (typeof mf_ajax === 'undefined') {
      $detailContent.html('<div style="padding:60px 20px;text-align:center;color:#c33;font-weight:700">Configuration error — please refresh the page.</div>');
      return;
    }

    $.post(mf_ajax.url, {
      action: 'mfe_get_event_detail',
      nonce: mf_ajax.nonce,
      event_id: eventId,
      event_type: eventType
    }).done(function(res){
      if (!res || !res.success) {
        $detailContent.html('<div style="padding:60px 20px;text-align:center;color:#c33;font-weight:700">Could not load event details.</div>');
        return;
      }
      $detailContent.html(buildDetailHTML(res.data));
      // Bind scroll handler + recalculate cue (handles short content too)
      setTimeout(function(){
        bindScrollCue();
        var $inner = $('#mfe-detail-overlay .mfe-detail-inner');
        if ($inner.length) updateScrollCue($inner[0]);
      }, 60);
      // Re-check once images load (cover image often arrives after the initial paint)
      setTimeout(function(){
        var $inner = $('#mfe-detail-overlay .mfe-detail-inner');
        if ($inner.length) updateScrollCue($inner[0]);
      }, 400);
    }).fail(function(){
      $detailContent.html('<div style="padding:60px 20px;text-align:center;color:#c33;font-weight:700">Network error. Please try again.</div>');
    });
  }

  function closeDetail(){
    var $detailOverlay = $('#mfe-detail-overlay');
    $detailOverlay.removeClass('is-open');
    $detailOverlay.removeAttr('data-mode');
    $('html,body').removeClass('mfe-detail-open');
    // Restore body styles + scroll position
    var savedScrollY = parseInt($('body').data('mfe-saved-scroll'), 10) || 0;
    $('body').css({position:'', top:'', left:'', right:'', width:''});
    window.scrollTo(0, savedScrollY);
    $('body').removeData('mfe-saved-scroll');
    // Reset scroll cue state so it shows again next time
    $detailOverlay.find('.mfe-detail-modal,.mfe-detail-wrapper').removeClass('is-at-bottom');
  }

  // Scroll-bottom detector: smooth fade-out over the last ~200px before bottom.
  // IMPORTANT: scroll event does NOT bubble, so we bind directly (not via delegation).
  function updateScrollCue(el){
    if (!el) return;
    var $wrapper = $(el).closest('.mfe-detail-wrapper');
    var $modal = $(el).closest('.mfe-detail-modal');
    var $cue = $wrapper.find('.mfe-detail-scroll-cue');

    var distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    var FADE_RANGE = 200;
    var opacity = Math.max(0, Math.min(1, distFromBottom / FADE_RANGE));

    // Snap to fully invisible when very close to the bottom or no scroll room
    if (distFromBottom <= 5 || el.scrollHeight <= el.clientHeight) {
      opacity = 0;
    }

    $modal.css('--mfe-cue-opacity', opacity);
    $cue.css('opacity', opacity);

    if (opacity < 0.15) {
      $cue.css({'animation-play-state':'paused', 'visibility': opacity === 0 ? 'hidden' : 'visible'});
    } else {
      $cue.css({'animation-play-state':'running', 'visibility':'visible'});
    }
  }

  // Bind scroll handler directly to the inner element (not delegated)
  function bindScrollCue(){
    var inner = document.getElementById('mfe-detail-content');
    if (!inner) return;
    var $inner = $('#mfe-detail-overlay .mfe-detail-inner');
    if (!$inner.length) return;
    // Remove old handler before binding new one (avoid double-fire)
    $inner.off('scroll.mfeCue').on('scroll.mfeCue', function(){ updateScrollCue(this); });
  }

  $(window).on('resize', function(){
    $('.mfe-detail-inner').each(function(){ updateScrollCue(this); });
  });

  function escAttr(s){ return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function escHtml(s){ var d=document.createElement('div'); d.textContent=String(s==null?'':s); return d.innerHTML; }

  function buildDetailHTML(d){
    var html = '';
    var typeLabels = {
      workshop: 'Mini-Volunteer Workshop',
      meetup: 'Mini-Family Meetup',
      expert: 'Mini-Expert Session',
      specialday: 'Mini-Special Day'
    };
    var label = typeLabels[d.type_token] || '';

    // Hero — only show if cover exists. If no cover, the popup goes straight to the body
    // (cleaner, no hollow placeholder banner).
    if (d.cover) {
      html += '<div class="mfe-detail-hero" style="background-image:url(\'' + escAttr(d.cover) + '\')"></div>';
    }

    html += '<div class="mfe-detail-body">';

    // Date pill
    html += '<div class="mfe-detail-datebox">';
    html += '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>';
    html += escHtml(d.date_label || '');
    html += '</div>';

    // Title
    html += '<h2 class="mfe-detail-title" id="mfe-detail-title">' + escHtml(d.title || '') + '</h2>';

    // Meta row (location + status badge — but never as a photo overlay)
    var meta = [];
    if (d.location) {
      meta.push('<span class="mfe-detail-meta-item"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s7-7.5 7-12a7 7 0 1 0-14 0c0 4.5 7 12 7 12z"/><circle cx="12" cy="10" r="2.5"/></svg>' + escHtml(d.location) + '</span>');
    }
    if (d.status && d.status !== 'published') {
      meta.push('<span class="mfe-detail-meta-item" style="text-transform:uppercase;letter-spacing:.5px">' + escHtml(d.status) + '</span>');
    }
    if (meta.length) html += '<div class="mfe-detail-meta">' + meta.join('') + '</div>';

    // Description
    if (d.description) {
      html += '<div class="mfe-detail-desc">' + d.description + '</div>';
    }

    // Photos gallery
    if (d.images && d.images.length) {
      html += '<div class="mfe-detail-photos">';
      for (var i = 0; i < d.images.length; i++) {
        html += '<div class="mfe-detail-photo" style="background-image:url(\'' + escAttr(d.images[i]) + '\')" title="View"></div>';
      }
      html += '</div>';
    }

    // Counts (events with join only)
    if (d.has_join) {
      html += '<div class="mfe-detail-counts">';
      html += '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg>';
      html += '<strong>' + (d.count || 0) + '</strong> members';
      html += '</div>';
    }

    // Buttons
    if (d.has_join) {
      var btnLabels = { workshop: 'Join Workshop', meetup: 'Join Meetup', expert: 'Join Session' };
      var defaultLabel = btnLabels[d.type_token] || 'Join';
      var label2 = d.is_disabled ? (d.status ? d.status.charAt(0).toUpperCase() + d.status.slice(1) : 'Closed')
                                 : (d.is_joined ? 'Joined ✓' : defaultLabel);
      html += '<div class="mfe-detail-btnrow">';
      html += '<button type="button" class="mfe-detail-join mfe-join-btn' + (d.is_joined ? ' is-joined' : '') + '" '
            + 'data-event-id="' + escAttr(d.id) + '" '
            + 'data-default-label="' + escAttr(defaultLabel) + '" '
            + (d.is_disabled ? 'disabled' : '') + '>' + escHtml(label2) + '</button>';
      html += '</div>';
    }

    html += '</div>'; // .mfe-detail-body
    return html;
  }

  // Click handlers
  $(document).on('click', '.mfe-detail-btn', function(e){
    e.preventDefault();
    var $btn = $(this);
    var eid = parseInt($btn.attr('data-event-id'), 10);
    var etype = $btn.attr('data-event-type');
    console.log('[mini-events] See Details clicked', {eid: eid, etype: etype, el: $btn[0]});
    if (!eid || !etype) {
      console.warn('[mini-events] missing event id/type on button', $btn[0]);
      return;
    }
    openDetail(eid, etype);
  });
  $(document).on('click', '#mfe-detail-close', function(e){
    e.preventDefault();
    closeDetail();
  });
  // Click outside content to close
  $(document).on('click', '#mfe-detail-overlay', function(e){
    if (e.target === this) closeDetail();
  });
  // Escape to close
  $(document).on('keydown', function(e){
    if (e.key === 'Escape' && $('#mfe-detail-overlay').hasClass('is-open')) closeDetail();
  });

  /* ═══════════════════════════════════════════════════════════
     LIGHTBOX — gallery photos inside the detail popup
  ═══════════════════════════════════════════════════════════ */
  var lbImages = [];
  var lbIndex = 0;
  var $lb = null;

  function buildLightbox(){
    if ($lb) return $lb;
    $lb = $(
      '<div id="mfe-lightbox" aria-hidden="true">' +
        '<button type="button" class="mfe-lb-close" aria-label="Close">' +
          '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
        '<button type="button" class="mfe-lb-prev" aria-label="Previous">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 18 9 12 15 6"/></svg>' +
        '</button>' +
        '<div class="mfe-lb-stage"><img class="mfe-lb-img" alt="" /></div>' +
        '<button type="button" class="mfe-lb-next" aria-label="Next">' +
          '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="9 18 15 12 9 6"/></svg>' +
        '</button>' +
        '<div class="mfe-lb-counter" aria-live="polite"></div>' +
      '</div>'
    );
    $('body').append($lb);
    return $lb;
  }

  function showLightbox(images, idx){
    if (!images || !images.length) return;
    lbImages = images.slice();
    lbIndex = Math.max(0, Math.min(idx || 0, lbImages.length - 1));
    var $L = buildLightbox();
    renderLb();
    $L.addClass('is-open').attr('aria-hidden', 'false');
  }

  function renderLb(){
    if (!$lb) return;
    $lb.find('.mfe-lb-img').attr('src', lbImages[lbIndex]);
    var multi = lbImages.length > 1;
    $lb.find('.mfe-lb-prev,.mfe-lb-next').toggle(multi);
    if (multi) {
      $lb.find('.mfe-lb-counter').text((lbIndex + 1) + ' / ' + lbImages.length).show();
    } else {
      $lb.find('.mfe-lb-counter').hide();
    }
  }

  function closeLightbox(){
    if (!$lb) return;
    $lb.removeClass('is-open').attr('aria-hidden', 'true');
    $lb.find('.mfe-lb-img').attr('src', '');
  }

  function lbNext(){ if (lbImages.length){ lbIndex = (lbIndex + 1) % lbImages.length; renderLb(); } }
  function lbPrev(){ if (lbImages.length){ lbIndex = (lbIndex - 1 + lbImages.length) % lbImages.length; renderLb(); } }

  // Click on a gallery photo inside detail popup → open lightbox at that index
  $(document).on('click', '#mfe-detail-overlay .mfe-detail-photo', function(e){
    e.preventDefault();
    var $photos = $(this).closest('.mfe-detail-photos').find('.mfe-detail-photo');
    var images = [];
    $photos.each(function(){
      var bg = this.style.backgroundImage || '';
      // Strip url(' ... ') wrapper
      var m = bg.match(/url\(['"]?(.*?)['"]?\)/);
      if (m && m[1]) images.push(m[1]);
    });
    var idx = $photos.index(this);
    showLightbox(images, idx);
  });

  $(document).on('click', '.mfe-lb-close', function(e){ e.preventDefault(); closeLightbox(); });
  $(document).on('click', '.mfe-lb-next',  function(e){ e.preventDefault(); e.stopPropagation(); lbNext(); });
  $(document).on('click', '.mfe-lb-prev',  function(e){ e.preventDefault(); e.stopPropagation(); lbPrev(); });
  // Backdrop click closes (any click on the overlay itself, not on inner controls/img)
  $(document).on('click', '#mfe-lightbox', function(e){
    if (e.target === this || $(e.target).hasClass('mfe-lb-stage') || $(e.target).hasClass('mfe-lb-img')) {
      closeLightbox();
    }
  });
  // Keyboard: Esc close, ←/→ navigate
  $(document).on('keydown', function(e){
    if (!$lb || !$lb.hasClass('is-open')) return;
    if (e.key === 'Escape')    { e.preventDefault(); closeLightbox(); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); lbNext(); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); lbPrev(); }
  });

  /* ═══════════════════════════════════════════════════════════
     LOGIN REQUIRED PROMPT — reuses the existing mfe-detail-overlay
     and applies the specialday theme so the outer chrome (black
     LEGO studs, black frame, circular close button) is identical
     to the Special Days popup. We just inject a small content body.
  ═══════════════════════════════════════════════════════════ */
  function mfShowLoginPrompt(){
    var $overlay = $('#mfe-detail-overlay');
    if (!$overlay.length) {
      // Fallback if the overlay markup isn't on this page
      window.location.href = '/mini-community/join-us/';
      return;
    }
    var $wrapper = $overlay.find('.mfe-detail-wrapper');
    var $content = $overlay.find('#mfe-detail-content');

    // Apply specialday theme (black studs + black frame)
    $wrapper.removeClass('mfe-detail-type-workshop mfe-detail-type-meetup mfe-detail-type-expert mfe-detail-type-specialday');
    $wrapper.addClass('mfe-detail-type-specialday');
    // Mark this overlay instance as the login-prompt mode (used by CSS to
    // hide the bottom scroll cue and constrain the width — Special Days popup
    // itself stays untouched).
    $overlay.attr('data-mode', 'login');

    // Inject the login-required body
    $content.html(
      '<div class="mfe-lp-body">' +
        '<div class="mfe-lp-icon">' +
          '<img src="https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png" alt="" />' +
        '</div>' +
        '<h3 class="mfe-lp-title">Hi there!</h3>' +
        '<p class="mfe-lp-text">You need a Mini-Talks account to join an event.</p>' +
        '<a href="/mini-community/join-us/" class="mfe-lp-cta">Join Us</a>' +
        '<p class="mfe-lp-signin">Already have an account? <a href="#" class="mfe-lp-signin-link">Sign in</a></p>' +
      '</div>'
    );

    // Lock scroll the same way openDetail does
    var savedScrollY = window.scrollY || window.pageYOffset || 0;
    $('body').data('mfe-saved-scroll', savedScrollY);
    $('body').css({position:'fixed', top:(-savedScrollY)+'px', left:0, right:0, width:'100%'});
    $('html,body').addClass('mfe-detail-open');
    $overlay.addClass('is-open');
  }
  window.mfShowLoginPrompt = mfShowLoginPrompt;

  // Sign in link inside the injected body → close prompt + open auth modal
  $(document).on('click', '.mfe-lp-signin-link', function(e){
    e.preventDefault();
    if (typeof closeDetail === 'function') closeDetail();
    else $('#mfe-detail-overlay').removeClass('is-open');
    if (typeof window.mfOpenAuth === 'function') window.mfOpenAuth('login');
    else window.location.href = '/wp-login.php';
  });

})(jQuery);
