import React from 'react';
import { DieType } from '../types';
import { motion } from 'motion/react';

interface DieVisualProps {
  dieType: DieType;
  displayedNumber: number | string | null;
  isRolling?: boolean;
  isCritical?: boolean;
  isFumble?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  sublabel?: string;
}

export const DieVisual: React.FC<DieVisualProps> = ({
  dieType,
  displayedNumber,
  isRolling = false,
  isCritical = false,
  isFumble = false,
  size = 'lg',
  className = '',
  sublabel,
}) => {
  const sizeClasses = {
    sm: 'w-7 h-7',
    md: 'w-12 h-12',
    lg: 'w-24 h-24 sm:w-28 sm:h-28',
    xl: 'w-32 h-32',
  }[size];

  const fontSizeClass = {
    sm: 'text-[10px]',
    md: 'text-sm',
    lg: 'text-2xl sm:text-3xl',
    xl: 'text-4xl',
  }[size];

  // Unique geometric vector styling for each polyhedral die
  const renderDieGeometry = () => {
    switch (dieType) {
      case 'd4': // Crimson Tetrahedron
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Outer Triangle */}
            <polygon
              points="50,8 94,88 6,88"
              fill="#7f1d1d"
              stroke="#fca5a5"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* 3 Facets converging at center apex (50, 60) */}
            <polygon points="50,8 6,88 50,60" fill="#991b1b" stroke="#f87171" strokeWidth="1" />
            <polygon points="50,8 94,88 50,60" fill="#dc2626" stroke="#f87171" strokeWidth="1" />
            <polygon points="6,88 94,88 50,60" fill="#b91c1c" stroke="#f87171" strokeWidth="1" />
            {/* Gold Rune Center Dot */}
            <circle cx="50" cy="60" r="3" fill="#fef08a" />
          </svg>
        );

      case 'd6': // Royal Sapphire Isometric 3D Cube
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Cube Outline */}
            <polygon
              points="50,6 94,30 94,76 50,98 6,76 6,30"
              fill="#1e3a8a"
              stroke="#bfdbfe"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* Top Isometric Face */}
            <polygon points="50,6 94,30 50,54 6,30" fill="#3b82f6" stroke="#93c5fd" strokeWidth="1.5" />
            {/* Left Face */}
            <polygon points="6,30 50,54 50,98 6,76" fill="#1e40af" stroke="#93c5fd" strokeWidth="1.5" />
            {/* Right Face */}
            <polygon points="50,54 94,30 94,76 50,98" fill="#1d4ed8" stroke="#93c5fd" strokeWidth="1.5" />
            {/* Central Pip / Node */}
            <circle cx="50" cy="54" r="2.5" fill="#fef08a" />
          </svg>
        );

      case 'd8': // Emerald Diamond Octahedron
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Diamond Outline */}
            <polygon
              points="50,4 96,50 50,96 4,50"
              fill="#064e3b"
              stroke="#a7f3d0"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* 4 Facets meeting in center */}
            <polygon points="50,4 50,50 4,50" fill="#059669" stroke="#6ee7b7" strokeWidth="1.2" />
            <polygon points="50,4 96,50 50,50" fill="#10b981" stroke="#6ee7b7" strokeWidth="1.2" />
            <polygon points="4,50 50,50 50,96" fill="#047857" stroke="#6ee7b7" strokeWidth="1.2" />
            <polygon points="50,50 96,50 50,96" fill="#065f46" stroke="#6ee7b7" strokeWidth="1.2" />
            {/* Gem facet accent */}
            <polygon points="50,22 74,50 50,78 26,50" fill="none" stroke="#a7f3d0" strokeWidth="1" strokeDasharray="3,2" opacity="0.7" />
          </svg>
        );

      case 'd10': // Mystic Amethyst Trapezohedron Kite
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Kite Boundary */}
            <polygon
              points="50,4 90,32 78,84 50,97 22,84 10,32"
              fill="#3b0764"
              stroke="#e9d5ff"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* 5 Kite Facets converging at center-top (50, 48) */}
            <polygon points="50,4 90,32 50,48" fill="#a855f7" stroke="#d8b4fe" strokeWidth="1.2" />
            <polygon points="50,4 10,32 50,48" fill="#9333ea" stroke="#d8b4fe" strokeWidth="1.2" />
            <polygon points="10,32 22,84 50,48" fill="#7e22ce" stroke="#d8b4fe" strokeWidth="1.2" />
            <polygon points="90,32 78,84 50,48" fill="#9333ea" stroke="#d8b4fe" strokeWidth="1.2" />
            <polygon points="22,84 50,97 78,84 50,48" fill="#581c87" stroke="#d8b4fe" strokeWidth="1.2" />
            <circle cx="50" cy="48" r="2.5" fill="#fef08a" />
          </svg>
        );

      case 'd12': // Dragon Sunburst Topaz Dodecahedron
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* 10-sided Outer Silhouette */}
            <polygon
              points="50,5 79,15 96,38 96,68 79,91 50,97 21,91 4,68 4,38 21,15"
              fill="#78350f"
              stroke="#fef08a"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            {/* 5 Outer Trapezoids */}
            <polygon points="50,5 79,15 72,44 50,28 21,15" fill="#f59e0b" stroke="#fde68a" strokeWidth="1.1" />
            <polygon points="79,15 96,38 96,68 64,70 72,44" fill="#d97706" stroke="#fde68a" strokeWidth="1.1" />
            <polygon points="96,68 79,91 50,97 36,70 64,70" fill="#b45309" stroke="#fde68a" strokeWidth="1.1" />
            <polygon points="50,97 21,91 4,68 28,44 36,70" fill="#92400e" stroke="#fde68a" strokeWidth="1.1" />
            <polygon points="4,68 4,38 21,15 50,28 28,44" fill="#d97706" stroke="#fde68a" strokeWidth="1.1" />
            {/* Central Pentagon Face */}
            <polygon
              points="50,28 72,44 64,70 36,70 28,44"
              fill="#fbbf24"
              stroke="#fef08a"
              strokeWidth="2"
            />
          </svg>
        );

      case 'd100': // Cosmic Prism / Void Percentile Sphere
        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Outer Sphere */}
            <circle cx="50" cy="50" r="46" fill="#1e1b4b" stroke="#818cf8" strokeWidth="2.5" />
            {/* Orbital Rings */}
            <ellipse cx="50" cy="50" rx="42" ry="22" fill="#312e81" stroke="#38bdf8" strokeWidth="1.2" opacity="0.8" />
            <ellipse cx="50" cy="50" rx="22" ry="42" fill="none" stroke="#c084fc" strokeWidth="1.2" strokeDasharray="3,2" opacity="0.6" />
            <polygon points="50,14 84,32 84,68 50,86 16,68 16,32" fill="none" stroke="#a5b4fc" strokeWidth="1" opacity="0.6" />
            <circle cx="50" cy="50" r="26" fill="#4338ca" stroke="#67e8f9" strokeWidth="1.5" />
          </svg>
        );

      case 'd20': // Astral Obsidian & Gold 20-Sided Icosahedron
      default: {
        const baseColor = isCritical ? '#065f46' : isFumble ? '#991b1b' : '#2c1810';
        const centerColor = isCritical ? '#059669' : isFumble ? '#dc2626' : '#4a3227';
        const strokeColor = isCritical ? '#6ee7b7' : isFumble ? '#fca5a5' : '#d4af37';
        const innerLineColor = isCritical ? '#a7f3d0' : isFumble ? '#fecaca' : '#e2dcc5';

        return (
          <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
            {/* Outer Hexagon Silhouette */}
            <polygon
              points="50,4 96,27 96,73 50,96 4,73 4,27"
              fill={baseColor}
              stroke={strokeColor}
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            {/* Outer Triangle Facet Struts */}
            <line x1="50" y1="4" x2="16" y2="27" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="50" y1="4" x2="84" y2="27" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="96" y1="27" x2="84" y2="27" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="96" y1="27" x2="84" y2="73" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="96" y1="73" x2="84" y2="73" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="96" y1="73" x2="50" y2="96" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="4" y1="73" x2="16" y2="73" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="4" y1="73" x2="50" y2="96" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="4" y1="27" x2="16" y2="27" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="4" y1="27" x2="16" y2="73" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="16" y1="27" x2="84" y2="27" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />
            <line x1="16" y1="73" x2="84" y2="73" stroke={innerLineColor} strokeWidth="1.2" opacity="0.75" />

            {/* Central Triangle Face */}
            <polygon
              points="50,27 84,73 16,73"
              fill={centerColor}
              stroke={strokeColor}
              strokeWidth="2"
            />
          </svg>
        );
      }
    }
  };

  const displayText =
    displayedNumber !== null && displayedNumber !== undefined
      ? String(displayedNumber)
      : dieType.toUpperCase();

  return (
    <motion.div
      animate={
        isRolling
          ? {
              rotate: [0, 90, 180, 270, 360],
              scale: [0.92, 1.15, 0.95, 1.1, 1],
              y: [0, -16, 4, -8, 0],
            }
          : isCritical
          ? {
              scale: [1, 1.12, 1],
              rotate: [0, -3, 3, 0],
            }
          : { rotate: 0, scale: 1, y: 0 }
      }
      transition={
        isRolling
          ? { duration: 0.6, ease: 'easeInOut' }
          : isCritical
          ? { duration: 0.8, repeat: Infinity, repeatDelay: 1 }
          : { duration: 0.3 }
      }
      className={`relative flex items-center justify-center select-none ${sizeClasses} ${className}`}
    >
      {/* 3D SVG Die Geometry */}
      <div className="w-full h-full">{renderDieGeometry()}</div>

      {/* Die Face Number Overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <motion.span
          key={`${dieType}-${displayText}`}
          initial={{ scale: 0.6, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 600, damping: 20 }}
          className={`font-black font-mono tracking-tight leading-none text-center ${fontSizeClass} ${
            isCritical
              ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.95)]'
              : isFumble
              ? 'text-rose-300 drop-shadow-[0_0_12px_rgba(244,63,94,0.95)]'
              : dieType === 'd12'
              ? 'text-amber-950 drop-shadow-[0_1px_1px_rgba(255,255,255,0.8)]'
              : 'text-amber-50 drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]'
          }`}
        >
          {displayText}
        </motion.span>

        {sublabel && (
          <span className="text-[9px] font-mono font-bold text-amber-100/80 leading-none mt-0.5">
            {sublabel}
          </span>
        )}
      </div>
    </motion.div>
  );
};
