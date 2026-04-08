'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential?: string }) => void;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              type?: 'standard' | 'icon';
              theme?: 'outline' | 'filled_blue' | 'filled_black';
              size?: 'large' | 'medium' | 'small';
              text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
              shape?: 'rectangular' | 'pill' | 'circle' | 'square';
              logo_alignment?: 'left' | 'center';
              width?: number;
            }
          ) => void;
        };
      };
    };
  }
}

type GoogleAuthButtonProps = {
  mode: 'signin' | 'signup';
  onCredential: (credential: string) => Promise<void> | void;
  onError: (message: string) => void;
};

export function GoogleAuthButton({ mode, onCredential, onError }: GoogleAuthButtonProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const initializedRef = useRef(false);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  }, [onCredential, onError]);

  useEffect(() => {
    const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      onErrorRef.current('Missing NEXT_PUBLIC_GOOGLE_CLIENT_ID');
      return;
    }

    const initGoogleButton = () => {
      if (!window.google?.accounts?.id || !containerRef.current) return;
      const containerWidth = Math.max(
        220,
        Math.floor(containerRef.current.getBoundingClientRect().width || 0)
      );

      if (!initializedRef.current) {
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: async (response) => {
            if (!response.credential) {
              onErrorRef.current('Google credential missing');
              return;
            }
            await onCredentialRef.current(response.credential);
          },
        });
        initializedRef.current = true;
      }

      containerRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(containerRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: mode === 'signup' ? 'signup_with' : 'signin_with',
        shape: 'pill',
        logo_alignment: 'left',
        width: containerWidth,
      });
      setReady(true);
    };

    const existingScript = document.getElementById('google-gsi-script');
    if (existingScript) {
      initGoogleButton();
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.id = 'google-gsi-script';
    script.onload = initGoogleButton;
    script.onerror = () => onErrorRef.current('Failed to load Google Identity script');
    document.body.appendChild(script);
  }, [mode]);

  return (
    <div className="flex flex-col items-center gap-2">
      <div ref={containerRef} className="w-full" />
      {!ready ? <p className="text-xs text-muted-foreground">Loading Google...</p> : null}
    </div>
  );
}
