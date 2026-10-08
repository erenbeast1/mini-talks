<?php
/**
 * Every picture on every screen, and nothing written straight into a template.
 *
 * Elif could not change some pictures and others were simply missing, both for
 * the same reason: the address was in a template rather than in an area. This
 * looks for the shape of that, and then checks the screens actually draw what
 * the panel holds.
 */
require __DIR__ . '/env.php';

/**
 * The pictures a visitor would see, and the ones with nowhere to point.
 *
 * An <img> inside something `hidden` does not count: the event popup ships one
 * empty on purpose and the script fills it from the card that was opened.
 */
function mf_pictures($html) {
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?><body>' . $html . '</body>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();
    $shown = 0; $empty = array();
    foreach ($doc->getElementsByTagName('img') as $img) {
        $hidden = false;
        for ($n = $img; $n && $n->nodeType === XML_ELEMENT_NODE; $n = $n->parentNode)
            if ($n->hasAttribute('hidden')) { $hidden = true; break; }
        if ($hidden) continue;
        $shown++;
        if (trim($img->getAttribute('src')) === '')
            $empty[] = '<img alt="' . $img->getAttribute('alt') . '">';
    }
    return array($shown, $empty);
}

echo "── no template writes a picture or a sentence onto the page ──\n";
$loose = array();
foreach (glob(MF_PATH . 'templates/*.php') as $f) {
    $src = file_get_contents($f);
    if (preg_match_all('#https?://[^\s\'"<>]+#', $src, $m))
        foreach ($m[0] as $u) $loose[] = basename($f) . ': ' . $u;
}
ok(!$loose, 'no address is hard-coded in a template' . ($loose ? ":\n          " . implode("\n          ", $loose) : ''));

echo "\n── the pictures Elif sent are the ones the screens draw ──\n";
$U = 'https://mini-talks.org/wp-content/uploads/';
$WANT = array(
    'mc.hero.art'          => $U . '2026/09/mini_events_mini_calendar.png',
    'join.art.family'      => $U . '2026/09/mini_community_mini_families.png',
    'join.art.volunteer'   => $U . '2026/09/mini_community_mini_volunteers.png',
    'forum.guest.art'      => $U . '2026/09/mini_community_forum.png',
    'forum.bullet.1'       => $U . '2026/08/mini-talks-bullet-yellow.png',
    'forum.bullet.2'       => $U . '2026/08/mini-talks-bullet-red.png',
    'forum.bullet.3'       => $U . '2026/08/mini-talks-bullet-blue.png',
    'forum.bullet.4'       => $U . '2026/08/mini-talks-bullet-green.png',
);
foreach ($WANT as $area => $url) {
    ok(Mini_Forum_Design::has($area), "the panel has $area");
    ok(Mini_Forum_Design::get($area) === $url, "  and it is " . basename($url));
}
$css = file_get_contents(MF_PATH . 'assets/css/mini-forum.css');
ok(strpos($css, '2026/02/yeni-sari-4.png') !== false, 'the guidelines brick wears the studs she sent');

echo "\n── every screen draws its pictures, and no token is left behind ──\n";
$screens = array(
    'the forum, signed out'  => array('forum-home', array(), false),
    'the forum, signed in'   => array('forum-home', array(), true),
    'Join Us'                => array('join-us', array(), false),
    'the Mini-Calendar hub'  => array('events-home', array(), false),
    'Mini-Volunteer Workshops' => array('events-list', array('mfe_type' => 'workshop'), false),
    'Mini-Family Meetups'    => array('events-list', array('mfe_type' => 'meetup'), false),
    'Mini-Expert Sessions'   => array('events-list', array('mfe_type' => 'expert_session'), false),
    'Mini-Community Updates' => array('events-list', array('mfe_type' => 'update'), false),
    'Mini-Special Days'      => array('events-special-days', array(), false),
    'Host an Event'          => array('events-host', array(), false),
);
foreach ($screens as $name => $s) {
    list($tpl, $vars, $in) = $s;
    $GLOBALS['mf_logged_in'] = $in;
    $html = mf_render($tpl, $vars);
    ok(strpos($html, '{{') === false, "$name: no {{token}} left behind");
    list($shown, $empty) = mf_pictures($html);
    ok(!$empty, "$name: no picture with an empty address (" . $shown . " on show)"
       . ($empty ? ': ' . implode(' | ', $empty) : ''));
}
$GLOBALS['mf_logged_in'] = false;

echo "\n── the forum's own screens ──\n";
$GLOBALS['mf_logged_in'] = true;
$in = mf_render('forum-home');
ok(substr_count($in, 'Mini-Forum</h1>') + substr_count($in, 'Mini-Forum</h2>') === 1,
   'the heading is on the page once, not twice');
ok(strpos($in, Mini_Forum_Design::get('forum.bullet.1')) !== false
   && strpos($in, Mini_Forum_Design::get('forum.bullet.4')) !== false,
   'the guidelines have a brick beside each line');
preg_match_all('/mini-talks-bullet-([a-z]+)\.png/', $in, $m);
ok(array_slice($m[1], 0, 4) === array('yellow','red','blue','green'),
   'in the order she sent them: ' . implode(', ', array_slice($m[1], 0, 4)));
$GLOBALS['mf_logged_in'] = false;
$out = mf_render('forum-home');
ok(strpos($out, Mini_Forum_Design::get('forum.guest.art')) !== false,
   'the signed-out box has a picture in it rather than an empty frame');

echo "\n── and all of it is still editable ──\n";
add_filter('mf_block', function ($v, $id) {
    return in_array($id, array('mc.hero.art','forum.bullet.1','join.art.family','forum.guest.art'), true)
        ? 'https://mini-talks.org/x/degisti.png' : $v;
}, 10, 2);
$hub = mf_render('events-home');
ok(strpos($hub, 'degisti.png') !== false, 'changing the hub picture changes the hub');
$ju = mf_render('join-us');
ok(strpos($ju, 'degisti.png') !== false, 'changing a Join Us picture changes Join Us');
$GLOBALS['mf_logged_in'] = true;
ok(strpos(mf_render('forum-home'), 'degisti.png') !== false, 'changing a brick changes the forum');
$GLOBALS['mf_logged_in'] = false;
ok(strpos(mf_render('forum-home'), 'degisti.png') !== false, 'and the signed-out screen too');
remove_all_filters('mf_block');

echo "\n── the header menu points at the pictures she sent ──\n";
$U = 'https://mini-talks.org/wp-content/uploads/';
$head = file_get_contents(dirname(__DIR__) . '/snippets/mt-header-markup.html');
foreach (array('mini_kits_mini_designs','mini_kits_design_talks','mini_kits_brick_talks','mini_kits_fig_talks',
               'mini_community_forum','mini_community_mini_families','mini_community_mini_volunteers',
               'mini_events_mini_calendar') as $name)
    ok(strpos($head, $U . '2026/09/' . $name . '.png') !== false, "the menu draws $name.png");
/* The whole address, not a fragment: "mini_calendar.png" is inside
   "mini_events_mini_calendar.png". */
foreach (array('2026/09/mini_designs_icon.png','2026/09/design_talks_icon.png','2026/09/brick_talks_icon.png',
               '2026/09/fig_talks_icon.png','2026/03/33_forum_3D.png','2026/03/17_mini_families_3D.png',
               '2026/03/18_mini_volunteers_3D-e1772736794933.png','2026/09/mini_calendar.png') as $old)
    ok(strpos($head, $U . $old) === false, 'and no longer the old ' . basename($old));

done();
