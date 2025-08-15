/**
 * Creates a debounced function that delays invoking the provided function
 * until after the specified wait time has elapsed since the last time it was invoked.
 * 
 * @param func The function to debounce
 * @param wait The number of milliseconds to delay
 * @returns A debounced version of the function with a flush method
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): {
  (...args: Parameters<T>): void;
  flush: () => void;
  cancel: () => void;
} {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: Parameters<T> | null = null;

  const debouncedFunction = (...args: Parameters<T>): void => {
    lastArgs = args;
    
    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(() => {
      if (lastArgs) {
        func(...lastArgs);
      }
      timeout = null;
      lastArgs = null;
    }, wait);
  };

  debouncedFunction.flush = () => {
    if (timeout && lastArgs) {
      clearTimeout(timeout);
      func(...lastArgs);
      timeout = null;
      lastArgs = null;
    }
  };

  debouncedFunction.cancel = () => {
    if (timeout) {
      clearTimeout(timeout);
      timeout = null;
      lastArgs = null;
    }
  };

  return debouncedFunction;
}

/**
 * Creates a debounced callback function, similar to the useDebouncedCallback hook from use-debounce
 * 
 * @param callback The function to debounce
 * @param delay The number of milliseconds to delay
 * @returns A debounced version of the callback
 */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number
): {
  (...args: Parameters<T>): void;
  flush: () => void;
  cancel: () => void;
} {
  return debounce(callback, delay);
}