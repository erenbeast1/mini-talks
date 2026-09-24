<?php
/**
 * Mini-Special Days — the year, month by month.
 *
 * No cards and no popup here: on its own page a special day is read in place,
 * so the whole story is on the page rather than behind a button. The calendar
 * hub still shows them as cards, because there they sit beside events.
 */
if (!defined('ABSPATH')) exit;

global $wpdb;
$tsd = $wpdb->prefix . 'mf_special_days';
$sd  = Mini_Forum_Events::special_day();

$days = $wpdb->get_results("
    SELECT * FROM $tsd WHERE status = 'published'
    ORDER BY day_date ASC, month_number ASC
");

/* Four colours in rotation, the way the design runs them: the year reads as a
   sequence rather than a wall of one colour. The colours themselves live in the
   stylesheet — an inline custom property does not survive wp_kses. */
$TONES = 4;

$by_month = array();
foreach ($days as $day) {
    $ts = strtotime($day->day_date);
    if (!$ts) continue;
    $by_month[date('Y-m', $ts)][] = $day;
}

$sections = '';
$month_buttons = mf_block_get('mc.filters.month', array(
    'value' => 'all', 'on' => 'true', 'label' => 'All Months',
));
$index = 0;
$n = 0;
foreach ($by_month as $ym => $rows) {
    $index++;
    /* The button and the section it shows carry the same number: the script
       matches data-month against data-month-section and hides the rest. */
    $month_buttons .= mf_block_get('mc.filters.month', array(
        'value' => (int) $index, 'on' => 'false',
        'label' => esc_html(date_i18n('F Y', strtotime($ym . '-01'))),
    ));
    $entries = '';
    foreach ($rows as $day) {
        $ts = strtotime($day->day_date);
        $tone = ($n % $TONES) + 1;
        $n++;
        $entries .= mf_block_get('mc.sd.entry', array(
            'tone'      => (int) $tone,
            'iso'       => esc_attr(date('Y-m-d', $ts)),
            'long_date' => esc_attr(date_i18n('l, F j, Y', $ts)),
            'weekday'   => esc_html(strtoupper(date_i18n('D', $ts))),
            'day'       => esc_html(date_i18n('d', $ts)),
            'mon'       => esc_html(strtoupper(date_i18n('M', $ts))),
            'title'     => esc_html($day->title),
            'story'     => Mini_Forum_Events::details($day),
        ));
    }
    $sections .= mf_block_get('mc.sd.month', array(
        'index'   => (int) $index,
        'month'   => esc_html(date_i18n('F Y', strtotime($ym . '-01'))),
        'entries' => $entries,
    ));
}

/* "What will you find here?" — the same block the category pages carry, with
   the words the manifest already holds for it. It was written and never drawn. */
$items = '';
for ($i = 1; $i <= 8; $i++) {
    $title = Mini_Forum_Design::get('mc.expect.special.' . $i . '.title');
    $text  = Mini_Forum_Design::get('mc.expect.special.' . $i . '.text');
    if (trim(strip_tags($title)) === '') continue;
    $items .= mf_block_get('mc.expect.item', array(
        'bullet' => esc_url(Mini_Forum_Events::bullet($i)),
        'title'  => esc_html($title),
        'text'   => esc_html($text),
    ));
}

$count = '';
if ($days) {
    $first = strtotime($days[0]->day_date);
    $last  = strtotime($days[count($days) - 1]->day_date);
    $count = sprintf(
        _n('%d special day', '%d special days', count($days), 'mini-forum') . ' · %s',
        count($days),
        date_i18n('F', $first) === date_i18n('F', $last)
            ? date_i18n('F Y', $first)
            : date_i18n('F', $first) . '–' . date_i18n('F Y', $last)
    );
}
?>
<main class="me-page me-list-page <?php echo esc_attr($sd['page_class']); ?>" id="me-events">
<div class="me-wrap">
  <section class="me-section me-kind-<?php echo esc_attr($sd['kind']); ?>" data-kind="<?php echo esc_attr($sd['kind']); ?>">

    <?php echo Mini_Forum_Events::head('special'); ?>

    <?php if ($items !== ''): ?>
      <?php mf_block('mc.expect', array(
        'title' => esc_html(Mini_Forum_Design::get('mc.expect.special.title')),
        'lead'  => esc_html(Mini_Forum_Design::get('mc.expect.special.lead')),
        'items' => $items,
      )); ?>
    <?php endif; ?>

    <h2 class="mw-heading"><?php echo esc_html(Mini_Forum_Design::get('mc.find.special.title')); ?></h2>
    <p class="mw-lead"><?php echo esc_html(Mini_Forum_Design::get('mc.find.special.lead')); ?></p>

    <?php echo Mini_Forum_Events::special_filters($month_buttons, $sd); ?>

    <?php if ($count !== '') mf_block('mc.sd.count', array('count' => esc_html($count))); ?>

    <?php if ($sections !== ''): ?>
      <?php echo $sections; ?>
    <?php else: ?>
      <p class="mw-empty"><?php echo esc_html(Mini_Forum_Design::get('mc.sd.empty')); ?></p>
    <?php endif; ?>

  </section>
</div>

<?php echo Mini_Forum_Events::join_block($sd['title']); ?>
</main>
