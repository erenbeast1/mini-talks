<?php
/**
 * Copy this file to  config.php  next to it, and put a long random string in.
 *
 * The same string goes in WordPress under Mini-Talks Game → Shared key. It is
 * what tells the game that a caller really is the forum, so treat it like a
 * password: never commit the filled-in copy, and change it here and in
 * WordPress together if it ever leaks.
 *
 * Generate one with:   php -r "echo bin2hex(random_bytes(32)), PHP_EOL;"
 */

define('MF_FORUM_LINK_KEY', 'change-me');

/** How long a link e-mail stays usable, in minutes. */
define('MF_LINK_TTL', 60);
