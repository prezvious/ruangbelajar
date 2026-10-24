import {
  THEME_OPTIONS as sela,
  getThemeByKey as selaTheme,
  getThemeTokens as selaTokens,
} from './vendor/themes.mjs';
const palettes = [
  ['olive', 'Olive', '#4d5d3c', '#39472e', '#f8f9f5'],
  ['ocean', 'Ocean', '#3b6374', '#233f4b', '#f5f8fa'],
  ['terracotta', 'Terracotta', '#89553f', '#603c2e', '#faf7f3'],
  ['plum', 'Plum', '#725575', '#4e3851', '#faf7fa'],
];
const ruang = palettes.map(([key, name, accent, dark, sidebar]) => ({
  key,
  name,
  collection: 'ruang',
  colors: ['#ffffff', accent, dark, sidebar],
  layout: { panelRadius: '12px' },
  accent,
  dark,
  sidebar,
}));
export const THEME_OPTIONS = [...ruang, ...sela];
export const getThemeByKey = (key) =>
  ruang.find((x) => x.key === key) || selaTheme(key);
export function getThemeTokens(key, mode = 'light') {
  const theme = ruang.find((x) => x.key === key);
  if (!theme) return selaTokens(key, mode);
  const base = { ...selaTokens('carbon-paper', mode) },
    dark = mode === 'dark';
  const [nightAccent, nightFocus, nightSelected] = {
    olive: ['#c5d5b5', '#d7e7c7', '#37492a'],
    ocean: ['#b1d5e3', '#d0e8f1', '#294653'],
    terracotta: ['#e4c4b5', '#f0dbd1', '#51382c'],
    plum: ['#d9bedc', '#ead5ec', '#49334c'],
  }[key];
  return {
    ...base,
    accentMain: dark ? nightAccent : theme.accent,
    textAccent: dark ? nightAccent : theme.accent,
    focusRing: dark ? nightFocus : theme.accent,
    paper: dark ? '#191d18' : '#ffffff',
    paperStrong: dark ? '#242a22' : theme.sidebar,
    surfaceInput: dark ? '#20261e' : '#ffffff',
    surfaceRaised: dark ? '#242b21' : theme.sidebar,
    surfaceRaisedStrong: dark ? '#20261e' : '#ffffff',
    textMain: dark ? '#edf1e8' : '#292d25',
    textSubtle: dark ? '#b6c0ad' : '#62695b',
    ink900: dark ? '#edf1e8' : '#292d25',
    line: dark ? '#7e8b73' : '#bac2b2',
    controlBorder: dark ? '#68775c' : '#b3bea9',
    headerSurface: dark ? '#151a13' : theme.sidebar,
    headerSurfaceAlt: dark ? '#151a13' : theme.sidebar,
    headerControlSurface: dark ? nightSelected : '#eef2e8',
    headerText: dark ? '#edf1e8' : '#292d25',
    headerTextSubtle: dark ? '#bdc9b1' : '#62695b',
    headerControlBorder: dark ? '#56644a' : '#d5dccd',
    buttonStrongText: dark ? '#192113' : '#ffffff',
    surfaceSelected: dark ? nightSelected : '#eef2e8',
  };
}
