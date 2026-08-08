import { useEffect, useState } from 'react';

export function useObjectUrl(source?: Blob | MediaSource | string | null) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    if (!source) {
      setUrl('');
      return;
    }
    if (typeof source === 'string') {
      setUrl(source);
      return;
    }

    const nextUrl = URL.createObjectURL(source);
    setUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [source]);

  return url;
}
