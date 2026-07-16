import { describe, it, expect } from 'vitest';
import path from 'path';

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
