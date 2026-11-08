import React from 'react';

/**
 * Clean book outline icon with two curved pages, matching Phone 2's top-left icon
 */
export const BookOutlineIcon: React.FC<{ size?: number; className?: string }> = ({
  size = 28,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z" />
      <path d="M6 2v20" />
      <path d="M12 2v20" />
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    </svg>
  );
};

/**
 * Realistic 3D angled Open Book illustration matching Phone 2 (Study Notes bottom-right)
 */
export const RealisticOpenBook: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`select-none pointer-events-none drop-shadow-lg ${className}`}>
      <svg
        viewBox="0 0 160 110"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="bookShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="2" dy="8" stdDeviation="6" floodColor="#0f172a" floodOpacity="0.45" />
          </filter>
          <linearGradient id="pageGradLeft" x1="1" y1="0" x2="0" y2="0">
            <stop offset="0%" stopColor="#d6cec2" />
            <stop offset="15%" stopColor="#f4ede2" />
            <stop offset="100%" stopColor="#faf6ef" />
          </linearGradient>
          <linearGradient id="pageGradRight" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#d6cec2" />
            <stop offset="15%" stopColor="#f4ede2" />
            <stop offset="100%" stopColor="#faf6ef" />
          </linearGradient>
          <linearGradient id="coverGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#78350f" />
            <stop offset="100%" stopColor="#451a03" />
          </linearGradient>
          <linearGradient id="ribbonGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#dc2626" />
            <stop offset="100%" stopColor="#991b1b" />
          </linearGradient>
        </defs>

        {/* Ambient shadow */}
        <ellipse cx="80" cy="98" rx="65" ry="8" fill="#020617" opacity="0.4" />

        {/* Hardcover bottom edges */}
        <g filter="url(#bookShadow)">
          {/* Left cover base */}
          <path
            d="M 12 85 C 24 88, 55 90, 78 88 L 78 85 C 55 87, 24 85, 12 82 Z"
            fill="url(#coverGrad)"
          />
          {/* Right cover base */}
          <path
            d="M 82 88 C 105 90, 136 88, 148 85 L 148 82 C 136 85, 105 87, 82 85 Z"
            fill="url(#coverGrad)"
          />

          {/* Book spine curve */}
          <path
            d="M 76 86 Q 80 88 84 86 L 84 28 Q 80 30 76 28 Z"
            fill="#3e1a06"
          />

          {/* Left page stack */}
          <path
            d="M 14 80 C 26 83, 56 85, 78 84 L 78 26 C 56 27, 26 25, 14 22 Z"
            fill="url(#pageGradLeft)"
            stroke="#e2d9cc"
            strokeWidth="0.75"
          />
          {/* Page stack depth stripes left */}
          <path d="M 14 80 L 14 83 C 26 86, 56 87, 78 86 L 78 84 Z" fill="#cfc4b4" />

          {/* Left top curved sheet */}
          <path
            d="M 16 23 C 32 25, 58 27, 78 26 L 78 83 C 58 84, 32 82, 16 79 Z"
            fill="#faf7f2"
          />

          {/* Right page stack */}
          <path
            d="M 82 84 C 104 85, 134 83, 146 80 L 146 22 C 134 25, 104 27, 82 26 Z"
            fill="url(#pageGradRight)"
            stroke="#e2d9cc"
            strokeWidth="0.75"
          />
          {/* Page stack depth stripes right */}
          <path d="M 146 80 L 146 83 C 134 86, 104 87, 82 86 L 82 84 Z" fill="#cfc4b4" />

          {/* Right top curved sheet */}
          <path
            d="M 82 26 C 102 27, 128 25, 144 23 L 144 79 C 128 82, 102 84, 82 83 Z"
            fill="#faf7f2"
          />

          {/* Spine crease shadow */}
          <path
            d="M 77 26 Q 80 27 83 26 L 83 84 Q 80 85 77 84 Z"
            fill="#000000"
            opacity="0.2"
          />

          {/* Left page faux printed lines */}
          <line x1="26" y1="36" x2="68" y2="38" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26" y1="44" x2="70" y2="46" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26" y1="52" x2="66" y2="54" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26" y1="60" x2="69" y2="62" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="26" y1="68" x2="52" y2="70" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

          {/* Right page faux printed lines */}
          <line x1="92" y1="38" x2="134" y2="36" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="90" y1="46" x2="134" y2="44" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="94" y1="54" x2="134" y2="52" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="91" y1="62" x2="134" y2="60" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />
          <line x1="93" y1="70" x2="118" y2="68" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" />

          {/* Red Bookmark Silk Ribbon hanging down */}
          <path
            d="M 79 26 Q 81 50 83 92 Q 86 98 88 104 L 92 103 Q 89 97 86 91 Q 84 50 82 26 Z"
            fill="url(#ribbonGrad)"
          />
          <polygon points="88,104 93,98 92,103" fill="#7f1d1d" />
        </g>
      </svg>
    </div>
  );
};

/**
 * Realistic 3D Vintage 35mm Rangefinder Camera illustration matching Phone 2 (Personal Keepsakes bottom-right)
 */
export const RealisticVintageCamera: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div className={`select-none pointer-events-none drop-shadow-xl ${className}`}>
      <svg
        viewBox="0 0 160 110"
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <filter id="cameraShadow" x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="3" dy="8" stdDeviation="6" floodColor="#09090b" floodOpacity="0.5" />
          </filter>
          <linearGradient id="chromeTop" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f8fafc" />
            <stop offset="40%" stopColor="#e2e8f0" />
            <stop offset="80%" stopColor="#cbd5e1" />
            <stop offset="100%" stopColor="#94a3b8" />
          </linearGradient>
          <linearGradient id="leatherBody" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#27272a" />
            <stop offset="50%" stopColor="#18181b" />
            <stop offset="100%" stopColor="#09090b" />
          </linearGradient>
          <linearGradient id="lensRing" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#e2e8f0" />
            <stop offset="50%" stopColor="#64748b" />
            <stop offset="100%" stopColor="#334155" />
          </linearGradient>
          <radialGradient id="lensGlass" cx="40%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
            <stop offset="35%" stopColor="#0284c7" stopOpacity="0.9" />
            <stop offset="70%" stopColor="#0f172a" />
            <stop offset="100%" stopColor="#020617" />
          </radialGradient>
        </defs>

        {/* Ambient base shadow */}
        <ellipse cx="80" cy="100" rx="68" ry="7" fill="#020617" opacity="0.45" />

        <g filter="url(#cameraShadow)">
          {/* Main camera body (leatherette bottom) */}
          <rect x="18" y="38" width="124" height="58" rx="8" fill="url(#leatherBody)" stroke="#3f3f46" strokeWidth="0.75" />

          {/* Leatherette tactile crosshatch pattern lines */}
          <line x1="22" y1="44" x2="138" y2="44" stroke="#27272a" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="22" y1="52" x2="138" y2="52" stroke="#27272a" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="22" y1="60" x2="138" y2="60" stroke="#27272a" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="22" y1="68" x2="138" y2="68" stroke="#27272a" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="22" y1="76" x2="138" y2="76" stroke="#27272a" strokeWidth="1" strokeDasharray="2,2" />
          <line x1="22" y1="84" x2="138" y2="84" stroke="#27272a" strokeWidth="1" strokeDasharray="2,2" />

          {/* Chrome top plate */}
          <path
            d="M 18 38 L 18 24 Q 18 20 22 20 L 138 20 Q 142 20 142 24 L 142 38 Z"
            fill="url(#chromeTop)"
            stroke="#94a3b8"
            strokeWidth="0.5"
          />

          {/* Bottom chrome trim plate */}
          <rect x="18" y="93" width="124" height="4" rx="2" fill="url(#chromeTop)" />

          {/* Shutter button (metallic cylinder on top left) */}
          <rect x="34" y="14" width="10" height="6" rx="1.5" fill="#f1f5f9" stroke="#64748b" strokeWidth="0.5" />
          <rect x="36" y="11" width="6" height="3" rx="1" fill="#cbd5e1" />

          {/* Shutter speed dial (knurled metal wheel) */}
          <rect x="52" y="15" width="14" height="5" rx="1" fill="#94a3b8" stroke="#475569" strokeWidth="0.5" />
          <line x1="55" y1="15" x2="55" y2="20" stroke="#475569" strokeWidth="0.75" />
          <line x1="59" y1="15" x2="59" y2="20" stroke="#475569" strokeWidth="0.75" />
          <line x1="63" y1="15" x2="63" y2="20" stroke="#475569" strokeWidth="0.75" />

          {/* Hotshoe mount in middle */}
          <rect x="74" y="16" width="14" height="4" rx="1" fill="#475569" />

          {/* Viewfinder window (front glass on top plate) */}
          <rect x="114" y="24" width="14" height="9" rx="2" fill="#0f172a" stroke="#64748b" strokeWidth="0.75" />
          <rect x="116" y="26" width="10" height="5" rx="1" fill="#38bdf8" opacity="0.6" />

          {/* Small Rangefinder sensor window */}
          <rect x="96" y="26" width="6" height="6" rx="1.5" fill="#1e293b" stroke="#64748b" strokeWidth="0.5" />

          {/* Leica-style Red Dot logo */}
          <circle cx="34" cy="30" r="3.5" fill="#ef4444" />
          <circle cx="34" cy="30" r="2.5" fill="#dc2626" />

          {/* Central 35mm Lens Assembly */}
          {/* Outer lens barrel */}
          <circle cx="80" cy="67" r="27" fill="url(#lensRing)" stroke="#1e293b" strokeWidth="1" />
          <circle cx="80" cy="67" r="24.5" fill="#0f172a" />

          {/* Aperture ring ridges */}
          <circle cx="80" cy="67" r="22" fill="#18181b" stroke="#475569" strokeWidth="1" />
          <circle cx="80" cy="67" r="19" fill="#09090b" />

          {/* Front multi-coated optical glass */}
          <circle cx="80" cy="67" r="16" fill="url(#lensGlass)" />

          {/* Anti-reflective lens coating reflection highlights */}
          <ellipse cx="74" cy="61" rx="6" ry="3.5" transform="rotate(-30 74 61)" fill="#ffffff" opacity="0.55" />
          <ellipse cx="86" cy="73" rx="4" ry="2" transform="rotate(-30 86 73)" fill="#38bdf8" opacity="0.4" />
          <circle cx="82" cy="69" r="1.5" fill="#ffffff" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
};
