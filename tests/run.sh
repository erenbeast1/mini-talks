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

# The game's own checks. node tests print their own line. The asset check runs
# first: a missing or zero-byte picture is the one failure that stops the build
# outright, so there is no point reading the rest until it passes.
for t in tests/assets.mjs tests/*.mjs; do
  [ -e "$t" ] || continue
  case "$t" in tests/assets.mjs) [ "$seen_assets" = 1 ] && continue; seen_assets=1 ;; esac
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
  # Two things this has to get right, both learned the hard way.
  #
  # The formatter: an earlier version of this passed --format unix, which this
  # ESLint does not have. It exited with an error message instead of a report,
  # grep found no "no-undef" in that message, and the check reported "no
  # problems" for weeks while an undefined variable shipped. So: the default
  # formatter, and stderr kept rather than thrown away.
  #
  # The exit code: eslint exits 1 when it finds anything, including the
  # pre-existing unused-variable errors this repository has. So the exit code
  # cannot be the signal — the report is. But a run that produced NO report at
  # all is a broken check, not a clean one, and must fail loudly.
  # KNOWN holds the names already undefined before any of this work, so a new
  # one fails loudly instead of hiding in the noise. They are a real bug, in
  # GamePage.jsx: scenes 2, 3 and 4 fall past the isRealTimeScene branch into a
  # block that reads isScene4/isScene2/lightmapTex/scene2LightmapMap, none of
  # which exist, so loading one of those scenes throws. Fixing it needs to know
  # what lightmapTex was meant to be, so it is reported rather than guessed at.
  KNOWN="isScene4|isScene2|scene2LightmapMap|lightmapTex"

  # eslint exits non-zero whenever it reports anything, and this file runs
  # under `set -e`, so without the `|| true` the assignment itself ends the
  # script — silently, right after the label has been printed with no newline.
  out=$(cd game && node_modules/.bin/eslint src 2>&1 || true)
  if [ -z "$out" ]; then
    echo "problems"
    echo "  eslint produced no output at all — the check is broken, not clean"
    fail=1
  else
    undef=$(printf '%s\n' "$out" | grep "no-undef" || true)
    new=$(printf '%s\n' "$undef" | grep -vE "'($KNOWN)'" | grep . || true)
    old=$(printf '%s\n' "$undef" | grep -cE "'($KNOWN)'" || true)
    if [ -n "$new" ]; then
      echo "problems"; printf '%s\n' "$new" | sed 's/^ */  /'; fail=1
    elif [ "$old" -gt 0 ]; then
      echo "no new problems ($old known, pre-existing — see KNOWN in tests/run.sh)"
    else
      # Nothing left: the known ones were fixed, so stop excusing them.
      echo "problems"
      echo "  the KNOWN list in tests/run.sh is stale — nothing matches it any more, remove it"
      fail=1
    fi
  fi
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
