#!/bin/sh
# Every check, in one go. Run from the repository root: sh tests/run.sh
set -e
fail=0
for t in tests/*.php; do
  case "$t" in */wp-stub.php|*/env.php) continue ;; esac
  printf '%-22s ' "$(basename "$t" .php)"
  if php "$t" > /tmp/mf-test.out 2>&1; then tail -1 /tmp/mf-test.out
  else tail -1 /tmp/mf-test.out; cat /tmp/mf-test.out; fail=1; fi
done
for f in plugins/mini-forum/includes/*.php plugins/mini-forum/templates/*.php plugins/mini-forum/*.php \
         plugins/mini-devices/*.php plugins/mini-devices/includes/*.php; do
  php -l "$f" > /dev/null || fail=1
done
printf '%-22s ' "php -l"; [ $fail -eq 0 ] && echo "no problems" || echo "problems"
node --check plugins/mini-forum/assets/js/mini-events.js
node --check plugins/mini-devices/assets/mini-devices.js
printf '%-22s %s\n' "js" "no problems"
exit $fail
