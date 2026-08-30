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

        $view    = sanitize_text_field($_GET['view'] ?? '');
        $post_id = intval($_GET['post_id'] ?? 0);

        if ($post_id > 0) {
            include MF_PATH . 'templates/forum-detail.php';
        } elseif ($view === 'create') {
            include MF_PATH . 'templates/forum-create.php';
        } elseif ($view === 'profile') {
            include MF_PATH . 'templates/forum-profile.php';
        } else {
            include MF_PATH . 'templates/forum-home.php';
        }

        return ob_get_clean();
    }

    /**
     * Events shortcode router
     *   /events/                        → hub (home)
     *   /events/?view=workshops         → Mini-Workshops
     *   /events/?view=meetups           → Mini-Families Meetups
     *   /events/?view=experts           → Mini-Expert Sessions
     *   /events/?view=updates           → Mini-Community Updates
     *   /events/?view=special-days      → Special Days
     *   /events/?view=host              → Host Event form
     */
    public static function events_router($atts) {
        ob_start();

        $view = sanitize_text_field($_GET['view'] ?? '');
        $allowed_subviews = ['workshops','meetups','experts','updates','special-days','host'];

        if (in_array($view, $allowed_subviews, true)) {
            include MF_PATH . 'templates/events-subpage.php';
        } else {
            include MF_PATH . 'templates/events-home.php';
        }

        return ob_get_clean();
    }

    /**
     * Join Us page shortcode
     */
    public static function join_page($atts) {
        ob_start();
        include MF_PATH . 'templates/join-us.php';
        return ob_get_clean();
    }
}

Mini_Forum_Shortcodes::init();
