<?php
if (!defined('ABSPATH')) exit;

class Mini_Forum_Shortcodes {

    public static function init() {
        add_shortcode('mini_forum',  [__CLASS__, 'router']);
        add_shortcode('mini_join',   [__CLASS__, 'join_page']);
        add_shortcode('mini_events', [__CLASS__, 'events_router']);
    }

    /**
     * Forum shortcode router
     *   /forum/                            → home
     *   /forum/?view=create&type=question  → create post
     *   /forum/?post_id=123                → post detail
     *   /forum/?view=profile               → user profile
     */
    public static function router($atts) {
        ob_start();
        $slot = (isset($_GET['view']) && $_GET['view'] === 'profile') ? 'profile' : 'forum';
        mf_block('slot.' . $slot . '.top');

        $view    = sanitize_text_field($_GET['view'] ?? '');
        $post_id = intval($_GET['post_id'] ?? 0);

        if ($post_id > 0) {
            include mf_template('forum-detail');
        } elseif ($view === 'create') {
            include mf_template('forum-create');
        } elseif ($view === 'profile') {
            include mf_template('forum-profile');
        } else {
            include mf_template('forum-home');
        }

        mf_block('slot.' . $slot . '.bottom');
        return ob_get_clean();
    }

    /**
     * Mini-Calendar shortcode router
     *   /mini-calendar/                                  → the calendar
     *   /mini-calendar/?view=mini-volunteer-workshops    → Mini-Volunteer Workshops
     *   /mini-calendar/?view=mini-family-meetups         → Mini-Family Meetups
     *   /mini-calendar/?view=mini-expert-sessions        → Mini-Expert Sessions
     *   /mini-calendar/?view=mini-community-updates      → Mini-Community Updates
     *   /mini-calendar/?view=mini-special-days           → Mini-Special Days
     *   /mini-calendar/?view=host                        → Host an Event
     *
     * The page itself can be called anything — the shortcode finds its own page
     * — so renaming it to Mini-Calendar needs no code change. Each sub-page's
     * view is its own title, which is what somebody reads in the address bar.
     */
    public static function events_router($atts) {
        /* The names the site shipped with still work: a link somebody shared
           is not worth breaking over a rename. They redirect rather than serve,
           so the address ends up the one people will see from now on. */
        $view    = sanitize_text_field($_GET['view'] ?? '');
        $aliases = Mini_Forum_Events::aliases();
        if (isset($aliases[$view]) && !headers_sent()) {
            wp_safe_redirect(Mini_Forum_Events::url($aliases[$view]), 301);
            exit;
        }

        ob_start();
        mf_block('slot.events.top');

        if ($view === 'host' || isset(Mini_Forum_Events::views()[$view])) {
            include mf_template('events-subpage');
        } else {
            include mf_template('events-home');
        }

        mf_block('slot.events.bottom');
        return ob_get_clean();
    }

    /**
     * Join Us page shortcode
     */
    public static function join_page($atts) {
        ob_start();
        mf_block('slot.join.top');
        include mf_template('join-us');
        mf_block('slot.join.bottom');
        return ob_get_clean();
    }
}

Mini_Forum_Shortcodes::init();
