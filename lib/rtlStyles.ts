import { FlexStyle, I18nManager, TextStyle } from 'react-native';

/**
 * Returns the appropriate flexDirection for RTL support
 * When I18nManager.isRTL is true, the system automatically mirrors 'row' layouts,
 * so we should NOT use 'row-reverse' (which would double-reverse back to LTR).
 * @param isRTL - Whether the current layout is RTL
 * @returns flexDirection style object
 */
export function rtlRow(isRTL: boolean): Pick<FlexStyle, 'flexDirection'> {
  // If system RTL is enabled, layout is automatically mirrored
  // Just use normal 'row' and let the system handle it
  if (I18nManager.isRTL) {
    return { flexDirection: 'row' };
  }

  // System doesn't handle RTL, manually reverse for RTL languages
  return {
    flexDirection: isRTL ? 'row-reverse' : 'row',
  };
}

/**
 * Returns the appropriate textAlign for RTL support
 * When I18nManager.isRTL is true, React Native treats 'left'/'right' as 'start'/'end'
 * which are then flipped in RTL mode. We need to counteract this by using the opposite value.
 * @param isRTL - Whether the current layout is RTL
 * @returns textAlign style object
 */
export function rtlTextAlign(isRTL: boolean): Pick<TextStyle, 'textAlign'> {
  // When I18nManager.isRTL is true, 'left'/'right' are interpreted as 'start'/'end'
  // and get flipped in RTL mode. Use the opposite value to counteract this.
  if (I18nManager.isRTL) {
    return {
      textAlign: isRTL ? 'left' : 'right',
    };
  }

  // System doesn't handle RTL, set alignment normally
  return {
    textAlign: isRTL ? 'right' : 'left',
  };
}

/**
 * Returns margin for the start side (left in LTR, right in RTL)
 * When I18nManager.isRTL is true, the system handles direction, so use marginLeft.
 * @param isRTL - Whether the current layout is RTL
 * @param value - The margin value
 * @returns margin style object
 */
export function rtlMarginStart(
  isRTL: boolean,
  value: number
): Pick<FlexStyle, 'marginLeft' | 'marginRight'> {
  // If system RTL is enabled, layout is mirrored - use marginLeft
  if (I18nManager.isRTL) {
    return { marginLeft: value };
  }
  return isRTL ? { marginRight: value } : { marginLeft: value };
}

/**
 * Returns margin for the end side (right in LTR, left in RTL)
 * When I18nManager.isRTL is true, the system handles direction, so use marginRight.
 * @param isRTL - Whether the current layout is RTL
 * @param value - The margin value
 * @returns margin style object
 */
export function rtlMarginEnd(
  isRTL: boolean,
  value: number
): Pick<FlexStyle, 'marginLeft' | 'marginRight'> {
  // If system RTL is enabled, layout is mirrored - use marginRight
  if (I18nManager.isRTL) {
    return { marginRight: value };
  }
  return isRTL ? { marginLeft: value } : { marginRight: value };
}

/**
 * Returns padding for the start side (left in LTR, right in RTL)
 * When I18nManager.isRTL is true, the system handles direction, so use paddingLeft.
 * @param isRTL - Whether the current layout is RTL
 * @param value - The padding value
 * @returns padding style object
 */
export function rtlPaddingStart(
  isRTL: boolean,
  value: number
): Pick<FlexStyle, 'paddingLeft' | 'paddingRight'> {
  // If system RTL is enabled, layout is mirrored - use paddingLeft
  if (I18nManager.isRTL) {
    return { paddingLeft: value };
  }
  return isRTL ? { paddingRight: value } : { paddingLeft: value };
}

/**
 * Returns padding for the end side (right in LTR, left in RTL)
 * When I18nManager.isRTL is true, the system handles direction, so use paddingRight.
 * @param isRTL - Whether the current layout is RTL
 * @param value - The padding value
 * @returns padding style object
 */
export function rtlPaddingEnd(
  isRTL: boolean,
  value: number
): Pick<FlexStyle, 'paddingLeft' | 'paddingRight'> {
  // If system RTL is enabled, layout is mirrored - use paddingRight
  if (I18nManager.isRTL) {
    return { paddingRight: value };
  }
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

/**
 * Returns margin auto for the start side (left in LTR, right in RTL)
 * Useful for pushing elements to the end of a flex container
 * When I18nManager.isRTL is true, the system handles direction, so use marginLeft.
 * @param isRTL - Whether the current layout is RTL
 * @returns margin style object with auto value
 */
export function rtlMarginStartAuto(
  isRTL: boolean
): Pick<FlexStyle, 'marginLeft' | 'marginRight'> {
  // If system RTL is enabled, layout is mirrored - use marginLeft
  if (I18nManager.isRTL) {
    return { marginLeft: 'auto' };
  }
  return isRTL ? { marginRight: 'auto' } : { marginLeft: 'auto' };
}

/**
 * Returns margin auto for the end side (right in LTR, left in RTL)
 * Useful for pushing elements to the start of a flex container
 * When I18nManager.isRTL is true, the system handles direction, so use marginRight.
 * @param isRTL - Whether the current layout is RTL
 * @returns margin style object with auto value
 */
export function rtlMarginEndAuto(
  isRTL: boolean
): Pick<FlexStyle, 'marginLeft' | 'marginRight'> {
  // If system RTL is enabled, layout is mirrored - use marginRight
  if (I18nManager.isRTL) {
    return { marginRight: 'auto' };
  }
  return isRTL ? { marginLeft: 'auto' } : { marginRight: 'auto' };
}
