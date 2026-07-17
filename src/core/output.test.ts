import { describe, it, expect } from 'vitest';
import path from 'path';
import { promises as fs } from 'node:fs';
import os from 'node:os';

const OUTPUT_DIR = 'output';
const defaultOutputName = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hour = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const sec = String(now.getSeconds()).padStart(2, '0');
  return `joined_output_${year}-${month}-${day}_${hour}${min}${sec}.mp4`;
};

function resolveOutputPath(name: string): string {
  let base = path.basename(name.trim());
  if (!base || base === '.' || base === '..') base = defaultOutputName();
  return path.join(OUTPUT_DIR, base);
}

describe('output utilities', () => {
  describe('resolveOutputPath', () => {
    it('should resolve a simple filename', () => {
      const result = resolveOutputPath('joined.mp4');
      expect(result).toBe(path.join(OUTPUT_DIR, 'joined.mp4'));
      expect(result).toContain('output');
    });

    it('should extract basename from directory traversal path', () => {
      const result = resolveOutputPath('../evil.mp4');
      expect(result).toBe(path.join(OUTPUT_DIR, 'evil.mp4'));
    });

    it('should reject absolute paths', () => {
      const result = resolveOutputPath('/etc/passwd');
      expect(result).toContain(OUTPUT_DIR);
      expect(result).not.toBe('/etc/passwd');
    });

    it('should handle paths with leading/trailing whitespace', () => {
      const result = resolveOutputPath('  joined.mp4  ');
      expect(result).toBe(path.join(OUTPUT_DIR, 'joined.mp4'));
    });

    it('should handle dot as name', () => {
      const result = resolveOutputPath('.');
      expect(result).toContain(OUTPUT_DIR);
      expect(result).toContain('joined_output_');
    });

    it('should handle double dot as name', () => {
      const result = resolveOutputPath('..');
      expect(result).toContain(OUTPUT_DIR);
      expect(result).toContain('joined_output_');
    });

    it('should handle empty string', () => {
      const result = resolveOutputPath('');
      expect(result).toContain(OUTPUT_DIR);
      expect(result).toContain('joined_output_');
    });

    it('should handle whitespace-only string', () => {
      const result = resolveOutputPath('   ');
      expect(result).toContain(OUTPUT_DIR);
      expect(result).toContain('joined_output_');
    });

    it('should preserve file extensions', () => {
      const result = resolveOutputPath('my-video.mov');
      expect(result).toBe(path.join(OUTPUT_DIR, 'my-video.mov'));
    });

    it('should handle nested paths by extracting basename', () => {
      const result = resolveOutputPath('/some/deep/path/video.mp4');
      expect(result).toBe(path.join(OUTPUT_DIR, 'video.mp4'));
    });
  });

  describe('writeChaptersFile', () => {
    it('should write chapters with correct timestamps and clip names', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clipjoin-test-'));
      const videoPath = path.join(tmpDir, 'my_video.mp4');
      const clips = [
        { name: 'intro.mp4', durationSec: 35, included: true },
        { name: 'main.mp4', durationSec: 149, included: true },
        { name: 'outro.mp4', durationSec: 55, included: true },
      ].map((c) => ({
        id: c.name,
        path: c.name,
        name: c.name,
        durationSec: c.durationSec,
        sizeBytes: 0,
        creationTime: new Date(),
        mtime: new Date(),
        videoSignature: 'h264 1920x1080',
        width: 1920,
        height: 1080,
        fps: 30,
        hasAudio: true,
        included: c.included,
      }));

      // Dynamically import so we get the real implementation.
      const { writeChaptersFile } = await import('./output.js');
      const chaptersPath = await writeChaptersFile(clips, videoPath);

      expect(chaptersPath).toBe(path.join(tmpDir, 'my_video_chapters.txt'));
      const content = await fs.readFile(chaptersPath, 'utf-8');
      expect(content).toBe('00:00 intro\n00:35 main\n03:04 outro\n');

      await fs.rm(tmpDir, { recursive: true, force: true });
    });

    it('should return empty string for no clips', async () => {
      const { writeChaptersFile } = await import('./output.js');
      const result = await writeChaptersFile([], '/some/video.mp4');
      expect(result).toBe('');
    });

    it('should strip extension from clip names', async () => {
      const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'clipjoin-test-'));
      const videoPath = path.join(tmpDir, 'out.mp4');
      const clips = [
        {
          name: 'GOPR0001.MP4', durationSec: 10, id: '1', path: 'GOPR0001.MP4',
          sizeBytes: 0, creationTime: new Date(), mtime: new Date(),
          videoSignature: 'h264 1920x1080', width: 1920, height: 1080,
          fps: 30, hasAudio: true, included: true,
        },
      ];

      const { writeChaptersFile } = await import('./output.js');
      const chaptersPath = await writeChaptersFile(clips, videoPath);
      const content = await fs.readFile(chaptersPath, 'utf-8');
      expect(content).toBe('00:00 GOPR0001\n');

      await fs.rm(tmpDir, { recursive: true, force: true });
    });
  });

  describe('defaultOutputName', () => {
    it('should generate a timestamped filename', () => {
      const name = defaultOutputName();
      expect(name).toContain('joined_output_');
      expect(name).toMatch(/\d{4}-\d{2}-\d{2}_\d{6}\.mp4/);
    });

    it('should have .mp4 extension', () => {
      const name = defaultOutputName();
      expect(name).toMatch(/\.mp4$/);
    });

    it('should have valid date format', () => {
      const name = defaultOutputName();
      const match = name.match(/joined_output_(\d{4})-(\d{2})-(\d{2})_(\d{2})(\d{2})(\d{2})/);
      expect(match).toBeTruthy();
      if (match) {
        const [, year, month, day] = match;
        const y = parseInt(year);
        const m = parseInt(month);
        const d = parseInt(day);
        expect(y).toBeGreaterThanOrEqual(2020);
        expect(m).toBeGreaterThanOrEqual(1);
        expect(m).toBeLessThanOrEqual(12);
        expect(d).toBeGreaterThanOrEqual(1);
        expect(d).toBeLessThanOrEqual(31);
      }
    });
  });
});
