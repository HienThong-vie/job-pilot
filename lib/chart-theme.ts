// Recharts takes SVG props, not class names, so the dashboard's chart styling
// lives here as token references — never hex values.

export const AXIS_TICK = { fill: "var(--color-chart-axis)", fontSize: 12 };

export const GRID_STROKE = "var(--color-border)";

export const Y_AXIS_WIDTH = 40;
export const Y_AXIS_TICK_MARGIN = 8;
export const X_AXIS_HEIGHT = 30;
export const X_AXIS_TICK_MARGIN = 16;

export const CHART_MARGIN = { top: 18, right: 10, bottom: 0, left: 0 };

// Every chart is the same height. The research card sits its chart at the
// bottom so the card can stretch to the Recent Activity card beside it.
export const CHART_HEIGHT_CLASS = "h-72";
