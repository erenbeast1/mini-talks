<?php
/**
 * Mini-Calendar — the events hub.
 *
 * One month calendar, then a section per category showing that month's events,
 * then special days and the closing call to action. The calendar is drawn in
 * the browser from the cards below it, so there is one source of truth on the
 * page: whatever this template prints into the grids is what the month shows.
 */
if (!defined('ABSPATH')) exit;

global $wpdb;
$te   = $wpdb->prefix . 'mf_events';
$tsd  = $wpdb->prefix . 'mf_special_days';
$eurl = function_exists('mf_get_events_url') ? mf_get_events_url() : get_permalink();

/* Everything within reach of the calendar, in one query per category rather
   than one per month: the member can page back and forth without a reload, so
   the cards for the neighbouring months have to already be here. */
$window_start = date('Y-m-d 00:00:00', strtotime('first day of -6 months'));
$window_end   = date('Y-m-d 23:59:59', strtotime('last day of +12 months'));
?>
<main class="me-page" id="me-events">
<div class="me-wrap">

  <?php mf_block('mc.hero', array(
    'title' => 'Mini-Calendar',
    'lead'  => 'Explore all Mini-Talks events for the selected month in one calendar.',
    'body'  => 'Browse workshops, family meetups, expert sessions, community updates, and special days. Use the arrows to explore other months.',
    'art'   => 'https://mini-talks.org/wp-content/uploads/2026/09/mini_calendar.png',
  )); ?>

  <?php mf_block('mc.calendar', array(
    'year'  => (int) date_i18n('Y'),
    'month' => (int) date_i18n('n'),
  )); ?>

  <?php mf_block('mc.note'); ?>

  <?php
  foreach (Mini_Forum_Events::categories() as $type => $cat) {
      $rows = $wpdb->get_results($wpdb->prepare("
          SELECT * FROM $te
          WHERE event_type = %s AND status IN ('published','completed')
            AND start_datetime BETWEEN %s AND %s
          ORDER BY start_datetime ASC
      ", $type, $window_start, $window_end));

      mf_block('mc.section', array(
          'kind'          => esc_attr($cat['kind']),
          'icon'          => esc_url($cat['icon']),
          'title'         => esc_html($cat['title']),
          'description'   => esc_html(Mini_Forum_Design::get('mc.desc.' . $cat['kind'])),
          'see_all_url'   => esc_url(Mini_Forum_Events::url($cat['view'])),
          'see_all_label' => esc_html($cat['see_all']),
          'cards'         => Mini_Forum_Events::cards($rows),
      ));
  }

  /* Special days sit in their own section and open their own popup: they are a
     date and a story, never something to book. */
  $sd = Mini_Forum_Events::special_day();
  $special = $wpdb->get_results($wpdb->prepare("
      SELECT * FROM $tsd WHERE status = 'published'
        AND day_date BETWEEN %s AND %s
      ORDER BY day_date ASC
  ", date('Y-m-d', strtotime($window_start)), date('Y-m-d', strtotime($window_end))));

  $sd_cards = '';
  foreach ($special as $day) {
      $ts = strtotime($day->day_date);
      $sd_cards .= mf_block_get('mc.special.card', array(
          'mon'         => esc_html(strtoupper(date_i18n('M', $ts))),
          'day'         => esc_html(date_i18n('d', $ts)),
          'year'        => esc_html(date_i18n('Y', $ts)),
          'title'       => esc_html($day->title),
          'description' => esc_html(wp_trim_words((string) $day->description, 26)),
          'story'       => Mini_Forum_Events::details($day),
      ));
  }

  mf_block('mc.section', array(
      'kind'          => esc_attr($sd['kind']),
      'icon'          => esc_url($sd['icon']),
      'title'         => esc_html($sd['title']),
      'description'   => esc_html(Mini_Forum_Design::get('mc.desc.special')),
      'see_all_url'   => esc_url(Mini_Forum_Events::url($sd['view'])),
      'see_all_label' => esc_html($sd['see_all']),
      'cards'         => $sd_cards,
  ));
  ?>

</div>

<?php
echo Mini_Forum_Events::join_block('Mini-Calendar');
echo Mini_Forum_Events::dialogs(true);
?>
</main>
