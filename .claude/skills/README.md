# Skills

## ui-ux-pro-max (vendored)

The following skills are vendored from
[nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
v2.13.0, MIT licensed (see `LICENSE.ui-ux-pro-max`):

| Skill | Purpose |
|---|---|
| `ui-ux-pro-max` | Core design intelligence — searchable styles, palettes, font pairings, UX guidelines, charts, 22 stacks |
| `ui-styling` | shadcn/ui + Tailwind interface implementation |
| `design` | Logo, corporate identity, banners, icons, social imagery |
| `design-system` | Three-layer design tokens, component specs, slide generation |
| `brand` | Brand voice, visual identity, messaging frameworks |
| `slides` | HTML presentations with Chart.js |
| `banner-design` | Social/ad/web/print banners |

Requires Python 3.x (standard library only) for the search scripts.

### Updating

Re-copy `.claude/skills/` from a fresh clone of the upstream repo:

```bash
git clone --depth 1 https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.git /tmp/uipm
rm -rf .claude/skills/{ui-ux-pro-max,ui-styling,design,design-system,brand,slides,banner-design}
cp -r /tmp/uipm/.claude/skills/. .claude/skills/
```

Alternatively, install upstream as a plugin instead of vendoring:

```
/plugin marketplace add nextlevelbuilder/ui-ux-pro-max-skill
/plugin install ui-ux-pro-max@ui-ux-pro-max-skill
```
