<?php
/**
 * Design — the front end's HTML, editable from wp-admin.
 *
 * Every screen is cut into named areas. An area's default HTML lives in the
 * manifest below; an admin may replace it with their own, written as plain HTML
 * in wp-admin. Templates print an area with mf_block('id').
 *
 * Dynamic content is not lost when an area is rewritten: an area declares
 * tokens, and the template hands their values in. The admin writes
 *
 *     <h1 class="mine">{{nickname}}</h1>
 *
 * and puts {{nickname}} wherever they like, or drops it entirely. Tokens whose
 * value is markup the plugin built — a list of posts, a row of role badges —
 * pass through untouched; the surrounding HTML is the admin's.
 *
 * Updating the plugin never touches an admin's HTML: overrides live in the
 * options table, not in the plugin's files, and rendering prefers them. When a
 * plugin update changes an area's default, the Design page says so beside that
 * area and offers the new default — it never applies it on its own.
 *
 * What this deliberately does NOT do is store PHP and run it. A textarea whose
 * contents get eval'd turns every admin account into a way to run code on the
 * server. Layout and copy live here; logic stays in files, where a theme or a
 * wp-content/mini-forum-templates/ copy can replace it properly.
 */

if (!defined('ABSPATH')) exit;

/* The inline icons the profile uses. Constants so the template and the
   manifest's default HTML cannot drift apart. */
define('MF_PENCIL_SVG', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>');
define('MF_COG_SVG', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.36.44.63.81.76H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>');
/* Game account — a controller, for the App & Studio card. */
define('MF_GAME_SVG', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="6" y1="11" x2="10" y2="11"/><line x1="8" y1="9" x2="8" y2="13"/><line x1="15" y1="12" x2="15.01" y2="12"/><line x1="18" y1="10" x2="18.01" y2="10"/><rect x="2" y="6" width="20" height="12" rx="6"/></svg>');
/* A tick, for the "check your inbox" step. */
define('MF_TICK_SVG', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>');

class Mini_Forum_Design {

    const OPT_BLOCKS = 'mf_design_blocks';
    const OPT_CSS    = 'mf_design_css';
    const OPT_BASE   = 'mf_design_base';   // the default each override was written against
    const OPT_BCSS   = 'mf_design_block_css';  // CSS written beside an area's HTML
    const OPT_LOG    = 'mf_design_history';    // every change, with the reason given for it
    const LOG_KEEP   = 60;                     // how many changes are kept

    /** Where the custom stylesheets apply. */
    public static function css_areas() {
        // Filterable for the same reason the block manifest is: another plugin's
        // screens want their own stylesheet, not a second Design page.
        return apply_filters('mf_design_css_areas_list', array(
            'global'  => array('Global', 'Every Mini-Forum screen, plus the popups.'),
            'forum'   => array('Forum', 'The forum home, a post, the create form.'),
            'events'  => array('Events', 'The events hub and its sub-pages.'),
            'profile' => array('Profile', 'The member profile, including the Mini-Kits panel.'),
            'join'    => array('Join Us', 'The membership form.'),
        ));
    }

    /**
     * Every editable block, grouped by the screen it belongs to.
     *
     * 'html' blocks may carry markup; 'text' blocks are printed escaped, for
     * places where markup would break the layout (a button's label, a heading
     * that is already inside its own tag).
     */
    /**
     * The default HTML for an area, kept as a file under design/.
     *
     * A screen's markup is hundreds of characters; as a PHP string literal it is
     * unreadable and easy to break with a stray quote. As a file it can be read,
     * diffed and edited like the template it came from. Cached per request.
     */
    public static function file($name) {
        static $cache = array();
        if (isset($cache[$name])) return $cache[$name];
        $path = MF_PATH . 'design/' . preg_replace('/[^a-z0-9._-]/i', '', $name) . '.html';
        $cache[$name] = file_exists($path) ? trim(file_get_contents($path)) : '';
        return $cache[$name];
    }

    /**
     * Every editable area, grouped by screen.
     *
     *   array(label, type, default_html, tokens)
     *
     * type   'html' takes markup, 'text' is printed escaped (a button label,
     *        a heading that already sits inside its own tag).
     * tokens name => what the template puts there. The value is inserted as-is:
     *        the plugin built it, so it is already safe.
     * keep   needle => why. A rewrite may drop these, and the page still works,
     *        but that one behaviour stops: the Design page warns when one goes
     *        missing rather than letting it fail quietly on the front end.
     */
    public static function manifest() {
        // Filterable so another plugin can add its own screens: Mini-Devices'
        // Mini-Kits panel belongs on this page too, not on a second one.
        return apply_filters('mf_design_blocks', array(

            /* Empty by default, and on purpose: somewhere to put a banner, a
               hero, a footer or a notice on a page that has no slot for one,
               without touching anything the plugin draws. */
            'slots' => array('label' => 'Your own blocks — top and bottom of each page', 'blocks' => array(
                'slot.forum.top'      => array('Forum — above everything', 'html', '', array(), array()),
                'slot.forum.bottom'   => array('Forum — below everything', 'html', '', array(), array()),
                'slot.profile.top'    => array('Profile — above everything', 'html', '', array(), array()),
                'slot.profile.bottom' => array('Profile — below everything', 'html', '', array(), array()),
                'slot.events.top'     => array('Events — above everything', 'html', '', array(), array()),
                'slot.events.bottom'  => array('Events — below everything', 'html', '', array(), array()),
                'slot.join.top'       => array('Join Us — above everything', 'html', '', array(), array()),
                'slot.join.bottom'    => array('Join Us — below everything', 'html', '', array(), array()),
            )),

            'forum_out' => array('label' => 'Forum — signed out', 'blocks' => array(
                'forum.guest.hero' => array('Hero', 'html',
                    '@forum.guest.hero',
                    array('logo' => 'The Mini-Talks logo URL')),

                'forum.guest.access' => array('Forum Access — heading and cards', 'html',
                    '@forum.guest.access',
                    array('join_url' => 'The Join Us page', 'studs_red' => 'Red stud strip image',
                          'studs_blue' => 'Blue stud strip image'),
                    array('data-mf-action="login"' => 'opens the sign-in popup')),
            )),

            'forum_in' => array('label' => 'Forum — signed in', 'blocks' => array(
                'forum.hero' => array('Hero', 'html',
                    '@forum.hero',
                    array('logo' => 'The Mini-Talks logo URL')),
            )),

            'profile' => array('label' => 'Profile', 'blocks' => array(
                'profile.header' => array('Header — avatar, name, badges, stats', 'html',
                    '@profile.header',
                    array('avatar' => "The member's avatar", 'edit_icon' => 'Pencil icon',
                          'nickname' => 'Their nickname', 'badges' => 'Their role badges',
                          'stats' => 'The Posts / Events / Kits boxes', 'settings_icon' => 'Cog icon'),
                    array(
                      'mf-av-editable'            => 'clicking the avatar opens the editor',
                      'mf-av-edit-btn'            => 'the Customize Avatar button opens the editor',
                      'data-mf-action="settings"' => 'opens the Settings popup',
                      'mf-stats-row'              => 'Mini-Devices adds the Mini-Kit request box here',
                      '{{stats}}'                 => 'the Posts / Events / Kits boxes, and where Mini-Kits writes its count',
                    )),

                'profile.posts.title'   => array('Posts heading', 'text', 'My Posts'),
                'profile.posts.empty'   => array('Posts empty state', 'html', 'No posts yet.'),
                'profile.events' => array('Mini-Events tab — the block', 'html',
                    '@profile.events',
                    array('count' => 'How many they have joined', 'rows' => 'One row per event',
                          'empty' => 'The empty state, when they have joined none',
                          'events_url' => 'The Mini-Events hub'),
                    array('{{rows}}' => 'the events themselves')),

                'profile.events.row' => array('Mini-Events tab — one row', 'html',
                    '@profile.events.row',
                    array('state' => 'is-upcoming or is-past', 'url' => 'The event page',
                          'colour' => 'red, yellow, blue or green — the type&rsquo;s colour',
                          'day' => 'Mon, Tue…', 'date' => 'The day number', 'month' => 'Jan, Feb…',
                          'title' => 'The event', 'meta' => 'Type, time and place',
                          'tag' => 'Coming up, Been, or Cancelled')),

                'profile.events.empty' => array('Mini-Events tab — nothing joined yet', 'html',
                    '@profile.events.empty'),

                'profile.kits.title'    => array('Mini-Kits heading', 'text', 'Mini-Kits'),
                'profile.kits.empty'    => array('Mini-Kits empty state', 'html', 'Your Mini-Talks kits will appear here once the Mini-Devices plugin is active.'),
                'profile.studio.title'  => array('App &amp; Studio heading', 'text', 'App & Studio'),
                'profile.studio.empty'  => array('App &amp; Studio empty state', 'html', 'Coming soon.'),
            )),

            /* The game account card, its popup, and the e-mail that carries the
               confirmation link. Every sentence a member reads while connecting
               their Mini-Talks game account is here. */
            'game' => array('label' => 'Game account — Profile → App & Studio', 'blocks' => array(

                'game.connect' => array('The card, before anything is connected', 'html',
                    '@game.connect',
                    array('logo' => 'The Mini-Talks mark, set on the Mini-Talks Game page'),
                    array('data-mf-action="game-open"' => 'opens the connect popup — without a button carrying this, nobody can connect',
                          'mf-studs' => 'the stud strip along the top of the card')),

                'game.linked' => array('The card, once connected', 'html',
                    '@game.linked',
                    array('avatar' => 'The game figure, or the forum avatar when the game has none',
                          'name' => 'The name on the game account',
                          'tags' => 'The role badge, and the age band or organisation after it',
                          'tagline' => 'Their game tagline, if they have one',
                          'stats' => 'The brick / medal / cup tiles',
                          'experts' => 'The experts block; empty when there are none',
                          'detail_btn' => 'The Details button; empty when there is nothing to show',
                          'minis' => "A parent's Minis; empty for every other role",
                          'email' => 'The connected address, masked', 'synced' => 'How long ago it was read'),
                    array('data-mf-action="game-refresh"'    => 'reads the game again',
                          'data-mf-action="game-avatar"'     => 'copies the game figure onto the forum avatar',
                          'data-mf-action="game-disconnect"' => 'opens the disconnect popup — leave it in, or nobody can undo this')),

                'game.stat' => array('One counter tile', 'html',
                    '@game.stat',
                    array('tone' => 'The tile\'s colour class — mf-game-stat-bricks, -medals, -cups, -streak, -minis',
                          'value' => 'The number', 'label' => 'What it counts'),
                    array('{{value}}' => 'the number itself', '{{label}}' => 'what it counts')),

                'game.minis' => array("A parent's Minis — the block around them", 'html',
                    '@game.minis',
                    array('count' => 'How many', 'rows' => 'One row per Mini'),
                    array('{{rows}}' => 'the Minis themselves')),

                'game.mini' => array("A parent's Minis — one row", 'html',
                    '@game.mini',
                    array('avatar' => "The Mini's figure, or their initial",
                          'name' => 'Their name', 'age' => 'Their age band',
                          'tagline' => 'The message their parent set for them, or their tagline',
                          'scenes' => 'Scenes played, minutes and recordings, on one line',
                          'stats' => 'Their four counter tiles',
                          'detail_btn' => 'The button that opens their detail')),

                'game.detail' => array('Popup — one Mini in detail', 'html',
                    '@game.detail',
                    array('name' => 'Whose detail it is', 'sub' => 'Their age band and message'),
                    array('data-mf-detail-body'      => 'the detail itself is written into this element',
                          'data-mf-detail-name'      => 'the name is written here',
                          'data-mf-game-step="detail"' => 'marks this as the detail step of the popup')),

                'game.detail.button' => array('The Details button', 'html',
                    '@game.detail.button',
                    array('id' => 'Which panel it opens', 'label' => 'Its wording'),
                    array('data-mf-action="game-detail"' => 'opens the detail popup',
                          'data-value="{{id}}"'          => 'says which Mini — without it the button opens nothing')),

                'game.detail.panel' => array('Detail popup — what is inside', 'html',
                    '@game.detail.panel',
                    array('stats' => 'The four counter tiles', 'streak' => 'The streak pills',
                          'rewards' => 'Where the bricks came from', 'scenes' => 'Scene by scene',
                          'figures' => 'The characters built', 'experts' => 'The experts')),

                'game.scene.row' => array('Detail — one scene', 'html',
                    '@game.scene.row',
                    array('name' => 'The scene', 'meta' => 'Minutes, recordings, when it was last played',
                          'levels' => 'One chip per level')),

                'game.level' => array('Detail — one level chip', 'html',
                    '@game.level',
                    array('state' => 'is-open or is-locked', 'name' => 'Sound, Word, Sentence or Dialogue')),

                'game.kv' => array('Detail — a row of small numbers', 'html',
                    '@game.kv',
                    array('title' => 'What the row is', 'rows' => 'The numbers themselves')),

                'game.kv.item' => array('Detail — one small number', 'html',
                    '@game.kv.item',
                    array('value' => 'The number', 'label' => 'What it means')),

                'game.detail.open'    => array('Button — open a Mini&rsquo;s detail', 'text', 'Details'),
                'game.detail.streak'  => array('Detail heading — streak', 'text', 'Streak'),
                'game.detail.current' => array('Detail — current streak', 'text', 'Current'),
                'game.detail.longest' => array('Detail — longest streak', 'text', 'Longest'),
                'game.detail.days'    => array('Detail — active days', 'text', 'Active days'),
                'game.detail.last'    => array('Detail — last active', 'text', 'Last active'),
                'game.detail.rewards' => array('Detail heading — rewards', 'text', 'Where the bricks came from'),

                'game.figures' => array('Characters built — the block around them', 'html',
                    '@game.figures',
                    array('count' => 'How many', 'rows' => 'One thumbnail each')),

                'game.figure' => array('Characters built — one thumbnail', 'html',
                    '@game.figure',
                    array('url' => 'The picture the game rendered', 'scene' => 'The scene it was built for')),

                'game.scenes' => array('Scenes played', 'html',
                    '@game.scenes',
                    array('played' => 'How many scenes they have played', 'total' => 'How many there are',
                          'rows' => 'One row per scene, with its levels', 'minutes' => 'Minutes played',
                          'recordings' => 'How many recordings they have made')),

                'game.experts' => array('Experts — the block around them', 'html',
                    '@game.experts',
                    array('rows' => 'One row per expert')),

                'game.expert' => array('Experts — one row', 'html',
                    '@game.expert',
                    array('face' => 'Their picture, or the first letter of their name',
                          'name' => 'Their name', 'where' => 'Their organisation, or their profession')),

                'game.form' => array('Popup — asking for the address', 'html',
                    '@game.form',
                    array(),
                    array('id="mf-game-email"'          => 'the address is read from this field',
                          'data-mf-game-msg'            => 'refusals and errors are written here',
                          'data-mf-action="game-send"'  => 'sends the confirmation link',
                          'data-mf-game-step="form"'    => 'marks this as the first step of the popup')),

                'game.sent' => array('Popup — after the link is sent', 'html',
                    '@game.sent',
                    array('email' => 'The address it went to', 'minutes' => 'How long the link lasts', 'tick' => 'The tick icon'),
                    array('data-mf-game-email'        => 'the address is written into this element',
                          'data-mf-action="game-open"' => 'goes back to the address field',
                          'data-mf-game-step="sent"'   => 'marks this as the second step of the popup')),

                'game.off' => array('Popup — confirming a disconnect', 'html',
                    '@game.off',
                    array(),
                    array('data-mf-action="game-disconnect-yes"' => 'actually disconnects',
                          'data-mf-action="game-close"'          => 'changes their mind',
                          'data-mf-game-step="off"'              => 'marks this as the disconnect step of the popup')),

                'game.email.subject' => array('Confirmation e-mail — subject', 'text',
                    'Connect your Mini-Talks game account'),

                'game.email' => array('Confirmation e-mail — the whole mail', 'html',
                    '@game.email',
                    array('game_name' => 'The name on the game account', 'nickname' => 'Their forum nickname',
                          'site' => 'This site&rsquo;s name', 'link' => 'The confirmation link',
                          'minutes' => 'How long the link lasts',
                          'logo' => 'The Mini-Talks mark', 'studs' => 'The stud strip image along the top'),
                    array('{{link}}' => 'the confirmation link — a mail without it connects nobody')),

                'game.stat.bricks' => array('Counter name — bricks', 'text', 'Bricks'),
                'game.stat.medals' => array('Counter name — medals', 'text', 'Medals'),
                'game.stat.cups'   => array('Counter name — cups', 'text', 'Cups'),
                'game.stat.streak' => array('Counter name — streak', 'text', 'Day streak'),
                'game.stat.minis'  => array('Counter name — Minis', 'text', 'Minis'),
                'game.ago.now'     => array('Freshness — read moments ago', 'text', 'just now'),

                'game.msg.linked'   => array('Message — connected', 'text', 'Connected. Your game account is on your profile now.'),
                'game.msg.taken'    => array('Message — that account is on another profile', 'text', 'That game account is already connected to another Mini-Talks profile.'),
                'game.msg.already'  => array('Message — this profile already has one', 'text', 'Your profile is already connected to a game account. Disconnect it first.'),
                'game.msg.invalid'  => array('Message — the link no longer works', 'text', 'That link is no longer valid. Please start again.'),
                'game.msg.bademail' => array('Message — not an address', 'text', 'That does not look like an e-mail address.'),
                'game.msg.slow'     => array('Message — too many tries', 'text', 'That is a lot of tries. Please wait a few minutes and start again.'),
                'game.msg.off'      => array('Message — linking is not set up', 'text', 'Game linking is not set up yet.'),
                'game.msg.noavatar' => array('Message — no figure saved in the game', 'text', 'There is no figure saved on that game account yet.'),
                'game.msg.avatar'   => array('Message — figure copied across', 'text', 'Your game figure is now your forum avatar.'),

                'game.role.child'   => array('Role name — child account', 'text', 'Mini'),
                'game.role.parent'  => array('Role name — parent account', 'text', 'Parent'),
                'game.role.expert'  => array('Role name — expert account', 'text', 'Expert'),
                'game.role.builder' => array('Role name — builder account', 'text', 'Builder'),
                'game.role.admin'   => array('Role name — the team', 'text', 'Team'),
            )),

            /* The Mini-Calendar and the five pages it leads to. The markup is the
               design as delivered; every sentence on those screens is an area here. */
            'calendar' => array('label' => 'Mini-Calendar — the hub', 'blocks' => array(

                'mc.hero' => array('Hero', 'html', '@mc.hero',
                    array('title' => 'The page title', 'lead' => 'The first line',
                          'body' => 'The paragraph under it', 'art' => 'The picture beside it')),

                'mc.calendar' => array('The month calendar', 'html', '@mc.calendar',
                    array('year' => 'The month it opens on', 'month' => 'Its month number'),
                    array('id="me-dates"' => 'the days are drawn into this element',
                          'id="me-month"' => 'the month name is written here',
                          'data-step' => 'the two arrows — without them nobody can change month')),

                'mc.note' => array('The programme note, under the calendar', 'html', '@mc.note'),

                'mc.section' => array('One category on the hub', 'html', '@mc.section',
                    array('kind' => 'workshop, family, expert, updates or special — also picks the colour',
                          'icon' => 'The picture', 'title' => 'The heading',
                          'description' => 'The paragraph', 'see_all_url' => 'Its own page',
                          'see_all_label' => 'The button', 'cards' => 'That month&rsquo;s events'),
                    array('data-kind="{{kind}}"' => 'the calendar groups and colours by this',
                          '{{cards}}' => 'the events themselves')),

                'mc.card' => array('One event card', 'html', '@mc.card',
                    array('image' => 'Its cover picture', 'subtitle' => 'Its short line',
                          'mon' => 'OCT', 'day' => '03', 'year' => '2026', 'title' => 'The event',
                          'meta' => 'Time and place', 'description' => 'The short description',
                          'details' => 'The long copy, shown in the popup', 'status' => 'Planned or Completed'),
                    array('me-date-badge' => 'the calendar reads the date from here',
                          'data-detail' => 'opens the popup — without it the card cannot be opened',
                          'me-status' => 'the word Completed moves a card into the past list')),

                'mc.special.card' => array('One special day, on the hub', 'html', '@mc.special.card',
                    array('mon' => 'SEP', 'day' => '21', 'year' => '2026', 'title' => 'The day',
                          'description' => 'One line', 'story' => 'The whole story, shown in the popup'),
                    array('me-special-trigger' => 'opens the special-day popup')),

                'mc.join' => array('The closing call to action', 'html', '@mc.join',
                    array('eyebrow' => 'The small line above the heading',
                          'join_url' => 'Where Join an Event goes', 'host_url' => 'Where Host an Event goes')),

                'mc.popup.event' => array('The event popup', 'html', '@mc.popup.event',
                    array('note' => 'An optional line at the foot of the popup'),
                    array('me-detail-copy' => 'the event&rsquo;s own words are written here',
                          'me-popup-close' => 'closes it')),

                'mc.popup.special' => array('The special-day popup', 'html', '@mc.popup.special', array(),
                    array('me-special-description' => 'the story is written here',
                          'me-special-close' => 'closes it')),

                'mc.desc.workshop' => array('Mini-Volunteer Workshops — the paragraph', 'text',
                    'Guided play sessions at Talk-Spots or online, where children spend pressure-free time with Mini-Volunteers. Mini-Kits and the App & Studio may join the play, while families stay quietly nearby.'),
                'mc.desc.family' => array('Mini-Family Meetups — the paragraph', 'text',
                    'Family gatherings at Talk-Spots or online — with or without children — where families find peer support, share experiences, and know they are not alone.'),
                'mc.desc.expert' => array('Mini-Expert Sessions — the paragraph', 'text',
                    'Online sessions where clinicians, educators, and researchers share knowledge with the Mini-Talks community. Explore one topic at a time, listen at your own pace, and bring questions about the session’s subject.'),
                'mc.desc.updates' => array('Mini-Community Updates — the paragraph', 'text',
                    'News, stories, and milestones from across the Mini-Talks community — families, volunteers, Talk-Spots, and experts around the world.'),
                'mc.desc.special' => array('Mini-Special Days — the paragraph', 'text',
                    'A year-round calendar of awareness days that bring attention to children\'s voices, communication, and inclusion.'),
            )),

            'calendar_pages' => array('label' => 'Mini-Calendar — the five pages', 'blocks' => array(

                'mc.list.head' => array('Page heading', 'html', '@mc.list.head',
                    array('icon' => 'The picture', 'title' => 'The page title', 'description' => 'The paragraph')),

                'mc.expect' => array('What happens here — the block', 'html', '@mc.expect',
                    array('title' => 'The heading', 'lead' => 'The line under it', 'items' => 'The points'),
                    array('{{items}}' => 'the points themselves')),

                'mc.expect.item' => array('What happens here — one point', 'html', '@mc.expect.item',
                    array('bullet' => 'Its brick', 'title' => 'The point', 'text' => 'One line about it')),

                'mc.filters' => array('Month and place filters', 'html', '@mc.filters',
                    array('anchor' => 'The section&rsquo;s id', 'find_title' => 'The heading',
                          'find_lead' => 'The line under it', 'months' => 'The month buttons', 'places' => 'The place buttons'),
                    array('id="mw-month-toggle"' => 'opens the month list',
                          'id="mw-month-options"' => 'the months go in here')),

                'mc.filters.month' => array('One month button', 'html', '@mc.filters.month',
                    array('value' => 'all, or 2026-10', 'on' => 'true when it is the chosen one', 'label' => 'Its wording')),

                'mc.filters.place' => array('One place button', 'html', '@mc.filters.place',
                    array('value' => 'all, or the place', 'on' => 'true when chosen', 'label' => 'Its wording',
                          'tone' => 'The colour class it wears', 'icon' => 'Its pin or screen'),
                    array('data-location' => 'the filter reads the place from here')),

                'mc.filters.sort' => array('One order button &mdash; Mini-Community Updates', 'html', '@mc.filters.sort',
                    array('value' => 'newest or oldest', 'on' => 'true when chosen', 'label' => 'Its wording',
                          'tone' => 'The colour class it wears'),
                    array('data-sort' => 'the filter reads the order from here')),

                'mc.filters.special' => array('Month filter &mdash; Mini-Special Days', 'html', '@mc.filters.special',
                    array('months' => 'The month buttons', 'all_label' => 'The wording on the show-everything button'),
                    array('id="mw-month-toggle"' => 'opens the month list',
                          'id="mw-month-options"' => 'the months go in here',
                          'id="sd-show-all"' => 'brings every month back')),

                'mc.list.body' => array('Upcoming and past', 'html', '@mc.list.body',
                    array('upcoming_title' => 'The first heading', 'upcoming_empty' => 'When the filter matches nothing',
                          'upcoming' => 'The upcoming cards', 'past_title' => 'The second heading',
                          'past_empty' => 'When there are no past ones', 'past' => 'The past cards'),
                    array('id="mw-upcoming-grid"' => 'the filter moves cards in and out of here',
                          'id="mw-past-grid"' => 'and of here')),

                'mc.upcoming.workshop.title' => array('Mini-Volunteer Workshops — upcoming heading', 'text', 'Upcoming Workshops'),
                'mc.past.workshop.title' => array('Mini-Volunteer Workshops — past heading', 'text', 'Past Workshops'),
                'mc.upcoming.workshop.empty' => array('Mini-Volunteer Workshops — nothing matches', 'text', 'No upcoming workshops match your selection.'),
                'mc.past.workshop.empty' => array('Mini-Volunteer Workshops — nothing past yet', 'text', 'No completed workshops have been added yet.'),
                'mc.find.workshop.title' => array('Mini-Volunteer Workshops — find heading', 'text', 'Find a workshop'),
                'mc.find.workshop.lead' => array('Mini-Volunteer Workshops — find line', 'text', 'Choose a month or location, then open See Details to explore the session.'),
                'mc.expect.workshop.title' => array('Mini-Volunteer Workshops — what happens heading', 'text', 'What Happens in a Workshop?'),
                'mc.expect.workshop.lead' => array('Mini-Volunteer Workshops — what happens line', 'text', 'Mini-Workshops are gentle, structured, and low-pressure.'),
                'mc.expect.workshop.1.title' => array('Mini-Volunteer Workshops — point 1', 'text', '1:1 or Small Group'),
                'mc.expect.workshop.1.text' => array('Mini-Volunteer Workshops — point 1, line', 'text', 'A small, supportive setting. Capacity is listed for each session.'),
                'mc.expect.workshop.2.title' => array('Mini-Volunteer Workshops — point 2', 'text', 'Mini-Volunteers Present'),
                'mc.expect.workshop.2.text' => array('Mini-Volunteer Workshops — point 2, line', 'text', 'Volunteers guide the shared activities.'),
                'mc.expect.workshop.3.title' => array('Mini-Volunteer Workshops — point 3', 'text', 'Online or at a Talk-Spot'),
                'mc.expect.workshop.3.text' => array('Mini-Volunteer Workshops — point 3, line', 'text', 'Join a reading session online or meet at a local venue.'),
                'mc.expect.workshop.4.title' => array('Mini-Volunteer Workshops — point 4', 'text', 'Around 40–60 Minutes'),
                'mc.expect.workshop.4.text' => array('Mini-Volunteer Workshops — point 4, line', 'text', 'Check the duration of your chosen session.'),
                'mc.expect.workshop.5.title' => array('Mini-Volunteer Workshops — point 5', 'text', 'No Pressure to Speak'),
                'mc.expect.workshop.5.text' => array('Mini-Volunteer Workshops — point 5, line', 'text', 'Communication at the child’s pace.'),
                'mc.expect.workshop.6.title' => array('Mini-Volunteer Workshops — point 6', 'text', 'Family Stays Nearby'),
                'mc.expect.workshop.6.text' => array('Mini-Volunteer Workshops — point 6, line', 'text', 'A parent or caregiver remains close.'),
                'mc.expect.workshop.7.title' => array('Mini-Volunteer Workshops — point 7', 'text', 'Mini-Kits & Studio'),
                'mc.expect.workshop.7.text' => array('Mini-Volunteer Workshops — point 7, line', 'text', 'Supportive tools when they help.'),
                'mc.expect.workshop.8.title' => array('Mini-Volunteer Workshops — point 8', 'text', 'A Predictable Flow'),
                'mc.expect.workshop.8.text' => array('Mini-Volunteer Workshops — point 8, line', 'text', 'Welcome, shared activity, optional sharing, and goodbye.'),
                'mc.upcoming.family.title' => array('Mini-Family Meetups — upcoming heading', 'text', 'Upcoming Meetups'),
                'mc.past.family.title' => array('Mini-Family Meetups — past heading', 'text', 'Past Meetups'),
                'mc.upcoming.family.empty' => array('Mini-Family Meetups — nothing matches', 'text', 'No upcoming meetups match your selection.'),
                'mc.past.family.empty' => array('Mini-Family Meetups — nothing past yet', 'text', 'No completed meetups have been added yet.'),
                'mc.find.family.title' => array('Mini-Family Meetups — find heading', 'text', 'Find a meetup'),
                'mc.find.family.lead' => array('Mini-Family Meetups — find line', 'text', 'Choose a month or location, then open See Details to explore the session.'),
                'mc.expect.family.title' => array('Mini-Family Meetups — what happens heading', 'text', 'What Happens in a Meetup?'),
                'mc.expect.family.lead' => array('Mini-Family Meetups — what happens line', 'text', 'Our meetups are informal, relaxed, and pressure-free.'),
                'mc.expect.family.1.title' => array('Mini-Family Meetups — point 1', 'text', 'With or Without Children'),
                'mc.expect.family.1.text' => array('Mini-Family Meetups — point 1, line', 'text', 'Adults welcome to come solo.'),
                'mc.expect.family.2.title' => array('Mini-Family Meetups — point 2', 'text', 'Family-Led'),
                'mc.expect.family.2.text' => array('Mini-Family Meetups — point 2, line', 'text', 'Conversations grow from shared experience.'),
                'mc.expect.family.3.title' => array('Mini-Family Meetups — point 3', 'text', 'Online or In-Person'),
                'mc.expect.family.3.text' => array('Mini-Family Meetups — point 3, line', 'text', 'Both formats supported.'),
                'mc.expect.family.4.title' => array('Mini-Family Meetups — point 4', 'text', 'About 90 Minutes'),
                'mc.expect.family.4.text' => array('Mini-Family Meetups — point 4, line', 'text', 'Time for real conversation. October welcome sessions are shorter; see each event’s duration.'),
                'mc.expect.family.5.title' => array('Mini-Family Meetups — point 5', 'text', 'Confidential'),
                'mc.expect.family.5.text' => array('Mini-Family Meetups — point 5, line', 'text', 'What is shared stays among families.'),
                'mc.expect.family.6.title' => array('Mini-Family Meetups — point 6', 'text', 'Open Across Differences'),
                'mc.expect.family.6.text' => array('Mini-Family Meetups — point 6, line', 'text', 'SM, autism, language, more.'),
                'mc.expect.family.7.title' => array('Mini-Family Meetups — point 7', 'text', 'Peer Support'),
                'mc.expect.family.7.text' => array('Mini-Family Meetups — point 7, line', 'text', 'You are not alone.'),
                'mc.expect.family.8.title' => array('Mini-Family Meetups — point 8', 'text', 'Light Structure'),
                'mc.expect.family.8.text' => array('Mini-Family Meetups — point 8, line', 'text', 'Conversation flows freely.'),
                'mc.upcoming.expert.title' => array('Mini-Expert Sessions — upcoming heading', 'text', 'Upcoming Sessions'),
                'mc.past.expert.title' => array('Mini-Expert Sessions — past heading', 'text', 'Past Sessions'),
                'mc.upcoming.expert.empty' => array('Mini-Expert Sessions — nothing matches', 'text', 'No upcoming sessions match your selection.'),
                'mc.past.expert.empty' => array('Mini-Expert Sessions — nothing past yet', 'text', 'No completed sessions have been added yet.'),
                'mc.find.expert.title' => array('Mini-Expert Sessions — find heading', 'text', 'Find a session'),
                'mc.find.expert.lead' => array('Mini-Expert Sessions — find line', 'text', 'Choose a month or format, then open See Details for the topic, session outline, and speaker information.'),
                'mc.expect.expert.title' => array('Mini-Expert Sessions — what happens heading', 'text', 'What Happens in a Session?'),
                'mc.expect.expert.lead' => array('Mini-Expert Sessions — what happens line', 'text', 'Sessions are informative, calm, and family-friendly.'),
                'mc.expect.expert.1.title' => array('Mini-Expert Sessions — point 1', 'text', 'All Members Welcome'),
                'mc.expect.expert.1.text' => array('Mini-Expert Sessions — point 1, line', 'text', 'Open to families, volunteers, and the wider community.'),
                'mc.expect.expert.2.title' => array('Mini-Expert Sessions — point 2', 'text', 'Expert-Led'),
                'mc.expect.expert.2.text' => array('Mini-Expert Sessions — point 2, line', 'text', 'Clinicians, educators, and researchers. Speaker names will be announced.'),
                'mc.expect.expert.3.title' => array('Mini-Expert Sessions — point 3', 'text', 'Online Format'),
                'mc.expect.expert.3.text' => array('Mini-Expert Sessions — point 3, line', 'text', 'Join from anywhere. Session times are listed in UTC.'),
                'mc.expect.expert.4.title' => array('Mini-Expert Sessions — point 4', 'text', '45–60 Minutes'),
                'mc.expect.expert.4.text' => array('Mini-Expert Sessions — point 4, line', 'text', 'Focused talks with time for topic-related questions.'),
                'mc.expect.expert.5.title' => array('Mini-Expert Sessions — point 5', 'text', 'Knowledge, Not Advice'),
                'mc.expect.expert.5.text' => array('Mini-Expert Sessions — point 5, line', 'text', 'General information, not individual assessment or counselling.'),
                'mc.expect.expert.6.title' => array('Mini-Expert Sessions — point 6', 'text', 'Focused Topics'),
                'mc.expect.expert.6.text' => array('Mini-Expert Sessions — point 6, line', 'text', 'One subject per session, explained clearly.'),
                'mc.expect.expert.7.title' => array('Mini-Expert Sessions — point 7', 'text', 'Recordings When Available'),
                'mc.expect.expert.7.text' => array('Mini-Expert Sessions — point 7, line', 'text', 'Recording availability will be stated for each session.'),
                'mc.expect.expert.8.title' => array('Mini-Expert Sessions — point 8', 'text', 'Resources Shared'),
                'mc.expect.expert.8.text' => array('Mini-Expert Sessions — point 8, line', 'text', 'Relevant links and materials, when provided by the speaker.'),
                'mc.upcoming.updates.title' => array('Mini-Community Updates — upcoming heading', 'text', 'Community Updates'),
                'mc.past.updates.title' => array('Mini-Community Updates — past heading', 'text', 'Past Updates'),
                'mc.upcoming.updates.empty' => array('Mini-Community Updates — nothing matches', 'text', 'No updates match your selection.'),
                'mc.past.updates.empty' => array('Mini-Community Updates — nothing past yet', 'text', 'No completed events have been added yet.'),
                'mc.find.updates.title' => array('Mini-Community Updates — find heading', 'text', 'Explore community updates'),
                'mc.find.updates.lead' => array('Mini-Community Updates — find line', 'text', 'Browse by month, or change the order to follow our community’s journey.'),
                'mc.expect.updates.title' => array('Mini-Community Updates — what happens heading', 'text', 'What Will You Find Here?'),
                'mc.expect.updates.lead' => array('Mini-Community Updates — what happens line', 'text', 'Follow the people, ideas, and shared moments behind Mini-Talks.'),
                'mc.expect.updates.1.title' => array('Mini-Community Updates — point 1', 'text', 'Community News'),
                'mc.expect.updates.1.text' => array('Mini-Community Updates — point 1, line', 'text', 'What’s happening across Mini-Talks.'),
                'mc.expect.updates.2.title' => array('Mini-Community Updates — point 2', 'text', 'Family Voices'),
                'mc.expect.updates.2.text' => array('Mini-Community Updates — point 2, line', 'text', 'Experiences shared by families.'),
                'mc.expect.updates.3.title' => array('Mini-Community Updates — point 3', 'text', 'Volunteer Moments'),
                'mc.expect.updates.3.text' => array('Mini-Community Updates — point 3, line', 'text', 'People bringing the community together.'),
                'mc.expect.updates.4.title' => array('Mini-Community Updates — point 4', 'text', 'Talk-Spot Stories'),
                'mc.expect.updates.4.text' => array('Mini-Community Updates — point 4, line', 'text', 'Connections in local spaces.'),
                'mc.expect.updates.5.title' => array('Mini-Community Updates — point 5', 'text', 'Project Milestones'),
                'mc.expect.updates.5.text' => array('Mini-Community Updates — point 5, line', 'text', 'Steps forward in the Mini-Talks journey.'),
                'mc.expect.updates.6.title' => array('Mini-Community Updates — point 6', 'text', 'Events & Presentations'),
                'mc.expect.updates.6.text' => array('Mini-Community Updates — point 6, line', 'text', 'Where we share ideas and meet others.'),
                'mc.expect.updates.7.title' => array('Mini-Community Updates — point 7', 'text', 'Photos & Stories'),
                'mc.expect.updates.7.text' => array('Mini-Community Updates — point 7, line', 'text', 'A closer look at community moments.'),
                'mc.expect.updates.8.title' => array('Mini-Community Updates — point 8', 'text', 'Around the World'),
                'mc.expect.updates.8.text' => array('Mini-Community Updates — point 8, line', 'text', 'Different places, shared purpose.'),
                'mc.find.special.title' => array('Mini-Special Days — find heading', 'text', 'Explore special days'),
                'mc.find.special.lead' => array('Mini-Special Days — find line', 'text', 'Browse all 12 months, or choose a month to explore the special days and stories behind them.'),
                'mc.expect.special.title' => array('Mini-Special Days — what happens heading', 'text', 'What Will You Find Here?'),
                'mc.expect.special.lead' => array('Mini-Special Days — what happens line', 'text', 'Awareness days that invite us to understand, include, and celebrate children in everyday life.'),
                'mc.expect.special.1.title' => array('Mini-Special Days — point 1', 'text', 'Communication & Awareness'),
                'mc.expect.special.1.text' => array('Mini-Special Days — point 1, line', 'text', 'Days dedicated to selective mutism, hearing, speech, and mental health.'),
                'mc.expect.special.2.title' => array('Mini-Special Days — point 2', 'text', 'Children’s Rights & Inclusion'),
                'mc.expect.special.2.text' => array('Mini-Special Days — point 2, line', 'text', 'Days that remind us of every child’s right to learn, participate, and be heard.'),
                'mc.expect.special.3.title' => array('Mini-Special Days — point 3', 'text', 'Families & Educators'),
                'mc.expect.special.3.text' => array('Mini-Special Days — point 3, line', 'text', 'Days that recognise parents, siblings, teachers, and the care they give.'),
                'mc.expect.special.4.title' => array('Mini-Special Days — point 4', 'text', 'Play, Books & Friendship'),
                'mc.expect.special.4.text' => array('Mini-Special Days — point 4, line', 'text', 'Days that celebrate how children play, imagine, read, and connect.'),
                'mc.expect.special.5.title' => array('Mini-Special Days — point 5', 'text', ''),
                'mc.expect.special.5.text' => array('Mini-Special Days — point 5, line', 'text', ''),
                'mc.expect.special.6.title' => array('Mini-Special Days — point 6', 'text', ''),
                'mc.expect.special.6.text' => array('Mini-Special Days — point 6, line', 'text', ''),
                'mc.expect.special.7.title' => array('Mini-Special Days — point 7', 'text', ''),
                'mc.expect.special.7.text' => array('Mini-Special Days — point 7, line', 'text', ''),
                'mc.expect.special.8.title' => array('Mini-Special Days — point 8', 'text', ''),
                'mc.expect.special.8.text' => array('Mini-Special Days — point 8, line', 'text', ''),

                'mc.sd.count' => array('Special days — the count line', 'html', '@mc.sd.count',
                    array('count' => 'How many, and which months')),
                'mc.sd.month' => array('Special days — one month', 'html', '@mc.sd.month',
                    array('index' => 'Its number', 'month' => 'The month', 'entries' => 'The days in it')),
                'mc.sd.entry' => array('Special days — one day', 'html', '@mc.sd.entry',
                    array('tone' => 'Which of the four colours, 1 to 4', 'iso' => 'The date, for machines',
                          'long_date' => 'The date, spoken', 'weekday' => 'SAT', 'day' => '24', 'mon' => 'JAN',
                          'title' => 'The day', 'story' => 'The story')),
                'mc.sd.empty' => array('Special days — none yet', 'text', 'No special days have been added yet.'),

                'mc.bullet.1' => array('Brick 1, beside a point', 'text',
                    'https://mini-talks.org/wp-content/uploads/2026/08/mini-talks-bullet-yellow.png'),
                'mc.bullet.2' => array('Brick 2, beside a point', 'text',
                    'https://mini-talks.org/wp-content/uploads/2026/08/mini-talks-bullet-blue.png'),
                'mc.bullet.3' => array('Brick 3, beside a point', 'text',
                    'https://mini-talks.org/wp-content/uploads/2026/08/mini-talks-bullet-red.png'),
                'mc.bullet.4' => array('Brick 4, beside a point', 'text',
                    'https://mini-talks.org/wp-content/uploads/2026/08/mini-talks-bullet-green.png'),
            )),

            'host' => array('label' => 'Host an Event', 'blocks' => array(
                'host.hero' => array('Hero', 'html',
                    '@host.hero',
                    array('logo' => 'The Mini-Talks logo URL')),

                'host.form.title' => array('Form heading', 'text', 'Host a Mini-Event'),
            )),

            'forum_more' => array('label' => 'Forum — the rest of the page', 'blocks' => array(
                'forum.guest.guidelines' => array('Signed-out guidelines box', 'html', '@forum.guest.guidelines', array(), array()),
                'forum.guest.notice'     => array('Signed-out notice line', 'html', '@forum.guest.notice', array(), array()),
                'forum.hero.center'      => array('Signed-in sub-heading', 'html', '@forum.hero.center', array(), array()),
                'forum.actions'          => array('The four "what would you like to share" cards', 'html', '@forum.actions',
                    array('cards' => 'the four cards, one per kind of post'),
                    array('mf-actions-grid' => 'the grid itself', '{{cards}}' => 'the cards')),
                'forum.list.header'      => array('Filters, search and the Recent Posts row', 'html', '@forum.list.header', array(),
                    array('mf-chip' => 'the topic filters', 'data-filter' => 'which topic each filter is',
                          'id="mf-search"' => 'the search box',
                          'id="mf-page-num"' => 'the page number',
                          'id="mf-page-next"' => 'the next-page button',
                          'data-mf-action="load-more"' => 'loading the next page')),
                'forum.guidelines'       => array('Signed-in guidelines card', 'html', '@forum.guidelines',
                    array('items' => 'the eight guideline lines'), array('{{items}}' => 'the guidelines')),
            )),



            'host_form' => array('label' => 'Host an Event — the form', 'blocks' => array(
                'host.form' => array('The form', 'html', '@host.form',
                    array('type_cards' => 'the four kinds of event',
                          'prefill_name' => "the member's name, when signed in",
                          'prefill_email' => 'their email, when signed in'),
                    array('id="mfe-host-form"' => 'the form the script submits',
                          '{{type_cards}}' => 'the four kinds of event, with the radio each one sets',
                          'name="full_name"' => 'name', 'name="email"' => 'email',
                          'id="mfe-host-status"' => 'where the result is shown')),
            )),

            'lists' => array('label' => 'Cards in a list', 'blocks' => array(
                'forum.post.card' => array('A forum post, in a list', 'html', '@forum.post.card',
                    array('url' => 'link to the post', 'border_class' => 'colour class for this kind of post',
                          'badge_class' => 'colour class for the badge', 'type_label' => 'Question, Experience, …',
                          'meta' => 'topic and tag, when there are any', 'title' => 'the title',
                          'preview' => 'the first 30 words', 'avatar' => "the author's avatar",
                          'author' => 'their nickname', 'role_class' => 'colour class for the role badge',
                          'role' => 'their role', 'replies' => 'how many replies', 'when' => 'how long ago'),
                    array('mf-post-card' => 'the card itself')),

                'forum.post.detail' => array('A post, on its own page', 'html', '@forum.post.detail',
                    array('border_class' => 'colour class for this kind of post',
                          'badge_class' => 'colour class for the badge', 'type_label' => 'Question, Experience, …',
                          'meta' => 'topic and tag, when there are any', 'title' => 'the title',
                          'body' => 'the post itself', 'avatar' => "the author's avatar",
                          'author' => 'their nickname', 'role_class' => 'colour class for the role badge',
                          'role' => 'their role', 'replies' => 'how many replies', 'when' => 'how long ago'),
                    array('mf-detail-card' => 'the card itself')),

                'forum.reply.card' => array('A reply, and a reply to a reply', 'html', '@forum.reply.card',
                    array('id' => 'the reply', 'avatar' => "the author's avatar", 'author' => 'their nickname',
                          'role_class' => 'colour class for the role badge', 'role' => 'their role',
                          'when' => 'how long ago', 'message' => 'what they wrote',
                          'reactions' => 'the emoji buttons', 'reply_button' => 'Reply, for signed-in members',
                          'sub_replies' => 'replies to this one'),
                    array('mf-reply-card' => 'the card itself',
                          'id="reply-{{id}}"' => 'linking straight to a reply',
                          'data-reply-id="{{id}}"' => 'where a new reaction is counted',
                          '{{reactions}}' => 'the emoji buttons',
                          '{{sub_replies}}' => 'replies to this one')),

            )),

            'popups' => array('label' => 'Popups', 'blocks' => array(
                'popup.auth.step1' => array('Sign up — step 1, choosing a role', 'html', '@popup.auth.step1', array(),
                    array('id="mf-auth-step1"' => 'the script shows and hides this step',
                          'mf-role-option' => 'the four role buttons',
                          'data-role' => 'which role each button stands for',
                          'data-mf-action="auth-role"' => 'picking a role',
                          'data-mf-action="auth-step2"' => 'Continue')),
                'popup.auth.step2' => array('Sign up — step 2, account basics', 'html', '@popup.auth.step2', array(),
                    array('id="mf-auth-step2"' => 'the script shows and hides this step',
                          'id="mf-reg-fullname"' => 'full name', 'id="mf-reg-nickname"' => 'nickname',
                          'id="mf-reg-email"' => 'email',
                          'id="mf-reg-password"' => 'password', 'id="mf-reg-password2"' => 'repeat password',
                          'data-mf-action="auth-step3"' => 'Continue')),
                'popup.auth.step3' => array('Sign up — step 3, details', 'html', '@popup.auth.step3', array(),
                    array('id="mf-auth-step3"' => 'the script shows and hides this step',
                          'data-mf-action="auth-register"' => 'Create Account')),
                'popup.auth.login' => array('Sign in', 'html', '@popup.auth.login',
                    array('lost_password_url' => "WordPress's own password reset"),
                    array('id="mf-auth-login"' => 'the script shows and hides this step',
                          'id="mf-login-email"' => 'email', 'id="mf-login-password"' => 'password',
                          'data-mf-action="auth-login"' => 'Sign in')),
                'popup.settings' => array('Settings', 'html', '@popup.settings',
                    array('lost_password_url' => "WordPress's own password reset"),
                    array('id="mf-set-current"' => 'current password', 'id="mf-set-new"' => 'new password',
                          'id="mf-set-new2"' => 'repeat new password',
                          'id="mf-settings-msg"' => 'where the result is shown',
                          'id="mf-set-save"' => 'the Update password button',
                          'data-mf-action="pwd-save"' => 'Update password')),
            )),

            'create' => array('label' => 'Forum — writing a post', 'blocks' => array(
                'forum.create.form' => array('The form', 'html', '@forum.create.form',
                    array('frame_colour' => 'the colour for this kind of post',
                          'type' => 'question, experience, idea or reflection',
                          'title_placeholder' => 'placeholder for the title',
                          'body_placeholder' => 'placeholder for the body',
                          'tags' => 'the tag buttons for this kind of post',
                          'forum_url' => 'back to the forum'),
                    array('id="mf-create-type"' => 'which kind of post this is',
                          'id="mf-create-title"' => 'the title field',
                          'id="mf-create-content"' => 'the body field',
                          'id="mf-create-topic"' => 'the topic dropdown',
                          'mf-tag-chip' => 'the tag buttons',
                          'id="mf-create-error"' => 'where problems are shown',
                          'data-mf-action="post-share"' => 'the Share button')),
            )),

            'join' => array('label' => 'Join Us', 'blocks' => array(
                'join.title' => array('Page heading', 'text', 'Join Us!'),

                'join.step1' => array('Step 1 — choosing an area', 'html',
                    '@join.step1',
                    array('img_family' => 'Mini-Families artwork', 'img_expert' => 'Mini-Experts artwork',
                          'img_volunteer' => 'Mini-Volunteers artwork', 'img_talkspot' => 'Talk-Spots artwork'),
                    array('id="ju-step1"'        => 'the script reveals and hides this step',
                          'mt-ju-role'           => 'the four choices',
                          'data-value'           => 'which area each choice stands for',
                          'data-mf-action="ju-role"' => 'picking one opens step 2')),

                'join.step2' => array('Step 2 — account details', 'html',
                    '@join.step2',
                    array(),
                    array('id="ju-step2"'   => 'the script reveals and hides this step',
                          'id="ju-fullname"' => 'the name field', 'id="ju-password"' => 'the password field',
                          'id="ju-email"'    => 'the email field', 'id="ju-city"' => 'the city field',
                          'id="ju-country"'  => 'the country field', 'id="ju-nickname"' => 'the nickname field',
                          'id="ju-extra"'    => 'the additional-info field',
                          'id="ju-dynamic-fields"' => 'where the fields for the chosen area appear',
                          'data-mf-action="ju-continue"' => 'opens step 3')),

                'join.step3' => array('Step 3 — consent and Join', 'html',
                    '@join.step3',
                    array('img_heart' => 'The heart on the Join button'),
                    array('id="ju-step3"'  => 'the script reveals this step',
                          'id="ju-consent"' => 'the consent checkbox, which Join requires',
                          'data-mf-action="ju-submit"' => 'the Join button')),
            )),
        ));
    }

    /* ── storage ── */

    private static function overrides() {
        $raw = get_option(self::OPT_BLOCKS, array());
        return is_array($raw) ? $raw : array();
    }

    private static function definition($id) {
        foreach (self::manifest() as $group) {
            if (!isset($group['blocks'][$id])) continue;
            return self::resolve($group['blocks'][$id]);
        }
        return null;
    }

    /**
     * '@name' in a manifest entry means the default lives in design/name.html.
     *
     * Anything reading a manifest entry has to come through here, not just
     * definition(): the admin page and the save both compare an area's value
     * against $def[2], and against the literal '@name' those comparisons are
     * all false. That is how a file-backed section came to be labelled "One
     * line", how saving one without touching it froze it against future
     * updates, and how every saved section grew a permanent "the plugin's
     * version changed" warning.
     */
    private static function resolve($def) {
        if (isset($def[2]) && is_string($def[2]) && strlen($def[2]) > 1 && $def[2][0] === '@') {
            $def[2] = self::file(substr($def[2], 1));
        }
        return $def;
    }

    /**
     * What an area's HTML may contain.
     *
     * wp_kses_post() alone is a gamble here: whether it allows form elements has
     * changed between WordPress versions, and a page whose <input> tags were
     * silently dropped is a sign-up form that no longer collects anything. The
     * list is therefore stated outright — every tag a page here needs, plus the
     * attributes the code binds to. Scripts, iframes and on* handlers are not on
     * it and never will be.
     */
    public static function allowed_html() {
        $tags = function_exists('wp_kses_allowed_html') ? wp_kses_allowed_html('post') : array();

        $common = array(
            'class' => true, 'id' => true, 'style' => true, 'title' => true, 'role' => true,
            'tabindex' => true, 'hidden' => true, 'lang' => true, 'dir' => true,
            'aria-label' => true, 'aria-labelledby' => true, 'aria-hidden' => true,
            'aria-describedby' => true, 'aria-expanded' => true, 'aria-controls' => true,
            'aria-pressed' => true, 'aria-haspopup' => true, 'aria-live' => true,
            'aria-current' => true, 'aria-modal' => true, 'aria-selected' => true,
            // Wildcards work on modern WordPress; the two the code binds to are
            // listed as well, so the bindings hold on an older one.
            'data-*' => true, 'data-mf-action' => true, 'data-value' => true,
        );

        $needed = array(
            'div' => array(), 'span' => array(), 'p' => array(), 'br' => array(), 'hr' => array(),
            'strong' => array(), 'em' => array(), 'b' => array(), 'i' => array(), 'small' => array(),
            'h1' => array(), 'h2' => array(), 'h3' => array(), 'h4' => array(), 'h5' => array(), 'h6' => array(),
            'ul' => array(), 'ol' => array(), 'li' => array(), 'dl' => array(), 'dt' => array(), 'dd' => array(),
            'section' => array(), 'article' => array(), 'aside' => array(), 'header' => array(),
            'footer' => array(), 'nav' => array(), 'figure' => array(), 'figcaption' => array(),
            'main' => array(), 'time' => array('datetime' => true),
            // The Mini-Calendar's two popups are real <dialog> elements, opened
            // with showModal() — the browser's own modal, not a div pretending.
            'dialog' => array('open' => true),
            // Tables carry the presentational attributes an e-mail cannot do
            // without: the confirmation mail is built out of nested tables,
            // because that is the only layout an inbox reliably renders, and
            // width / align / cellpadding are how it holds together there.
            'table' => array('width' => true, 'height' => true, 'align' => true, 'bgcolor' => true,
                             'border' => true, 'cellpadding' => true, 'cellspacing' => true),
            'thead' => array(), 'tbody' => array(), 'tfoot' => array(),
            'tr' => array('align' => true, 'valign' => true, 'bgcolor' => true, 'height' => true),
            'th' => array('colspan' => true, 'rowspan' => true, 'scope' => true, 'align' => true,
                          'valign' => true, 'width' => true, 'height' => true, 'bgcolor' => true),
            'td' => array('colspan' => true, 'rowspan' => true, 'align' => true, 'valign' => true,
                          'width' => true, 'height' => true, 'bgcolor' => true),
            'a'   => array('href' => true, 'target' => true, 'rel' => true, 'download' => true),
            'img' => array('src' => true, 'alt' => true, 'width' => true, 'height' => true,
                           'loading' => true, 'srcset' => true, 'sizes' => true),
            'form' => array('action' => true, 'method' => true, 'novalidate' => true, 'autocomplete' => true),
            'label' => array('for' => true),
            'input' => array('type' => true, 'name' => true, 'value' => true, 'placeholder' => true,
                             'checked' => true, 'disabled' => true, 'readonly' => true, 'required' => true,
                             'maxlength' => true, 'minlength' => true, 'min' => true, 'max' => true,
                             'step' => true, 'pattern' => true, 'autocomplete' => true, 'accept' => true),
            'textarea' => array('name' => true, 'rows' => true, 'cols' => true, 'placeholder' => true,
                                'required' => true, 'maxlength' => true),
            'select' => array('name' => true, 'multiple' => true, 'required' => true, 'size' => true),
            'option' => array('value' => true, 'selected' => true, 'disabled' => true),
            'optgroup' => array('label' => true, 'disabled' => true),
            'button' => array('type' => true, 'name' => true, 'value' => true, 'disabled' => true),
            'fieldset' => array('disabled' => true), 'legend' => array(),
            'details' => array('open' => true), 'summary' => array(),

            // Inline icons, as a deliberately narrow subset: shapes and their
            // geometry, nothing that can fetch or run anything. No <use>, no
            // href of any kind, no <script>, no <foreignObject>.
            'svg' => array('viewbox' => true, 'viewBox' => true, 'width' => true, 'height' => true,
                           'fill' => true, 'stroke' => true, 'stroke-width' => true,
                           'stroke-linecap' => true, 'stroke-linejoin' => true, 'xmlns' => true,
                           'preserveaspectratio' => true, 'focusable' => true),
            'path' => array('d' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true,
                            'stroke-linecap' => true, 'stroke-linejoin' => true, 'fill-rule' => true,
                            'clip-rule' => true, 'transform' => true, 'opacity' => true),
            'circle' => array('cx' => true, 'cy' => true, 'r' => true, 'fill' => true, 'stroke' => true,
                              'stroke-width' => true, 'opacity' => true, 'transform' => true),
            'ellipse' => array('cx' => true, 'cy' => true, 'rx' => true, 'ry' => true, 'fill' => true,
                               'stroke' => true, 'stroke-width' => true, 'transform' => true),
            'rect' => array('x' => true, 'y' => true, 'width' => true, 'height' => true, 'rx' => true,
                            'ry' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true,
                            'transform' => true, 'opacity' => true),
            'line' => array('x1' => true, 'y1' => true, 'x2' => true, 'y2' => true, 'stroke' => true,
                            'stroke-width' => true, 'stroke-linecap' => true, 'transform' => true),
            'g' => array('fill' => true, 'stroke' => true, 'transform' => true, 'opacity' => true),
            'text' => array('x' => true, 'y' => true, 'fill' => true, 'font-size' => true,
                            'text-anchor' => true, 'dominant-baseline' => true, 'transform' => true),
            'polygon' => array('points' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true,
                               'transform' => true, 'opacity' => true),
            'polyline' => array('points' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true,
                                'stroke-linecap' => true, 'stroke-linejoin' => true),
            'polygon' => array('points' => true, 'fill' => true, 'stroke' => true, 'stroke-width' => true,
                               'transform' => true),
            'g' => array('fill' => true, 'stroke' => true, 'stroke-width' => true, 'transform' => true,
                         'opacity' => true),
        );

        foreach ($needed as $tag => $attrs) {
            $have = isset($tags[$tag]) && is_array($tags[$tag]) ? $tags[$tag] : array();
            $tags[$tag] = array_merge($have, $attrs, $common);
        }
        return apply_filters('mf_design_allowed_html', $tags);
    }

    /** Is this id registered at all? Lets another plugin ask before relying on it. */
    public static function has($id) {
        return self::definition($id) !== null;
    }

    /** The block as it should render: the admin's version, or the default. */
    public static function get($id) {
        $def = self::definition($id);
        if (!$def) return '';
        $over = self::overrides();
        $val  = array_key_exists($id, $over) ? $over[$id] : $def[2];
        return apply_filters('mf_block', $val, $id, $def);
    }

    public static function is_overridden($id) {
        return array_key_exists($id, self::overrides());
    }

    /**
     * The area, ready to print.
     *
     * The admin's HTML is run through wp_kses_post first, then the tokens are
     * filled — in that order, so a token's value (markup the plugin built, and
     * already safe) is never mangled by kses, while anything typed into the box
     * still is.
     */
    public static function render($id, $vars = array()) {
        $def = self::definition($id);
        if (!$def) return '';
        $val = self::get($id);
        $out = $def[1] === 'text' ? esc_html($val) : wp_kses($val, self::allowed_html());

        $tokens = isset($def[3]) && is_array($def[3]) ? $def[3] : array();
        if (!$tokens) return $out;

        $find = $repl = array();
        foreach ($tokens as $name => $note) {
            $find[] = '{{' . $name . '}}';
            $repl[] = isset($vars[$name]) ? $vars[$name] : '';
        }
        return str_replace($find, $repl, $out);
    }

    public static function keeps($id) {
        $def = self::definition($id);
        return $def && isset($def[4]) && is_array($def[4]) ? $def[4] : array();
    }

    /** Which of an area's hooks its current HTML no longer contains. */
    public static function missing_keeps($id) {
        $html = self::get($id);
        $out  = array();
        foreach (self::keeps($id) as $needle => $why) {
            if (strpos($html, $needle) === false) $out[$needle] = $why;
        }
        return $out;
    }

    public static function tokens($id) {
        $def = self::definition($id);
        return $def && isset($def[3]) && is_array($def[3]) ? $def[3] : array();
    }

    /* ── keeping an admin's HTML through a plugin update ──
       An override is stored with a hash of the default it was written against.
       A later update that changes that default cannot touch the override — the
       page just says the plugin's version moved on, and offers the new one. */

    private static function bases() {
        $raw = get_option(self::OPT_BASE, array());
        return is_array($raw) ? $raw : array();
    }

    public static function default_changed($id) {
        $def = self::definition($id);
        if (!$def || !self::is_overridden($id)) return false;
        $base = self::bases();
        if (!isset($base[$id])) return false;              // written before this was tracked
        return $base[$id] !== md5($def[2]);
    }

    /**
     * The plugin's own rules that style an area's markup.
     *
     * Handing someone the HTML without the CSS that dresses it is half a job:
     * they would be rewriting a block with no idea what `.mf-hero-desc` does to
     * it. So the rules are collected from the plugin's stylesheets by matching
     * the classes the markup actually uses, and shown beside the box —
     * read-only, because the place to change one is the box below, and copying
     * the whole sheet into the database would freeze it against every update.
     */
    public static function css_for($id) {
        $html = self::get($id) . ' ' . (($d = self::definition($id)) ? $d[2] : '');
        if (!preg_match_all('/class\s*=\s*"([^"]*)"/i', $html, $m)) return '';

        $classes = array();
        foreach ($m[1] as $list) {
            foreach (preg_split('/\s+/', trim($list)) as $c) {
                if ($c !== '') $classes['.' . $c] = true;
            }
        }
        if (!$classes) return '';

        $out = '';
        foreach (self::stylesheets() as $file) {
            if (!file_exists($file)) continue;
            $css = file_get_contents($file);
            $css = preg_replace('#/\*.*?\*/#s', '', $css);          // comments out of the way
            foreach (explode('}', $css) as $rule) {
                $split = strpos($rule, '{');
                if ($split === false) continue;
                $sel = trim(substr($rule, 0, $split));
                if ($sel === '' || $sel[0] === '@') continue;          // skip at-rule openers
                foreach ($classes as $c => $x) {
                    // word boundary, so .mf-hero does not drag in .mf-hero-face
                    if (preg_match('/' . preg_quote($c, '/') . '(?![\w-])/', $sel)) {
                        $out .= $sel . ' {' . trim(substr($rule, $split + 1)) . "}\n";
                        break;
                    }
                }
                if (strlen($out) > 24000) return $out . "\n/* … more rules follow; open the stylesheet for the rest */\n";
            }
        }
        return $out;
    }

    /**
     * Which screen a group of areas belongs to, and where to go and look at it.
     *
     * "Probably the Mini-Kits screen" is not something anyone should have to
     * guess from an id, so every group says where it appears and links there.
     */
    public static function group_pages() {
        $forum  = function_exists('mf_get_forum_url')  ? mf_get_forum_url()  : home_url('/');
        $events = function_exists('mf_get_events_url') ? mf_get_events_url() : home_url('/');
        return apply_filters('mf_design_group_pages', array(
            'slots'         => array('Every screen, top and bottom',  $forum),
            'forum_out'     => array('Forum, signed out',        $forum),
            'forum_in'      => array('Forum, signed in',         $forum),
            'forum_more'    => array('Forum home',               $forum),
            'create'        => array('Writing a post',           add_query_arg('view', 'create', $forum)),
            'profile'       => array('Profile',                  add_query_arg('view', 'profile', $forum)),
            'lists'         => array('Wherever posts and events are listed', $forum),
            'calendar'       => array('Mini-Calendar',           $events),
            'calendar_pages' => array('Mini-Calendar sub-pages', add_query_arg('view', 'mini-volunteer-workshops', $events)),
            'host'          => array('Host an Event',            add_query_arg('view', 'host', $events)),
            'host_form'     => array('Host an Event',            add_query_arg('view', 'host', $events)),
            'join'          => array('Join Us',                  home_url('/mini-community/join-us/')),
            'popups'        => array('Sign in, sign up and Settings — open them from any page', $forum),
            'game'          => array('Profile → App & Studio',  add_query_arg('view', 'profile', $forum)),
            'minikits'        => array('Profile → Mini-Kits',    add_query_arg('view', 'profile', $forum)),
            'minikits_status' => array('Profile → Mini-Kits',    add_query_arg('view', 'profile', $forum)),
            'minikits_screens'=> array('Profile → Mini-Kits',    add_query_arg('view', 'profile', $forum)),
        ));
    }

    /**
     * A rendered look at one area, for the admin page.
     *
     * Reading markup and picturing the result is a skill nobody should need to
     * edit their own site's words, so each area shows itself: its HTML inside an
     * iframe carrying the site's own stylesheets. Tokens become visible chips so
     * it is clear where the real content lands.
     */
    public static function preview_srcdoc($id) {
        $def = self::definition($id);
        if (!$def) return '';

        $html = $def[1] === 'text' ? esc_html(self::get($id)) : wp_kses(self::get($id), self::allowed_html());
        foreach (self::tokens($id) as $name => $note) {
            $html = str_replace('{{' . $name . '}}',
                '<span style="display:inline-block;padding:1px 7px;border-radius:9px;background:#EEF3FF;' .
                'border:1px dashed #9db4e8;color:#3d5aa0;font:600 11px/1.6 system-ui">' . esc_html($name) . '</span>',
                $html);
        }

        $links = '';
        foreach (self::stylesheets() as $file) {
            if (!file_exists($file)) continue;
            $links .= '<link rel="stylesheet" href="' . esc_url(MF_URL . 'assets/css/' . basename($file)) . '">';
        }
        $own = trim(self::block_css($id));

        return '<!doctype html><html><head><meta charset="utf-8">' . $links .
               '<style>body{margin:0;padding:14px;background:#fff;font-family:Montserrat,system-ui,sans-serif}' .
               ($own !== '' ? str_replace(array('<', '>'), '', $own) : '') . '</style></head><body>' .
               $html . '</body></html>';
    }

    public static function stylesheets() {
        return apply_filters('mf_design_stylesheets', array(
            MF_PATH . 'assets/css/mini-forum.css',
            MF_PATH . 'assets/css/mini-forum-auth.css',
            MF_PATH . 'assets/css/mini-forum-profile.css',
        ));
    }

    /** CSS written next to one area's HTML. Rewriting markup usually needs a
     *  rule or two, and sending someone to another tab to write them is how a
     *  half-styled block ends up on the site. */
    public static function block_css($id = null) {
        $all = get_option(self::OPT_BCSS, array());
        if (!is_array($all)) $all = array();
        if ($id === null) return $all;
        return isset($all[$id]) ? (string) $all[$id] : '';
    }

    public static function css($area) {
        $all = get_option(self::OPT_CSS, array());
        return is_array($all) && isset($all[$area]) ? (string) $all[$area] : '';
    }

    /* ── history ──
       Every save is recorded with who made it, when, what changed and why. A
       design people keep editing needs an answer to "who changed this, and what
       did it say before" — and a way back that does not depend on remembering. */

    public static function history() {
        $log = get_option(self::OPT_LOG, array());
        return is_array($log) ? $log : array();
    }

    /**
     * @param array  $changes  id => array('from' => …, 'to' => …) for html and css.
     *                         A null 'to' means the area went back to the default.
     * @param string $reason   What the person typed into "Why this change".
     */
    private static function log($changes, $reason, $kind = 'edit') {
        if (!$changes) return;
        $user = function_exists('wp_get_current_user') ? wp_get_current_user() : null;
        $log  = self::history();
        array_unshift($log, array(
            'time'    => time(),
            'user'    => $user && $user->ID ? $user->display_name : 'unknown',
            'reason'  => $reason,
            'kind'    => $kind,
            'changes' => $changes,
        ));
        update_option(self::OPT_LOG, array_slice($log, 0, self::LOG_KEEP));
    }

    /** Put an entry's values back, recording that as its own change. */
    public static function restore($index, $reason = '') {
        $log = self::history();
        if (!isset($log[$index])) return false;

        $entry   = $log[$index];
        $blocks  = self::overrides();
        $bcss    = self::block_css();
        $base    = self::bases();
        $changes = array();

        foreach ($entry['changes'] as $id => $c) {
            $was_html = isset($blocks[$id]) ? $blocks[$id] : null;
            $was_css  = isset($bcss[$id])   ? $bcss[$id]   : null;

            if (array_key_exists('to', $c)) {
                if ($c['to'] === null) { unset($blocks[$id], $base[$id]); }
                else { $blocks[$id] = $c['to']; $base[$id] = md5(($d = self::definition($id)) ? $d[2] : ''); }
            }
            if (array_key_exists('to_css', $c)) {
                if ($c['to_css'] === null || $c['to_css'] === '') unset($bcss[$id]);
                else $bcss[$id] = $c['to_css'];
            }
            $changes[$id] = array(
                'from' => $was_html, 'to' => isset($blocks[$id]) ? $blocks[$id] : null,
                'from_css' => $was_css, 'to_css' => isset($bcss[$id]) ? $bcss[$id] : null,
            );
        }

        update_option(self::OPT_BLOCKS, $blocks);
        update_option(self::OPT_BCSS, $bcss);
        update_option(self::OPT_BASE, $base);
        self::log($changes, $reason !== '' ? $reason : sprintf('Restored the version of %s',
                  date_i18n('j M Y H:i', $entry['time'])), 'restore');
        return true;
    }

    /* ── backup ── */

    public static function export() {
        return wp_json_encode(array(
            'plugin'    => 'mini-forum',
            'version'   => defined('MF_VERSION') ? MF_VERSION : '',
            'exported'  => gmdate('c'),
            'blocks'    => self::overrides(),
            'block_css' => self::block_css(),
            'css'       => get_option(self::OPT_CSS, array()),
        ));
    }

    /** @return string '' on success, otherwise why it was refused. */
    public static function import($json, $reason = '') {
        $data = json_decode(trim($json), true);
        if (!is_array($data) || !isset($data['blocks']) || !is_array($data['blocks'])) {
            return 'That does not look like a Design backup.';
        }

        $blocks  = self::overrides();
        $changes = array();
        foreach ($data['blocks'] as $id => $val) {
            if (!self::has($id) || !is_string($val)) continue;         // ignore what this version has no place for
            $def = self::definition($id);
            $val = $def[1] === 'text' ? sanitize_text_field($val) : wp_kses($val, self::allowed_html());
            $changes[$id] = array('from' => isset($blocks[$id]) ? $blocks[$id] : null, 'to' => $val);
        }
        if (!$changes) return 'Nothing in that backup matches this version.';

        $base = self::bases();
        foreach ($changes as $id => $c) {
            $blocks[$id] = $c['to'];
            $base[$id]   = md5(self::definition($id)[2]);
        }
        update_option(self::OPT_BLOCKS, $blocks);
        update_option(self::OPT_BASE, $base);

        if (isset($data['block_css']) && is_array($data['block_css'])) {
            $bcss = self::block_css();
            foreach ($data['block_css'] as $id => $css) {
                if (!self::has($id) || !is_string($css)) continue;
                $bcss[$id] = trim(str_replace(array('<', '>'), '', wp_strip_all_tags($css)));
            }
            update_option(self::OPT_BCSS, $bcss);
        }
        if (isset($data['css']) && is_array($data['css'])) {
            $out = array();
            foreach (self::css_areas() as $key => $meta) {
                if (!isset($data['css'][$key]) || !is_string($data['css'][$key])) continue;
                $css = trim(str_replace(array('<', '>'), '', wp_strip_all_tags($data['css'][$key])));
                if ($css !== '') $out[$key] = $css;
            }
            update_option(self::OPT_CSS, $out);
        }

        self::log($changes, $reason !== '' ? $reason : 'Restored from a backup', 'import');
        return '';
    }

    /* ── front end ── */

    public static function init() {
        add_action('wp_head', array(__CLASS__, 'print_css'), 99);
        if (is_admin()) {
            add_action('admin_menu', array(__CLASS__, 'menu'), 20);
        }
    }

    /**
     * Which areas apply to the page being rendered. Global always; the rest by
     * the shortcode the page carries, so a stylesheet written for Events cannot
     * leak onto the forum.
     */
    private static function active_areas() {
        $areas = array('global');
        $post  = get_post();
        $body  = $post ? $post->post_content : '';

        if (has_shortcode($body, 'mini_join'))   $areas[] = 'join';
        if (has_shortcode($body, 'mini_events')) $areas[] = 'events';
        if (has_shortcode($body, 'mini_forum')) {
            $areas[] = 'forum';
            if (isset($_GET['view']) && $_GET['view'] === 'profile') $areas[] = 'profile';
        }
        return apply_filters('mf_design_css_areas', $areas, $post);
    }

    public static function print_css() {
        $out = '';
        foreach (self::active_areas() as $area) {
            $css = trim(self::css($area));
            if ($css !== '') $out .= "\n/* mini-forum: {$area} */\n" . $css;
        }
        // Then whatever was written beside an area's HTML. Last, so it wins over
        // the area sheet the same way it sits closer to the markup it belongs to.
        foreach (self::block_css() as $id => $css) {
            $css = trim($css);
            if ($css !== '' && self::has($id)) $out .= "\n/* mini-forum: {$id} */\n" . $css;
        }
        if ($out === '') return;
        // Stored already stripped; stripped again here so an old value saved
        // before that rule cannot escape the element either.
        echo "<style id=\"mf-design-css\">" . str_replace(array('<', '>'), '', $out) . "</style>\n";
    }

    /* ── admin ── */

    /**
     * Its own top-level menu, not a page under Mini-Events.
     *
     * This page edits the forum, the profile, Join Us and Mini-Kits as much as
     * it edits events — nobody looking to change how the site reads would think
     * to open Mini-Events to find it. Standing on its own also means it no
     * longer depends on that menu existing.
     */
    public static function menu() {
        add_menu_page('Mini-Talks Design', 'Mini-Talks Design', 'manage_options',
                      'mf-design', array(__CLASS__, 'page'), 'dashicons-art', 31);
    }

    public static function page() {
        if (!current_user_can('manage_options')) return;

        $tab = isset($_GET['tab']) ? sanitize_key($_GET['tab']) : 'blocks';
        if (!in_array($tab, array('blocks', 'css', 'templates', 'history'), true)) $tab = 'blocks';
        if (!empty($_POST['mf_design_nonce']) && wp_verify_nonce($_POST['mf_design_nonce'], 'mf_design')) {
            if ($tab === 'history') {
                $reason = isset($_POST['mf_reason']) ? sanitize_text_field(wp_unslash($_POST['mf_reason'])) : '';
                if (isset($_POST['restore']) && self::restore((int) $_POST['restore'], $reason)) {
                    echo '<div class="notice notice-success is-dismissible"><p>Put back.</p></div>';
                } elseif (!empty($_POST['mf_import'])) {
                    $err = self::import(wp_unslash($_POST['mf_import']), $reason);
                    echo $err === ''
                        ? '<div class="notice notice-success is-dismissible"><p>Backup restored.</p></div>'
                        : '<div class="notice notice-error is-dismissible"><p>' . esc_html($err) . '</p></div>';
                }
            } else {
                $tab === 'css' ? self::save_css() : self::save_blocks();
                echo '<div class="notice notice-success is-dismissible"><p>Saved.</p></div>';
            }
        }

        $base = admin_url('admin.php?page=mf-design');
        ?>
        <div class="wrap">
          <h1>Design</h1>
          <?php self::guide($tab); ?>
          <h2 class="nav-tab-wrapper">
            <a class="nav-tab <?php echo $tab === 'blocks' ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url($base); ?>">Text &amp; HTML</a>
            <a class="nav-tab <?php echo $tab === 'css' ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url($base . '&tab=css'); ?>">Custom CSS</a>
            <a class="nav-tab <?php echo $tab === 'templates' ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url($base . '&tab=templates'); ?>">Whole templates</a>
            <a class="nav-tab <?php echo $tab === 'history' ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url($base . '&tab=history'); ?>">History &amp; backup</a>
          </h2>
          <?php if ($tab === 'templates') { self::form_templates(); }
                elseif ($tab === 'history')  { self::form_history(); }
                else { ?>
          <form method="post">
            <?php wp_nonce_field('mf_design', 'mf_design_nonce'); ?>
            <?php self::reason_field(); ?>
            <?php $tab === 'css' ? self::form_css() : self::form_blocks(); ?>
            <?php submit_button('Save changes'); ?>
          </form>
          <?php } ?>
        </div>
        <?php
    }

    /** A short guide, open on a first visit and remembered per user after that. */
    private static function guide($tab) {
        $seen = get_user_meta(get_current_user_id(), 'mf_design_guide_seen', true);
        if (isset($_GET['guide'])) {
            $seen = $_GET['guide'] === 'hide' ? 1 : '';
            update_user_meta(get_current_user_id(), 'mf_design_guide_seen', $seen);
        }
        $base = admin_url('admin.php?page=mf-design&tab=' . $tab);
        ?>
        <details <?php echo $seen ? '' : 'open'; ?> style="margin:14px 0 18px;padding:14px 18px;background:#fff;border:1px solid #dcdcde;border-left:4px solid #2271b1;max-width:60em">
          <summary style="cursor:pointer;font-weight:600;font-size:14px">How this page works</summary>

          <p><strong>What it changes.</strong> How the site looks and what it says — nothing else.
          Members, posts, events, requests and Mini-Kits are untouched by anything on this page.</p>

          <h3 style="margin:16px 0 4px">The three tabs</h3>
          <ul style="list-style:disc;margin-left:20px">
            <li><strong>Text &amp; HTML</strong> — the words and the markup of each area. Areas marked
                <em>HTML</em> take real markup: tags, classes, inline styles. Areas marked
                <em>Plain text</em> are printed as written, so a tag there shows up as text.</li>
            <li><strong>Custom CSS</strong> — styling, one stylesheet per area. Reach for this first:
                colour, spacing and size rarely need the HTML touched at all.</li>
            <li><strong>Whole templates</strong> — for rebuilding a screen's layout outright. It has no
                editor, only instructions: a template is PHP, and a box on a web page that saves and
                runs PHP would let anyone with an admin login run code on this server.</li>
          </ul>

          <h3 style="margin:16px 0 4px">{{tokens}}</h3>
          <p>Some areas carry tokens, listed above their box. They are where the site drops in something
          it worked out — a member's nickname, their avatar, the logo, a link. Put a token wherever you
          want it in your HTML; leave it out and that piece is simply not shown. Type anything else in
          double braces and it stays on screen as text, so a typo shows itself rather than breaking
          the page.</p>

          <h3 style="margin:16px 0 4px">The list of things to keep</h3>
          <p>Where an area's box lists <em>“The code looks for these”</em>, those are hooks the software
          uses: a button that opens the Settings popup, the row Mini-Kits writes its count into. Rewrite
          the HTML around them as you like, but keep them, or that one behaviour stops. If you save
          without one, this page tells you exactly which — and Reset brings it back.</p>

          <h3 style="margin:16px 0 4px">What you cannot break</h3>
          <p>Sign-ups, posting, events, requests and email all run in PHP, which this page cannot touch.
          Saving strips <code>&lt;script&gt;</code>, <code>&lt;iframe&gt;</code> and event handlers such
          as <code>onclick</code>, so a paste from elsewhere cannot bring code with it. The worst case is
          a screen that looks wrong — and every area has Reset.</p>

          <h3 style="margin:16px 0 4px">Updating the plugin</h3>
          <p>Your changes live in the database, not in the plugin's files, so installing a new version
          never overwrites them. When an update changes an area you had customised, this page says so
          beside that area and shows the plugin's new version — it stays yours until you choose
          otherwise.</p>

          <h3 style="margin:16px 0 4px">Working safely</h3>
          <ol style="margin-left:20px">
            <li>Change one area, save, and look at the page in another tab.</li>
            <li>Keep a copy of an area's HTML before a big rewrite — paste it somewhere. Reset returns
                the <em>plugin's</em> version, not your previous one.</li>
            <li>Check a phone width too; the site's own CSS is built for it, a hand-written block may
                not be.</li>
            <li>Text on this site is English and TranslatePress translates from it, so a rewrite in
                another language will not translate as expected.</li>
          </ol>

          <p style="margin-top:14px">
            <a href="<?php echo esc_url($base . '&guide=' . ($seen ? 'show' : 'hide')); ?>">
              <?php echo $seen ? 'Keep this open on every visit' : 'Collapse this from now on'; ?>
            </a>
          </p>
        </details>
        <?php
    }

    private static function reason_field() {
        ?>
        <p style="margin:6px 0 14px">
          <label for="mf_reason"><strong>Why this change</strong>
            <span style="font-weight:400;color:#666">— kept with the change, so the next person knows</span>
          </label><br>
          <input type="text" id="mf_reason" name="mf_reason" class="large-text"
                 placeholder="e.g. Shortened the hero text for mobile" maxlength="200">
        </p>
        <?php
    }

    private static function form_history() {
        $log = self::history();
        ?>
        <h2 style="margin-top:18px">What has been changed</h2>
        <p class="description" style="max-width:52em">
          The last <?php echo (int) self::LOG_KEEP; ?> changes, newest first: who made it, when, why, and
          what each area said before and after. <strong>Put back</strong> restores an area to what it was
          right after that change — recorded as a change of its own, so nothing is ever lost silently.
        </p>

        <?php if (!$log): ?>
          <p><em>No changes yet.</em></p>
        <?php else: ?>
          <table class="widefat striped" style="max-width:60em">
            <thead><tr><th style="width:150px">When</th><th style="width:130px">Who</th><th>Why</th><th style="width:110px"></th></tr></thead>
            <tbody>
            <?php foreach ($log as $i => $e): ?>
              <tr>
                <td><?php echo esc_html(date_i18n('j M Y H:i', $e['time'])); ?></td>
                <td><?php echo esc_html($e['user']); ?><br>
                    <small style="color:#777"><?php echo esc_html($e['kind']); ?></small></td>
                <td>
                  <?php echo $e['reason'] !== '' ? esc_html($e['reason']) : '<em style="color:#999">no reason given</em>'; ?>
                  <details style="margin-top:6px">
                    <summary style="cursor:pointer;font-size:12px">
                      <?php echo count($e['changes']); ?> area<?php echo count($e['changes']) === 1 ? '' : 's'; ?>:
                      <?php echo esc_html(implode(', ', array_keys($e['changes']))); ?>
                    </summary>
                    <?php foreach ($e['changes'] as $id => $c): ?>
                      <p style="margin:8px 0 2px"><code><?php echo esc_html($id); ?></code></p>
                      <?php if (array_key_exists('from', $c)): ?>
                        <p style="margin:2px 0;font-size:11px;color:#777">before</p>
                        <textarea rows="3" class="large-text code" readonly><?php echo esc_textarea($c['from'] === null ? '(the plugin default)' : $c['from']); ?></textarea>
                        <p style="margin:2px 0;font-size:11px;color:#777">after</p>
                        <textarea rows="3" class="large-text code" readonly><?php echo esc_textarea($c['to'] === null ? '(the plugin default)' : $c['to']); ?></textarea>
                      <?php endif; ?>
                    <?php endforeach; ?>
                  </details>
                </td>
                <td>
                  <form method="post" onsubmit="return confirm('Put these areas back to how they were after this change?')">
                    <?php wp_nonce_field('mf_design', 'mf_design_nonce'); ?>
                    <input type="hidden" name="restore" value="<?php echo (int) $i; ?>">
                    <input type="hidden" name="mf_reason" value="">
                    <button type="submit" class="button button-small">Put back</button>
                  </form>
                </td>
              </tr>
            <?php endforeach; ?>
            </tbody>
          </table>
        <?php endif; ?>

        <h2 style="margin-top:30px">Backup</h2>
        <p class="description" style="max-width:52em">
          Everything on this page — every area's HTML, the CSS beside each one, and the five area
          stylesheets — as one block of text. Copy it somewhere safe before a big change, or to carry
          this design to another site. Restoring reads back only the areas this version knows; anything
          else in the file is ignored rather than half-applied.
        </p>
        <p><strong>Copy this out</strong></p>
        <textarea rows="6" class="large-text code" readonly onclick="this.select()"><?php echo esc_textarea(self::export()); ?></textarea>

        <form method="post" style="margin-top:18px">
          <?php wp_nonce_field('mf_design', 'mf_design_nonce'); ?>
          <p><strong>Paste one back in</strong></p>
          <textarea name="mf_import" rows="6" class="large-text code" spellcheck="false"
                    placeholder="Paste a backup here"></textarea>
          <?php self::reason_field(); ?>
          <?php submit_button('Restore this backup', 'secondary'); ?>
        </form>
        <?php
    }

    private static function form_blocks() {
        $pages = self::group_pages();
        ?>
        <p class="description" style="max-width:56em">
          Every area of the front end. Each one shows what it looks like, where it appears, its HTML,
          and the CSS that styles it. Areas marked <strong>Whole section</strong> are a block of the
          page; <strong>One line</strong> areas are a single heading or sentence. Scripts and event
          handlers are stripped on save, and every area has a Reset.
        </p>
        <?php
        foreach (self::manifest() as $key => $group) {
            $where = isset($pages[$key]) ? $pages[$key] : null;
            echo '<h2 style="margin-top:28px">' . esc_html($group['label']) . '</h2>';
            if ($where) {
                printf('<p class="description" style="margin:-8px 0 10px">Appears on: <strong>%s</strong> — <a href="%s" target="_blank" rel="noopener">open the page</a></p>',
                       esc_html($where[0]), esc_url($where[1]));
            }
            echo '<table class="form-table" role="presentation"><tbody>';
            foreach ($group['blocks'] as $id => $def) {
                $def    = self::resolve($def);
                $val    = self::get($id);
                $over   = self::is_overridden($id);
                $tokens = self::tokens($id);
                $keeps  = self::keeps($id);
                $gone   = self::missing_keeps($id);
                $moved  = self::default_changed($id);
                $bcss   = self::block_css($id);
                $whole  = $def[1] === 'html' && strlen($def[2]) > 220;
                ?>
                <tr>
                  <th scope="row" style="vertical-align:top;width:210px">
                    <label for="<?php echo esc_attr($id); ?>" style="font-size:14px"><?php echo wp_kses_post($def[0]); ?></label>
                    <span style="display:block;margin-top:5px">
                      <span style="display:inline-block;padding:1px 7px;border-radius:9px;font-size:11px;font-weight:700;<?php
                        echo $whole ? 'background:#E7F0FF;color:#204a8f' : 'background:#F0F0F0;color:#666'; ?>">
                        <?php echo $whole ? 'Whole section' : ($def[1] === 'html' ? 'Small block' : 'One line'); ?>
                      </span>
                      <?php if ($over): ?>
                        <span style="display:inline-block;margin-left:4px;padding:1px 7px;border-radius:9px;background:#FFF3D6;color:#8A5A00;font-size:11px;font-weight:700">Yours</span>
                      <?php endif; ?>
                    </span>
                    <code style="display:block;margin-top:6px;font-size:11px;color:#888"><?php echo esc_html($id); ?></code>
                  </th>
                  <td>
                    <!-- what it looks like -->
                    <details open style="margin:0 0 10px">
                      <summary style="cursor:pointer;font-size:12px;color:#2271b1;font-weight:600">What this looks like</summary>
                      <iframe title="<?php echo esc_attr($def[0]); ?>" loading="lazy"
                              style="width:100%;height:<?php echo $whole ? 260 : 90; ?>px;border:1px solid #dcdcde;border-radius:4px;background:#fff;margin-top:6px"
                              srcdoc="<?php echo esc_attr(self::preview_srcdoc($id)); ?>"></iframe>
                    </details>

                    <?php if ($tokens): ?>
                      <p class="description" style="margin:0 0 6px">
                        The site fills these in — put them where you like, or leave one out:
                        <?php foreach ($tokens as $name => $note): ?>
                          <code style="margin-right:6px" title="<?php echo esc_attr($note); ?>">{{<?php echo esc_html($name); ?>}}</code>
                        <?php endforeach; ?>
                      </p>
                    <?php endif; ?>

                    <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#555">HTML</p>
                    <textarea id="<?php echo esc_attr($id); ?>" name="blocks[<?php echo esc_attr($id); ?>]"
                              rows="<?php echo $whole ? 12 : (strlen($val) > 90 ? 5 : 2); ?>"
                              class="large-text code" spellcheck="false"><?php echo esc_textarea($val); ?></textarea>

                    <?php if ($keeps): ?>
                      <p class="description" style="margin:6px 0 0">
                        Keep these — the site holds on to them:
                        <?php foreach ($keeps as $needle => $why): ?>
                          <code style="margin-right:6px;<?php echo isset($gone[$needle]) ? 'background:#FEE2E2;color:#B91C1C' : ''; ?>"
                                title="<?php echo esc_attr($why); ?>"><?php echo esc_html($needle); ?></code>
                        <?php endforeach; ?>
                      </p>
                    <?php endif; ?>
                    <?php if ($gone): ?>
                      <div style="margin-top:6px;padding:9px 12px;border-left:4px solid #B91C1C;background:#FEF2F2">
                        <strong>Your version is missing:</strong>
                        <ul style="margin:6px 0 0 18px;list-style:disc">
                          <?php foreach ($gone as $needle => $why): ?>
                            <li><code><?php echo esc_html($needle); ?></code> — <?php echo esc_html($why); ?>. That stops working.</li>
                          <?php endforeach; ?>
                        </ul>
                        Reset brings it back.
                      </div>
                    <?php endif; ?>

                    <!-- CSS, on every area -->
                    <?php $existing = self::css_for($id); ?>
                    <details style="margin-top:10px" <?php echo $bcss !== '' ? 'open' : ''; ?>>
                      <summary style="cursor:pointer;font-size:12px;color:#2271b1;font-weight:600">
                        CSS<?php echo $bcss !== '' ? ' (in use)' : ''; ?>
                      </summary>
                      <?php if ($existing !== ''): ?>
                        <p class="description" style="margin:6px 0 4px">
                          <strong>What already styles this</strong> — read-only. Copy a rule down and change it below.
                        </p>
                        <textarea rows="7" class="large-text code" readonly spellcheck="false"
                                  onclick="this.select()" style="background:#f6f7f7"><?php echo esc_textarea(trim($existing)); ?></textarea>
                      <?php endif; ?>
                      <p class="description" style="margin:6px 0 4px"><strong>Your rules for this area</strong></p>
                      <textarea name="bcss[<?php echo esc_attr($id); ?>]" rows="5" class="large-text code"
                                spellcheck="false" placeholder="/* e.g. .mf-hero-desc{font-size:18px!important} */"><?php echo esc_textarea($bcss); ?></textarea>
                    </details>

                    <?php if ($moved): ?>
                      <div style="margin-top:8px;padding:10px 12px;border-left:4px solid #B26B00;background:#FFF8EC">
                        <strong>The plugin's version of this changed in an update.</strong>
                        Yours is untouched and still in use. To take the new one instead, tick Reset.
                        <details style="margin-top:6px"><summary>Show the plugin's current default</summary>
                          <textarea rows="6" class="large-text code" readonly onclick="this.select()"><?php echo esc_textarea($def[2]); ?></textarea>
                        </details>
                      </div>
                    <?php endif; ?>

                    <p class="description" style="margin-top:6px">
                      <label><input type="checkbox" name="reset[<?php echo esc_attr($id); ?>]" value="1"> Reset to the plugin's default</label>
                    </p>
                  </td>
                </tr>
                <?php
            }
            echo '</tbody></table>';
        }
    }

    private static function save_blocks() {
        $in    = isset($_POST['blocks']) && is_array($_POST['blocks']) ? wp_unslash($_POST['blocks']) : array();
        $reset = isset($_POST['reset'])  && is_array($_POST['reset'])  ? $_POST['reset'] : array();
        $out    = self::overrides();
        $base   = self::bases();
        $before = $out;
        $reason = isset($_POST['mf_reason']) ? sanitize_text_field(wp_unslash($_POST['mf_reason'])) : '';

        foreach (self::manifest() as $group) {
            foreach ($group['blocks'] as $id => $def) {
                $def = self::resolve($def);
                if (!empty($reset[$id])) { unset($out[$id], $base[$id]); continue; }
                if (!isset($in[$id])) continue;

                $val = $def[1] === 'text' ? sanitize_text_field($in[$id]) : wp_kses($in[$id], self::allowed_html());
                // Matching the default is not a customisation; storing it would
                // freeze this area against every future plugin update.
                if ($val === $def[2]) { unset($out[$id]); continue; }
                $out[$id]  = $val;
                $base[$id] = md5($def[2]);
            }
        }
        update_option(self::OPT_BLOCKS, $out);
        update_option(self::OPT_BASE, $base);

        // The CSS written beside each area, on the same save.
        $css_in     = isset($_POST['bcss']) && is_array($_POST['bcss']) ? wp_unslash($_POST['bcss']) : array();
        $css_out    = self::block_css();
        $before_css = $css_out;
        foreach (self::manifest() as $group) {
            foreach ($group['blocks'] as $id => $def) {
                if (!empty($reset[$id])) { unset($css_out[$id]); continue; }
                if (!isset($css_in[$id])) continue;
                $css = trim(str_replace(array('<', '>'), '', wp_strip_all_tags($css_in[$id])));
                if ($css === '') unset($css_out[$id]); else $css_out[$id] = $css;
            }
        }
        update_option(self::OPT_BCSS, $css_out);

        // One entry per save, listing only what actually moved.
        $changes = array();
        foreach (self::manifest() as $group) {
            foreach ($group['blocks'] as $id => $def) {
                $was_h = isset($before[$id])  ? $before[$id]  : null;
                $now_h = isset($out[$id])     ? $out[$id]     : null;
                $was_c = isset($before_css[$id]) ? $before_css[$id] : null;
                $now_c = isset($css_out[$id]) ? $css_out[$id] : null;
                if ($was_h === $now_h && $was_c === $now_c) continue;
                $changes[$id] = array('from' => $was_h, 'to' => $now_h,
                                      'from_css' => $was_c, 'to_css' => $now_c);
            }
        }
        self::log($changes, $reason);
    }

    /** The screens, and the two places a whole one can be replaced. */
    public static function templates() {
        return array(
            'forum-home'          => 'Forum — landing (signed out) and home (signed in)',
            'forum-detail'        => 'Forum — a single post with its replies',
            'forum-create'        => 'Forum — the new post form',
            'forum-profile'       => 'Profile',
            'events-home'         => 'Events — the hub',
            'events-subpage'      => 'Events — a sub-page frame',
            'events-eventtype'    => 'Events — one event type',
            'events-updates'      => 'Events — community updates',
            'events-special-days' => 'Events — special days',
            'events-host'         => 'Events — host an event',
            'join-us'             => 'Join Us',
            'auth-popup'          => 'Sign in / sign up popup',
            'settings-popup'      => 'Settings popup',
        );
    }

    private static function form_templates() {
        $dir   = defined('WP_CONTENT_DIR') ? WP_CONTENT_DIR . '/mini-forum-templates' : '';
        $theme = get_stylesheet_directory() . '/mini-forum';
        ?>
        <p class="description" style="max-width:52em">
          The tabs above cover the copy and the styling. To rebuild a screen's layout outright,
          copy its template out of the plugin and edit the copy — the plugin then loads yours
          instead, with every variable it prepared still in scope. <strong>Updating the plugin
          never touches your copy</strong>, because it does not live in the plugin's folder.
        </p>
        <p class="description" style="max-width:52em">
          Two places are searched, in this order:
        </p>
        <ol style="max-width:52em">
          <li><code><?php echo esc_html($dir); ?>/&lt;name&gt;.php</code> — survives both plugin
              updates and a change of theme. <?php echo is_dir($dir) ? '<strong>This folder exists.</strong>' : 'Create this folder to use it.'; ?></li>
          <li><code><?php echo esc_html($theme); ?>/&lt;name&gt;.php</code> — the usual WordPress
              route; lost if the theme is switched.</li>
        </ol>
        <p class="description" style="max-width:52em">
          Delete your copy and the plugin's own template comes back. There is no editor here on
          purpose: a template is PHP, and a box on a web page that saves and runs PHP would make
          every admin account a way to run code on this server.
        </p>

        <table class="widefat striped" style="max-width:52em;margin-top:14px">
          <thead><tr><th>Template</th><th>Screen</th><th>In use</th></tr></thead>
          <tbody>
          <?php foreach (self::templates() as $name => $label):
              $own = $dir && file_exists($dir . '/' . $name . '.php');
              $th  = file_exists($theme . '/' . $name . '.php');
              $src = $own ? 'wp-content copy' : ($th ? 'theme copy' : 'plugin');
          ?>
            <tr>
              <td><code><?php echo esc_html($name); ?>.php</code></td>
              <td><?php echo esc_html($label); ?></td>
              <td<?php echo $src === 'plugin' ? '' : ' style="font-weight:700;color:#8A5A00"'; ?>><?php echo esc_html($src); ?></td>
            </tr>
          <?php endforeach; ?>
          </tbody>
        </table>
        <?php
    }

    private static function form_css() {
        $all = get_option(self::OPT_CSS, array());
        ?>
        <p class="description" style="max-width:52em">
          Printed after the plugin's own stylesheet, so a rule here wins without needing
          <code>!important</code> in most cases — the plugin's own rules do use it, so match them
          when overriding one. Each area only loads on the pages it belongs to.
        </p>
        <?php
        foreach (self::css_areas() as $key => $meta) {
            $val = is_array($all) && isset($all[$key]) ? $all[$key] : '';
            ?>
            <h2><?php echo esc_html($meta[0]); ?></h2>
            <p class="description"><?php echo esc_html($meta[1]); ?></p>
            <textarea name="css[<?php echo esc_attr($key); ?>]" rows="10" class="large-text code"
                      spellcheck="false" placeholder="/* CSS for <?php echo esc_attr($meta[0]); ?> */"><?php echo esc_textarea($val); ?></textarea>
            <?php
        }
    }

    private static function save_css() {
        $in  = isset($_POST['css']) && is_array($_POST['css']) ? wp_unslash($_POST['css']) : array();
        $out = array();
        foreach (self::css_areas() as $key => $meta) {
            if (!isset($in[$key])) continue;
            // CSS never needs angle brackets, and without them nothing written
            // here can close the <style> element and become markup.
            $css = trim(str_replace(array('<', '>'), '', wp_strip_all_tags($in[$key])));
            if ($css !== '') $out[$key] = $css;
        }
        update_option(self::OPT_CSS, $out);
    }
}

Mini_Forum_Design::init();

/* ── the two calls templates make ── */

/**
 * Print an editable area.
 *
 * @param string $id   Area id from the manifest.
 * @param array  $vars Values for the area's tokens: mf_block('profile.header',
 *                     array('nickname' => esc_html($nick), 'avatar' => $html)).
 *                     Escape anything that came from a user before passing it.
 */
function mf_block($id, $vars = array()) {
    echo Mini_Forum_Design::render($id, $vars);
}

/** The same area as a string, for attributes and concatenation. */
function mf_block_get($id, $vars = array()) {
    return Mini_Forum_Design::render($id, $vars);
}

/** Whether an area id is registered. */
function mf_block_exists($id) {
    return Mini_Forum_Design::has($id);
}

/**
 * Locate a template, letting the active theme replace it.
 *
 *   wp-content/themes/<theme>/mini-forum/events-home.php
 *
 * A theme copy is included in place of the plugin's, with every variable the
 * plugin prepared still in scope — the proper way to redesign a whole screen.
 */
function mf_template($name) {
    $name = preg_replace('/[^a-z0-9\-]/', '', $name);

    // wp-content/mini-forum-templates/<name>.php — outside the plugin, so an
    // update cannot overwrite it, and outside the theme, so switching themes
    // does not lose it.
    if (defined('WP_CONTENT_DIR')) {
        $content = WP_CONTENT_DIR . '/mini-forum-templates/' . $name . '.php';
        if (file_exists($content)) return apply_filters('mf_template', $content, $name);
    }

    $theme = locate_template('mini-forum/' . $name . '.php');
    $path  = $theme ? $theme : MF_PATH . 'templates/' . $name . '.php';
    return apply_filters('mf_template', $path, $name);
}
