<?php
/**
 * Just enough WordPress to render the plugin's templates and run its save path.
 *
 * It lives in the repository because it did not, once: the harnesses were in a
 * scratch directory, the container was recycled, and every check went with it.
 */

define('ABSPATH', 1);
define('MF_PATH', dirname(__DIR__) . '/plugins/mini-forum/');
define('MF_URL', 'https://mini-talks.org/wp-content/plugins/mini-forum/');
define('MF_VERSION', 'test');
define('WP_CONTENT_DIR', '/tmp');
define('MINUTE_IN_SECONDS', 60);
date_default_timezone_set('Europe/Istanbul');

$OPT = array();
function get_option($k, $d = false) { global $OPT; return isset($OPT[$k]) ? $OPT[$k] : $d; }
function update_option($k, $v) { global $OPT; $OPT[$k] = $v; return true; }
function delete_option($k) { global $OPT; unset($OPT[$k]); return true; }
function get_transient($k) { return false; }
function set_transient($k, $v, $t = 0) { return true; }
function delete_transient($k) { return true; }

function add_action() {} function is_admin() { return false; }
$GLOBALS['mf_filters'] = array();
function add_filter($tag, $fn, $p = 10, $a = 1) { $GLOBALS['mf_filters'][$tag][] = $fn; }
function remove_all_filters($tag) { $GLOBALS['mf_filters'][$tag] = array(); }
function apply_filters($tag, $value) {
    $rest = array_slice(func_get_args(), 2);
    foreach ((isset($GLOBALS['mf_filters'][$tag]) ? $GLOBALS['mf_filters'][$tag] : array()) as $fn)
        $value = call_user_func_array($fn, array_merge(array($value), $rest));
    return $value;
}

function esc_html($s) { return htmlspecialchars((string) $s, ENT_QUOTES); }
function esc_attr($s) { return htmlspecialchars((string) $s, ENT_QUOTES); }
function esc_textarea($s) { return htmlspecialchars((string) $s, ENT_QUOTES); }
function esc_js($s) { return addslashes((string) $s); }
function esc_url($s) { return (string) $s; }
function esc_url_raw($s) { return (string) $s; }
function sanitize_text_field($s) { return trim(preg_replace('/\s+/', ' ', strip_tags((string) $s))); }
function sanitize_key($s) { return preg_replace('/[^a-z0-9_\-]/', '', strtolower((string) $s)); }
function wp_strip_all_tags($s) { return strip_tags((string) $s); }
function wp_unslash($s) { return $s; }
function wp_trim_words($t, $n = 55) { $w = preg_split('/\s+/', wp_strip_all_tags($t)); return implode(' ', array_slice($w, 0, $n)); }
function wpautop($t) {
    $t = trim((string) $t); if ($t === '') return '';
    $o = '';
    foreach (preg_split('/\n\s*\n/', $t) as $p) { $p = trim($p); if ($p !== '') $o .= '<p>' . str_replace("\n", "<br />\n", $p) . "</p>\n"; }
    return $o;
}
function nl2br_wp($s) { return nl2br($s); }
function _n($s, $p, $n, $d = '') { return $n === 1 ? $s : $p; }
function __($s, $d = '') { return $s; } function esc_html__($s, $d = '') { return $s; }
function current_time($t = '') { return time(); }
function date_i18n($f, $ts = null) { return date($f, $ts === null ? time() : $ts); }
function home_url($p = '/') { return 'https://mini-talks.org' . $p; }
function admin_url($p = '') { return '/wp-admin/' . $p; }
function add_query_arg($a, $b = null, $c = null) {
    /* WordPress takes either (key, value, url) or (array, url). */
    if (is_array($a)) { $pairs = $a; $u = $b; } else { $pairs = array($a => $b); $u = $c; }
    $u = (string) $u;
    foreach ($pairs as $k => $v) $u .= (strpos($u, '?') === false ? '?' : '&') . $k . '=' . rawurlencode((string) $v);
    return $u;
}
function get_permalink($id = 0) { return 'https://mini-talks.org/mini-events/mini-calendar/'; }
function get_pages() { return array(); }
function get_post() { return null; } function has_shortcode() { return false; }
function current_user_can() { return true; }
function add_menu_page() {} function add_submenu_page() {}
function wp_verify_nonce() { return true; } function wp_nonce_field() {}
function wp_upload_dir() { return array('basedir' => '/tmp', 'baseurl' => 'https://mini-talks.org/wp-content/uploads'); }
function wp_mkdir_p($d) { return true; }
function get_stylesheet_directory() { return '/tmp/theme'; }
function mf_get_forum_url() { return 'https://mini-talks.org/mini-community/mini-forum/'; }
function mf_get_events_url() { return 'https://mini-talks.org/mini-events/mini-calendar/'; }

/* Signed in or out, for the templates that branch on it. */
$GLOBALS['mf_logged_in'] = false;
function is_user_logged_in() { return (bool) $GLOBALS['mf_logged_in']; }
function get_current_user_id() { return $GLOBALS['mf_logged_in'] ? 1 : 0; }
function wp_get_current_user() { $u = new stdClass(); $u->display_name = 'Eren'; $u->user_email = 'e@x.com'; $u->ID = 1; return $u; }

/**
 * A stand-in for kses that filters the way the real one does: an allow-list of
 * tags, an allow-list of attributes per tag, WordPress's data-* wildcard, and
 * no javascript: in a URL. A permissive stub would let the design files pass
 * tests they would fail on the site.
 */
function wp_kses_allowed_html($context = 'post') {
    $common = array('id'=>true,'class'=>true,'style'=>true,'title'=>true,'dir'=>true,'lang'=>true,'align'=>true);
    $t = array();
    foreach (array('p','div','span','strong','b','em','i','u','s','blockquote','h1','h2','h3','h4','h5','h6',
                   'ul','ol','li','figure','figcaption','table','thead','tbody','tr','pre','code','small','sub','sup') as $tag)
        $t[$tag] = $common;
    $t['br']  = array('class'=>true);
    $t['hr']  = array('class'=>true,'style'=>true);
    $t['a']   = $common + array('href'=>true,'target'=>true,'rel'=>true);
    $t['img'] = $common + array('src'=>true,'alt'=>true,'width'=>true,'height'=>true,'loading'=>true,'srcset'=>true,'sizes'=>true);
    $t['th']  = $common + array('colspan'=>true,'rowspan'=>true,'scope'=>true,'bgcolor'=>true,'width'=>true);
    $t['td']  = $t['th'];
    $t['table'] = $common + array('bgcolor'=>true,'width'=>true,'border'=>true,'cellpadding'=>true,'cellspacing'=>true);
    return $t;
}
function wp_kses($html, $allowed = null) {
    if ($allowed === null) $allowed = wp_kses_allowed_html('post');
    $html = (string) $html;
    if (trim($html) === '') return '';
    $doc = new DOMDocument();
    libxml_use_internal_errors(true);
    $doc->loadHTML('<?xml encoding="utf-8"?><body>' . $html . '</body>', LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
    libxml_clear_errors();
    $walk = function ($node) use (&$walk, $allowed) {
        foreach (iterator_to_array($node->childNodes) as $child) {
            if ($child->nodeType !== XML_ELEMENT_NODE) continue;
            $name = strtolower($child->nodeName);
            if (!isset($allowed[$name])) {
                if (in_array($name, array('script','style'), true)) { $child->parentNode->removeChild($child); }
                else {
                    while ($child->firstChild) $child->parentNode->insertBefore($child->firstChild, $child);
                    $child->parentNode->removeChild($child);
                }
                continue;
            }
            foreach (iterator_to_array($child->attributes) as $attr) {
                $an = strtolower($attr->nodeName);
                $okay = !empty($allowed[$name][$an])
                     || (!empty($allowed[$name]['data-*']) && preg_match('/^data(?:-[a-z0-9_]+)+$/', $an));
                if (!$okay) { $child->removeAttribute($attr->nodeName); continue; }
                if (in_array($an, array('href','src'), true)
                    && preg_match('#^\s*(javascript|vbscript|data)\s*:#i', $attr->nodeValue))
                    $child->removeAttribute($attr->nodeName);
            }
            $walk($child);
        }
    };
    $body = $doc->getElementsByTagName('body')->item(0);
    if (!$body) return '';
    $walk($body);
    $out = '';
    foreach ($body->childNodes as $c) $out .= $doc->saveHTML($c);
    /* libxml percent-encodes the value of a URI attribute when it serialises,
       so src="{{image}}" comes back as src="%7B%7Bimage%7D%7D". Real kses does
       no such thing, and the tokens are substituted after this runs. */
    return str_replace(array('%7B%7B', '%7D%7D'), array('{{', '}}'), $out);
}
function wp_kses_post($s) { return wp_kses($s, wp_kses_allowed_html('post')); }
