'use client';

import React, { useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { isValidUrl } from '@/lib/utils';
import { BookOpen } from 'lucide-react';

interface SafeImageProps extends Omit<ImageProps, 'src'> {
  src: string | null | undefined;
  fallback?: React.ReactNode;
}

export default function SafeImage({ src, alt, fallback, className, ...props }: SafeImageProps) {
  const [error, setError] = useState(false);
  const [prevSrc, setPrevSrc] = useState(src);

  // Reset error state when src changes (performed during render as recommended by React docs)
  if (src !== prevSrc) {
    setPrevSrc(src);
    setError(false);
  }
  
  // Calculate validity during render
  const isValid = src ? isValidUrl(src) : false;

  if (!src || !isValid || error) {
    return (
      <div className={className + " flex items-center justify-center bg-gray-50 text-gray-300"}>
        {fallback || <BookOpen className="w-1/2 h-1/2" />}
      </div>
    );
  }

  // Handle Google Drive links specifically
  let displaySrc = src;
  if (src.includes('drive.google.com') && src.includes('/file/d/')) {
    const id = src?.split('/file/d/')[1]?.split('/')[0];
    if (id) {
      displaySrc = `https://drive.google.com/uc?id=${id}`;
    }
  }

  return (
    <Image
      {...props}
      src={displaySrc}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      referrerPolicy="no-referrer"
      unoptimized={true}
    />
  );
}
