import { useEffect, useRef, useCallback, useMemo } from 'react';
import { useAppStore } from '../store';

// Advanced debounce hook with cleanup
export function useDebounce<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const timeoutRef = useRef<NodeJS.Timeout>();
  
  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      
      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay, ...deps]
  ) as T;
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  return debouncedCallback;
}

// Advanced throttle hook
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
  deps: React.DependencyList = []
): T {
  const lastRun = useRef(Date.now());
  
  const throttledCallback = useCallback(
    (...args: Parameters<T>) => {
      if (Date.now() - lastRun.current >= delay) {
        callback(...args);
        lastRun.current = Date.now();
      }
    },
    [callback, delay, ...deps]
  ) as T;
  
  return throttledCallback;
}

// Intersection Observer hook for virtual scrolling
export function useIntersectionObserver(
  options: IntersectionObserverInit = {}
) {
  const elementRef = useRef<HTMLElement>(null);
  const observerRef = useRef<IntersectionObserver>();
  
  const observe = useCallback((callback: (entry: IntersectionObserverEntry) => void) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach(callback);
      },
      options
    );
    
    if (elementRef.current) {
      observerRef.current.observe(elementRef.current);
    }
  }, [options]);
  
  useEffect(() => {
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);
  
  return { elementRef, observe };
}

// Advanced local storage hook with serialization
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  serializer = JSON
) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? serializer.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  });
  
  const setValue = useCallback(
    (value: T | ((val: T) => T)) => {
      try {
        const valueToStore = value instanceof Function ? value(storedValue) : value;
        setStoredValue(valueToStore);
        window.localStorage.setItem(key, serializer.stringify(valueToStore));
      } catch (error) {
        console.warn(`Error setting localStorage key "${key}":`, error);
      }
    },
    [key, storedValue, serializer]
  );
  
  const removeValue = useCallback(() => {
    try {
      window.localStorage.removeItem(key);
      setStoredValue(defaultValue);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  }, [key, defaultValue]);
  
  return [storedValue, setValue, removeValue] as const;
}

// Session timeout hook
export function useSessionTimeout() {
  const { isAuthenticated, signOut, updateLastActivity } = useAppStore();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const idleTimeoutRef = useRef<NodeJS.Timeout>();
  
  const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  const IDLE_TIMEOUT = 15 * 60 * 1000; // 15 minutes
  
  const resetTimers = useCallback(() => {
    if (!isAuthenticated) return;
    
    // Clear existing timers
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    
    // Set session timeout
    timeoutRef.current = setTimeout(() => {
      signOut();
    }, SESSION_TIMEOUT);
    
    // Set idle timeout
    idleTimeoutRef.current = setTimeout(() => {
      signOut();
    }, IDLE_TIMEOUT);
    
    updateLastActivity();
  }, [isAuthenticated, signOut, updateLastActivity]);
  
  useEffect(() => {
    if (!isAuthenticated) return;
    
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    const handleActivity = () => {
      resetTimers();
    };
    
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
    
    resetTimers();
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (idleTimeoutRef.current) clearTimeout(idleTimeoutRef.current);
    };
  }, [isAuthenticated, resetTimers]);
}

// Keyboard shortcuts hook
export function useKeyboardShortcuts(shortcuts: Record<string, () => void>) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = [
        event.ctrlKey && 'ctrl',
        event.metaKey && 'meta',
        event.shiftKey && 'shift',
        event.altKey && 'alt',
        event.key.toLowerCase()
      ].filter(Boolean).join('+');
      
      const handler = shortcuts[key];
      if (handler) {
        event.preventDefault();
        handler();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [shortcuts]);
}

// Virtual scrolling hook for large lists
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number,
  containerHeight: number,
  overscan: number = 5
) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );
    
    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);
  
  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1).map((item, index) => ({
      item,
      index: visibleRange.start + index
    }));
  }, [items, visibleRange]);
  
  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;
  
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop);
  }, []);
  
  return {
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  };
}

// Form validation hook
export function useFormValidation<T extends Record<string, any>>(
  initialValues: T,
  validationRules: Record<keyof T, (value: any) => string | null>
) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  
  const validateField = useCallback((name: keyof T, value: any) => {
    const rule = validationRules[name];
    return rule ? rule(value) : null;
  }, [validationRules]);
  
  const setValue = useCallback((name: keyof T, value: any) => {
    setValues(prev => ({ ...prev, [name]: value }));
    
    // Validate if field has been touched
    if (touched[name]) {
      const error = validateField(name, value);
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [touched, validateField]);
  
  const setTouched = useCallback((name: keyof T) => {
    setTouched(prev => ({ ...prev, [name]: true }));
    
    // Validate when field is touched
    const error = validateField(name, values[name]);
    setErrors(prev => ({ ...prev, [name]: error }));
  }, [values, validateField]);
  
  const validateAll = useCallback(() => {
    const newErrors: Partial<Record<keyof T, string>> = {};
    let isValid = true;
    
    Object.keys(values).forEach(key => {
      const error = validateField(key as keyof T, values[key as keyof T]);
      if (error) {
        newErrors[key as keyof T] = error;
        isValid = false;
      }
    });
    
    setErrors(newErrors);
    setTouched(Object.keys(values).reduce((acc, key) => {
      acc[key as keyof T] = true;
      return acc;
    }, {} as Record<keyof T, boolean>));
    
    return isValid;
  }, [values, validateField]);
  
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
  }, [initialValues]);
  
  const isValid = useMemo(() => {
    return Object.values(errors).every(error => !error);
  }, [errors]);
  
  return {
    values,
    errors,
    touched,
    isValid,
    setValue,
    setTouched,
    validateAll,
    reset
  };
}