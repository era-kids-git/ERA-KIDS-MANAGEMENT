import React from 'react';

/**
 * Standard EraKidsLogo component.
 * Renders exactly: <img src="logo.png" alt="Logo" ... />
 * No SVG or CSS graphics.
 */
export const EraKidsLogo: React.FC<{ className?: string; size?: number | string }> = ({
  className = 'w-8 h-8',
  size
}) => {
  return (
    <img
      src="/logo.png"
      alt="Logo ERA Kids"
      className={`${className} object-contain shrink-0 select-none`}
      style={{
        ...(size ? { width: size, height: size } : {}),
        imageRendering: 'auto'
      }}
      loading="eager"
      decoding="async"
      onError={(e) => {
        const target = e.currentTarget;
        if (!target.getAttribute('data-retried')) {
          target.setAttribute('data-retried', 'true');
          target.src = 'logo.png';
        }
      }}
    />
  );
};

export default EraKidsLogo;
