'use client';

import { useState } from 'react';

export function useLoadingScreen() {
  const [isLoading, setIsLoading] = useState(true);

  const onLoadingComplete = () => {
    setIsLoading(false);
  };

  return { isLoading, onLoadingComplete };
}
