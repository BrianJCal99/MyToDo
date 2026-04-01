// Priority indicator colors — semantic, same in light and dark
export const PRIORITY_COLORS = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
} as const;

export interface ThemeColors {
  yellow: string;      // primary accent — same in both themes
  black: string;       // always #111111 — for text on yellow buttons/checkboxes
  background: string;  // screen background
  surface: string;     // cards, inputs, sidebar
  border: string;      // dividers and input outlines
  text: string;        // primary readable text
  muted: string;       // secondary text
  placeholder: string; // input placeholder
  disabled: string;    // disabled button background
  disabledText: string;
}

export const lightColors: ThemeColors = {
  yellow: '#FFD600',
  black: '#111111',
  background: '#F7F7F0',
  surface: '#FFFFFF',
  border: '#E0E0D5',
  text: '#111111',
  muted: '#777777',
  placeholder: '#AAAAAA',
  disabled: '#FFF5B0',
  disabledText: '#B8A000',
};

export const darkColors: ThemeColors = {
  yellow: '#FFD600',
  black: '#111111',
  background: '#111111',
  surface: '#1A1A1A',
  border: '#2C2C2C',
  text: '#FFFFFF',
  muted: '#888888',
  placeholder: '#555555',
  disabled: '#3A3200',
  disabledText: '#7A6A00',
};
