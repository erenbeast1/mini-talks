<?php
/**
 * One category's own page — workshops, meetups, expert sessions or updates.
 *
 * The same shape for all four: who it is for, what happens, a month and place
 * filter, what is coming up, and what has already happened. $mfe_type is set
 * by the router.
 */
if (!defined('ABSPATH')) exit;

$cat = Mini_Forum_Events::category($mfe_type);
if (!$cat) return;

$rows     = Mini_Forum_Events::by_type($mfe_type);
$all      = array_merge($rows['upcoming'], $rows['past']);
$slug     = $cat['kind'];
$eurl     = function_exists('mf_get_events_url') ? mf_get_events_url() : get_permalink();

/* "What happens in a workshop?" — eight points, each editable on its own, so a
   category can say what is true of it rather than what is true of workshops. */
$items = '';
for ($i = 1; $i <= 8; $i++) {
    $title = Mini_Forum_Design::get('mc.expect.' . $slug . '.' . $i . '.title');
    $text  = Mini_Forum_Design::get('mc.expect.' . $slug . '.' . $i . '.text');
    if (trim(strip_tags($title)) === '') continue;
    $items .= mf_block_get('mc.expect.item', array(
        'bullet' => esc_url(Mini_Forum_Design::get('mc.bullet.' . (($i % 4) + 1))),
        'title'  => esc_html($title),
        'text'   => esc_html($text),
    ));
}
?>
<main class="me-page me-list-page <?php echo esc_attr($cat['page_class']); ?>" id="me-events">
<div class="me-wrap">
  <section class="me-section me-kind-<?php echo esc_attr($cat['kind']); ?>" data-kind="<?php echo esc_attr($cat['kind']); ?>">

    <?php echo Mini_Forum_Events::head($slug); ?>

    <?php if ($items !== ''): ?>
      <?php mf_block('mc.expect', array(
        'title' => esc_html(Mini_Forum_Design::get('mc.expect.' . $slug . '.title')),
        'lead'  => esc_html(Mini_Forum_Design::get('mc.expect.' . $slug . '.lead')),
        'items' => $items,
      )); ?>
    <?php endif; ?>

    <?php if (!empty($cat['note'])) mf_block('mc.note'); ?>

    <?php mf_block('mc.filters', array(
      'anchor'     => esc_attr($slug),
      'find_title' => esc_html(Mini_Forum_Design::get('mc.find.' . $slug . '.title')),
      'find_lead'  => esc_html(Mini_Forum_Design::get('mc.find.' . $slug . '.lead')),
      'months'     => Mini_Forum_Events::month_options($all),
      'places'     => Mini_Forum_Events::filter_buttons($all, $cat),
    )); ?>

    <?php mf_block('mc.list.body', array(
      'upcoming_title' => esc_html(Mini_Forum_Design::get('mc.upcoming.' . $slug . '.title')),
      'upcoming_empty' => esc_html(Mini_Forum_Design::get('mc.upcoming.' . $slug . '.empty')),
      'upcoming'       => Mini_Forum_Events::cards($rows['upcoming']),
      'past_title'     => esc_html(Mini_Forum_Design::get('mc.past.' . $slug . '.title')),
      'past_empty'     => esc_html(Mini_Forum_Design::get('mc.past.' . $slug . '.empty')),
      'past'           => Mini_Forum_Events::cards($rows['past']),
    )); ?>

  </section>
</div>

<?php
echo Mini_Forum_Events::join_block($cat['title']);
echo Mini_Forum_Events::dialogs(false);
?>
</main>
