<?php
/**
 * Mini-Calendar & Mini-Events — the pieces every events screen shares.
 *
 * One card, one status, one table of categories. The calendar draws four of
 * them and each list page draws one, so the card lives here rather than being
 * copied into five templates that would then drift apart.
 *
 * The category table is also the URL table: the sub-page a category links to,
 * the colour it wears, and the data-kind the calendar script groups by are all
 * one row, so a category cannot end up a different colour on two screens.
 */

if (!defined('ABSPATH')) exit;

class Mini_Forum_Events {

    /**
     * The five categories, as the design names them.
     *
     * 'kind' is what the calendar script keys its palette by; it is not the
     * database's event_type, which is the array key. Both are kept because the
     * design was drawn against one and the tables were written against the
     * other, and renaming either would break something that already works.
     */
    public static function categories() {
        return apply_filters('mf_events_categories', array(
            'workshop' => array(
                'kind'   => 'workshop',
                'view'   => 'mini-volunteer-workshops',
                'title'  => 'Mini-Volunteer Workshops',
                'colour' => '#E52828', 'pale' => '#FFF4F4',
                'see_all' => 'See All Workshops',
                'icon'   => 'https://mini-talks.org/wp-content/uploads/2026/03/36_mini_workshop_3D.png',
            ),
            'meetup' => array(
                'kind'   => 'family',
                'view'   => 'mini-family-meetups',
                'title'  => 'Mini-Family Meetups',
                'colour' => '#FFCC00', 'pale' => '#FFFBEB',
                'see_all' => 'See All Meetups',
                'icon'   => 'https://mini-talks.org/wp-content/uploads/2026/03/17_mini_families_3D.png',
            ),
            'expert_session' => array(
                'kind'   => 'expert',
                'view'   => 'mini-expert-sessions',
                'title'  => 'Mini-Expert Sessions',
                'colour' => '#0055BF', 'pale' => '#F1F7FF',
                'see_all' => 'See All Sessions',
                'icon'   => 'https://mini-talks.org/wp-content/uploads/2026/03/20_mini_experts_3D.png',
            ),
            'update' => array(
                'kind'   => 'updates',
                'view'   => 'mini-community-updates',
                'title'  => 'Mini-Community Updates',
                'colour' => '#237841', 'pale' => '#F1F9F4',
                'see_all' => 'See All Updates',
                'icon'   => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png',
            ),
        ));
    }

    /** Special days are their own thing: a date and a story, never a booking. */
    public static function special_day() {
        return apply_filters('mf_events_special_day', array(
            'kind'   => 'special',
            'view'   => 'mini-special-days',
            'title'  => 'Mini-Special Days',
            'colour' => '#FF7417', 'pale' => '#FFF5EC',
            'see_all' => 'See All Special Days',
            'icon'   => 'https://mini-talks.org/wp-content/uploads/2026/04/minitalks-logo-2.png',
        ));
    }

    public static function category($event_type) {
        $all = self::categories();
        return isset($all[$event_type]) ? $all[$event_type] : null;
    }

    /**
     * Sub-page slugs.
     *
     * The page's own title, slugified, because that is what somebody reads in
     * the address bar and what they would guess. The shorter names the site
     * shipped with keep working: a link somebody already shared, or a bookmark,
     * is not something to break over a rename.
     */
    public static function views() {
        $out = array();
        foreach (self::categories() as $type => $c) $out[$c['view']] = $type;
        $out[self::special_day()['view']] = 'special_day';
        return $out;
    }

    public static function aliases() {
        return array(
            'workshops'    => 'mini-volunteer-workshops',
            'meetups'      => 'mini-family-meetups',
            'experts'      => 'mini-expert-sessions',
            'updates'      => 'mini-community-updates',
            'special-days' => 'mini-special-days',
        );
    }

    /** The sub-page URL for a category. */
    public static function url($view) {
        $base = function_exists('mf_get_events_url') ? mf_get_events_url() : home_url('/');
        return add_query_arg('view', $view, $base);
    }

    /**
     * What the card's status pill says.
     *
     * 'Completed' is load-bearing: the filter script moves a card into the past
     * grid by reading exactly that word, so it is produced here and nowhere
     * else.
     */
    public static function status($ev) {
        if ($ev->status === 'cancelled') return 'Cancelled';
        if ($ev->status === 'completed') return 'Completed';
        return strtotime($ev->start_datetime) < current_time('timestamp') ? 'Completed' : 'Planned';
    }

    /** "11:00–11:40 · Online", the line under a card's title. */
    public static function meta($ev) {
        $bits = array();
        $start = strtotime($ev->start_datetime);
        $time  = date_i18n('H:i', $start);
        if (!empty($ev->end_datetime)) $time .= '–' . date_i18n('H:i', strtotime($ev->end_datetime));
        $bits[] = $time;
        foreach (array('location_name', 'city', 'format_type') as $k) {
            if (!empty($ev->$k)) { $bits[] = $ev->$k; break; }
        }
        return implode(' · ', $bits);
    }

    /**
     * The long copy inside the popup.
     *
     * Paragraph per line, because the popup clones these children one by one;
     * a single block of text would arrive as one unbroken wall.
     */
    public static function details($ev) {
        // Also called with a special-day row, which has no short_description.
        $raw = isset($ev->description) ? trim((string) $ev->description) : '';
        if ($raw === '' && isset($ev->short_description)) $raw = trim((string) $ev->short_description);
        if ($raw === '') return '';
        $out = '';
        foreach (preg_split('/\n\s*\n|\r\n\r\n/', $raw) as $para) {
            $para = trim($para);
            if ($para !== '') $out .= '<p>' . nl2br(esc_html($para)) . '</p>';
        }
        return $out;
    }

    /** One event card, in the design's own markup. */
    public static function card($ev) {
        $start = strtotime($ev->start_datetime);
        return mf_block_get('mc.card', array(
            'image'       => !empty($ev->cover_image_url) ? esc_url($ev->cover_image_url) : '',
            'subtitle'    => !empty($ev->short_description) ? esc_attr($ev->short_description) : '',
            'mon'         => esc_html(strtoupper(date_i18n('M', $start))),
            'day'         => esc_html(date_i18n('d', $start)),
            'year'        => esc_html(date_i18n('Y', $start)),
            'title'       => esc_html($ev->title),
            'meta'        => esc_html(self::meta($ev)),
            'description' => esc_html(wp_trim_words((string) (!empty($ev->short_description) ? $ev->short_description : $ev->description), 26)),
            'details'     => self::details($ev),
            'status'      => esc_html(self::status($ev)),
        ));
    }

    public static function cards($rows) {
        $out = '';
        foreach ((array) $rows as $ev) $out .= self::card($ev);
        return $out;
    }

    /** Published events of one type, soonest first, upcoming before past. */
    public static function by_type($event_type, $upcoming = 40, $past = 40) {
        global $wpdb;
        $t = $wpdb->prefix . 'mf_events';
        $up = $wpdb->get_results($wpdb->prepare("
            SELECT * FROM $t
            WHERE event_type = %s AND status IN ('published','completed')
              AND DATE(start_datetime) >= CURDATE()
            ORDER BY start_datetime ASC LIMIT %d
        ", $event_type, $upcoming));
        $old = $wpdb->get_results($wpdb->prepare("
            SELECT * FROM $t
            WHERE event_type = %s AND status IN ('published','completed')
              AND DATE(start_datetime) < CURDATE()
            ORDER BY start_datetime DESC LIMIT %d
        ", $event_type, $past));
        return array('upcoming' => $up, 'past' => $old);
    }

    /**
     * The months the filter offers — only months that have something in them,
     * so the dropdown never sends somebody to an empty screen.
     */
    public static function month_options($rows) {
        $seen = array();
        foreach ((array) $rows as $ev) {
            $ts = strtotime($ev->start_datetime);
            $seen[date('Y-m', $ts)] = date_i18n('F Y', $ts);
        }
        ksort($seen);
        $out = mf_block_get('mc.filters.month', array('value' => 'all', 'on' => 'true', 'label' => 'All months'));
        foreach ($seen as $value => $label) {
            $out .= mf_block_get('mc.filters.month', array(
                'value' => esc_attr($value), 'on' => 'false', 'label' => esc_html($label),
            ));
        }
        return $out;
    }

    /** The same, for places. A place with no events is not offered either. */
    public static function place_options($rows) {
        $seen = array();
        foreach ((array) $rows as $ev) {
            foreach (array('city', 'location_name', 'format_type') as $k) {
                if (!empty($ev->$k)) { $seen[$ev->$k] = $ev->$k; break; }
            }
        }
        asort($seen);
        $out = mf_block_get('mc.filters.place', array('value' => 'all', 'on' => 'true', 'label' => 'All places'));
        foreach ($seen as $value) {
            $out .= mf_block_get('mc.filters.place', array(
                'value' => esc_attr($value), 'on' => 'false', 'label' => esc_html($value),
            ));
        }
        return $out;
    }

    /** The two popups, once per page. */
    public static function dialogs($special = false) {
        $out = mf_block_get('mc.popup.event', array('note' => ''));
        if ($special) $out .= mf_block_get('mc.popup.special');
        return $out;
    }

    /** The closing call to action, shared by every events screen. */
    public static function join_block($eyebrow = 'Mini-Calendar') {
        $first = self::categories();
        $first = reset($first);
        return mf_block_get('mc.join', array(
            'eyebrow'  => esc_html($eyebrow),
            'join_url' => esc_url(self::url($first['view'])),
            'host_url' => esc_url(self::url('host')),
        ));
    }
}
