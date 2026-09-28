import { describe, expect, it } from 'vitest';
import { getFirebaseClient, localFirebaseEnabled, firebaseOptions } from './firebase-client';

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
  it('rejects production mode through the emulator entry and typo modes', () => {
    expect(() => localFirebaseEnabled('production', 'drafta-memo.com')).toThrow('Unsupported');
    expect(() => localFirebaseEnabled('emulators', 'localhost')).toThrow('Unsupported');
  });
  it('requires the exact production app and keeps emulator configuration separate', () => {
    const config = { projectId: 'drafta-memo', authDomain: 'drafta-memo.firebaseapp.com', appId: '1:642102711632:web:e1e1f3a8ba7d00eec00855', apiKey: 'test-key-not-a-real-credential' };
    expect(firebaseOptions('production', 'drafta-memo.com', config)).toEqual(config);
    expect(firebaseOptions('production', 'localhost', config)).toEqual(config);
    expect(firebaseOptions('emulator', 'localhost', config)?.projectId).toBe('demo-drafta');
    expect(firebaseOptions(undefined, 'drafta-memo.com', config)).toBeNull();
    for (const invalid of [{}, { ...config, projectId: 'other-project' }, { ...config, authDomain: 'other.firebaseapp.com' }, { ...config, apiKey: '' }, { ...config, appId: 'other-app' }]) {
      expect(() => firebaseOptions('production', 'drafta-memo.com', invalid)).toThrow('configuration');
    }
    expect(() => firebaseOptions('production', 'other.example', config)).toThrow('host');
  });
});
