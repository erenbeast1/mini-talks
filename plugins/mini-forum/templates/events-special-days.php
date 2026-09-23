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
   sequence rather than a wall of one colour. Yellow needs a darker ink to stay
   readable, which is the only reason the two are separate values. */
$PALETTE = array(
    array('#E52828', '#E52828'),
    array('#FFCC00', '#876800'),
    array('#0055BF', '#0055BF'),
    array('#237841', '#237841'),
);

$by_month = array();
foreach ($days as $day) {
    $ts = strtotime($day->day_date);
    if (!$ts) continue;
    $by_month[date('Y-m', $ts)][] = $day;
}

$sections = '';
$index = 0;
$n = 0;
foreach ($by_month as $ym => $rows) {
    $index++;
    $entries = '';
    foreach ($rows as $day) {
        $ts = strtotime($day->day_date);
        list($colour, $ink) = $PALETTE[$n % count($PALETTE)];
        $n++;
        $entries .= mf_block_get('mc.sd.entry', array(
            'colour'    => esc_attr($colour),
            'ink'       => esc_attr($ink),
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
<main class="me-page me-workshop-page" id="me-events">
<div class="me-wrap">
  <section class="me-section" data-kind="<?php echo esc_attr($sd['kind']); ?>"
           style="--c:<?php echo esc_attr($sd['colour']); ?>;--pale:<?php echo esc_attr($sd['pale']); ?>">

    <?php mf_block('mc.list.head', array(
      'icon'        => esc_url($sd['icon']),
      'title'       => esc_html($sd['title']),
      'description' => esc_html(Mini_Forum_Design::get('mc.desc.special')),
    )); ?>

    <h2 class="mw-heading"><?php echo esc_html(Mini_Forum_Design::get('mc.find.special.title')); ?></h2>
    <p class="mw-lead"><?php echo esc_html(Mini_Forum_Design::get('mc.find.special.lead')); ?></p>

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
