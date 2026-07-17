import { describe, it, expect } from 'vitest';
import { humanSize, humanTime, humanClock, humanDate } from './format.js';

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

  describe('humanDate', () => {
    // Constructed with local-time components; humanDate reads local getters,
    // so these assertions are timezone-independent.
    it('formats an afternoon date like Finder', () => {
      expect(humanDate(new Date(2026, 6, 16, 19, 7))).toBe('Jul 16, 2026, 7:07 PM');
    });

    it('formats a morning date', () => {
      expect(humanDate(new Date(2026, 0, 1, 9, 5))).toBe('Jan 1, 2026, 9:05 AM');
    });

    it('shows midnight as 12 AM', () => {
      expect(humanDate(new Date(2026, 6, 16, 0, 0))).toBe('Jul 16, 2026, 12:00 AM');
    });

    it('shows noon as 12 PM', () => {
      expect(humanDate(new Date(2026, 11, 31, 12, 0))).toBe('Dec 31, 2026, 12:00 PM');
    });

    it('zero-pads minutes but not the hour', () => {
      expect(humanDate(new Date(2026, 2, 3, 13, 4))).toBe('Mar 3, 2026, 1:04 PM');
    });
  });
});
