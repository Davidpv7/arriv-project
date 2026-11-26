import { useWindowDimensions } from 'react-native';

/** Width from which the app uses its desktop layout (sidebar, two panes, side columns). */
export const WIDE_MIN_WIDTH = 1024;

/**
 * True on wide screens (desktop web, big tablets). Phones, and the web at phone width,
 * always get the mobile layout. Re-renders when the window is resized.
 */
export function useIsWide(): boolean {
  const { width } = useWindowDimensions();
  return width >= WIDE_MIN_WIDTH;
}
