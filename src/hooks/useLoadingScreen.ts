'use client';

import { useState, useEffect } from 'react';

const SESSION_KEY = 'jpr_loading_done';

export function useLoadingScreen() {
  // Start as loading=true, but immediately check sessionStorage on mount
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check sessionStorage — if already seen this session, skip loading
    try {
      const done = sessionStorage.getItem(SESSION_KEY);
      if (done === 'true') {
        setIsLoading(false);
        return;
      }
    } catch {
      // sessionStorage unavailable — skip loading
      setIsLoading(false);
      return;
    }
    // Otherwise: keep loading=true, LoadingScreen will call onLoadingComplete
  }, []);

  const onLoadingComplete = () => {
    try {
      sessionStorage.setItem(SESSION_KEY, 'true');
    } catch {
      // ignore
    }
    setIsLoading(false);
  };

  return { isLoading, onLoadingComplete };
}
