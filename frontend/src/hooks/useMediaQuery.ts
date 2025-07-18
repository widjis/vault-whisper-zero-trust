import { useState, useEffect } from 'react';

type MediaQueryType = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface MediaQueryConfig {
  xs: string;
  sm: string;
  md: string;
  lg: string;
  xl: string;
}

const defaultMediaQueries: MediaQueryConfig = {
  xs: '(max-width: 599px)',
  sm: '(min-width: 600px) and (max-width: 959px)',
  md: '(min-width: 960px) and (max-width: 1279px)',
  lg: '(min-width: 1280px) and (max-width: 1919px)',
  xl: '(min-width: 1920px)',
};

interface UseMediaQueryReturn {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  activeBreakpoint: MediaQueryType;
  breakpoints: Record<MediaQueryType, boolean>;
}

const useMediaQuery = (config: MediaQueryConfig = defaultMediaQueries): UseMediaQueryReturn => {
  const [breakpoints, setBreakpoints] = useState<Record<MediaQueryType, boolean>>({
    xs: false,
    sm: false,
    md: false,
    lg: false,
    xl: false,
  });

  useEffect(() => {
    // Create media query lists
    const mediaQueryLists = {
      xs: window.matchMedia(config.xs),
      sm: window.matchMedia(config.sm),
      md: window.matchMedia(config.md),
      lg: window.matchMedia(config.lg),
      xl: window.matchMedia(config.xl),
    };

    // Initial check
    const getCurrentBreakpoints = () => ({
      xs: mediaQueryLists.xs.matches,
      sm: mediaQueryLists.sm.matches,
      md: mediaQueryLists.md.matches,
      lg: mediaQueryLists.lg.matches,
      xl: mediaQueryLists.xl.matches,
    });

    setBreakpoints(getCurrentBreakpoints());

    // Event listeners for breakpoint changes
    const handleChange = () => {
      setBreakpoints(getCurrentBreakpoints());
    };

    // Add listeners
    Object.values(mediaQueryLists).forEach((mql) => {
      mql.addEventListener('change', handleChange);
    });

    // Cleanup
    return () => {
      Object.values(mediaQueryLists).forEach((mql) => {
        mql.removeEventListener('change', handleChange);
      });
    };
  }, [config]);

  // Determine active breakpoint (the smallest one that matches)
  const activeBreakpoint: MediaQueryType = (
    Object.entries(breakpoints).find(([, matches]) => matches)?.[0] as MediaQueryType
  ) || 'md'; // Default to 'md' if none match

  // Convenience flags
  const isMobile = breakpoints.xs || breakpoints.sm;
  const isTablet = breakpoints.md;
  const isDesktop = breakpoints.lg || breakpoints.xl;

  return {
    isMobile,
    isTablet,
    isDesktop,
    activeBreakpoint,
    breakpoints,
  };
};

export default useMediaQuery;