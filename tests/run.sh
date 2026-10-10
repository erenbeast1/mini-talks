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

# The game's own checks. node tests print their own line.
for t in tests/*.mjs; do
  [ -e "$t" ] || continue
  node "$t" || fail=1
done

# The game is JSX, which node --check cannot read; esbuild can, and it is
# already a Vite dependency. Skipped rather than failed when node_modules is
# not installed, so this script still runs on a fresh clone.
if [ -x game/node_modules/.bin/esbuild ]; then
  jsxfail=0
  for f in $(find game/src -name '*.jsx' -o -name '*.js'); do
    game/node_modules/.bin/esbuild --log-level=error --outfile=/dev/null "$f" || jsxfail=1
  done
  printf '%-22s ' "game jsx"
  [ $jsxfail -eq 0 ] && echo "no problems" || { echo "problems"; fail=1; }
else
  printf '%-22s %s\n' "game jsx" "skipped (run npm install in game/)"
fi

# esbuild parses, so it cannot see a name that is never bound — which is how a
# `{request.mini_id}` pasted into a block where there is no `request` gets all
# the way to the browser. ESLint can. The game has pre-existing unused-variable
# errors, so this gates on no-undef alone rather than on a clean run.
if [ -x game/node_modules/.bin/eslint ]; then
  printf '%-22s ' "game no-undef"
  undef=$(cd game && node_modules/.bin/eslint src --format unix 2>/dev/null | grep "no-undef" || true)
  if [ -z "$undef" ]; then echo "no problems"; else echo "problems"; echo "$undef"; fail=1; fi
else
  printf '%-22s %s\n' "game no-undef" "skipped (run npm install in game/)"
fi

# php -l over the game API as well.
apifail=0
for f in $(find game-api -name '*.php' -not -path '*/vendor/*'); do
  php -l "$f" > /dev/null || apifail=1
done
printf '%-22s ' "game-api php -l"
[ $apifail -eq 0 ] && echo "no problems" || { echo "problems"; fail=1; }

exit $fail
