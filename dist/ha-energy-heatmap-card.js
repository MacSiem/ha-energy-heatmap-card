/**
 * HA Energy Heatmap Card
 * A custom Lovelace card for Home Assistant that visualizes energy consumption
 * as a heatmap grid (hour × day) — like GitHub contributions, but for energy.
 *
 * @version 1.0.0
 * @author MacSiem
 * @license MIT
 */

const LitElement = Object.getPrototypeOf(
  customElements.get("ha-panel-lovelace") || customElements.get("hui-view")
);
const html = LitElement?.prototype?.html || (strings => strings);
const css = LitElement?.prototype?.css || (strings => strings);

// Fallback: if LitElement isn't loaded yet, wait and retry
if (!LitElement) {
  console.warn("ha-energy-heatmap-card: LitElement not found, retrying...");
  setTimeout(() => {
    const script = document.createElement("script");
    script.src = import.meta?.url || "";
    document.head.appendChild(script);
  }, 2000);
}

const CARD_VERSION = "1.0.0";

// Color palettes
const PALETTES = {
  green: ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"],
  blue: ["#ebedf0", "#9ecae1", "#6baed6", "#3182bd", "#08519c"],
  orange: ["#ebedf0", "#fdbe85", "#fd8d3c", "#e6550d", "#a63603"],
  red: ["#ebedf0", "#fcbba1", "#fb6a4a", "#de2d26", "#a50f15"],
  purple: ["#ebedf0", "#c6b3d9", "#9e82c1", "#756bb1", "#54278f"],
  yellow: ["#ebedf0", "#fff3b0", "#ffd54f", "#ffb300", "#ff8f00"],
};

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const HOUR_LABELS = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0")
);

class EnergyHeatmapCard extends (LitElement || HTMLElement) {
  static get properties() {
    return {
      hass: { type: Object },
      config: { type: Object },
      _data: { type: Object, state: true },
      _tooltip: { type: Object, state: true },
    };
  }

  static getConfigElement() {
    return document.createElement("ha-energy-heatmap-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      title: "Energy Heatmap",
      days: 30,
      palette: "green",
      show_legend: true,
      show_labels: true,
    };
  }

  constructor() {
    super();
    this._data = {};
    this._tooltip = { visible: false, text: "", x: 0, y: 0 };
    this._history = null;
    this._lastFetch = 0;
    this._fetchInterval = 300000; // 5 min cache
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error("You need to define an entity");
    }
    this.config = {
      title: "Energy Heatmap",
      days: 30,
      palette: "green",
      show_legend: true,
      show_labels: true,
      unit: "",
      min_color: "",
      max_color: "",
      ...config,
    };
  }

  getCardSize() {
    return 6;
  }

  shouldUpdate(changedProps) {
    if (changedProps.has("config")) return true;
    if (changedProps.has("_data")) return true;
    if (changedProps.has("_tooltip")) return true;
    if (changedProps.has("hass")) {
      const oldHass = changedProps.get("hass");
      if (!oldHass) return true;
      return (
        oldHass.states[this.config.entity] !==
        this.hass.states[this.config.entity]
      );
    }
    return false;
  }

  updated(changedProps) {
    if (changedProps.has("hass") || changedProps.has("config")) {
      this._fetchHistory();
    }
  }

  async _fetchHistory() {
    if (!this.hass || !this.config.entity) return;

    const now = Date.now();
    if (now - this._lastFetch < this._fetchInterval && this._history) return;
    this._lastFetch = now;

    const days = this.config.days || 30;
    const end = new Date();
    const start = new Date(end.getTime() - days * 24 * 60 * 60 * 1000);

    try {
      const uri = `history/period/${start.toISOString()}?filter_entity_id=${this.config.entity}&end_time=${end.toISOString()}&minimal_response&no_attributes`;
      const history = await this.hass.callApi("GET", uri);

      if (history && history.length > 0 && history[0].length > 0) {
        this._history = history[0];
        this._processData();
      }
    } catch (err) {
      console.error("ha-energy-heatmap-card: Error fetching history:", err);
    }
  }

  _processData() {
    if (!this._history || this._history.length === 0) return;

    // Build hour×day grid
    // grid[dayOfWeek][hour] = { sum, count }
    const grid = {};
    for (let d = 0; d < 7; d++) {
      grid[d] = {};
      for (let h = 0; h < 24; h++) {
        grid[d][h] = { sum: 0, count: 0 };
      }
    }

    // Daily totals for the calendar view
    const dailyTotals = {};

    let prevValue = null;
    let prevTime = null;

    for (const entry of this._history) {
      const val = parseFloat(entry.s ?? entry.state);
      if (isNaN(val)) {
        prevValue = null;
        continue;
      }

      const time = new Date(entry.lu ?? entry.last_updated ?? entry.last_changed);
      const dayOfWeek = (time.getDay() + 6) % 7; // Monday=0
      const hour = time.getHours();
      const dateKey = time.toISOString().split("T")[0];

      // For cumulative sensors (energy), calculate delta
      if (prevValue !== null && val >= prevValue) {
        const delta = val - prevValue;
        if (delta < 100) {
          // sanity check
          grid[dayOfWeek][hour].sum += delta;
          grid[dayOfWeek][hour].count += 1;

          if (!dailyTotals[dateKey]) dailyTotals[dateKey] = 0;
          dailyTotals[dateKey] += delta;
        }
      }

      prevValue = val;
      prevTime = time;
    }

    // Calculate stats
    let maxVal = 0;
    let totalEnergy = 0;
    let peakHour = 0;
    let peakDay = 0;
    let peakVal = 0;

    for (let d = 0; d < 7; d++) {
      for (let h = 0; h < 24; h++) {
        const avg =
          grid[d][h].count > 0
            ? grid[d][h].sum / grid[d][h].count
            : grid[d][h].sum;
        const val = grid[d][h].sum;
        totalEnergy += val;
        if (val > maxVal) maxVal = val;
        if (val > peakVal) {
          peakVal = val;
          peakHour = h;
          peakDay = d;
        }
      }
    }

    // Daily calendar data
    const calendarData = Object.entries(dailyTotals)
      .map(([date, total]) => ({ date, total }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const maxDaily = Math.max(...calendarData.map((d) => d.total), 0.001);

    this._data = {
      grid,
      maxVal: maxVal || 0.001,
      totalEnergy,
      peakHour,
      peakDay,
      peakVal,
      calendarData,
      maxDaily,
      avgDaily: calendarData.length > 0
        ? totalEnergy / calendarData.length
        : 0,
    };
  }

  _getColor(value, max) {
    if (!value || value === 0) return this._getPalette()[0];
    const palette = this._getPalette();
    const ratio = Math.min(value / max, 1);
    const idx = Math.min(
      Math.floor(ratio * (palette.length - 1)) + 1,
      palette.length - 1
    );
    return palette[idx];
  }

  _getPalette() {
    if (this.config.min_color && this.config.max_color) {
      return [
        "#ebedf0",
        this._blendColors(this.config.min_color, this.config.max_color, 0.25),
        this._blendColors(this.config.min_color, this.config.max_color, 0.5),
        this._blendColors(this.config.min_color, this.config.max_color, 0.75),
        this.config.max_color,
      ];
    }
    return PALETTES[this.config.palette] || PALETTES.green;
  }

  _blendColors(c1, c2, ratio) {
    const hex = (c) => parseInt(c.slice(1), 16);
    const r1 = (hex(c1) >> 16) & 0xff,
      g1 = (hex(c1) >> 8) & 0xff,
      b1 = hex(c1) & 0xff;
    const r2 = (hex(c2) >> 16) & 0xff,
      g2 = (hex(c2) >> 8) & 0xff,
      b2 = hex(c2) & 0xff;
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)}`;
  }

  _getUnit() {
    if (this.config.unit) return this.config.unit;
    const stateObj = this.hass?.states[this.config.entity];
    return stateObj?.attributes?.unit_of_measurement || "kWh";
  }

  _showTooltip(e, text) {
    const rect = this.shadowRoot
      .querySelector(".card-content")
      .getBoundingClientRect();
    this._tooltip = {
      visible: true,
      text,
      x: e.clientX - rect.left,
      y: e.clientY - rect.top - 40,
    };
  }

  _hideTooltip() {
    this._tooltip = { ...this._tooltip, visible: false };
  }

  render() {
    if (!this.hass || !this.config) {
      return this._renderEmpty("Loading...");
    }

    const stateObj = this.hass.states[this.config.entity];
    if (!stateObj) {
      return this._renderEmpty(`Entity not found: ${this.config.entity}`);
    }

    const unit = this._getUnit();
    const data = this._data;

    if (!data.grid) {
      return this._renderEmpty("Fetching energy data...");
    }

    return html`
      <ha-card>
        ${this.config.title
          ? html`<h1 class="card-header">${this.config.title}</h1>`
          : ""}
        <div class="card-content">
          ${this._renderStats(data, unit)}
          ${this._renderHeatmapGrid(data, unit)}
          ${data.calendarData?.length > 0
            ? this._renderCalendar(data, unit)
            : ""}
          ${this.config.show_legend ? this._renderLegend(data, unit) : ""}
          ${this._tooltip.visible
            ? html`<div
                class="tooltip"
                style="left:${this._tooltip.x}px;top:${this._tooltip.y}px"
              >
                ${this._tooltip.text}
              </div>`
            : ""}
        </div>
      </ha-card>
    `;
  }

  _renderEmpty(msg) {
    return html`
      <ha-card>
        <div class="card-content empty">${msg}</div>
      </ha-card>
    `;
  }

  _renderStats(data, unit) {
    return html`
      <div class="stats-row">
        <div class="stat">
          <span class="stat-value">${data.totalEnergy.toFixed(1)}</span>
          <span class="stat-label">Total ${unit}</span>
        </div>
        <div class="stat">
          <span class="stat-value">${data.avgDaily.toFixed(2)}</span>
          <span class="stat-label">Avg/day ${unit}</span>
        </div>
        <div class="stat">
          <span class="stat-value"
            >${DAY_LABELS[data.peakDay]}
            ${data.peakHour.toString().padStart(2, "0")}:00</span
          >
          <span class="stat-label">Peak time</span>
        </div>
      </div>
    `;
  }

  _renderHeatmapGrid(data, unit) {
    const showLabels = this.config.show_labels !== false;

    return html`
      <div class="section-title">Consumption by Hour & Day</div>
      <div class="heatmap-container">
        ${showLabels
          ? html`<div class="heatmap-y-labels">
              <div class="label-spacer"></div>
              ${DAY_LABELS.map(
                (d) => html`<div class="y-label">${d}</div>`
              )}
            </div>`
          : ""}
        <div class="heatmap-grid-wrapper">
          ${showLabels
            ? html`<div class="heatmap-x-labels">
                ${HOUR_LABELS.filter((_, i) => i % 3 === 0).map(
                  (h) => html`<div class="x-label">${h}</div>`
                )}
              </div>`
            : ""}
          <div class="heatmap-grid">
            ${[0, 1, 2, 3, 4, 5, 6].map(
              (d) => html`
                <div class="heatmap-row">
                  ${Array.from({ length: 24 }, (_, h) => {
                    const val = data.grid[d][h].sum;
                    const color = this._getColor(val, data.maxVal);
                    return html`
                      <div
                        class="heatmap-cell"
                        style="background-color:${color}"
                        @mouseenter=${(e) =>
                          this._showTooltip(
                            e,
                            `${DAY_LABELS[d]} ${HOUR_LABELS[h]}:00 — ${val.toFixed(2)} ${unit}`
                          )}
                        @mouseleave=${() => this._hideTooltip()}
                      ></div>
                    `;
                  })}
                </div>
              `
            )}
          </div>
        </div>
      </div>
    `;
  }

  _renderCalendar(data, unit) {
    const weeks = [];
    let currentWeek = [];

    if (data.calendarData.length === 0) return "";

    // Fill leading empty days
    const firstDate = new Date(data.calendarData[0].date);
    const firstDow = (firstDate.getDay() + 6) % 7;
    for (let i = 0; i < firstDow; i++) {
      currentWeek.push(null);
    }

    for (const entry of data.calendarData) {
      currentWeek.push(entry);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      while (currentWeek.length < 7) currentWeek.push(null);
      weeks.push(currentWeek);
    }

    return html`
      <div class="section-title">Daily Overview</div>
      <div class="calendar-container">
        <div class="calendar-grid">
          ${weeks.map(
            (week) => html`
              <div class="calendar-week">
                ${week.map((day) =>
                  day
                    ? html`
                        <div
                          class="calendar-cell"
                          style="background-color:${this._getColor(
                            day.total,
                            data.maxDaily
                          )}"
                          @mouseenter=${(e) =>
                            this._showTooltip(
                              e,
                              `${day.date}: ${day.total.toFixed(2)} ${unit}`
                            )}
                          @mouseleave=${() => this._hideTooltip()}
                        ></div>
                      `
                    : html`<div class="calendar-cell empty"></div>`
                )}
              </div>
            `
          )}
        </div>
      </div>
    `;
  }

  _renderLegend(data, unit) {
    const palette = this._getPalette();
    const max = data.maxVal;
    return html`
      <div class="legend">
        <span class="legend-label">Less</span>
        ${palette.map(
          (color, i) => html`
            <div
              class="legend-cell"
              style="background-color:${color}"
              title="${i === 0 ? "0" : ((max / (palette.length - 1)) * i).toFixed(1)} ${unit}"
            ></div>
          `
        )}
        <span class="legend-label">More</span>
      </div>
    `;
  }

  static get styles() {
    return css`
      :host {
        --cell-size: 16px;
        --cell-gap: 2px;
        --cell-radius: 2px;
        --calendar-cell-size: 14px;
      }
      ha-card {
        padding: 0;
        overflow: hidden;
      }
      .card-header {
        padding: 16px 16px 0;
        font-size: 1.2em;
        font-weight: 500;
      }
      .card-content {
        padding: 16px;
        position: relative;
      }
      .card-content.empty {
        text-align: center;
        color: var(--secondary-text-color);
        padding: 32px;
      }
      .section-title {
        font-size: 0.85em;
        font-weight: 500;
        color: var(--secondary-text-color);
        margin: 16px 0 8px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .section-title:first-of-type {
        margin-top: 8px;
      }

      /* Stats */
      .stats-row {
        display: flex;
        justify-content: space-around;
        gap: 8px;
        margin-bottom: 8px;
      }
      .stat {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 8px 12px;
        background: var(--card-background-color, #fff);
        border: 1px solid var(--divider-color, #e0e0e0);
        border-radius: 8px;
        flex: 1;
      }
      .stat-value {
        font-size: 1.1em;
        font-weight: 600;
        color: var(--primary-text-color);
      }
      .stat-label {
        font-size: 0.75em;
        color: var(--secondary-text-color);
        margin-top: 2px;
      }

      /* Heatmap */
      .heatmap-container {
        display: flex;
        overflow-x: auto;
      }
      .heatmap-y-labels {
        display: flex;
        flex-direction: column;
        margin-right: 4px;
      }
      .label-spacer {
        height: 20px;
      }
      .y-label {
        height: var(--cell-size);
        margin-bottom: var(--cell-gap);
        display: flex;
        align-items: center;
        font-size: 0.7em;
        color: var(--secondary-text-color);
        padding-right: 4px;
      }
      .heatmap-grid-wrapper {
        flex: 1;
        min-width: 0;
        overflow-x: auto;
      }
      .heatmap-x-labels {
        display: flex;
        height: 20px;
        padding-left: 0;
      }
      .x-label {
        width: calc((var(--cell-size) + var(--cell-gap)) * 3);
        font-size: 0.7em;
        color: var(--secondary-text-color);
        text-align: center;
      }
      .heatmap-grid {
        display: flex;
        flex-direction: column;
        gap: var(--cell-gap);
      }
      .heatmap-row {
        display: flex;
        gap: var(--cell-gap);
      }
      .heatmap-cell {
        width: var(--cell-size);
        height: var(--cell-size);
        border-radius: var(--cell-radius);
        cursor: pointer;
        transition: opacity 0.15s, transform 0.15s;
      }
      .heatmap-cell:hover {
        opacity: 0.8;
        transform: scale(1.3);
        z-index: 1;
      }

      /* Calendar */
      .calendar-container {
        overflow-x: auto;
      }
      .calendar-grid {
        display: flex;
        gap: var(--cell-gap);
      }
      .calendar-week {
        display: flex;
        flex-direction: column;
        gap: var(--cell-gap);
      }
      .calendar-cell {
        width: var(--calendar-cell-size);
        height: var(--calendar-cell-size);
        border-radius: var(--cell-radius);
        cursor: pointer;
        transition: opacity 0.15s, transform 0.15s;
      }
      .calendar-cell.empty {
        background: transparent;
        cursor: default;
      }
      .calendar-cell:not(.empty):hover {
        opacity: 0.8;
        transform: scale(1.3);
        z-index: 1;
      }

      /* Legend */
      .legend {
        display: flex;
        align-items: center;
        justify-content: flex-end;
        gap: 3px;
        margin-top: 12px;
      }
      .legend-label {
        font-size: 0.7em;
        color: var(--secondary-text-color);
        padding: 0 4px;
      }
      .legend-cell {
        width: 12px;
        height: 12px;
        border-radius: 2px;
      }

      /* Tooltip */
      .tooltip {
        position: absolute;
        background: var(--primary-text-color);
        color: var(--card-background-color, #fff);
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.8em;
        pointer-events: none;
        white-space: nowrap;
        z-index: 10;
        transform: translateX(-50%);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
    `;
  }
}

// Register card
customElements.define("ha-energy-heatmap-card", EnergyHeatmapCard);

// Register in card picker
window.customCards = window.customCards || [];
window.customCards.push({
  type: "ha-energy-heatmap-card",
  name: "Energy Heatmap Card",
  description:
    "Visualize energy consumption as a heatmap grid — like GitHub contributions, but for your energy data.",
  preview: true,
  documentationURL: "https://github.com/MacSiem/ha-energy-heatmap-card",
});

console.info(
  `%c HA-ENERGY-HEATMAP-CARD %c v${CARD_VERSION} `,
  "color: white; background: #30a14e; font-weight: bold; padding: 2px 6px; border-radius: 4px 0 0 4px;",
  "color: #30a14e; background: #ebedf0; font-weight: bold; padding: 2px 6px; border-radius: 0 4px 4px 0;"
);
