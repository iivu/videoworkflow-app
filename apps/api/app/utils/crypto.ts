import crypto, { type BinaryLike, type BinaryToTextEncoding } from 'node:crypto';

export function hmacSha256(key: BinaryLike, data: BinaryLike, encoding?: BinaryToTextEncoding) {
  const hmac = crypto.createHmac('sha256', key);
  hmac.update(data);
  return encoding ? hmac.digest(encoding) : hmac.digest();
}

export function sha256(data: BinaryLike) {
  return crypto.createHash('sha256').update(data).digest('hex');
}
