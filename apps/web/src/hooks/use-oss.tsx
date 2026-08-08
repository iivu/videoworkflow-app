import { toast } from '@r/ui';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { query } from '#/services/api';

export function useOss() {
  const [uploading, setUploading] = useState(false);
  const {
    data: ossPolicy,
    isLoading: ossPolicyLoading,
    error: ossPolicyError,
  } = useQuery(
    query.oss.getPolicy.queryOptions(
      {},
      {
        staleTime: 60 * 60 * 1000, // oss policy 有效期为 1 小时
      },
    ),
  );

  async function upload(files: Array<{ file: File; key: string }>) {
    if (uploading) return;
    if (!ossPolicy?.data) {
      toast.add({ type: 'error', description: '获取上传策略失败，请刷新页面重试' });
      return null;
    }
    const c = ossPolicy.data;
    setUploading(true);
    const result = await Promise.all(
      files.map(async ({ file, key }) => {
        const fd = new FormData();
        const realKey = `${c.dir}/${key}`;
        fd.append('policy', c.policy);
        fd.append('OSSAccessKeyId', c.ossAccessKeyId);
        fd.append('success_action_status', '200');
        fd.append('signature', c.signature);
        fd.append('key', realKey);
        fd.append('file', file);
        const resp = await fetch(c.host, {
          method: 'POST',
          body: fd,
        }).catch(() => null);
        if (!resp) return null;
        if (!resp.ok) return null;
        return `${c.host}/${realKey}`;
      }),
    ).finally(() => {
      setUploading(false);
    });
    const failedCount = result.filter((v) => v === null).length;
    if (failedCount > 0) {
      toast.add({ type: 'warning', description: `${failedCount} 个文件上传失败` });
    }
    return files.map((v, index) => ({ key: v.key, url: result[index] }));
  }

  return { uploading, setUploading, ossPolicy, ossPolicyLoading, ossPolicyError, upload };
}
