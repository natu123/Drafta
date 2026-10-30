import { createECDH, randomBytes } from 'node:crypto';
import webpush from 'web-push';
import { describe, expect, it } from 'vitest';
import { pushRequest } from './push.js';

describe('reminder push requests (specs/25, 2.2)', () => {
  it('encrypts the payload and signs the request for the device', () => {
    const vapid = { subject: 'https://drafta-memo.com', ...webpush.generateVAPIDKeys() };
    const device = createECDH('prime256v1'); device.generateKeys();
    const target = { endpoint: 'https://push.example.test/abc', p256dh: device.getPublicKey('base64url'), auth: randomBytes(16).toString('base64url') };
    const request = pushRequest(target, { type: 'reminder', noteId: 'memo-1', title: 'Send the invoice', lang: 'en' }, vapid);
    expect(request.endpoint).toBe(target.endpoint);
    expect(request.method).toBe('POST');
    expect(request.headers['Content-Encoding']).toBe('aes128gcm');
    expect(String(request.headers.Authorization)).toMatch(/^vapid t=.+, k=/);
    expect(request.headers.TTL).toBe(3600);
    expect(request.headers.Urgency).toBe('high');
    // The title travels encrypted only.
    expect(Buffer.from(request.body as Buffer).includes('Send the invoice')).toBe(false);
  });
});
