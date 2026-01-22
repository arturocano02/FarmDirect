"use client";

import { useState } from "react";
import Image, { type ImageProps } from "next/image";

type ImageWithFallbackProps = Omit<ImageProps, "src" | "alt"> & {
  src?: string | null;
  fallbackSrc: string;
  alt: string;
};

export function ImageWithFallback({ src, fallbackSrc, alt, onError, ...rest }: ImageWithFallbackProps) {
  const [hasError, setHasError] = useState(false);

  const resolvedSrc = !src || hasError ? fallbackSrc : src;

  return (
    <Image
      {...rest}
      src={resolvedSrc}
      alt={alt}
      onError={(event) => {
        if (!hasError) {
          setHasError(true);
        }
        onError?.(event);
      }}
    />
  );
}
