import IMask from 'imask';
import { useEffect, useRef } from 'react';

export const usePhoneMask = () => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let mask: any = null;
    if (inputRef.current) {
      mask = IMask(inputRef.current, {
        mask: '+00 (00) 00000-0000',
      });
    }
    return () => {
      mask?.destroy();
    };
  }, []);

  return inputRef;
};
