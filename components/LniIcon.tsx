/**
 * LniIcon — Lineicons icon component for React Native.
 *
 * Usage:
 *   <LniIcon name="lni-check" size={18} color={colors.yellow} />
 *
 * Browse all icon names at https://lineicons.com/icons
 */
import { createIconSet } from '@expo/vector-icons';
import glyphMap from '../node_modules/lineicons/assets/icon-fonts/unicodesMap.json';

const LniIcon = createIconSet(
  glyphMap as Record<string, number>,
  'Lineicons',
  'Lineicons.ttf'
);

export default LniIcon;
export type LniIconName = keyof typeof glyphMap;
