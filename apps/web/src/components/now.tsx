import { useEffect, useState } from 'react';

type Props = { local?: string };

export function Now({ local = 'zh-CN' }: Props) {
  const [now, setNow] = useState(() => new Date().toLocaleString(local));

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(new Date().toLocaleString(local));
    }, 1000);

    return () => clearInterval(interval);
  }, [local]);

  return now;
}
