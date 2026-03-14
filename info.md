# Energy Heatmap Card

Visualize your Home Assistant energy consumption as a beautiful heatmap — like GitHub's contribution graph, but for your energy data.

## Features

- **Hour × Day heatmap** — See exactly when you use the most energy
- **Daily overview calendar** — GitHub-style contribution graph for daily totals
- **Peak detection** — Instantly see your peak consumption time
- **Stats summary** — Total consumption, daily average, peak time
- **6 color palettes** — Green, blue, orange, red, purple, yellow
- **Custom colors** — Define your own min/max colors
- **Dark mode support** — Follows your HA theme
- **Interactive tooltips** — Hover for exact values
- **Responsive** — Works on mobile and desktop

## Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | Entity ID of your energy sensor |
| `title` | string | `Energy Heatmap` | Card title |
| `days` | number | `30` | Number of days to show |
| `palette` | string | `green` | Color palette: green, blue, orange, red, purple, yellow |
| `show_legend` | boolean | `true` | Show color legend |
| `show_labels` | boolean | `true` | Show hour/day labels |
| `unit` | string | auto | Override unit of measurement |
| `min_color` | string | | Custom min color (hex) |
| `max_color` | string | | Custom max color (hex) |

## Example

```yaml
type: custom:ha-energy-heatmap-card
entity: sensor.energy_total
title: Home Energy Usage
days: 30
palette: green
```
