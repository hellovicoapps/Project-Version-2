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

  return (
    <div className={`flex items-center group ${className}`}>
      <div className="relative">
        <div className={`
          transition-all duration-300 flex items-center justify-center overflow-hidden
          ${imageLoaded && !imageError 
            ? "w-28 h-28 rounded-3xl" 
            : "p-4 bg-[var(--brand-primary)] rounded-3xl shadow-lg shadow-[var(--brand-primary)]/20 group-hover:scale-110"
          }
        `}>
          {!imageError && (
            <img 
              src={logoUrl} 
              alt="Vico Logo" 
              className={`w-full h-full object-contain transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0 absolute'}`}
              onLoad={() => setImageLoaded(true)}
              onError={() => setImageError(true)}
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
