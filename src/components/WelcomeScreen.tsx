import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { Logo } from './Logo';

interface WelcomeScreenProps {
  onComplete: () => void;
}

export const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onComplete }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onComplete();
    }, 2800);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
      onClick={onComplete}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--color-paper)] text-[var(--color-ink)] p-6 cursor-pointer select-none paper-grain"
      role="button"
      tabIndex={0}
      aria-label="Welcome to MyDay Hub. Tap to continue."
    >
      <div className="flex flex-col items-center text-center max-w-sm">
        {/* Animated Developer Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <Logo size={120} animate={true} />
        </motion.div>

        {/* App Title settling beneath */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="space-y-2"
        >
          <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-[var(--color-ink)]">
            MyDay Hub
          </h1>
          <div className="h-[1px] w-10 bg-[var(--color-hairline)] mx-auto my-2" />
          <p className="text-xs uppercase tracking-[0.2em] text-[var(--color-muted)] font-mono font-medium">
            Personal Offline Journal
          </p>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.45 }}
          transition={{ delay: 1.8, duration: 0.6 }}
          className="mt-14 text-xs font-mono text-[var(--color-muted)] tracking-wider"
        >
          Tap to begin
        </motion.p>
      </div>
    </motion.div>
  );
};
