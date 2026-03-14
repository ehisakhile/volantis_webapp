import { useState, useEffect } from 'react';

export function useVisibilityChange() {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if document is defined (for SSR)
    if (typeof document === 'undefined') return;

    setIsVisible(!document.hidden);

    const handleVisibilityChange = () => {
      setIsVisible(!document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  return isVisible;
}