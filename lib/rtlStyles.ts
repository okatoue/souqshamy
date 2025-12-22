// RTL-aware style helpers
import { FlexStyle, TextStyle, ViewStyle, StyleSheet, I18nManager } from 'react-native';

/**
 * Get the current RTL state from React Native's I18nManager
 */
export function isRTL(): boolean {
  return I18nManager.isRTL;
}

/**
 * Create an RTL-aware flexDirection for row layouts
 */
export function rtlRow(forceRTL?: boolean): Pick<FlexStyle, 'flexDirection'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    flexDirection: isRtl ? 'row-reverse' : 'row',
  };
}

/**
 * Create an RTL-aware textAlign
 */
export function rtlTextAlign(forceRTL?: boolean): Pick<TextStyle, 'textAlign'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    textAlign: isRtl ? 'right' : 'left',
  };
}

/**
 * Create RTL-aware horizontal margin (left becomes right in RTL)
 */
export function rtlMarginStart(value: number, forceRTL?: boolean): Pick<ViewStyle, 'marginLeft' | 'marginRight'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    marginLeft: isRtl ? 0 : value,
    marginRight: isRtl ? value : 0,
  };
}

/**
 * Create RTL-aware horizontal margin for the end side (right becomes left in RTL)
 */
export function rtlMarginEnd(value: number, forceRTL?: boolean): Pick<ViewStyle, 'marginLeft' | 'marginRight'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    marginLeft: isRtl ? value : 0,
    marginRight: isRtl ? 0 : value,
  };
}

/**
 * Create RTL-aware horizontal padding (left becomes right in RTL)
 */
export function rtlPaddingStart(value: number, forceRTL?: boolean): Pick<ViewStyle, 'paddingLeft' | 'paddingRight'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    paddingLeft: isRtl ? 0 : value,
    paddingRight: isRtl ? value : 0,
  };
}

/**
 * Create RTL-aware horizontal padding for the end side (right becomes left in RTL)
 */
export function rtlPaddingEnd(value: number, forceRTL?: boolean): Pick<ViewStyle, 'paddingLeft' | 'paddingRight'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    paddingLeft: isRtl ? value : 0,
    paddingRight: isRtl ? 0 : value,
  };
}

/**
 * Create RTL-aware absolute positioning for start side (left becomes right in RTL)
 */
export function rtlAbsoluteStart(value: number, forceRTL?: boolean): Pick<ViewStyle, 'left' | 'right'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    left: isRtl ? undefined : value,
    right: isRtl ? value : undefined,
  };
}

/**
 * Create RTL-aware absolute positioning for end side (right becomes left in RTL)
 */
export function rtlAbsoluteEnd(value: number, forceRTL?: boolean): Pick<ViewStyle, 'left' | 'right'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    left: isRtl ? value : undefined,
    right: isRtl ? undefined : value,
  };
}

/**
 * Get RTL-aware alignment for flex items
 */
export function rtlAlignSelf(forceRTL?: boolean): Pick<FlexStyle, 'alignSelf'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    alignSelf: isRtl ? 'flex-end' : 'flex-start',
  };
}

/**
 * Get RTL-aware justify content
 */
export function rtlJustifyContent(forceRTL?: boolean): Pick<FlexStyle, 'justifyContent'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    justifyContent: isRtl ? 'flex-end' : 'flex-start',
  };
}

/**
 * Get the correct chevron icon name based on RTL state
 */
export function rtlChevron(direction: 'forward' | 'back', forceRTL?: boolean): 'chevron-forward' | 'chevron-back' {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();

  if (direction === 'forward') {
    return isRtl ? 'chevron-back' : 'chevron-forward';
  } else {
    return isRtl ? 'chevron-forward' : 'chevron-back';
  }
}

/**
 * Get the correct arrow icon name based on RTL state
 */
export function rtlArrow(direction: 'forward' | 'back', forceRTL?: boolean): 'arrow-forward' | 'arrow-back' {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();

  if (direction === 'forward') {
    return isRtl ? 'arrow-back' : 'arrow-forward';
  } else {
    return isRtl ? 'arrow-forward' : 'arrow-back';
  }
}

/**
 * Transform a value for RTL (useful for rotate transforms)
 */
export function rtlTransform(value: number, forceRTL?: boolean): number {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return isRtl ? -value : value;
}

/**
 * Create RTL-aware scale transform (useful for flipping icons)
 */
export function rtlScaleX(forceRTL?: boolean): { transform: [{ scaleX: number }] } {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return {
    transform: [{ scaleX: isRtl ? -1 : 1 }],
  };
}

/**
 * Create RTL-aware border radius (swap left/right radii)
 */
export function rtlBorderRadius(
  topStart: number,
  topEnd: number,
  bottomEnd: number,
  bottomStart: number,
  forceRTL?: boolean
): Pick<ViewStyle, 'borderTopLeftRadius' | 'borderTopRightRadius' | 'borderBottomLeftRadius' | 'borderBottomRightRadius'> {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();

  return {
    borderTopLeftRadius: isRtl ? topEnd : topStart,
    borderTopRightRadius: isRtl ? topStart : topEnd,
    borderBottomLeftRadius: isRtl ? bottomEnd : bottomStart,
    borderBottomRightRadius: isRtl ? bottomStart : bottomEnd,
  };
}

/**
 * Create a complete RTL-aware row container style
 */
export function rtlRowContainer(baseStyle?: ViewStyle, forceRTL?: boolean): ViewStyle {
  return {
    ...baseStyle,
    ...rtlRow(forceRTL),
  };
}

/**
 * Utility to conditionally apply styles based on RTL state
 */
export function rtlStyle<T extends ViewStyle | TextStyle>(
  ltrStyle: T,
  rtlStyleOverride: Partial<T>,
  forceRTL?: boolean
): T {
  const isRtl = forceRTL !== undefined ? forceRTL : isRTL();
  return isRtl ? { ...ltrStyle, ...rtlStyleOverride } : ltrStyle;
}

/**
 * Pre-built common RTL styles
 */
export const RTLStyles = StyleSheet.create({
  rowLTR: {
    flexDirection: 'row',
  },
  rowRTL: {
    flexDirection: 'row-reverse',
  },
  textAlignLeft: {
    textAlign: 'left',
  },
  textAlignRight: {
    textAlign: 'right',
  },
  textAlignStart: {
    textAlign: I18nManager.isRTL ? 'right' : 'left',
  },
  textAlignEnd: {
    textAlign: I18nManager.isRTL ? 'left' : 'right',
  },
});
