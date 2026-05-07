import IMask from 'imask';
import { useEffect, useRef } from 'react';

export const usePhoneMask = () => {
  const inputRef = useRef<HTMLInputElement>(null);
  const maskRef = useRef<IMask.InputMask<IMask.MaskedPattern> | null>(null);

  useEffect(() => {
    if (inputRef.current) {
      maskRef.current = IMask(inputRef.current, {
        mask: '+00 (00) 00000-0000',
      });
    }
    return () => {
      maskRef.current?.destroy();
    };
  }, []);

  return inputRef;
};
