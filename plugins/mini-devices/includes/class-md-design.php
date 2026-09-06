<?php
/**
 * Mini-Kits on the Design page.
 *
 * Mini-Forum owns one Design screen for the whole site; this adds the Mini-Kits
 * copy to it rather than opening a second one. Everything here works the same
 * way: defaults live in the code, an admin's version lives in the options
 * table, and a plugin update never touches theirs.
 *
 * Two halves, because Mini-Kits is drawn in two places:
 *
 *   PHP   the shelf's own heading, the kit names and taglines, the sentence
 *         each request status carries.
 *   JS    the screens inside a kit popup. Those strings are localised into
 *         MD.text, and the script reads them with a fallback, so the plugin
 *         still works if Mini-Forum is missing or older.
 *
 * With Mini-Forum absent every t() falls back to the default and nothing is
 * editable — no fatals, no blank screens.
 */

if (!defined('ABSPATH')) exit;

class MD_Design {

    public static function init() {
        add_filter('mf_design_blocks', array(__CLASS__, 'register'));
        add_filter('mf_design_css_areas_list', array(__CLASS__, 'css_area'));
        add_filter('mf_design_css_areas', array(__CLASS__, 'css_active'), 10, 2);
    }

    /** Is the Design page available at all? */
    public static function available() {
        return function_exists('mf_block_get');
    }

    /**
     * One string: the admin's version if there is one, else the default.
     *
     * An id Mini-Forum does not know — an older Mini-Forum, or a string added
     * here since — falls back rather than rendering blank.
     */
    public static function t($id, $default) {
        if (!self::available()) return $default;
        if (function_exists('mf_block_exists') && !mf_block_exists($id)) return $default;
        return mf_block_get($id);
    }

    /* ── what appears on the Design page ── */

    public static function register($groups) {
        $groups['minikits'] = array('label' => 'Mini-Kits', 'blocks' => array(

            'kits.shelf.title' => array('Section heading', 'text', 'Mini-Kits'),
            'kits.shelf.sub'   => array('Section paragraph', 'html',
                'Choose a Mini-Kit to see what you can do with it. Request one, personalize yours, and follow where it is.'),
            'kits.privacy'     => array('Privacy line under the shelf', 'html',
                'Audio recordings stay on the kit — they are never uploaded to the site. Only recording counts and durations are saved to your profile.'),

            'kits.mini-designs.name'    => array('Mini-Designs — name', 'text', 'Mini-Designs'),
            'kits.mini-designs.tagline' => array('Mini-Designs — tagline', 'text', 'Buildable scenes for Mini-Talks.'),
            'kits.design-talks.name'    => array('Design-Talks — name', 'text', 'Design-Talks'),
            'kits.design-talks.tagline' => array('Design-Talks — tagline', 'text', 'Turn Mini-Designs into interactive communication experiences.'),
            'kits.brick-talks.name'     => array('Brick-Talks — name', 'text', 'Brick-Talks'),
            'kits.brick-talks.tagline'  => array('Brick-Talks — tagline', 'text', 'Bring personalized characters to life through voice and animation.'),
            'kits.fig-talks.name'       => array('Fig-Talks — name', 'text', 'Fig-Talks'),
            'kits.fig-talks.tagline'    => array('Fig-Talks — tagline', 'text', 'A personalized figure designed to represent the child.'),
        ));

        $groups['minikits_status'] = array('label' => 'Mini-Kits — what a member is told', 'blocks' => array(
            'kits.status.draft'     => array('Draft', 'text', 'Your design is still being personalized.'),
            'kits.status.submitted' => array('Submitted', 'text', 'Your request has been shared with the Mini-Talks team.'),
            'kits.status.contacted' => array('Contacted', 'text', 'Our team has contacted you about the next steps.'),
            'kits.status.preparing' => array('Preparing', 'text', 'Your Mini-Kit is being prepared.'),
            'kits.status.ready'     => array('Ready to Connect', 'text', 'Your Mini-Kit is ready — connect it to your profile.'),
            'kits.status.connected' => array('Connected', 'text', 'This Mini-Kit is now connected to your profile.'),
        ));

        $groups['minikits_screens'] = array('label' => 'Mini-Kits — inside a kit', 'blocks' => array(
            'kits.explore.title'  => array('Explore — heading', 'text', 'Explore Mini-Designs'),
            'kits.explore.intro'  => array('Explore — paragraph', 'text',
                'Every scene is on show. Pick the ones you would like built — anything that cannot be built right now says so, and can be picked another time.'),
            'kits.request.intro.catalogue' => array('Request — Mini-Designs paragraph', 'text',
                'These are the scenes you picked. Add anything the team should know, then send your request — they will get in touch about the next steps.'),
            'kits.request.intro.personalize' => array('Request — Fig-Talks paragraph', 'text',
                'Personalize your figure to create a Fig-Talks character that feels familiar and uniquely yours. Your Fig-Talks is made with the character you design here, so this comes first.'),
            'kits.request.intro.plain' => array('Request — Design/Brick-Talks paragraph', 'text',
                'Every Mini-Kit is made to order, so tell the team you would like one and they will get in touch.'),
            'kits.connect.intro'  => array('Connect — paragraph', 'text',
                'Plug the kit into this computer with its USB cable, then press Connect. Your browser will ask which device to use — pick the kit, and it links itself to your profile.'),
            'kits.slots.intro'    => array('Figs & Slots — paragraph', 'text',
                'Each slot holds one Fig and one recording. Figs are kept on your profile, so you can keep working on them while the kit is unplugged, and send them over when you plug it in.'),
            'kits.note.label'     => array('Note field — label', 'text', 'Add a note'),
            'kits.note.placeholder' => array('Note field — placeholder', 'text', 'Anything you’d like us to know?'),
        ));

        return $groups;
    }

    public static function css_area($areas) {
        $areas['minikits'] = array('Mini-Kits', 'The Mini-Kits shelf and the kit popups, wherever they appear.');
        return $areas;
    }

    /** Mini-Kits lives inside the profile, and on any page carrying a preview. */
    public static function css_active($areas, $post) {
        if (in_array('profile', $areas, true)) { $areas[] = 'minikits'; return $areas; }
        if ($post && (has_shortcode($post->post_content, 'mini_kits_demo')
                   || has_shortcode($post->post_content, 'fig_designer_demo')
                   || has_shortcode($post->post_content, 'connected_devices'))) {
            $areas[] = 'minikits';
        }
        return $areas;
    }

    /** The strings the front-end script needs, resolved server-side. */
    public static function js_text() {
        $out = array();
        foreach (self::register(array()) as $group) {
            foreach ($group['blocks'] as $id => $def) {
                if (strpos($id, 'kits.') !== 0) continue;
                $out[substr($id, 5)] = self::t($id, $def[2]);
            }
        }
        return $out;
    }
}

MD_Design::init();
