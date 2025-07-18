import { useState, useCallback } from 'react';

interface UseClipboardReturn {
  copied: boolean;
  copyToClipboard: (text: string) => Promise<boolean>;
  copySuccess: () => void;
  copyError: () => void;
}

const useClipboard = (resetDelay = 2000): UseClipboardReturn => {
  const [copied, setCopied] = useState(false);

  const resetCopiedState = useCallback(() => {
    setTimeout(() => {
      setCopied(false);
    }, resetDelay);
  }, [resetDelay]);

  const copySuccess = useCallback(() => {
    setCopied(true);
    resetCopiedState();
  }, [resetCopiedState]);

  const copyError = useCallback(() => {
    setCopied(false);
    console.error('Failed to copy text to clipboard');
  }, []);

  const copyToClipboard = useCallback(
    async (text: string): Promise<boolean> => {
      if (!navigator.clipboard) {
        try {
          // Fallback for older browsers
          const textArea = document.createElement('textarea');
          textArea.value = text;
          
          // Make the textarea out of viewport
          textArea.style.position = 'fixed';
          textArea.style.left = '-999999px';
          textArea.style.top = '-999999px';
          document.body.appendChild(textArea);
          textArea.focus();
          textArea.select();
          
          const successful = document.execCommand('copy');
          document.body.removeChild(textArea);
          
          if (successful) {
            copySuccess();
            return true;
          } else {
            copyError();
            return false;
          }
        } catch (err) {
          copyError();
          return false;
        }
      }

      try {
        await navigator.clipboard.writeText(text);
        copySuccess();
        return true;
      } catch (err) {
        copyError();
        return false;
      }
    },
    [copySuccess, copyError]
  );

  return {
    copied,
    copyToClipboard,
    copySuccess,
    copyError,
  };
};

export default useClipboard;