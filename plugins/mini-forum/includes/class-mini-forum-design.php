<?php
/**
 * Design — the site's own words and styling, editable from wp-admin.
 *
 * Three things, in order of how far they go:
 *
 *   1. Blocks   Every fixed piece of copy on a screen — headings, intros,
 *               empty states, button labels — is a named block. The manifest
 *               below holds the default; an admin may replace it with their own
 *               HTML. Templates print them with mf_block('id').
 *
 *   2. CSS      A stylesheet per area, written in wp-admin and printed after
 *               the plugin's own, so anything can be restyled without touching
 *               a file.
 *
 *   3. Templates  mf_template() looks in the active theme first, so a whole
 *               screen can be replaced by dropping mini-forum/<name>.php into
 *               the theme, with every variable the plugin prepared still in
 *               scope.
 *
 * What this deliberately does NOT do is store PHP and run it. A textarea whose
 * contents get eval'd turns every admin account into a way to run code on the
 * server, and it breaks on the next plugin update. Layout and copy live here;
 * logic stays in files, where a theme can override it properly.
 */

if (!defined('ABSPATH')) exit;

class Mini_Forum_Design {

    const OPT_BLOCKS = 'mf_design_blocks';
    const OPT_CSS    = 'mf_design_css';

    /** Where the custom stylesheets apply. */
    public static function css_areas() {
        return array(
            'global'  => array('Global', 'Every Mini-Forum screen, plus the popups.'),
            'forum'   => array('Forum', 'The forum home, a post, the create form.'),
            'events'  => array('Events', 'The events hub and its sub-pages.'),
            'profile' => array('Profile', 'The member profile, including the Mini-Kits panel.'),
            'join'    => array('Join Us', 'The membership form.'),
        );
    }

    /**
     * Every editable block, grouped by the screen it belongs to.
     *
     * 'html' blocks may carry markup; 'text' blocks are printed escaped, for
     * places where markup would break the layout (a button's label, a heading
     * that is already inside its own tag).
     */
    public static function manifest() {
        // Filterable so another plugin can add its own screens: Mini-Devices'
        // Mini-Kits panel belongs on this page too, not on a second one.
        return apply_filters('mf_design_blocks', array(

            'forum' => array('label' => 'Forum — signed out', 'blocks' => array(
                'forum.guest.hero.title'  => array('Hero heading', 'text', 'Forum'),
                'forum.guest.hero.desc'   => array('Hero paragraphs', 'html', '<p class="mf-hero-desc">A safe space where Mini-Community members can share their experiences and feel that they are not alone.</p>'),
                'forum.guest.title'       => array('Access heading', 'text', 'Forum Access'),
                'forum.guest.sub'         => array('Access paragraph', 'html', 'Forum is part of Mini-Community. To access the Forum, you must first be an approved Mini-Community member.'),
                'forum.guest.join.title'  => array('Join card — heading', 'html', 'Not a Mini-Community<br>Member Yet'),
                'forum.guest.join.body'   => array('Join card — paragraph', 'html', 'To access the Forum, you first need to join Mini-Community.'),
                'forum.guest.join.cta'    => array('Join card — button', 'text', 'Join Us'),
                'forum.guest.member.title'=> array('Sign-in card — heading', 'html', "I'm a Mini-Community<br>Member"),
                'forum.guest.member.body' => array('Sign-in card — paragraph', 'html', 'You can sign in with your email address and password.'),
                'forum.guest.member.cta'  => array('Sign-in card — button', 'text', 'Sign In'),
            )),

            'forum_in' => array('label' => 'Forum — signed in', 'blocks' => array(
                'forum.hero.title'      => array('Hero heading', 'text', 'Mini-Forum'),
                'forum.hero.desc'       => array('Hero paragraphs', 'html', '<p class="mf-hero-desc">Share. Connect. Support.</p><p class="mf-hero-desc">A safe space for families, experts, and volunteers.</p>'),
            )),

            'profile' => array('label' => 'Profile', 'blocks' => array(
                'profile.community'     => array('Line under the name', 'html', 'Part of the Mini-Talks community'),
                'profile.posts.title'   => array('Posts heading', 'text', 'My Posts'),
                'profile.posts.empty'   => array('Posts empty state', 'html', 'No posts yet.'),
                'profile.kits.title'    => array('Mini-Kits heading', 'text', 'Mini-Kits'),
                'profile.kits.empty'    => array('Mini-Kits empty state', 'html', 'Your Mini-Talks kits will appear here once the Mini-Devices plugin is active.'),
                'profile.studio.title'  => array('App &amp; Studio heading', 'text', 'App & Studio'),
                'profile.studio.empty'  => array('App &amp; Studio empty state', 'html', 'Coming soon.'),
            )),

            'events' => array('label' => 'Events', 'blocks' => array(
                'events.hero.title'     => array('Hero heading', 'text', 'Mini-Events'),
                'events.hero.desc'      => array('Hero paragraphs', 'html', '<p class="mf-hero-desc">Real-world meetups where the Mini-Talks experience comes to life.</p>'),
                'events.soon.title'     => array('Empty sub-page heading', 'text', 'Coming soon'),
                'events.soon.body'      => array('Empty sub-page paragraph', 'html', 'This page is being prepared. In the meantime, explore the Mini-Events hub.'),
                'events.soon.cta'       => array('Empty sub-page button', 'text', 'Back to Mini-Events'),
            )),

            'host' => array('label' => 'Host an Event', 'blocks' => array(
                'host.hero.title'       => array('Hero heading', 'text', 'Host an Event'),
                'host.hero.desc'        => array('Hero paragraphs', 'html', '<p class="mf-hero-desc">Want to organize a workshop, meetup or expert session?</p><p class="mf-hero-desc">Tell us a little — admin will review and get back to you.</p>'),
                'host.form.title'       => array('Form heading', 'text', 'Host a Mini-Event'),
            )),

            'join' => array('label' => 'Join Us', 'blocks' => array(
                'join.title'            => array('Page heading', 'text', 'Join Us!'),
                'join.area.title'       => array('Area step heading', 'html', 'Choose Your Area <span>(Select one)</span>'),
                'join.consent.title'    => array('Consent heading', 'html', 'Acknowledgment &amp; Consent'),
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

    public static function render($id) {
        $def = self::definition($id);
        if (!$def) return '';
        $val = self::get($id);
        return $def[1] === 'text' ? esc_html($val) : wp_kses_post($val);
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
        if ($out === '') return;
        // Stored already stripped; stripped again here so an old value saved
        // before that rule cannot escape the element either.
        echo "<style id=\"mf-design-css\">" . str_replace(array('<', '>'), '', $out) . "</style>\n";
    }

    /* ── admin ── */

    public static function menu() {
        add_submenu_page('mfe-dashboard', 'Design', 'Design', 'manage_options',
                         'mf-design', array(__CLASS__, 'page'));
    }

    public static function page() {
        if (!current_user_can('manage_options')) return;

        $tab = isset($_GET['tab']) && $_GET['tab'] === 'css' ? 'css' : 'blocks';
        if (!empty($_POST['mf_design_nonce']) && wp_verify_nonce($_POST['mf_design_nonce'], 'mf_design')) {
            $tab === 'css' ? self::save_css() : self::save_blocks();
            echo '<div class="notice notice-success is-dismissible"><p>Saved.</p></div>';
        }

        $base = admin_url('admin.php?page=mf-design');
        ?>
        <div class="wrap">
          <h1>Design</h1>
          <h2 class="nav-tab-wrapper">
            <a class="nav-tab <?php echo $tab === 'blocks' ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url($base); ?>">Text &amp; HTML</a>
            <a class="nav-tab <?php echo $tab === 'css' ? 'nav-tab-active' : ''; ?>" href="<?php echo esc_url($base . '&tab=css'); ?>">Custom CSS</a>
          </h2>
          <form method="post">
            <?php wp_nonce_field('mf_design', 'mf_design_nonce'); ?>
            <?php $tab === 'css' ? self::form_css() : self::form_blocks(); ?>
            <?php submit_button('Save changes'); ?>
          </form>
        </div>
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
                <tr>
                  <th scope="row">
                    <label for="<?php echo esc_attr($id); ?>"><?php echo wp_kses_post($def[0]); ?></label><br>
                    <code style="font-size:11px;color:#777"><?php echo esc_html($id); ?></code>
                    <span style="display:block;font-size:11px;color:#777"><?php echo $def[1] === 'html' ? 'HTML' : 'Plain text'; ?></span>
                  </th>
                  <td>
                    <textarea id="<?php echo esc_attr($id); ?>" name="blocks[<?php echo esc_attr($id); ?>]"
                              rows="<?php echo strlen($val) > 90 ? 3 : 2; ?>" class="large-text code"><?php echo esc_textarea($val); ?></textarea>
                    <p class="description" style="margin-top:4px">
                      <label><input type="checkbox" name="reset[<?php echo esc_attr($id); ?>]" value="1"> Reset to default</label>
                      <?php if ($over): ?>
                        <span style="color:#B26B00;font-weight:600;margin-left:10px">Customised</span>
                      <?php endif; ?>
                      <span style="color:#999;margin-left:10px">Default: <?php echo esc_html(wp_html_excerpt($def[2], 70, '…')); ?></span>
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

        foreach (self::manifest() as $group) {
            foreach ($group['blocks'] as $id => $def) {
                if (!empty($reset[$id])) { unset($out[$id]); continue; }
                if (!isset($in[$id])) continue;

                $val = $def[1] === 'text' ? sanitize_text_field($in[$id]) : wp_kses_post($in[$id]);
                // Matching the default is not a customisation; storing it would
                // freeze this copy against every future plugin update.
                if ($val === $def[2]) unset($out[$id]); else $out[$id] = $val;
            }
        }
        update_option(self::OPT_BLOCKS, $out);
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

/** Print an editable block. */
function mf_block($id) {
    echo Mini_Forum_Design::render($id);
}

/** The same block as a string, for attributes and concatenation. */
function mf_block_get($id) {
    return Mini_Forum_Design::get($id);
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
    $name  = preg_replace('/[^a-z0-9\-]/', '', $name);
    $theme = locate_template('mini-forum/' . $name . '.php');
    $path  = $theme ? $theme : MF_PATH . 'templates/' . $name . '.php';
    return apply_filters('mf_template', $path, $name);
}
