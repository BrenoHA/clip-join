import { describe, it, expect } from 'vitest';
import { humanSize, humanTime, humanClock } from './format';

describe('format utilities', () => {
  describe('humanSize', () => {
    it('should format bytes correctly', () => {
      expect(humanSize(0)).toBe('0.0B');
      expect(humanSize(512)).toBe('512.0B');
      expect(humanSize(1023)).toBe('1023.0B');
    });

    it('should format kilobytes correctly', () => {
      expect(humanSize(1024)).toBe('1.0KB');
      expect(humanSize(1536)).toBe('1.5KB');
      expect(humanSize(1024 * 1024 - 1)).toBe('1024.0KB');
    });

    it('should format megabytes correctly', () => {
      expect(humanSize(1024 * 1024)).toBe('1.0MB');
      expect(humanSize(1024 * 1024 * 2.5)).toBe('2.5MB');
    });

    it('should format gigabytes correctly', () => {
      expect(humanSize(1024 * 1024 * 1024)).toBe('1.0GB');
      expect(humanSize(1024 * 1024 * 1024 * 40)).toBe('40.0GB');
    });

    it('should format terabytes correctly', () => {
      expect(humanSize(1024 * 1024 * 1024 * 1024)).toBe('1.0TB');
      expect(humanSize(1024 * 1024 * 1024 * 1024 * 5)).toBe('5.0TB');
    });

    it('should format petabytes correctly', () => {
      expect(humanSize(1024 * 1024 * 1024 * 1024 * 1024)).toBe('1.0PB');
    });

    it('should handle small negative numbers', () => {
      expect(humanSize(-100)).toBe('-100.0B');
      expect(humanSize(-512)).toBe('-512.0B');
    });
  });

  describe('humanTime', () => {
    it('should format 0 seconds', () => {
      expect(humanTime(0)).toBe('00:00:00');
    });

    it('should format seconds only', () => {
      expect(humanTime(1)).toBe('00:00:01');
      expect(humanTime(59)).toBe('00:00:59');
    });

    it('should format minutes and seconds', () => {
      expect(humanTime(60)).toBe('00:01:00');
      expect(humanTime(90)).toBe('00:01:30');
      expect(humanTime(3599)).toBe('00:59:59');
    });

    it('should format hours, minutes, and seconds', () => {
      expect(humanTime(3600)).toBe('01:00:00');
      expect(humanTime(3661)).toBe('01:01:01');
      expect(humanTime(36000)).toBe('10:00:00');
    });

    it('should handle large durations', () => {
      expect(humanTime(86400)).toBe('24:00:00');
      expect(humanTime(90061)).toBe('25:01:01');
    });

    it('should handle floats by flooring them', () => {
      expect(humanTime(1.9)).toBe('00:00:01');
      expect(humanTime(60.5)).toBe('00:01:00');
    });

    it('should handle negative numbers by treating as 0', () => {
      expect(humanTime(-10)).toBe('00:00:00');
    });
  });

  describe('humanClock', () => {
    it('should format MM:SS for times < 1 hour', () => {
      expect(humanClock(0)).toBe('00:00');
      expect(humanClock(30)).toBe('00:30');
      expect(humanClock(3599)).toBe('59:59');
    });

    it('should format HH:MM:SS for times >= 1 hour', () => {
      expect(humanClock(3600)).toBe('01:00:00');
      expect(humanClock(3661)).toBe('01:01:01');
      expect(humanClock(36000)).toBe('10:00:00');
    });

    it('should handle edge cases', () => {
      expect(humanClock(60)).toBe('01:00');
      expect(humanClock(1)).toBe('00:01');
    });

    it('should handle floats by flooring them', () => {
      expect(humanClock(59.9)).toBe('00:59');
      expect(humanClock(3600.9)).toBe('01:00:00');
    });

    it('should handle negative numbers', () => {
      expect(humanClock(-10)).toBe('00:00');
    });
  });
});
