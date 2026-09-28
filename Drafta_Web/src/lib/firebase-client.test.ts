import { describe, expect, it } from 'vitest';
import { getFirebaseClient, localFirebaseEnabled } from './firebase-client';

describe('Firebase activation boundary', () => {
  it('does not connect without explicit opt-in, including server rendering', () => {
    expect(localFirebaseEnabled(undefined, 'drafta-memo.com')).toBe(false);
    expect(localFirebaseEnabled('off', 'localhost')).toBe(false);
    expect(getFirebaseClient()).toBeNull();
  });
  it.each(['localhost', '127.0.0.1', '[::1]'])('allows emulator mode on %s', host => {
    expect(localFirebaseEnabled('emulator', host)).toBe(true);
  });
  it.each(['drafta-memo.com', 'localhost.example.com', '192.168.1.1'])('rejects emulator mode on %s', host => {
    expect(() => localFirebaseEnabled('emulator', host)).toThrow('local browser');
  });
  it('rejects unapproved production activation and typo modes', () => {
    expect(() => localFirebaseEnabled('production', 'drafta-memo.com')).toThrow('Unsupported');
    expect(() => localFirebaseEnabled('emulators', 'localhost')).toThrow('Unsupported');
  });
});
