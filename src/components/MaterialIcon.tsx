import React from 'react';

export interface MaterialIconProps {
  name: string;
  size?: number;
  filled?: boolean;
  weight?: number;
  grade?: number;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Authentic Google Material Symbols Rounded Icon Component
 * Ensures uniform 24px default size, optical sizing, fill toggle, and crisp antialiasing.
 */
export const MaterialIcon: React.FC<MaterialIconProps> = ({
  name,
  size = 24,
  filled = false,
  weight,
  grade = 0,
  className = '',
  style,
}) => {
  const fontOpticalSize = Math.max(20, Math.min(48, Math.round(size)));
  const iconWeight = weight ?? (filled ? 600 : 400);

  return (
    <span
      className={`material-symbols-rounded select-none pointer-events-none inline-flex items-center justify-center shrink-0 leading-none ${filled ? 'is-filled' : ''} ${className}`}
      style={{
        fontSize: `${size}px`,
        width: `${size}px`,
        height: `${size}px`,
        fontVariationSettings: `'FILL' ${filled ? 1 : 0}, 'wght' ${iconWeight}, 'GRAD' ${grade}, 'opsz' ${fontOpticalSize}`,
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
};
