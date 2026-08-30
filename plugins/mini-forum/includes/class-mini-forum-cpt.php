<?php
if (!defined('ABSPATH')) exit;

class Mini_Forum_CPT {

    public static function register() {
        register_post_type('mf_post', [
            'labels' => [
                'name'          => 'Forum Posts',
                'singular_name' => 'Forum Post',
                'add_new'       => 'Add New Post',
                'add_new_item'  => 'Add New Forum Post',
                'edit_item'     => 'Edit Forum Post',
            ],
            'public'       => false,
            'show_ui'      => true,
            'show_in_menu' => true,
            'menu_icon'    => 'dashicons-format-chat',
            'supports'     => ['title', 'editor', 'author'],
            'has_archive'  => false,
            'rewrite'      => false,
        ]);

        // Real Stories — submitted via the front-end form, reviewed by admin
        register_post_type('mf_real_story', [
            'labels' => [
                'name'               => 'Real Stories',
                'singular_name'      => 'Real Story',
                'add_new'            => 'Add New Story',
                'add_new_item'       => 'Add New Real Story',
                'edit_item'          => 'Edit Real Story',
                'all_items'          => 'All Real Stories',
                'menu_name'          => 'Real Stories',
            ],
            'public'             => false,
            'show_ui'            => true,
            'show_in_menu'       => true,
            'menu_icon'          => 'dashicons-format-quote',
            'supports'           => ['title', 'editor', 'custom-fields'],
            'has_archive'        => false,
            'rewrite'            => false,
            'capability_type'    => 'post',
        ]);

        // Newsletter — footer subscribers list (admin-managed)
        register_post_type('mf_newsletter', [
            'labels' => [
                'name'          => 'Newsletter',
                'singular_name' => 'Subscriber',
                'all_items'     => 'All Subscribers',
                'menu_name'     => 'Newsletter',
                'add_new_item'  => 'Add New Subscriber',
                'edit_item'     => 'Edit Subscriber',
            ],
            'public'          => false,
            'show_ui'         => true,
            'show_in_menu'    => true,
            'menu_icon'       => 'dashicons-email-alt',
            'supports'        => ['title', 'custom-fields'],
            'has_archive'     => false,
            'rewrite'         => false,
            'capability_type' => 'post',
        ]);

        register_taxonomy('mf_topic', 'mf_post', [
            'labels' => [
                'name'          => 'Forum Topics',
                'singular_name' => 'Topic',
            ],
            'public'       => false,
            'show_ui'      => true,
            'hierarchical' => true,
        ]);

        // Insert default topics if they don't exist
        if (!term_exists('family', 'mf_topic')) {
            wp_insert_term('With Family & Close Circle', 'mf_topic', ['slug' => 'family']);
            wp_insert_term('At School',                  'mf_topic', ['slug' => 'school']);
            wp_insert_term('In Social Settings',         'mf_topic', ['slug' => 'social']);
            wp_insert_term('Mini-Talks Experiences',     'mf_topic', ['slug' => 'mini-talks']);
        }
    }
}
