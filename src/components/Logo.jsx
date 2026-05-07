/**
 * Centralized SocialPlug logo component.
 * Prefers raster /logo.png if present, falls back to SVG.
 */
import { useState } from 'react';

export default function Logo({ size = 40, className = '', rounded = true }) {
  const [src, setSrc] = useState(`${import.meta.env.BASE_URL}logo.png`);
  return (
    <img
      src={src}
      onError={() => setSrc(`${import.meta.env.BASE_URL}logo.svg`)}
      alt="SocialPlug"
      width={size}
      height={size}
      className={`${rounded ? 'rounded-xl' : ''} ${className}`}
      style={{ objectFit: 'contain' }}
    />
  );
}
