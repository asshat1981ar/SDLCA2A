import { describe, it, expect } from 'vitest';
import { getStatusColor, getStatusBgColor } from './statusColors';

describe('statusColors utilities', () => {
  describe('getStatusColor', () => {
    it('should return green color for success status', () => {
      expect(getStatusColor('success')).toBe('text-green-400');
      expect(getStatusColor('completed')).toBe('text-green-400');
    });

    it('should return red color for error status', () => {
      expect(getStatusColor('error')).toBe('text-red-400');
      expect(getStatusColor('failed')).toBe('text-red-400');
    });

    it('should return yellow color for in progress status', () => {
      expect(getStatusColor('in_progress')).toBe('text-yellow-400');
      expect(getStatusColor('building')).toBe('text-yellow-400');
    });

    it('should return gray color for planned status', () => {
      expect(getStatusColor('planned')).toBe('text-gray-400');
      expect(getStatusColor('pending')).toBe('text-gray-400');
    });

    it('should return gray color for unknown status', () => {
      expect(getStatusColor('unknown')).toBe('text-gray-400');
      expect(getStatusColor('')).toBe('text-gray-400');
      expect(getStatusColor('random-status')).toBe('text-gray-400');
    });
  });

  describe('getStatusBgColor', () => {
    it('should return green background for success status', () => {
      expect(getStatusBgColor('success')).toBe('bg-green-900/20');
      expect(getStatusBgColor('completed')).toBe('bg-green-900/20');
    });

    it('should return red background for error status', () => {
      expect(getStatusBgColor('error')).toBe('bg-red-900/20');
      expect(getStatusBgColor('failed')).toBe('bg-red-900/20');
    });

    it('should return yellow background for in progress status', () => {
      expect(getStatusBgColor('in_progress')).toBe('bg-yellow-900/20');
      expect(getStatusBgColor('building')).toBe('bg-yellow-900/20');
    });

    it('should return gray background for planned status', () => {
      expect(getStatusBgColor('planned')).toBe('bg-gray-900/20');
      expect(getStatusBgColor('pending')).toBe('bg-gray-900/20');
    });

    it('should return gray background for unknown status', () => {
      expect(getStatusBgColor('unknown')).toBe('bg-gray-900/20');
      expect(getStatusBgColor('')).toBe('bg-gray-900/20');
      expect(getStatusBgColor('random-status')).toBe('bg-gray-900/20');
    });
  });
});