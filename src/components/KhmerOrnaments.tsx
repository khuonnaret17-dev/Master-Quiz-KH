import React from 'react';

interface KhmerCornerMotifProps {
  position: 'tl' | 'tr' | 'bl' | 'br';
  size?: number;
  className?: string;
}

export const KhmerCornerMotif: React.FC<KhmerCornerMotifProps> = ({
  position,
  size = 44,
  className = '',
}) => {
  const posClasses: Record<KhmerCornerMotifProps['position'], string> = {
    tl: 'top-2 left-2',
    tr: 'top-2 right-2 rotate-90',
    br: 'bottom-2 right-2 rotate-180',
    bl: 'bottom-2 left-2 -rotate-90',
  };

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className={`pointer-events-none select-none absolute ${posClasses[position]} ${className}`}
    >
      <path
        d="M4 86 L4 4 L86 4"
        stroke="var(--theme-gold)"
        strokeWidth="2.5"
        strokeLinecap="square"
        strokeOpacity="0.7"
      />
      <path
        d="M12 80 L12 12 L80 12"
        stroke="var(--theme-accent)"
        strokeWidth="1.3"
        strokeLinecap="square"
        strokeOpacity="0.45"
      />
      <path
        d="M16 26 C18 16, 26 15, 36 16 C27 21, 21 27, 16 36 C15 26, 16 26, 16 26 Z"
        fill="var(--theme-gold)"
        fillOpacity="0.22"
        stroke="var(--theme-gold)"
        strokeWidth="1.6"
        strokeOpacity="0.75"
      />
      <path d="M19 19 L29 19 L25 25 L19 29 Z" fill="var(--theme-gold)" fillOpacity="0.75" />
      <path
        d="M37 16 C47 11, 56 17, 65 12 C59 19, 51 21, 43 20"
        stroke="var(--theme-gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeOpacity="0.65"
      />
      <path
        d="M16 37 C11 47, 17 56, 12 65 C19 59, 21 51, 20 43"
        stroke="var(--theme-gold)"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeOpacity="0.65"
      />
      <circle cx="80" cy="12" r="2.2" fill="var(--theme-gold)" fillOpacity="0.7" />
      <circle cx="12" cy="80" r="2.2" fill="var(--theme-gold)" fillOpacity="0.7" />
    </svg>
  );
};

interface KhmerLotusDividerProps {
  width?: number;
  className?: string;
}

export const KhmerLotusDivider: React.FC<KhmerLotusDividerProps> = ({
  width = 240,
  className = '',
}) => {
  return (
    <svg
      width={width}
      height={22}
      viewBox="0 0 260 24"
      fill="none"
      aria-hidden="true"
      className={`select-none ${className}`}
    >
      <line
        x1="6"
        y1="12"
        x2="104"
        y2="12"
        stroke="var(--theme-gold)"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />
      <line
        x1="28"
        y1="15.5"
        x2="98"
        y2="15.5"
        stroke="var(--theme-accent)"
        strokeWidth="0.9"
        strokeOpacity="0.4"
      />
      <line
        x1="156"
        y1="12"
        x2="254"
        y2="12"
        stroke="var(--theme-gold)"
        strokeWidth="1.5"
        strokeOpacity="0.7"
      />
      <line
        x1="162"
        y1="15.5"
        x2="232"
        y2="15.5"
        stroke="var(--theme-accent)"
        strokeWidth="0.9"
        strokeOpacity="0.4"
      />
      <path
        d="M130 3 L139 12 L130 21 L121 12 Z"
        fill="var(--theme-gold)"
        fillOpacity="0.25"
        stroke="var(--theme-gold)"
        strokeWidth="1.5"
      />
      <path d="M130 7.5 L134.5 12 L130 16.5 L125.5 12 Z" fill="var(--theme-gold)" />
      <path
        d="M116 12 C112 7.5, 107 8.5, 104 12 C107 15.5, 112 16.5, 116 12 Z"
        stroke="var(--theme-gold)"
        strokeWidth="1.2"
        fill="var(--theme-gold)"
        fillOpacity="0.2"
      />
      <path
        d="M144 12 C148 7.5, 153 8.5, 156 12 C153 15.5, 148 16.5, 144 12 Z"
        stroke="var(--theme-gold)"
        strokeWidth="1.2"
        fill="var(--theme-gold)"
        fillOpacity="0.2"
      />
    </svg>
  );
};

interface KhmerLotusCrestProps {
  size?: number;
  className?: string;
}

export const KhmerLotusCrest: React.FC<KhmerLotusCrestProps> = ({
  size = 56,
  className = '',
}) => {
  const height = Math.round((size * 60) / 120);
  return (
    <svg
      width={size}
      height={height}
      viewBox="0 0 120 60"
      fill="none"
      aria-hidden="true"
      className={`select-none ${className}`}
    >
      <path
        d="M60 4 C65 16, 68 26, 60 40 C52 26, 55 16, 60 4 Z"
        fill="var(--theme-gold)"
        fillOpacity="0.25"
        stroke="var(--theme-gold)"
        strokeWidth="2"
      />
      <path
        d="M60 12 C62.5 20, 63.5 27, 60 36 C56.5 27, 57.5 20, 60 12 Z"
        fill="var(--theme-gold)"
      />
      <path
        d="M54 36 C45 26, 38 19, 28 21 C34 29, 41 36, 50 40"
        fill="var(--theme-gold)"
        fillOpacity="0.18"
        stroke="var(--theme-gold)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M66 36 C75 26, 82 19, 92 21 C86 29, 79 36, 70 40"
        fill="var(--theme-gold)"
        fillOpacity="0.18"
        stroke="var(--theme-gold)"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M46 42 C33 38, 22 33, 14 38 C21 44, 31 46, 44 45"
        stroke="var(--theme-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M74 42 C87 38, 98 33, 106 38 C99 44, 89 46, 76 45"
        stroke="var(--theme-accent)"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path d="M26 49 L94 49" stroke="var(--theme-gold)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M60 44 L65 49 L60 54 L55 49 Z" fill="var(--theme-gold)" />
    </svg>
  );
};

export const KhmerLatticeBar: React.FC<{ className?: string }> = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`w-full h-1.5 khmer-lattice-strip ${className}`}
    />
  );
};
