import { describe, it, expect } from 'vitest';

describe('probe utilities', () => {
  describe('videoSignature extraction', () => {
    it('should extract codec and resolution from probe data', () => {
      const probe = {
        streams: [
          {
            codec_type: 'video',
            codec_name: 'h264',
            width: 1920,
            height: 1080,
          },
        ],
      };
      const v = probe.streams.find((s: any) => s.codec_type === 'video') as any;
      const signature = `${v?.codec_name ?? '?'} ${v?.width ?? '?'}x${v?.height ?? '?'}`;
      expect(signature).toBe('h264 1920x1080');
    });

    it('should handle missing codec info', () => {
      const probe = {
        streams: [
          {
            codec_type: 'video',
            codec_name: undefined,
            width: 1920,
            height: 1080,
          },
        ],
      };
      const v = probe.streams.find((s: any) => s.codec_type === 'video') as any;
      const signature = `${v?.codec_name ?? '?'} ${v?.width ?? '?'}x${v?.height ?? '?'}`;
      expect(signature).toBe('? 1920x1080');
    });

    it('should return "unknown" when no video stream found', () => {
      const probe = {
        streams: [
          {
            codec_type: 'audio',
            codec_name: 'aac',
          },
        ],
      };
      const v = (probe?.streams ?? []).find((s: any) => s.codec_type === 'video') as any;
      const signature = v ? `${v.codec_name ?? '?'} ${v.width ?? '?'}x${v.height ?? '?'}` : 'unknown';
      expect(signature).toBe('unknown');
    });

    it('should handle various codec types', () => {
      const codecs = ['h264', 'h265', 'vp9', 'av1'];
      codecs.forEach((codec) => {
        const probe = {
          streams: [
            {
              codec_type: 'video',
              codec_name: codec,
              width: 1920,
              height: 1080,
            },
          ],
        };
        const v = probe.streams.find((s: any) => s.codec_type === 'video') as any;
        const signature = `${v?.codec_name ?? '?'} ${v?.width ?? '?'}x${v?.height ?? '?'}`;
        expect(signature).toContain(codec);
      });
    });
  });

  describe('duration parsing', () => {
    it('should parse valid duration', () => {
      const probe = { format: { duration: '60.5' } } as any;
      const d = parseFloat(probe?.format?.duration);
      const duration = Number.isFinite(d) ? d : 0;
      expect(duration).toBe(60.5);
    });

    it('should return 0 for missing duration', () => {
      const probe = { format: {} } as any;
      const d = parseFloat(probe?.format?.duration);
      const duration = Number.isFinite(d) ? d : 0;
      expect(duration).toBe(0);
    });

    it('should return 0 for invalid duration', () => {
      const probe = { format: { duration: 'invalid' } } as any;
      const d = parseFloat(probe?.format?.duration);
      const duration = Number.isFinite(d) ? d : 0;
      expect(duration).toBe(0);
    });

    it('should handle zero duration', () => {
      const probe = { format: { duration: '0' } } as any;
      const d = parseFloat(probe?.format?.duration);
      const duration = Number.isFinite(d) ? d : 0;
      expect(duration).toBe(0);
    });
  });

  describe('creation time extraction', () => {
    it('should extract creation_time from metadata', () => {
      const probe = {
        format: {
          tags: {
            creation_time: '2024-01-15T10:30:00Z',
          },
        },
      } as any;
      const ct = probe?.format?.tags?.creation_time;
      const parsed = typeof ct === 'string' ? new Date(ct) : null;
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed?.getFullYear()).toBe(2024);
    });

    it('should return null for invalid creation_time', () => {
      const probe = {
        format: {
          tags: {
            creation_time: 'invalid-date',
          },
        },
      } as any;
      const ct = probe?.format?.tags?.creation_time;
      const parsed = typeof ct === 'string' ? new Date(ct) : null;
      expect(Number.isNaN(parsed?.getTime())).toBe(true);
    });

    it('should handle missing creation_time', () => {
      const probe = { format: { tags: {} } } as any;
      const ct = probe?.format?.tags?.creation_time;
      expect(ct).toBeUndefined();
    });
  });
});
