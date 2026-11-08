import React from 'react';
import { motion } from 'motion/react';

interface LogoProps {
  className?: string;
  size?: number;
  animate?: boolean;
  strokeColor?: string;
  accentColor?: string;
}

export const Logo: React.FC<LogoProps> = ({
  className = '',
  size = 56,
  animate = false,
  strokeColor = 'var(--color-ink)',
  accentColor = 'var(--color-saffron)',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="MyDay Hub Monogram"
      role="img"
    >
      {/* Center vertical bar */}
      <motion.line
        x1="256"
        y1="40"
        x2="256"
        y2="472"
        stroke={strokeColor}
        strokeWidth="24"
        strokeLinecap="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Left 'D' frame */}
      <motion.path
        d="M 90 100 L 256 100 C 356 100, 356 412, 256 412 L 90 412 Z"
        stroke={strokeColor}
        strokeWidth="24"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Right 'D' frame */}
      <motion.path
        d="M 422 100 L 256 100 C 156 100, 156 412, 256 412 L 422 412 Z"
        stroke={strokeColor}
        strokeWidth="24"
        strokeLinejoin="round"
        strokeLinecap="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Center intersecting ring */}
      <motion.circle
        cx="256"
        cy="256"
        r="116"
        stroke={accentColor}
        strokeWidth="18"
        strokeLinecap="round"
        initial={animate ? { pathLength: 0, opacity: 0 } : false}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.3, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
      />
    </svg>
  );
};
