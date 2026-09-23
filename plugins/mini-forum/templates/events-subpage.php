<?php
/**
 * Sub-page router. The view name is the page's own title, slugified; the
 * shorter names the site shipped with are redirected to it rather than
 * silently served, so a shared link ends up on the address people will see.
 */
if (!defined('ABSPATH')) exit;

$view = sanitize_text_field($_GET['view'] ?? '');

if ($view === 'host') {
    include MF_PATH . 'templates/events-host.php';
    return;
}

$views = Mini_Forum_Events::views();
if (!isset($views[$view])) return;

$type = $views[$view];
if ($type === 'special_day') {
    include MF_PATH . 'templates/events-special-days.php';
    return;
}

$mfe_type = $type;
include MF_PATH . 'templates/events-list.php';
