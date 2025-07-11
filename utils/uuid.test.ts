import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { generateUUID } from './uuid';

describe('generateUUID', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should use crypto.randomUUID when available', () => {
    const mockRandomUUID = vi.fn(() => '12345678-1234-4567-8901-123456789012');
    
    Object.defineProperty(global, 'crypto', {
      value: { randomUUID: mockRandomUUID },
      writable: true,
      configurable: true
    });

    const result = generateUUID();
    
    expect(mockRandomUUID).toHaveBeenCalledOnce();
    expect(result).toBe('12345678-1234-4567-8901-123456789012');
  });

  it('should generate UUID with correct format when crypto.randomUUID is not available', () => {
    Object.defineProperty(global, 'crypto', {
      value: undefined,
      writable: true,
      configurable: true
    });

    const result = generateUUID();
    
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(result).toMatch(uuidRegex);
  });

  it('should generate UUID with correct format when crypto exists but randomUUID is not available', () => {
    Object.defineProperty(global, 'crypto', {
      value: {},
      writable: true,
      configurable: true
    });

    const result = generateUUID();
    
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    expect(result).toMatch(uuidRegex);
  });

  it('should generate different UUIDs on multiple calls', () => {
    Object.defineProperty(global, 'crypto', {
      value: undefined,
      writable: true,
      configurable: true
    });

    const uuid1 = generateUUID();
    const uuid2 = generateUUID();
    
    expect(uuid1).not.toBe(uuid2);
  });

  it('should generate UUID with correct length', () => {
    const result = generateUUID();
    expect(result).toHaveLength(36); // 32 characters + 4 dashes
  });
});