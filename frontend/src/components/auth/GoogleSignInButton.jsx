// src/components/auth/GoogleSignInButton.jsx
//
// Renders Google's own "Sign in with Google" button via Google Identity
// Services (GIS) — https://accounts.google.com/gsi/client. We don't build a
// custom button that calls a Google API ourselves; GIS owns the whole
// widget and hands us back a signed ID token (`credential`), which we send
// to POST /api/auth/google for the backend to verify.
import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { AlertTriangle } from 'lucide-react';
import { googleLogin } from '../../redux/authSlice';
import { useTheme } from '../../hooks/useTheme';

const GIS_SCRIPT_SRC = 'https://accounts.google.com/gsi/client';
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function loadGisScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) return resolve();

    const existing = document.querySelector(`script[src="${GIS_SCRIPT_SRC}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve());
      existing.addEventListener('error', reject);
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_SRC;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export default function GoogleSignInButton() {
  const dispatch = useDispatch();
  const { theme } = useTheme();
  const containerRef = useRef(null);
  const [scriptError, setScriptError] = useState(false);

  useEffect(() => {
    if (!CLIENT_ID) return; // unconfigured — render the placeholder below instead

    let cancelled = false;

    loadGisScript()
      .then(() => {
        if (cancelled || !containerRef.current) return;

        window.google.accounts.id.initialize({
          client_id: CLIENT_ID,
          callback: (response) => {
            dispatch(googleLogin(response.credential));
          },
        });

        containerRef.current.innerHTML = ''; // clear before re-render (e.g. on theme change)
        window.google.accounts.id.renderButton(containerRef.current, {
          type: 'standard',
          theme: theme === 'dark' ? 'filled_black' : 'outline',
          size: 'large',
          width: 320,
          text: 'continue_with',
          shape: 'rectangular',
        });
      })
      .catch(() => {
        if (!cancelled) setScriptError(true);
      });

    return () => {
      cancelled = true;
    };
  }, [dispatch, theme]);

  if (!CLIENT_ID) {
    return (
      <div
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5 text-xs text-ink-muted"
        title="Set VITE_GOOGLE_CLIENT_ID in your .env to enable Google sign-in"
      >
        <AlertTriangle size={14} />
        Google sign-in isn&apos;t configured
      </div>
    );
  }

  if (scriptError) {
    return (
      <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5 text-xs text-urgent">
        <AlertTriangle size={14} />
        Couldn&apos;t load Google sign-in — check your connection
      </div>
    );
  }

  // GIS renders its own <div>/<iframe> button inside this container.
  return <div ref={containerRef} className="flex w-full justify-center" />;
}
