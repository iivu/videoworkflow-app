import { v4 as uuidv4 } from 'uuid';

export function getUniqueFilename(filename?: string) {
  const ext = filename?.split('.').pop();
  const now = Date.now();
  return `${uuidv4()}-${now}${ext ? `.${ext}` : ''}`;
}
