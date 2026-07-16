import { describe, it, expect } from 'vitest';
import { sortClips, canLossless } from './videos.js';
import type { Clip } from './types.js';

describe('videos utilities', () => {
  describe('sortClips', () => {
    const clips: Clip[] = [
      {
        id: '3',
        path: '/videos/charlie.mp4',
        name: 'charlie',
        durationSec: 45,
        sizeBytes: 1000000,
        creationTime: new Date('2024-01-15'),
        videoSignature: 'h264_1920x1080',
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: true,
        included: true,
      },
      {
        id: '1',
        path: '/videos/alice.mp4',
        name: 'alice',
        durationSec: 30,
        sizeBytes: 800000,
        creationTime: new Date('2024-01-10'),
        videoSignature: 'h264_1920x1080',
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: true,
        included: true,
      },
      {
        id: '2',
        path: '/videos/bob.mp4',
        name: 'bob',
        durationSec: 60,
        sizeBytes: 1200000,
        creationTime: new Date('2024-01-12'),
        videoSignature: 'h264_1920x1080',
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: true,
        included: true,
      },
    ];

    it('should sort by date in ascending order', () => {
      const sorted = sortClips(clips, 'date');
      expect(sorted[0].name).toBe('alice');
      expect(sorted[1].name).toBe('bob');
      expect(sorted[2].name).toBe('charlie');
    });

    it('should sort by name in ascending order (case-insensitive)', () => {
      const sorted = sortClips(clips, 'name');
      expect(sorted[0].name).toBe('alice');
      expect(sorted[1].name).toBe('bob');
      expect(sorted[2].name).toBe('charlie');
    });

    it('should sort by name case-insensitively', () => {
      const mixedCase: Clip[] = [
        { ...clips[0], name: 'Zebra' },
        { ...clips[1], name: 'apple' },
        { ...clips[2], name: 'Banana' },
      ];
      const sorted = sortClips(mixedCase, 'name');
      expect(sorted.map((c: Clip) => c.name.toLowerCase())).toEqual([
        'apple',
        'banana',
        'zebra',
      ]);
    });

    it('should return a new array without modifying input', () => {
      const originalIds = clips.map(c => c.id);
      sortClips(clips, 'date');
      const currentIds = clips.map(c => c.id);
      expect(currentIds).toEqual(originalIds);
    });

    it('should handle empty arrays', () => {
      expect(sortClips([], 'date')).toEqual([]);
      expect(sortClips([], 'name')).toEqual([]);
    });

    it('should handle single clip', () => {
      const single = [clips[0]];
      expect(sortClips(single, 'date')).toHaveLength(1);
      expect(sortClips(single, 'name')).toHaveLength(1);
    });
  });

  describe('canLossless', () => {
    const baseClip: Clip = {
      id: '1',
      path: '/videos/video.mp4',
      name: 'video',
      durationSec: 60,
      sizeBytes: 1000000,
      creationTime: new Date(),
      videoSignature: 'h264_1920x1080',
      width: 1920,
      height: 1080,
      fps: 30,
      hasAudio: true,
      included: true,
    };

    it('should return false when no clips are included', () => {
      const clips = [
        { ...baseClip, included: false },
        { ...baseClip, id: '2', included: false },
      ];
      expect(canLossless(clips)).toBe(false);
    });

    it('should return true when all included clips share the same signature', () => {
      const clips = [
        { ...baseClip, id: '1' },
        { ...baseClip, id: '2' },
        { ...baseClip, id: '3' },
      ];
      expect(canLossless(clips)).toBe(true);
    });

    it('should return false when included clips have different signatures', () => {
      const clips = [
        { ...baseClip, id: '1', videoSignature: 'h264_1920x1080' },
        { ...baseClip, id: '2', videoSignature: 'h264_1920x1080' },
        {
          ...baseClip,
          id: '3',
          videoSignature: 'h264_1280x720',
          included: true,
        },
      ];
      expect(canLossless(clips)).toBe(false);
    });

    it('should ignore non-included clips with different signatures', () => {
      const clips = [
        { ...baseClip, id: '1', videoSignature: 'h264_1920x1080' },
        {
          ...baseClip,
          id: '2',
          videoSignature: 'h264_1280x720',
          included: false,
        },
      ];
      expect(canLossless(clips)).toBe(true);
    });

    it('should return false for empty array', () => {
      expect(canLossless([])).toBe(false);
    });

    it('should return true for single included clip', () => {
      const clips = [baseClip];
      expect(canLossless(clips)).toBe(true);
    });

    it('should handle mixed included/excluded clips correctly', () => {
      const clips = [
        { ...baseClip, id: '1', videoSignature: 'h264_1920x1080' },
        {
          ...baseClip,
          id: '2',
          videoSignature: 'h264_1920x1080',
          included: true,
        },
        {
          ...baseClip,
          id: '3',
          videoSignature: 'vp9_3840x2160',
          included: false,
        },
      ];
      expect(canLossless(clips)).toBe(true);
    });
  });
});
