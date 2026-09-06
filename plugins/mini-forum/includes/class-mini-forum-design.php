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

/* The two inline icons the profile header uses. Constants so the template and
   the manifest's default HTML cannot drift apart. */
define('MF_PENCIL_SVG', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>');
define('MF_COG_SVG', '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.36.44.63.81.76H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>');

class Mini_Forum_Design {

    const OPT_BLOCKS = 'mf_design_blocks';
    const OPT_CSS    = 'mf_design_css';
    const OPT_BASE   = 'mf_design_base';   // the default each override was written against
    const OPT_BCSS   = 'mf_design_block_css';  // CSS written beside an area's HTML

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

            'forum_out' => array('label' => 'Forum — signed out', 'blocks' => array(
                'forum.guest.hero' => array('Hero', 'html',
                    '<div class="mf-hero-new">' .
                      '<div class="mf-hero-left">' .
                        '<h1 class="mf-title-contour">Forum</h1>' .
                        '<div class="mf-hero-bars"><span style="background:var(--mf-red)"></span><span style="background:var(--mf-yellow)"></span><span style="background:var(--mf-blue)"></span><span style="background:var(--mf-green)"></span></div>' .
                        '<p class="mf-hero-desc">A safe space where Mini-Community members can share their experiences and feel that they are not alone.</p>' .
                      '</div>' .
                      '<div class="mf-hero-face"><img src="{{logo}}" alt="Mini-Talks" /></div>' .
                    '</div>',
                    array('logo' => 'The Mini-Talks logo URL')),

                'forum.guest.access' => array('Forum Access — heading and cards', 'html',
                    '<h2 class="mf-title-contour" style="text-align:center;font-size:clamp(24px,2.8vw,42px);margin-bottom:10px">Forum Access</h2>' .
                    '<p class="mf-guest-access-sub">Forum is part of Mini-Community. To access the Forum, you must first be an approved Mini-Community member.</p>' .
                    '<div class="mf-guest-cards">' .
                      '<div class="mf-guest-card">' .
                        '<div class="mf-guest-card-studs" style="background-image:url(\'{{studs_red}}\')"></div>' .
                        '<div class="mf-guest-card-body" style="background:var(--mf-red)">' .
                          '<h3>Not a Mini-Community<br>Member Yet</h3>' .
                          '<div class="mf-guest-card-inner">' .
                            '<p>To access the Forum, you first need to join Mini-Community.</p>' .
                            '<a href="{{join_url}}" class="mf-guest-card-btn" style="color:var(--mf-red)">Join Us</a>' .
                          '</div>' .
                        '</div>' .
                      '</div>' .
                      '<div class="mf-guest-card">' .
                        '<div class="mf-guest-card-studs" style="background-image:url(\'{{studs_blue}}\')"></div>' .
                        '<div class="mf-guest-card-body" style="background:var(--mf-blue)">' .
                          '<h3>I\'m a Mini-Community<br>Member</h3>' .
                          '<div class="mf-guest-card-inner">' .
                            '<p>You can sign in with your email address and password.</p>' .
                            '<button class="mf-guest-card-btn" style="color:var(--mf-blue)" data-mf-action="login">Sign In</button>' .
                          '</div>' .
                        '</div>' .
                      '</div>' .
                    '</div>',
                    array('join_url' => 'The Join Us page', 'studs_red' => 'Red stud strip image',
                          'studs_blue' => 'Blue stud strip image'),
                    array('data-mf-action="login"' => 'opens the sign-in popup')),
            )),

            'forum_in' => array('label' => 'Forum — signed in', 'blocks' => array(
                'forum.hero' => array('Hero', 'html',
                    '<div class="mf-hero-new">' .
                      '<div class="mf-hero-left">' .
                        '<h1 class="mf-title-contour">Mini-Forum</h1>' .
                        '<div class="mf-hero-bars"><span style="background:var(--mf-red)"></span><span style="background:var(--mf-yellow)"></span><span style="background:var(--mf-blue)"></span><span style="background:var(--mf-green)"></span></div>' .
                        '<p class="mf-hero-desc">Share. Connect. Support.</p>' .
                        '<p class="mf-hero-desc">A safe space for families, experts, and volunteers.</p>' .
                      '</div>' .
                      '<div class="mf-hero-face"><img src="{{logo}}" alt="Mini-Talks" /></div>' .
                    '</div>',
                    array('logo' => 'The Mini-Talks logo URL')),
            )),

            'profile' => array('label' => 'Profile', 'blocks' => array(
                'profile.header' => array('Header — avatar, name, badges, stats', 'html',
                    '<div class="mf-avatar-col">' .
                      '<div class="mf-avatar-lg mf-av-editable" role="button" tabindex="0" aria-label="Edit your avatar">' .
                        '{{avatar}}<span class="mf-av-edit-overlay">Edit</span>' .
                      '</div>' .
                      '<button type="button" class="mf-av-edit-btn" aria-label="Customize your avatar">{{edit_icon}} Customize Avatar</button>' .
                    '</div>' .
                    '<div class="mf-profile-info">' .
                      '<h1>{{nickname}}</h1>' .
                      '<div class="mf-profile-roles">{{badges}}</div>' .
                      '<p class="mf-profile-community">Part of the Mini-Talks community</p>' .
                      '<div class="mf-stats-row">{{stats}}</div>' .
                    '</div>' .
                    '<div class="mf-profile-settings">' .
                      '<button type="button" class="mf-settings-btn" data-mf-action="settings" aria-label="Open account settings">{{settings_icon}} Settings</button>' .
                    '</div>',
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
                'profile.kits.title'    => array('Mini-Kits heading', 'text', 'Mini-Kits'),
                'profile.kits.empty'    => array('Mini-Kits empty state', 'html', 'Your Mini-Talks kits will appear here once the Mini-Devices plugin is active.'),
                'profile.studio.title'  => array('App &amp; Studio heading', 'text', 'App & Studio'),
                'profile.studio.empty'  => array('App &amp; Studio empty state', 'html', 'Coming soon.'),
            )),

            'events' => array('label' => 'Events', 'blocks' => array(
                'events.hero' => array('Hero', 'html',
                    '<div class="mf-hero-new">' .
                      '<div class="mf-hero-left">' .
                        '<h1 class="mf-title-contour">Mini-Events</h1>' .
                        '<div class="mf-hero-bars"><span style="background:var(--mf-red)"></span><span style="background:var(--mf-yellow)"></span><span style="background:var(--mf-blue)"></span><span style="background:var(--mf-green)"></span></div>' .
                        '<p class="mf-hero-desc">Real-world meetups where the Mini-Talks experience comes to life.</p>' .
                        '<p class="mf-hero-desc">Natural interactions where children and volunteers connect together.</p>' .
                      '</div>' .
                      '<div class="mf-hero-face"><img src="{{logo}}" alt="Mini-Talks" /></div>' .
                    '</div>',
                    array('logo' => 'The Mini-Talks logo URL')),

                'events.soon' => array('Empty sub-page card', 'html',
                    '<div class="mfe-frame-inner" style="padding:36px 28px;text-align:center">' .
                      '<h3 style="font-family:\'Montserrat\',sans-serif;font-weight:900;font-size:22px;color:#1D1D1B;margin:0 0 10px">Coming soon</h3>' .
                      '<p style="font-weight:700;font-size:14px;color:#1D1D1B;margin:0 0 20px;line-height:1.6">This page is being prepared. In the meantime, explore the Mini-Events hub.</p>' .
                      '<a href="{{events_url}}" class="mfe-explore-btn mfe-btn-blue">Back to Mini-Events</a>' .
                    '</div>',
                    array('events_url' => 'The Mini-Events hub')),
            )),

            'host' => array('label' => 'Host an Event', 'blocks' => array(
                'host.hero' => array('Hero', 'html',
                    '<div class="mf-hero-new">' .
                      '<div class="mf-hero-left">' .
                        '<h1 class="mf-title-contour blue">Host an Event</h1>' .
                        '<div class="mf-hero-bars"><span style="background:var(--mf-red)"></span><span style="background:var(--mf-yellow)"></span><span style="background:var(--mf-blue)"></span><span style="background:var(--mf-green)"></span></div>' .
                        '<p class="mf-hero-desc">Want to organize a workshop, meetup or expert session?</p>' .
                        '<p class="mf-hero-desc">Tell us a little — admin will review and get back to you.</p>' .
                      '</div>' .
                      '<div class="mf-hero-face"><img src="{{logo}}" alt="Mini-Talks" /></div>' .
                    '</div>',
                    array('logo' => 'The Mini-Talks logo URL')),

                'host.form.title' => array('Form heading', 'text', 'Host a Mini-Event'),
            )),

            'join' => array('label' => 'Join Us', 'blocks' => array(
                'join.title' => array('Page heading', 'text', 'Join Us!'),

                'join.step1' => array('Step 1 — choosing an area', 'html',
                    '<div class="mt-ju-step" id="ju-step1"><div class="mt-ju-num"><span style="color:#E52828">1</span></div><div class="mt-ju-card"><div class="mt-ju-card-box mt-ju-card-red"><div class="mt-ju-card-inner"><h3>Choose Your Area <span>(Select one)</span></h3><div class="mt-ju-roles"><div class="mt-ju-role" data-value="Mini-Family" data-mf-action="ju-role"><img src="{{img_family}}" alt="" /><div><strong>Mini-Families</strong><span>For families supporting a child\'s communication journey, or adults (18+) with lived experience.</span></div></div><div class="mt-ju-role" data-value="Mini-Expert" data-mf-action="ju-role"><img src="{{img_expert}}" alt="" /><div><strong>Mini-Experts</strong><span>For professionals and educators working in communication and selective mutism.</span></div></div><div class="mt-ju-role" data-value="Mini-Volunteer" data-mf-action="ju-role"><img src="{{img_volunteer}}" alt="" /><div><strong>Mini-Volunteers</strong><span>For individuals who want to support children and families in their communication journey.</span></div></div><div class="mt-ju-role" data-value="Talk-Spot" data-mf-action="ju-role"><img src="{{img_talkspot}}" alt="" /><div><strong>Talk-Spots</strong><span>For venues and organizations that want to create safe and supportive spaces for communication.</span></div></div></div></div></div></div></div>',
                    array('img_family' => 'Mini-Families artwork', 'img_expert' => 'Mini-Experts artwork',
                          'img_volunteer' => 'Mini-Volunteers artwork', 'img_talkspot' => 'Talk-Spots artwork'),
                    array('id="ju-step1"'        => 'the script reveals and hides this step',
                          'mt-ju-role'           => 'the four choices',
                          'data-value'           => 'which area each choice stands for',
                          'data-mf-action="ju-role"' => 'picking one opens step 2')),

                'join.step2' => array('Step 2 — account details', 'html',
                    '<div class="mt-ju-step is-hidden" id="ju-step2"><div class="mt-ju-num"><span style="color:#0055BF">2</span></div><div class="mt-ju-card"><div class="mt-ju-card-box mt-ju-card-blue"><div class="mt-ju-card-inner"><div class="mt-ju-formrow"><div class="mt-ju-formfield"><label>Full Name:</label><span class="mt-ju-sub">(Not displayed in forum)</span><input type="text" id="ju-fullname" class="bdr-red" /></div><div class="mt-ju-formfield"><label>Password:</label><span class="mt-ju-sub">(At least 8 characters)</span><input type="password" id="ju-password" class="bdr-blue" /></div><div class="mt-ju-formfield"><label>Email Address:</label><span class="mt-ju-sub">(Used for login)</span><input type="email" id="ju-email" class="bdr-green" /></div></div><div class="mt-ju-formrow"><div class="mt-ju-formfield"><label>City:</label><span class="mt-ju-sub">(Optional)</span><input type="text" id="ju-city" class="bdr-red" /></div><div class="mt-ju-formfield"><label>Country:</label><span class="mt-ju-sub">(Optional)</span><input type="text" id="ju-country" class="bdr-green" /></div><div class="mt-ju-formfield"><label>Nickname:</label><span class="mt-ju-sub">(Displayed in forum)</span><input type="text" id="ju-nickname" class="bdr-yellow" /></div></div><div id="ju-dynamic-fields"></div><div class="mt-ju-formrow"><div class="mt-ju-formfield" style="flex:1!important"><label>Additional Info:</label><span class="mt-ju-sub">(Optional)</span><textarea id="ju-extra" placeholder="Add a short note if you\'d like..."></textarea></div></div><div class="mt-ju-step-actions"><button type="button" class="mt-ju-continue mt-ju-continue-blue" data-mf-action="ju-continue">Continue</button></div></div></div></div></div>',
                    array(),
                    array('id="ju-step2"'   => 'the script reveals and hides this step',
                          'id="ju-fullname"' => 'the name field', 'id="ju-password"' => 'the password field',
                          'id="ju-email"'    => 'the email field', 'id="ju-city"' => 'the city field',
                          'id="ju-country"'  => 'the country field', 'id="ju-nickname"' => 'the nickname field',
                          'id="ju-extra"'    => 'the additional-info field',
                          'id="ju-dynamic-fields"' => 'where the fields for the chosen area appear',
                          'data-mf-action="ju-continue"' => 'opens step 3')),

                'join.step3' => array('Step 3 — consent and Join', 'html',
                    '<div class="mt-ju-step is-hidden" id="ju-step3"><div class="mt-ju-num"><span style="color:#FFCC00">3</span></div><div class="mt-ju-card"><div class="mt-ju-card-box mt-ju-card-yellow"><div class="mt-ju-card-inner"><h3>Acknowledgment &amp; Consent</h3><label class="mt-ju-consent"><input type="checkbox" id="ju-consent" /><span>I have read and accept the Mini-Community Guidelines and Terms of Participation.</span></label><a href="/mini-community/guidelines/" target="_blank" class="mt-ju-guidelines-link">View Guidelines and Terms of Participation</a><p class="mt-ju-info">Mini-Community does not provide treatment, referrals, or child-specific evaluations.<br>All shared content is based on personal experience and awareness.<br>Personal information is kept confidential and never shared without consent.</p><div style="text-align:center;padding:20px 0 12px"><button class="mt-ju-btn" type="button" data-mf-action="ju-submit"><div class="mt-ju-btn-stud"></div><div class="mt-ju-btn-topbar"></div><div class="mt-ju-btn-inner"><img class="mt-ju-btn-heart" src="{{img_heart}}" alt="" /><span class="mt-ju-btn-label">Join</span></div></button></div></div></div></div></div>',
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
            if (isset($group['blocks'][$id])) return $group['blocks'][$id];
        }
        return null;
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
            'aria-describedby' => true, 'aria-expanded' => true,
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
            'table' => array(), 'thead' => array(), 'tbody' => array(), 'tr' => array(),
            'th' => array('colspan' => true, 'rowspan' => true, 'scope' => true),
            'td' => array('colspan' => true, 'rowspan' => true),
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
        if (!in_array($tab, array('blocks', 'css', 'templates'), true)) $tab = 'blocks';
        if (!empty($_POST['mf_design_nonce']) && wp_verify_nonce($_POST['mf_design_nonce'], 'mf_design')) {
            $tab === 'css' ? self::save_css() : self::save_blocks();
            echo '<div class="notice notice-success is-dismissible"><p>Saved.</p></div>';
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
          </h2>
          <?php if ($tab === 'templates') { self::form_templates(); } else { ?>
          <form method="post">
            <?php wp_nonce_field('mf_design', 'mf_design_nonce'); ?>
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

    private static function form_blocks() {
        ?>
        <p class="description" style="max-width:52em">
          Every fixed piece of copy on the front end. Blocks marked <em>HTML</em> take markup —
          links, <code>&lt;br&gt;</code>, a <code>&lt;span&gt;</code> to colour a word. Scripts and
          iframes are stripped on save. Tick <strong>Reset</strong> to go back to the default.
        </p>
        <?php
        foreach (self::manifest() as $key => $group) {
            echo '<h2>' . esc_html($group['label']) . '</h2>';
            echo '<table class="form-table" role="presentation"><tbody>';
            foreach ($group['blocks'] as $id => $def) {
                $val  = self::get($id);
                $over = self::is_overridden($id);
                ?>
                <?php $tokens = self::tokens($id); $moved = self::default_changed($id); ?>
                <tr>
                  <th scope="row" style="vertical-align:top">
                    <label for="<?php echo esc_attr($id); ?>"><?php echo wp_kses_post($def[0]); ?></label><br>
                    <code style="font-size:11px;color:#777"><?php echo esc_html($id); ?></code>
                    <span style="display:block;font-size:11px;color:#777"><?php echo $def[1] === 'html' ? 'HTML' : 'Plain text'; ?></span>
                    <?php if ($over): ?>
                      <span style="display:inline-block;margin-top:6px;padding:2px 7px;border-radius:9px;background:#FFF3D6;color:#8A5A00;font-size:11px;font-weight:700">Yours</span>
                    <?php endif; ?>
                  </th>
                  <td>
                    <?php if ($tokens): ?>
                      <p class="description" style="margin:0 0 6px">
                        Put these anywhere in your HTML, or leave them out:
                        <?php foreach ($tokens as $name => $note): ?>
                          <code style="margin-right:6px" title="<?php echo esc_attr($note); ?>">{{<?php echo esc_html($name); ?>}}</code>
                        <?php endforeach; ?>
                      </p>
                    <?php endif; ?>

                    <textarea id="<?php echo esc_attr($id); ?>" name="blocks[<?php echo esc_attr($id); ?>]"
                              rows="<?php echo strlen($val) > 400 ? 12 : (strlen($val) > 90 ? 5 : 2); ?>"
                              class="large-text code" spellcheck="false"><?php echo esc_textarea($val); ?></textarea>

                    <?php $keeps = self::keeps($id); $gone = self::missing_keeps($id); ?>
                    <?php if ($keeps): ?>
                      <p class="description" style="margin:6px 0 0">
                        The code looks for these — keep them and everything keeps working:
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
                        The rest of the page is unaffected, and Reset brings it back.
                      </div>
                    <?php endif; ?>

                    <?php if ($moved): ?>
                      <div style="margin-top:8px;padding:10px 12px;border-left:4px solid #B26B00;background:#FFF8EC">
                        <strong>The plugin's version of this changed in an update.</strong>
                        Yours is untouched and still in use. To take the new one instead, tick Reset.
                        <details style="margin-top:6px"><summary>Show the plugin's current default</summary>
                          <textarea rows="6" class="large-text code" readonly onclick="this.select()"><?php echo esc_textarea($def[2]); ?></textarea>
                        </details>
                      </div>
                    <?php endif; ?>

                    <?php if ($def[1] === 'html'): $bcss = self::block_css($id); ?>
                      <details style="margin-top:8px" <?php echo $bcss !== '' ? 'open' : ''; ?>>
                        <summary style="cursor:pointer;font-size:12px;color:#2271b1">
                          CSS for this area<?php echo $bcss !== '' ? ' (in use)' : ''; ?>
                        </summary>
                        <?php $existing = self::css_for($id); ?>
                        <?php if ($existing !== ''): ?>
                          <p class="description" style="margin:6px 0 4px">
                            <strong>What already styles this markup</strong> — the plugin's own rules for the
                            classes above. Read-only: copy a rule into the box below and change it there.
                          </p>
                          <textarea rows="8" class="large-text code" readonly spellcheck="false"
                                    onclick="this.select()" style="background:#f6f7f7"><?php echo esc_textarea(trim($existing)); ?></textarea>
                        <?php endif; ?>
                        <p class="description" style="margin:6px 0 4px">
                          <strong>Your rules for this area.</strong> Printed after the area stylesheets, on every
                          page this area appears on. The plugin's own rules use <code>!important</code>,
                          so match that when overriding one.
                        </p>
                        <textarea name="bcss[<?php echo esc_attr($id); ?>]" rows="5" class="large-text code"
                                  spellcheck="false" placeholder="/* e.g. .benim-hero{gap:30px!important} */"><?php echo esc_textarea($bcss); ?></textarea>
                      </details>
                    <?php endif; ?>

                    <p class="description" style="margin-top:4px">
                      <label><input type="checkbox" name="reset[<?php echo esc_attr($id); ?>]" value="1"> Reset to the plugin's default</label>
                      <?php if (!$over): ?>
                        <span style="color:#999;margin-left:10px">Unchanged — this follows the plugin.</span>
                      <?php endif; ?>
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
        $out   = self::overrides();
        $base  = self::bases();

        foreach (self::manifest() as $group) {
            foreach ($group['blocks'] as $id => $def) {
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
        $css_in  = isset($_POST['bcss']) && is_array($_POST['bcss']) ? wp_unslash($_POST['bcss']) : array();
        $css_out = self::block_css();
        foreach (self::manifest() as $group) {
            foreach ($group['blocks'] as $id => $def) {
                if (!empty($reset[$id])) { unset($css_out[$id]); continue; }
                if (!isset($css_in[$id])) continue;
                $css = trim(str_replace(array('<', '>'), '', wp_strip_all_tags($css_in[$id])));
                if ($css === '') unset($css_out[$id]); else $css_out[$id] = $css;
            }
        }
        update_option(self::OPT_BCSS, $css_out);
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
