<?php
/** The stub, the plugin, and a database with enough in it to draw every screen. */
require_once __DIR__ . '/wp-stub.php';

class MF_Test_Wpdb {
    public $prefix = 'wp_';
    public $events = array(), $days = array(), $posts = array();
    public function prepare($sql, ...$a) {
        foreach ($a as $v) {
            $sql = preg_replace('/%d/', (int) $v, $sql, 1);
            $sql = preg_replace('/%s/', "'" . $v . "'", $sql, 1);
        }
        return $sql;
    }
    public function get_results($sql) {
        if (strpos($sql, 'mf_special_days') !== false) return $this->days;
        if (strpos($sql, 'mf_events') !== false) {
            preg_match("/event_type = '([a-z_]+)'/", $sql, $m);
            $past = strpos($sql, '< CURDATE') !== false;
            $out = array();
            foreach ($this->events as $e) {
                if ($m && $e->event_type !== $m[1]) continue;
                $old = strtotime($e->start_datetime) < time();
                if (strpos($sql, 'CURDATE') !== false && $old !== $past) continue;
                $out[] = $e;
            }
            return $out;
        }
        return array();
    }
    public function get_var($sql) { return 0; }
    public function get_row($sql) { return null; }
}
$wpdb = new MF_Test_Wpdb();

function mf_ev($id, $type, $title, $days, $status = 'published', $loc = 'Kadıköy Talk-Spot') {
    $o = new stdClass();
    $o->id = $id; $o->event_type = $type; $o->title = $title; $o->slug = 'e' . $id;
    $o->short_description = 'A short line about ' . $title . '.';
    $o->description = "First paragraph about $title.\n\nSecond paragraph with more detail.";
    $o->location_name = $loc; $o->city = 'İstanbul'; $o->format_type = 'In person';
    $o->start_datetime = date('Y-m-d H:i:s', strtotime("$days days"));
    $o->end_datetime   = date('Y-m-d H:i:s', strtotime("$days days +40 minutes"));
    $o->status = $status; $o->cover_image_url = ''; $o->host_user_id = 1;
    return $o;
}
function mf_sd($id, $title, $days) {
    $o = new stdClass(); $o->id = $id; $o->title = $title;
    $o->day_date = date('Y-m-d', strtotime("$days days"));
    $o->month_number = (int) date('n', strtotime("$days days"));
    $o->description = "Why $title matters.\n\nA second paragraph of the story.";
    $o->status = 'published'; return $o;
}
$wpdb->events = array(
    mf_ev(1, 'workshop', 'Reading Together: A Gentle Start', 5),
    mf_ev(2, 'workshop', 'Building Words', -20, 'completed'),
    mf_ev(3, 'meetup', 'Mini-Family Meetup', 9, 'published', 'Bostancı'),
    mf_ev(4, 'expert_session', 'Selective Mutism at School', 14, 'published', 'Online'),
    mf_ev(5, 'update', 'Our First Talk-Spot Opened', -3, 'completed'),
);
$wpdb->days = array(mf_sd(1, 'International Day of Peace', 2), mf_sd(2, 'World Childrens Day', 40));

require_once MF_PATH . 'includes/class-mini-forum-design.php';
require_once MF_PATH . 'includes/class-mini-forum-events.php';

/** Render a template the way the shortcode would. */
function mf_render($tpl, $vars = array()) {
    global $wpdb;
    extract($vars);
    ob_start();
    include MF_PATH . 'templates/' . $tpl . '.php';
    return ob_get_clean();
}

$GLOBALS['mf_fail'] = 0;
function ok($cond, $msg) {
    echo ($cond ? "  ok    " : "  FAIL  ") . $msg . "\n";
    if (!$cond) $GLOBALS['mf_fail']++;
}
function done() {
    echo $GLOBALS['mf_fail'] ? "\n{$GLOBALS['mf_fail']} problem(s)\n" : "\nno problems\n";
    exit($GLOBALS['mf_fail'] ? 1 : 0);
}
