<?php
/**
 * The four Mini-Kits, in one place.
 *
 * The profile is organised by kit, not by action: Mini-Kits → pick a kit → that
 * kit's own screen, showing whatever its current state allows. Each kit shares
 * one request lifecycle; what differs is the step before the request.
 *
 *   Mini-Designs   choose scenes from the catalogue
 *   Design-Talks   nothing
 *   Brick-Talks    nothing
 *   Fig-Talks      personalise a figure (face, hairstyle, hair colour)
 */

if (!defined('ABSPATH')) exit;

class MD_Kits {

    /**
     * pre_request — what happens before a request can be sent:
     *   'catalogue'  pick from Mini-Designs
     *   'personalize' design a figure
     *   ''           straight to the request
     *
     * device — the serial device code this kit maps to, if it has one.
     */
    public static function all() {
        return apply_filters('md_kits', array(
            'mini-designs' => array(
                'name'        => 'Mini-Designs',
                'tagline'     => 'Buildable scenes for Mini-Talks.',
                'colour'      => 'green',
                'pre_request' => 'catalogue',
                'device'      => '',
                'cta'         => 'Choose your Mini-Designs',
            ),
            'design-talks' => array(
                'name'        => 'Design-Talks',
                'tagline'     => 'Turn Mini-Designs into interactive communication experiences.',
                'colour'      => 'yellow',
                'pre_request' => '',
                'device'      => 'D',
                'cta'         => 'Request Design-Talks',
            ),
            'brick-talks' => array(
                'name'        => 'Brick-Talks',
                'tagline'     => 'Bring personalized characters to life through voice and animation.',
                'colour'      => 'blue',
                'pre_request' => '',
                'device'      => 'B',
                'cta'         => 'Request Brick-Talks',
            ),
            'fig-talks' => array(
                'name'        => 'Fig-Talks',
                'tagline'     => 'A personalized figure designed to represent the child.',
                'colour'      => 'red',
                'pre_request' => 'personalize',
                'device'      => 'F',
                'cta'         => 'Personalize Fig-Talks',
            ),
        ));
    }

    public static function get($slug) {
        $all = self::all();
        return isset($all[$slug]) ? $all[$slug] : null;
    }

    public static function slugs() { return array_keys(self::all()); }

    /** Kit slug for a serial device code (F/B/D), or ''. */
    public static function by_device($code) {
        foreach (self::all() as $slug => $kit) {
            if ($kit['device'] && $kit['device'] === $code) return $slug;
        }
        return '';
    }
}
