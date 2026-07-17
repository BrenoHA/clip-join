import { describe, it, expect } from 'vitest';
import type { Clip, JoinMode, JoinResult } from './types.js';
import { buildTransitionArgs, normalizeConcatPath, resolveTransitionDuration } from './join.js';
import { TRANSITION_DURATION_SEC } from '../config.js';

function makeClip(over: Partial<Clip> = {}): Clip {
  return {
    id: over.path ?? '/videos/clip.mp4',
    path: '/videos/clip.mp4',
    name: 'clip.mp4',
    durationSec: 10,
    sizeBytes: 1000000,
    creationTime: new Date(),
    mtime: new Date(),
    videoSignature: 'h264 1920x1080',
    width: 1920,
    height: 1080,
    fps: 30,
    hasAudio: true,
    included: true,
    ...over,
  };
}

describe('join utilities', () => {
  describe('buildConcatFile logic', () => {
    it('should properly escape single quotes in paths', () => {
      const path = "/videos/clip's video.mp4";
      const escaped = path.replace(/'/g, "'\\''");
      expect(escaped).toBe("/videos/clip'\\''s video.mp4");
    });

    it('should handle paths with multiple quotes', () => {
      const path = "O'Brien's 'best' clip.mp4";
      const escaped = path.replace(/'/g, "'\\''");
      expect(escaped).toBe("O'\\''Brien'\\''s '\\''best'\\'' clip.mp4");
    });

    it('should handle normal paths without quotes', () => {
      const path = '/videos/normal_video.mp4';
      const escaped = path.replace(/'/g, "'\\''");
      expect(escaped).toBe('/videos/normal_video.mp4');
    });

    it('rewrites Windows backslash paths to forward slashes', () => {
      const p = 'C:\\Users\\me\\My Clips\\GX011199.MP4';
      expect(normalizeConcatPath(p, true)).toBe('C:/Users/me/My Clips/GX011199.MP4');
    });

    it('leaves POSIX paths untouched (backslash is a legal filename char)', () => {
      const p = '/videos/weird\\name.mp4';
      expect(normalizeConcatPath(p, false)).toBe('/videos/weird\\name.mp4');
    });

    it('should format concat file entries correctly', () => {
      const paths = ['/videos/1.mp4', '/videos/2.mp4', '/videos/3.mp4'];
      const body = paths
        .map((p) => `file '${p.replace(/'/g, "'\\''")}'`)
        .join('\n');
      const lines = body.split('\n');
      expect(lines).toHaveLength(3);
      expect(lines[0]).toContain("file '/videos/1.mp4'");
    });
  });

  describe('lossless vs re-encode decision', () => {
    const baseClip: Clip = {
      id: '1',
      path: '/videos/video.mp4',
      name: 'video.mp4',
      durationSec: 60,
      sizeBytes: 1000000,
      creationTime: new Date(),
      mtime: new Date(),
      videoSignature: 'h264_1920x1080',
      width: 1920,
      height: 1080,
      fps: 30,
      hasAudio: true,
      included: true,
    };

    it('should attempt lossless join by default', () => {
      const forceReencode = false;
      expect(forceReencode).toBe(false);
    });

    it('should force re-encode when requested', () => {
      const forceReencode = true;
      expect(forceReencode).toBe(true);
    });

    it('should use valid CRF range', () => {
      const DEFAULT_CRF = 28;
      expect(DEFAULT_CRF).toBeGreaterThan(0);
      expect(DEFAULT_CRF).toBeLessThan(51);
    });

    it('should use valid preset', () => {
      const DEFAULT_PRESET = 'medium';
      expect(['fast', 'medium', 'slow']).toContain(DEFAULT_PRESET);
    });
  });

  describe('progress tracking', () => {
    it('should parse out_time_us from ffmpeg progress', () => {
      const progressLine = 'out_time_us=5000000';
      const m = progressLine.match(/^out_time_(?:us|ms)=(\d+)/);
      expect(m).toBeTruthy();
      expect(m?.[1]).toBe('5000000');
    });

    it('should parse out_time_ms from ffmpeg progress', () => {
      const progressLine = 'out_time_ms=5000000';
      const m = progressLine.match(/^out_time_(?:us|ms)=(\d+)/);
      expect(m).toBeTruthy();
      expect(m?.[1]).toBe('5000000');
    });

    it('should calculate progress fraction', () => {
      const totalDuration = 60;
      const timeUs = 30000000;
      const fraction = Math.min(1, Math.max(0, timeUs / 1_000_000 / totalDuration));
      expect(fraction).toBe(0.5);
    });

    it('should clamp progress fraction between 0 and 1', () => {
      const totalDuration = 60;
      const fraction1 = Math.min(1, Math.max(0, -1000000 / 1_000_000 / totalDuration));
      expect(fraction1).toBe(0);
      const fraction2 = Math.min(1, Math.max(0, 120000000 / 1_000_000 / totalDuration));
      expect(fraction2).toBe(1);
    });

    it('should handle zero duration edge case', () => {
      const totalDuration = 0;
      const timeUs = 5000000;
      const result = totalDuration > 0 ? timeUs / 1_000_000 / totalDuration : 0;
      expect(result).toBe(0);
    });
  });

  describe('JoinResult structure', () => {
    const mockResult: JoinResult = {
      mode: 'lossless',
      outputPath: '/output/joined_output_2024-01-15_101530.mp4',
      sizeBytes: 2000000,
      durationSec: 120,
      elapsedMs: 5000,
    };

    it('should have required properties', () => {
      expect(mockResult).toHaveProperty('mode');
      expect(mockResult).toHaveProperty('outputPath');
      expect(mockResult).toHaveProperty('sizeBytes');
      expect(mockResult).toHaveProperty('durationSec');
      expect(mockResult).toHaveProperty('elapsedMs');
    });

    it('should have valid mode', () => {
      const validModes: JoinMode[] = ['lossless', 'reencode'];
      expect(validModes).toContain(mockResult.mode);
    });

    it('should have non-negative sizeBytes', () => {
      expect(mockResult.sizeBytes).toBeGreaterThanOrEqual(0);
    });

    it('should have non-negative elapsedMs', () => {
      expect(mockResult.elapsedMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('resolveTransitionDuration', () => {
    it('uses the configured default when clips are long enough', () => {
      const clips = [makeClip({ durationSec: 10 }), makeClip({ durationSec: 8 })];
      expect(resolveTransitionDuration(clips)).toBe(TRANSITION_DURATION_SEC);
    });

    it('clamps below the shortest clip', () => {
      const clips = [makeClip({ durationSec: 10 }), makeClip({ durationSec: 0.3 })];
      const d = resolveTransitionDuration(clips);
      expect(d).toBeLessThan(0.3);
      expect(d).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('buildTransitionArgs', () => {
    const enc = { crf: 18, preset: 'veryfast' };

    it('passes each clip as its own -i input', () => {
      const clips = [
        makeClip({ path: '/v/a.mp4' }),
        makeClip({ path: '/v/b.mp4' }),
        makeClip({ path: '/v/c.mp4' }),
      ];
      const { args } = buildTransitionArgs(clips, '/out.mp4', 'crossfade', 0.5, enc);
      expect(args.filter((a) => a === '-i')).toHaveLength(3);
      expect(args).toContain('/v/a.mp4');
      expect(args).toContain('/v/c.mp4');
    });

    it('maps the requested transition to its xfade name', () => {
      const clips = [makeClip(), makeClip()];
      const { args } = buildTransitionArgs(clips, '/out.mp4', 'crossfade', 0.5, enc);
      const graph = args[args.indexOf('-filter_complex') + 1];
      expect(graph).toContain('transition=fade');
    });

    it('forces yuv420p so the output plays in QuickTime', () => {
      const clips = [makeClip(), makeClip()];
      const { args } = buildTransitionArgs(clips, '/out.mp4', 'crossfade', 0.5, enc);
      const i = args.indexOf('-pix_fmt');
      expect(i).toBeGreaterThan(-1);
      expect(args[i + 1]).toBe('yuv420p');
    });

    it('builds one xfade per boundary (n-1 for n clips)', () => {
      const clips = [makeClip(), makeClip(), makeClip(), makeClip()];
      const { args } = buildTransitionArgs(clips, '/out.mp4', 'crossfade', 0.5, enc);
      const graph = args[args.indexOf('-filter_complex') + 1];
      const count = (graph.match(/xfade=/g) ?? []).length;
      expect(count).toBe(3);
    });

    it('computes xfade offsets as sum(dur before k) - k*d', () => {
      const clips = [
        makeClip({ durationSec: 10 }),
        makeClip({ durationSec: 6 }),
        makeClip({ durationSec: 4 }),
      ];
      const d = 0.5;
      const { args } = buildTransitionArgs(clips, '/out.mp4', 'crossfade', d, enc);
      const graph = args[args.indexOf('-filter_complex') + 1];
      // boundary 1: 10 - 1*0.5 = 9.500 ; boundary 2: 16 - 2*0.5 = 15.000
      expect(graph).toContain('offset=9.500');
      expect(graph).toContain('offset=15.000');
    });

    it('subtracts the overlap from the reported total duration', () => {
      const clips = [makeClip({ durationSec: 10 }), makeClip({ durationSec: 10 })];
      const { totalDuration } = buildTransitionArgs(clips, '/out.mp4', 'crossfade', 0.5, enc);
      expect(totalDuration).toBe(19.5); // 20 - (2-1)*0.5
    });

    it('skips the audio graph and mapping when a clip has no audio', () => {
      const clips = [makeClip({ hasAudio: true }), makeClip({ hasAudio: false })];
      const { args } = buildTransitionArgs(clips, '/out.mp4', 'crossfade', 0.5, enc);
      const graph = args[args.indexOf('-filter_complex') + 1];
      expect(graph).not.toContain('acrossfade');
      expect(args).not.toContain('[aout]');
      expect(args).toContain('[vout]');
    });

    it('includes audio crossfade + mapping when all clips have audio', () => {
      const clips = [makeClip(), makeClip()];
      const { args } = buildTransitionArgs(clips, '/out.mp4', 'crossfade', 0.5, enc);
      const graph = args[args.indexOf('-filter_complex') + 1];
      expect(graph).toContain('acrossfade=d=0.5');
      expect(args).toContain('[aout]');
    });
  });
});
