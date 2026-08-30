<?php
/**
 * The Mini-Designs catalogue.
 *
 * Mini-Designs is not one product: it is a library of buildable LEGO scenes a
 * member picks from. Whether a scene can be built right now depends on parts,
 * which changes week to week — so availability is a field the team edits, never
 * something baked into the code.
 */

if (!defined('ABSPATH')) exit;

class MD_Designs {

    const CPT = 'md_mini_design';

    /** A scene nobody has vouched for is not buildable. The game's database
     *  knows far more scenes than the workshop can build, so anything that
     *  arrives without an explicit answer stays out of reach until the team
     *  marks it Available by hand. */
    const DEFAULT_AVAILABILITY = 'unavailable';

    public static function availabilities() {
        return array(
            'available'   => 'Available',
            'unavailable' => 'Currently Unavailable',
            'coming_soon' => 'Coming Soon',
        );
    }

    /** The scenes the team confirmed they can build today. These, and only
     *  these, are seeded as Available. */
    public static function seed_scenes() {
        return apply_filters('md_designs_seed', array(
            'Classroom', 'Coffee Shop', 'Supermarket', 'Choir Performance',
            'Robotics Tournament', 'Playground', 'Beach', 'Swimming Pool',
            'Basketball Court', 'Tennis Court',
        ));
    }

    /** One place that answers "can this be built?", so a missing value can
     *  never read as Available by accident. */
    public static function availability($id) {
        $av = get_post_meta((int) $id, '_md_availability', true);
        return isset(self::availabilities()[$av]) ? $av : self::DEFAULT_AVAILABILITY;
    }

    public static function init() {
        add_action('init', array(__CLASS__, 'register_cpt'));
        add_action('init', array(__CLASS__, 'maybe_seed'), 20);
        if (is_admin()) {
            add_filter('manage_' . self::CPT . '_posts_columns', array(__CLASS__, 'columns'));
            add_action('manage_' . self::CPT . '_posts_custom_column', array(__CLASS__, 'column'), 10, 2);
            add_action('add_meta_boxes', array(__CLASS__, 'meta_box'));
            add_action('save_post_' . self::CPT, array(__CLASS__, 'save'));
        }
    }

    public static function register_cpt() {
        register_post_type(self::CPT, array(
            'labels' => array(
                'name'          => 'Mini-Designs',
                'singular_name' => 'Mini-Design',
                'add_new_item'  => 'Add Mini-Design',
                'edit_item'     => 'Edit Mini-Design',
            ),
            'public'        => false,
            'show_ui'       => true,
            'show_in_menu'  => true,
            'menu_icon'     => 'dashicons-screenoptions',
            'menu_position' => 28,
            'supports'      => array('title', 'editor', 'thumbnail', 'page-attributes'),
            'hierarchical'  => false,
        ));
    }

    /**
     * Seed the scenes that can be built today. Runs once; after that the
     * catalogue is the team's to manage, and a re-seed would fight them.
     * The wider scene list lives in the game's own database — those come in
     * later, and arrive unavailable until the team says otherwise.
     */
    public static function maybe_seed() {
        if (get_option('md_designs_seeded')) return;

        $order = 0;
        foreach (self::seed_scenes() as $name) {
            $id = self::ensure($name, 'available', $order);
            // These ten are the list the team confirmed, so the one-time seed
            // asserts them Available even if the scene already existed.
            if ($id) update_post_meta($id, '_md_availability', 'available');
            $order += 10;
        }
        update_option('md_designs_seeded', 1);
    }

    /**
     * Create a scene if it is missing, and set its availability only then.
     * An existing scene keeps whatever the team chose for it — a later import
     * from the game's database must never quietly re-open a scene the team
     * closed, nor close one they opened.
     */
    public static function ensure($name, $availability = self::DEFAULT_AVAILABILITY, $order = 0) {
        $name = trim(wp_strip_all_tags($name));
        if ($name === '') return 0;

        $existing = get_page_by_title($name, OBJECT, self::CPT);
        if ($existing) return (int) $existing->ID;

        $id = wp_insert_post(array(
            'post_type'   => self::CPT,
            'post_status' => 'publish',
            'post_title'  => $name,
            'menu_order'  => (int) $order,
        ));
        if (!$id || is_wp_error($id)) return 0;

        if (!isset(self::availabilities()[$availability])) $availability = self::DEFAULT_AVAILABILITY;
        update_post_meta($id, '_md_availability', $availability);
        return (int) $id;
    }

    /**
     * Bring scene names in from the game's own database (minitalks-api,
     * `select * from scenes`). Everything lands Currently Unavailable: that
     * list is the whole game, not what the workshop can build, and only the
     * team decides which of them opens up.
     *
     * @return int Number of scenes created.
     */
    public static function import_names($names) {
        $created = 0;
        $order   = 1000;
        foreach ((array) $names as $name) {
            if (self::exists($name)) continue;
            if (self::ensure($name, self::DEFAULT_AVAILABILITY, $order)) $created++;
            $order += 10;
        }
        return $created;
    }

    public static function exists($name) {
        return (bool) get_page_by_title(trim(wp_strip_all_tags($name)), OBJECT, self::CPT);
    }

    /** The catalogue as the front end sees it. Unavailable scenes are kept in
     *  the list — hiding them would make Mini-Designs look far smaller than it is. */
    public static function catalogue() {
        $posts = get_posts(array(
            'post_type'   => self::CPT,
            'numberposts' => -1,
            'orderby'     => array('menu_order' => 'ASC', 'title' => 'ASC'),
            'post_status' => 'publish',
        ));
        $out = array();
        foreach ($posts as $p) {
            $av = self::availability($p->ID);
            $out[] = array(
                'id'           => $p->ID,
                'name'         => $p->post_title,
                'description'  => wp_strip_all_tags($p->post_content),
                'image'        => get_the_post_thumbnail_url($p->ID, 'medium') ?: '',
                'availability' => $av,
                'label'        => self::availabilities()[$av] ?? $av,
                'selectable'   => $av === 'available',
            );
        }
        return $out;
    }

    public static function names($ids) {
        $out = array();
        foreach ((array) $ids as $id) {
            $p = get_post((int) $id);
            if ($p && $p->post_type === self::CPT) $out[] = $p->post_title;
        }
        return $out;
    }

    /** Only scenes that can actually be built may be requested. */
    public static function filter_selectable($ids) {
        $ok = array();
        foreach ((array) $ids as $id) {
            $id = (int) $id;
            $p  = get_post($id);
            if (!$p || $p->post_type !== self::CPT) continue;
            if (self::availability($id) !== 'available') continue;
            $ok[] = $id;
        }
        return $ok;
    }

    /* ── admin ── */

    public static function columns($cols) {
        $out = array();
        foreach ($cols as $k => $v) {
            $out[$k] = $v;
            if ($k === 'title') {
                $out['md_thumb']        = 'Image';
                $out['md_availability'] = 'Availability';
            }
        }
        return $out;
    }

    public static function column($col, $id) {
        if ($col === 'md_thumb') {
            $u = get_the_post_thumbnail_url($id, 'thumbnail');
            echo $u ? '<img src="' . esc_url($u) . '" style="width:52px;height:52px;object-fit:cover;border-radius:8px">'
                    : '<span style="color:#999">—</span>';
        } elseif ($col === 'md_availability') {
            $av  = self::availability($id);
            $all = self::availabilities();
            printf('<strong>%s</strong>', esc_html($all[$av] ?? $av));
        }
    }

    public static function meta_box() {
        add_meta_box('md_design_availability', 'Availability', function ($post) {
            wp_nonce_field('md_design_av', 'md_design_av_nonce');
            $av = self::availability($post->ID);
            echo '<select name="md_availability" style="width:100%">';
            foreach (self::availabilities() as $k => $label) {
                printf('<option value="%s"%s>%s</option>', esc_attr($k), selected($av, $k, false), esc_html($label));
            }
            echo '</select>';
            echo '<p class="description">Members always see every scene. Anything not Available shows as it is and cannot be selected. A new scene starts as Currently Unavailable until someone here says otherwise.</p>';
        }, self::CPT, 'side');
    }

    public static function save($post_id) {
        if (!isset($_POST['md_design_av_nonce']) ||
            !wp_verify_nonce($_POST['md_design_av_nonce'], 'md_design_av')) return;
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) return;
        if (!current_user_can('edit_post', $post_id)) return;
        if (!isset($_POST['md_availability'])) return;

        $av = sanitize_key($_POST['md_availability']);
        if (isset(self::availabilities()[$av])) update_post_meta($post_id, '_md_availability', $av);
    }
}

MD_Designs::init();
