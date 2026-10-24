import { useState } from 'react';
import { ImageOff } from 'lucide-react';

interface Props {
  src: string | null | undefined;
  alt: string;
  className?: string;
  iconSize?: number;
}

export function ProductImage({ src, alt, className = '', iconSize = 24 }: Props) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return (
      <div className={`flex items-center justify-center bg-cream-100 text-charcoal-700/30 ${className}`} aria-label={`Sin imagen para ${alt}`}>
        <ImageOff size={iconSize} />
      </div>
    );
  }

  return <img src={src} alt={alt} className={`object-cover ${className}`} onError={() => setFailed(true)} />;
}
