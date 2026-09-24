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

    /* The two icons the filter buttons wear, straight from the designs: a pin
       for somewhere you go, a screen for somewhere you join. */
    const PIN_ICON    = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 22s7-8 7-14a7 7 0 0 0-14 0c0 6 7 14 7 14z"/><circle cx="12" cy="8" r="2"/></svg>';
    const SCREEN_ICON = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M12 17v4M8 21h8"/></svg>';

    /**
     * The five categories, as the design names them.
     *
     * 'kind' is what the calendar script keys its palette by; it is not the
     * database's event_type, which is the array key. Both are kept because the
     * design was drawn against one and the tables were written against the
     * other, and renaming either would break something that already works.
     *
     * 'colour' and 'pale' are here to be read, not printed: an inline custom
     * property does not survive wp_kses, so the colours reach the page through
     * the .me-kind-* classes in mini-events.css. They are written down twice on
     * purpose — a category's colour should be legible from the category table.
     *
     * 'note' says whether the page carries the programme note. Three of the
     * five designs have one and two do not, and a note drawn where the design
     * has none arrives in the wrong colour, because it is the one piece with
     * nothing on the page to take its colour from.
     *
     * There is no picture here. Every picture on these screens is a design
     * area — mc.head.<name>.image for a page's own heading, mc.section.<name>
     * .image for the small one on the hub — so it can be changed from the
     * panel rather than from this file.
     *
     * 'page_class' is the category's own page class. The designs give three of
     * the five pages the same one, which in a single stylesheet means the last
     * page read repaints the other two; each gets its own here.
     */
    public static function categories() {
        return apply_filters('mf_events_categories', array(
            'workshop' => array(
                'kind'   => 'workshop',
                'view'   => 'mini-volunteer-workshops',
                'title'  => 'Mini-Volunteer Workshops',
                'page_class' => 'me-workshop-page',
                'filter' => 'place', 'all_label' => 'All Locations', 'note' => true,
                'colour' => '#E52828', 'pale' => '#FFF4F4',
                'see_all' => 'See All Workshops',
            ),
            'meetup' => array(
                'kind'   => 'family',
                'view'   => 'mini-family-meetups',
                'title'  => 'Mini-Family Meetups',
                'page_class' => 'me-meetup-page',
                'filter' => 'place', 'all_label' => 'All Locations', 'note' => true,
                'colour' => '#FFCC00', 'pale' => '#FFFAE7',
                'see_all' => 'See All Meetups',
            ),
            'expert_session' => array(
                'kind'   => 'expert',
                'view'   => 'mini-expert-sessions',
                'title'  => 'Mini-Expert Sessions',
                'page_class' => 'me-session-page',
                'filter' => 'place', 'all_label' => 'All Sessions', 'note' => true,
                'colour' => '#0055BF', 'pale' => '#F1F7FF',
                'see_all' => 'See All Sessions',
            ),
            'update' => array(
                'kind'   => 'updates',
                'view'   => 'mini-community-updates',
                'title'  => 'Mini-Community Updates',
                'page_class' => 'me-updates-page',
                'filter' => 'sort', 'all_label' => 'From Latest', 'note' => false,
                'colour' => '#237841', 'pale' => '#F6FCF8',
                'see_all' => 'See All Updates',
            ),
        ));
    }

    /** Special days are their own thing: a date and a story, never a booking. */
    public static function special_day() {
        return apply_filters('mf_events_special_day', array(
            'kind'   => 'special',
            'view'   => 'mini-special-days',
            'title'  => 'Mini-Special Days',
            'page_class' => 'me-special-page',
            'filter' => 'month', 'all_label' => 'All 12 Months', 'note' => false,
            'colour' => '#FF7417', 'pale' => '#FFF5ED',
            'see_all' => 'See All Special Days',
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

        /* The column holds both kinds of description. Someone typing into the
           admin form leaves plain text with blank lines between paragraphs;
           someone pasting from an editor leaves HTML. Escaping the second kind
           printed the tags on the page, which is what people were reading. */
        $out = self::is_html($raw)
            ? self::rich($raw)
            : self::plain($raw);

        return apply_filters('mf_events_details', $out, $raw, $ev);
    }

    /** Plain text: a blank line starts a paragraph, a single newline breaks. */
    private static function plain($raw) {
        $out = '';
        foreach (preg_split('/\n\s*\n|\r\n\r\n/', $raw) as $para) {
            $para = trim($para);
            if ($para !== '') $out .= '<p>' . nl2br(esc_html($para)) . '</p>';
        }
        return $out;
    }

    /**
     * HTML from an editor, cleaned up.
     *
     * wp_kses_post is what WordPress trusts for post content, so scripts and
     * event handlers go. What it keeps and we do not want is the styling the
     * editor left behind — a font size, black on white, a justification — which
     * would fight the popup it lands in. The popup has its own typography, and
     * on this site the design wins, so those attributes are dropped with it.
     */
    private static function rich($html) {
        $allowed = wp_kses_allowed_html('post');
        foreach ($allowed as $tag => $attrs) {
            unset($allowed[$tag]['style'], $allowed[$tag]['align'], $allowed[$tag]['bgcolor']);
        }
        $out = trim(wp_kses($html, $allowed));

        /* A paste is often one long run of text with no block around it. */
        if ($out !== '' && !preg_match('/^\s*<(p|div|ul|ol|h[1-6]|blockquote|figure|table)\b/i', $out)) {
            $out = wpautop($out);
        }
        return $out;
    }

    /** Is there a tag in here, or only the text someone typed? */
    private static function is_html($raw) {
        return (bool) preg_match('/<(p|br|div|ul|ol|li|h[1-6]|strong|b|em|i|a|span|blockquote|figure|img|table)\b[^>]*>/i', $raw);
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

    /**
     * The place buttons. A place with no events is not offered, and each one
     * wears a colour: the page's own for "all", then the design's cycle. Online
     * is always the dark one with the screen icon, the way the designs draw it.
     */
    public static function place_options($rows, $cat = array()) {
        $seen = array();
        foreach ((array) $rows as $ev) {
            foreach (array('city', 'location_name', 'format_type') as $k) {
                if (!empty($ev->$k)) { $seen[$ev->$k] = $ev->$k; break; }
            }
        }
        asort($seen);

        $all = isset($cat['all_label']) ? $cat['all_label'] : 'All Locations';
        $out = mf_block_get('mc.filters.place', array(
            'value' => 'all', 'on' => 'true', 'tone' => 'mw-tone-blue',
            'icon' => self::PIN_ICON, 'label' => esc_html($all),
        ));

        $cycle = array('mw-tone-yellow', 'mw-tone-red', 'mw-tone-green', 'mw-tone-ink');
        $i = 0;
        foreach ($seen as $value) {
            $online = in_array(strtolower($value), array('online', 'virtual', 'remote'), true);
            $out .= mf_block_get('mc.filters.place', array(
                'value' => esc_attr($value),
                'on'    => 'false',
                'tone'  => $online ? 'mw-tone-ink' : $cycle[$i++ % count($cycle)],
                'icon'  => $online ? self::SCREEN_ICON : self::PIN_ICON,
                'label' => esc_html($value),
            ));
        }
        return $out;
    }

    /**
     * Mini-Community Updates has no places to filter by, so the design gives it
     * an order instead: newest first in the category's own green, oldest in the
     * dark. The script reads data-sort, the same way it reads data-location.
     */
    public static function sort_options($cat = array()) {
        $newest = isset($cat['all_label']) ? $cat['all_label'] : 'From Latest';
        return mf_block_get('mc.filters.sort', array(
                   'value' => 'newest', 'on' => 'true',
                   'tone' => 'mw-tone-green', 'label' => esc_html($newest),
               ))
             . mf_block_get('mc.filters.sort', array(
                   'value' => 'oldest', 'on' => 'false',
                   'tone' => 'mw-tone-ink', 'label' => 'From Oldest',
               ));
    }

    /**
     * The brick beside each point of "What happens here".
     *
     * The designs run the same eight down every page: yellow, blue, red, green
     * across the first row, then blue, yellow, green, red across the second —
     * the pairs swapped, so the two rows do not read as one repeat. It is not a
     * cycle, which is what it had been drawn as, and a cycle put a different
     * brick against every point.
     *
     * The colours themselves are mc.bullet.1 to .4 and can be changed; this is
     * the order they are used in.
     */
    public static function bullet($i) {
        $order = apply_filters('mf_events_bullet_order', array(1, 2, 3, 4, 2, 1, 4, 3));
        $n = $order[($i - 1) % count($order)];
        return Mini_Forum_Design::get('mc.bullet.' . $n);
    }

    /**
     * The picture at the top of a page, as its own editable block.
     *
     * Mini-Expert Sessions uses the cropping one: the design's picture has a
     * lot of room around the art, and the crop is CSS rather than the design's
     * own <svg><image href>, which the design layer will not carry. Swap that
     * block for the plain one if the picture is ever replaced with a tight crop.
     */
    public static function head_art($kind) {
        $block = $kind === 'expert' ? 'mc.head.art.crop' : 'mc.head.art';
        return mf_block_get($block, array(
            'image' => esc_url(Mini_Forum_Design::get('mc.head.' . $kind . '.image')),
            /* The heading breaks over two lines; a screen reader should hear
               the words apart, not "Mini-VolunteerWorkshops". */
            'alt'   => esc_attr(trim(preg_replace('/\s+/', ' ',
                           wp_strip_all_tags(str_replace(array('<br>', '<br/>', '<br />'), ' ',
                               Mini_Forum_Design::get('mc.head.' . $kind . '.title')))))),
        ));
    }

    /** The whole heading: picture, title and paragraph, all three editable. */
    public static function head($kind) {
        return mf_block_get('mc.list.head', array(
            'art'         => self::head_art($kind),
            'title'       => Mini_Forum_Design::render('mc.head.' . $kind . '.title'),
            'description' => esc_html(Mini_Forum_Design::get('mc.desc.' . $kind)),
        ));
    }

    /** Whichever of the two a category asks for. */
    public static function filter_buttons($rows, $cat) {
        $which = isset($cat['filter']) ? $cat['filter'] : 'place';
        return $which === 'sort' ? self::sort_options($cat) : self::place_options($rows, $cat);
    }

    /**
     * Mini-Special Days is filtered by month alone — there is nowhere to go and
     * nothing to book, only twelve months to read through.
     */
    public static function special_filters($months, $cat) {
        return mf_block_get('mc.filters.special', array(
            'months'    => $months,
            'all_label' => esc_html(isset($cat['all_label']) ? $cat['all_label'] : 'All 12 Months'),
        ));
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
