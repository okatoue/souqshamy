import { FlexStyle, TextStyle } from 'react-native';

/**
 * Returns the appropriate flexDirection for RTL support
 * @param isRTL - Whether the current layout is RTL
 * @returns flexDirection style object
 */
export function rtlRow(isRTL: boolean): Pick<FlexStyle, 'flexDirection'> {
  return {
    flexDirection: isRTL ? 'row-reverse' : 'row',
  };
}

/**
 * Returns the appropriate textAlign for RTL support
 * @param isRTL - Whether the current layout is RTL
 * @returns textAlign style object
 */
export function rtlTextAlign(isRTL: boolean): Pick<TextStyle, 'textAlign'> {
  return {
    textAlign: isRTL ? 'right' : 'left',
  };
}

/**
 * Returns margin for the start side (left in LTR, right in RTL)
 * @param isRTL - Whether the current layout is RTL
 * @param value - The margin value
 * @returns margin style object
 */
export function rtlMarginStart(
  isRTL: boolean,
  value: number
): Pick<FlexStyle, 'marginLeft' | 'marginRight'> {
  return isRTL ? { marginRight: value } : { marginLeft: value };
}

/**
 * Returns margin for the end side (right in LTR, left in RTL)
 * @param isRTL - Whether the current layout is RTL
 * @param value - The margin value
 * @returns margin style object
 */
export function rtlMarginEnd(
  isRTL: boolean,
  value: number
): Pick<FlexStyle, 'marginLeft' | 'marginRight'> {
  return isRTL ? { marginLeft: value } : { marginRight: value };
}

/**
 * Returns padding for the start side (left in LTR, right in RTL)
 * @param isRTL - Whether the current layout is RTL
 * @param value - The padding value
 * @returns padding style object
 */
export function rtlPaddingStart(
  isRTL: boolean,
  value: number
): Pick<FlexStyle, 'paddingLeft' | 'paddingRight'> {
  return isRTL ? { paddingRight: value } : { paddingLeft: value };
}

/**
 * Returns padding for the end side (right in LTR, left in RTL)
 * @param isRTL - Whether the current layout is RTL
 * @param value - The padding value
 * @returns padding style object
 */
export function rtlPaddingEnd(
  isRTL: boolean,
  value: number
): Pick<FlexStyle, 'paddingLeft' | 'paddingRight'> {
  return isRTL ? { paddingLeft: value } : { paddingRight: value };
}

/**
 * Returns the appropriate icon name for RTL support
 * Useful for directional icons like arrows
 * @param isRTL - Whether the current layout is RTL
 * @param ltrIcon - The icon name for LTR layouts
 * @param rtlIcon - The icon name for RTL layouts
 * @returns The appropriate icon name
 */
export function rtlIcon<T extends string>(
  isRTL: boolean,
  ltrIcon: T,
  rtlIcon: T
): T {
  return isRTL ? rtlIcon : ltrIcon;
}
