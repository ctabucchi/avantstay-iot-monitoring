# AvantStay IoT Monitoring

A plan to watch every AvantStay home the way an onsite guard would. NoiseAware sensors, Ring cameras and booking data get joined up, and a bot does the busywork so agents only handle alerts that need a person.

- `index.html`: Overview. What this is, why it matters, today vs. tomorrow, a short game, a savings calculator, how it connects, the phased plan and requirements.
- `about.html`: How the page was made, where the information came from, and how to build something like it.

## Editing

Static HTML, no build step. Edit the files, commit, and push to `main`. `.github/workflows/deploy.yml` republishes GitHub Pages on every push.

- `assets/site.css`: brand tokens (top of file) and all styles. Tokens match the GX Journey site.
- `assets/house3d.js`: the 3D home in the hero (three.js r128 from cdnjs).
- `assets/app.js`: charts, the "night shift" game, and the calculator. Chart data sits at the top of the file.

## Public repo rules

This repo is public. Round internal numbers, change details in examples, and don't name guests, homes, or staff.

## Brand

| Token | Value | Use |
| --- | --- | --- |
| `--ink` | `#022B54` | Navy: headings, dark sections |
| `--accent` | `#53C3D0` | Teal: accents on dark surfaces only |
| `--link` | `#1C5D9F` | Links |
| Body | Source Sans 3 | Matches avantstay.com |
| Headings | Fraunces | Open-license stand-in for the brand display face |

## Accessibility

Skip link, landmarks and heading order, keyboard play for the game and sliders, visible focus, AA contrast, table views for charts, and reduced motion support.
