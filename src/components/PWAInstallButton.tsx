import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { MaterialIcon } from './MaterialIcon';

export const PWAInstallButton: React.FC<{ compact?: boolean }> = ({ compact = false }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className={`inline-flex items-center gap-2 rounded-full border border-[var(--color-hairline)] bg-[var(--color-card)] text-[var(--color-ink)] hover:border-[var(--color-ink)] transition font-medium cursor-pointer ${
          compact ? 'px-3 py-1.5 text-xs' : 'px-4 py-2 text-sm'
        }`}
        aria-label="Install MyDay Hub application"
      >
        <MaterialIcon name="install_mobile" size={compact ? 16 : 18} />
        <span>Install App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--color-hairline)] bg-[var(--color-card)] text-[var(--color-ink)] hover:border-[var(--color-ink)] transition font-medium text-xs cursor-pointer ${
            compact ? 'px-2.5 py-1.5' : 'px-3.5 py-2'
          }`}
          aria-label="How to install on iOS"
        >
          <MaterialIcon name="install_mobile" size={compact ? 14 : 16} />
          <span>Install on iOS</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
            <div className="w-full max-w-sm rounded-3xl bg-[var(--color-card)] text-[var(--color-ink)] p-6 border border-[var(--color-hairline)] shadow-xl">
              <div className="flex items-center justify-between pb-3 border-b border-[var(--color-hairline)]">
                <h3 className="font-serif text-xl font-medium tracking-tight">Install on iOS</h3>
                <button
                  onClick={() => setShowIOSGuide(false)}
                  className="p-1 rounded-full text-[var(--color-muted)] hover:text-[var(--color-ink)] cursor-pointer flex items-center justify-center"
                  aria-label="Close installation guide"
                >
                  <MaterialIcon name="close" size={20} />
                </button>
              </div>
              <div className="mt-4 space-y-3 text-xs leading-relaxed text-[var(--color-ink)]">
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] font-mono text-xs font-semibold flex items-center justify-center mt-0.5">
                    1
                  </span>
                  <p>Tap the <strong>Share</strong> button in Safari's bottom toolbar.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] font-mono text-xs font-semibold flex items-center justify-center mt-0.5">
                    2
                  </span>
                  <p>Scroll down and choose <strong>"Add to Home Screen"</strong>.</p>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-lg border border-[var(--color-hairline)] bg-[var(--color-paper)] font-mono text-xs font-semibold flex items-center justify-center mt-0.5">
                    3
                  </span>
                  <p>Open MyDay Hub directly from your home screen for offline use.</p>
                </div>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-6 w-full rounded-full bg-[var(--color-ink)] text-[var(--color-paper)] py-2 text-xs font-semibold hover:opacity-90 transition cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
