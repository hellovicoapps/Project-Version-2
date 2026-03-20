import React, { useState } from 'react';
import { Zap } from 'lucide-react';

interface LogoProps {
  className?: string;
  iconSize?: number;
  showText?: boolean;
  textSize?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  className = "", 
  iconSize = 56, 
  showText = false,
  textSize = "text-3xl"
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const logoUrl = "/logo.png";

  // Calculate container size based on iconSize to maintain proportions
  const containerSize = iconSize * 1.5;

  return (
    <div className={`flex items-center group ${className}`}>
      <div className="relative" style={{ width: containerSize, height: containerSize }}>
        <div className={`
          transition-all duration-300 flex items-center justify-center overflow-hidden w-full h-full
          ${imageLoaded && !imageError 
            ? "rounded-xl" 
            : "bg-[var(--brand-primary)] rounded-xl shadow-lg shadow-[var(--brand-primary)]/20 group-hover:scale-110"
          }
        `}>
          {!imageError && (
            <img 
              src={logoUrl} 
              alt="Vico Logo" 
              className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
              referrerPolicy="no-referrer"
            />
          )}
          {(!imageLoaded || imageError) && (
            <Zap size={iconSize} className="text-white" />
          )}
        </div>
      </div>
      {showText && (
        <span className={`ml-4 ${textSize} font-bold tracking-tighter text-[var(--text-main)]`}>
          Vico
        </span>
      )}
    </div>
  );
};
