# ð© HA Energy Heatmap Card

[![HACS](https://img.shields.io/badge/HACS-Custom-orange.svg)](https://hacs.xyz)
[![GitHub Release](https://img.shields.io/github/v/release/MacSiem/ha-energy-heatmap-card)](https://github.com/MacSiem/ha-energy-heatmap-card/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A custom Lovelace card for **Home Assistant** that visualizes energy consumption as a heatmap â like GitHub's contribution graph, but for your energy data.

![Energy Heatmap Card Preview](docs/preview.png)

## â¨ Features

- **Hour Ã Day Heatmap** â See exactly when you consume the most energy
- **Daily Overview Calendar** â GitHub-style contribution graph for daily totals
- **Peak Detection** â Automatically identifies your peak consumption times
- **Smart Stats** â Total consumption, daily average, peak time at a glance
- **6 Built-in Palettes** â Green, blue, orange, red, purple, yellow
- **Custom Colors** â Define your own gradient with hex colors
- **Dark Mode** â Follows your Home Assistant theme automatically
- **Interactive Tooltips** â Hover over any cell for exact values
- **Responsive Design** â Works on mobile, tablet, and desktop
- **HA Native** â Uses HA history API directly, no external dependencies

## ð¦ Installation

### HACS (Recommended)

1. Open **HACS** in Home Assistant
2. Go to **Frontend** â Click **â®** â **Custom repositories**
3. Add `https://github.com/MacSiem/ha-energy-heatmap-card` as **Lovelace** type
4. Search for **Energy Heatmap Card** and install
5. Refresh your browser

### Manual

1. Download `ha-energy-heatmap-card.js` from the [latest release](https://github.com/MacSiem/ha-energy-heatmap-card/releases)
2. Copy to `config/www/ha-energy-heatmap-card.js`
3. Add resource in **Settings** â **Dashboards** â **Resources**:
   - URL: `/local/ha-energy-heatmap-card.js`
   - Type: JavaScript Module

## ð Usage

### Basic

```yaml
type: custom:ha-energy-heatmap-card
entity: sensor.energy_total
```

### Full Options

```yaml
type: custom:ha-energy-heatmap-card
entity: sensor.energy_total
title: Home Energy Usage
days: 30
palette: green
show_legend: true
show_labels: true
```

### Custom Colors

```yaml
type: custom:ha-energy-heatmap-card
entity: sensor.energy_total
title: Custom Gradient
min_color: "#fef0d9"
max_color: "#b30000"
```

### Per-Device Cards

```yaml
type: vertical-stack
cards:
  - type: custom:ha-energy-heatmap-card
    entity: sensor.plug_fridge_summation_delivered
    title: Fridge
    palette: blue
    days: 14
  - type: custom:ha-energy-heatmap-card
    entity: sensor.plug_washing_machine_summation_delivered
    title: Washing Machine
    palette: orange
    days: 14
```

## âï¸ Configuration

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `entity` | string | **required** | Entity ID of your energy sensor (cumulative `kWh`) |
| `title` | string | `Energy Heatmap` | Card title (set to empty string to hide) |
| `days` | number | `30` | Number of days of history to display |
| `palette` | string | `green` | Color palette: `green`, `blue`, `orange`, `red`, `purple`, `yellow` |
| `show_legend` | boolean | `true` | Show the color scale legend |
| `show_labels` | boolean | `true` | Show hour and day-of-week labels |
| `unit` | string | auto | Override unit of measurement |
| `min_color` | string | â | Custom minimum color (hex, overrides palette) |
| `max_color` | string | â | Custom maximum color (hex, overrides palette) |

## ð¨ Color Palettes

| Palette | Preview |
|---------|---------|
| `green` | ð©ð©ð©ð© (default, GitHub-style) |
| `blue` | ð¦ð¦ð¦ð¦ |
| `orange` | ð§ð§ð§ð§ |
| `red` | ð¥ð¥ð¥ð¥ |
| `purple` | ðªðªðªðª |
| `yellow` | ð¨ð¨ð¨ð¨ |

## ð§ Supported Entities

This card works with any **cumulative energy sensor** (device_class: `energy`), including:

- Home Assistant Energy Dashboard entities
- Smart plugs (Zigbee, Z-Wave, WiFi)
- Utility meter sensors
- Shelly, Sonoff, IKEA, Aqara energy sensors
- Any sensor that reports cumulative `kWh`

## ð¤ Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## ð License

This project is licensed under the MIT License â see the [LICENSE](LICENSE) file for details.

## ð¡ Inspiration

This card was built out of a need to understand **when** energy is consumed, not just **how much**. Standard HA energy dashboards show totals and trends, but miss the hour-by-hour patterns that reveal standby waste, peak usage habits, and optimization opportunities.

---

**Made with â¤ï¸ for the Home Assistant community**

---

## Support

If you find this project useful, consider supporting its development:

<a href="https://buymeacoffee.com/macsiem" target="_blank"><img src="https://cdn.buymeacoffee.com/buttons/v2/default-yellow.png" alt="Buy Me A Coffee" height="50" ></a>
<a href="https://www.paypal.com/donate/?hosted_button_id=Y967H4PLRBN8W" target="_blank"><img src="https://img.shields.io/badge/PayPal-Donate-blue?logo=paypal&logoColor=white" alt="PayPal Donate" height="50" ></a>
