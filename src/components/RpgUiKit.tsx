import React from 'react';

interface RpgBoardPanelProps {
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}

/**
 * 9-slice RPG dialogue/story board framed with carved wood & gold corners.
 * Uses matching borderWidth and borderImageWidth so inner content never overlaps
 * the wood/gold borders and maintains balanced margins at any viewport size.
 */
export const RpgBoardPanel: React.FC<RpgBoardPanelProps> = ({
  children,
  className = '',
  bodyClassName = '',
}) => (
  <div
    style={{
      borderStyle: 'solid',
      borderColor: 'transparent',
      borderWidth: '20px 24px 20px 24px',
      borderImageSource: "url('./assets/ui/ui_board_panel.png')",
      borderImageSlice: '64 74 64 74 fill',
      borderImageWidth: '20px 24px 20px 24px',
      borderImageRepeat: 'stretch',
    }}
    className={`relative text-slate-100 drop-shadow-[0_18px_36px_rgba(0,0,0,0.65)] ${className}`}
  >
    <div className={`px-1 pb-1 pt-0.5 sm:px-2 sm:pb-2 sm:pt-1 ${bodyClassName}`}>{children}</div>
  </div>
);

interface RpgNameplateProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * 9-slice parchment-and-wood nameplate banner (Lost Legends speaker ribbon).
 */
export const RpgNameplate: React.FC<RpgNameplateProps> = ({ children, className = '' }) => (
  <div
    style={{
      borderStyle: 'solid',
      borderColor: 'transparent',
      borderWidth: '10px 20px 10px 20px',
      borderImageSource: "url('./assets/ui/ui_nameplate.png')",
      borderImageSlice: '36 68 36 68 fill',
      borderImageWidth: '10px 20px 10px 20px',
      borderImageRepeat: 'stretch',
    }}
    className={`inline-flex max-w-full items-center px-1.5 py-0.5 text-[#3b1b06] drop-shadow-[0_6px_12px_rgba(0,0,0,0.45)] ${className}`}
  >
    {children}
  </div>
);

interface RpgAvatarFrameProps {
  accentColor: string;
  children: React.ReactNode;
  className?: string;
}

/**
 * Square carved wood-and-gold portrait frame with transparent inner window.
 */
export const RpgAvatarFrame: React.FC<RpgAvatarFrameProps> = ({
  accentColor,
  children,
  className = '',
}) => (
  <div
    className={`relative flex h-12 w-12 shrink-0 items-center justify-center sm:h-14 sm:w-14 ${className}`}
  >
    <div
      className="flex h-[74%] w-[74%] items-center justify-center rounded-lg text-white shadow-inner"
      style={{ backgroundColor: accentColor }}
    >
      {children}
    </div>
    <img
      src="./assets/ui/ui_avatar_frame.png"
      alt=""
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 h-full w-full select-none object-contain drop-shadow-[0_4px_8px_rgba(0,0,0,0.45)]"
      draggable={false}
    />
  </div>
);

export type RpgPillVariant = 'green' | 'gold' | 'cream';

interface RpgPillButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: RpgPillVariant;
  children: React.ReactNode;
}

const PILL_STYLES: Record<RpgPillVariant, { img: string; textClass: string }> = {
  green: {
    img: "url('./assets/ui/ui_pill_green.png')",
    textClass: 'text-white drop-shadow-[0_1px_2px_rgba(6,78,59,0.95)]',
  },
  gold: {
    img: "url('./assets/ui/ui_pill_gold.png')",
    textClass: 'text-[#3b1b06] drop-shadow-[0_1px_0_rgba(255,255,255,0.45)]',
  },
  cream: {
    img: "url('./assets/ui/ui_pill_cream.png')",
    textClass: 'text-[#451a03]',
  },
};

/**
 * Horizontal 9-slice RPG capsule pill button that keeps circular end-caps at any width
 * and guarantees safe interior padding so text never touches the pill borders.
 */
export const RpgPillButton: React.FC<RpgPillButtonProps> = ({
  variant = 'gold',
  children,
  className = '',
  type = 'button',
  ...rest
}) => {
  const cfg = PILL_STYLES[variant];
  return (
    <button
      type={type}
      {...rest}
      style={{
        borderStyle: 'solid',
        borderColor: 'transparent',
        borderWidth: '10px 22px 10px 22px',
        borderImageSource: cfg.img,
        borderImageSlice: '32 76 32 76 fill',
        borderImageWidth: '10px 22px 10px 22px',
        borderImageRepeat: 'stretch',
      }}
      className={`inline-flex min-h-[46px] items-center justify-center gap-2 px-2 py-0.5 text-center text-xs font-black leading-snug transition hover:brightness-105 active:translate-y-0.5 disabled:opacity-50 sm:text-sm ${cfg.textClass} ${className}`}
    >
      {children}
    </button>
  );
};
