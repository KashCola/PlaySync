import React from 'react';
import Image from 'next/image';

interface PlaySyncLogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

const sizeMap = {
  sm: 32,
  md: 48,
  lg: 64,
  xl: 96
};

export function PlaySyncLogo({ size = 'md', className = '' }: PlaySyncLogoProps) {
  const dimensions = sizeMap[size];
  
  return (
    <div className={`${className} relative flex-shrink-0`}>
      <Image
        src="/logos/playsync-logo.svg"
        alt="PlaySync Logo"
        width={dimensions}
        height={dimensions}
        className="rounded-2xl"
        priority
      />
    </div>
  );
}

export function PlaySyncWordmark({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <Image
        src="/logos/playsync-wordmark.svg"
        alt="PlaySync - Playlist Converter"
        width={300}
        height={80}
        className="h-16 w-auto"
        priority
      />
    </div>
  );
}
