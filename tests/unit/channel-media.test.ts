import { describe, it, expect, vi, beforeEach } from 'vitest';
import os from 'os';

// Mock os module to control homedir in tests
vi.mock('os', () => ({
  default: {
    homedir: vi.fn(() => '/home/testuser'),
  },
  homedir: vi.fn(() => '/home/testuser'),
}));

import {
  extractImagesFromText,
  extractFilesFromText,
  isImagePath,
  isHttpUrl,
  normalizeLocalPath,
} from '../../electron/channels/shared/media';

describe('isImagePath', () => {
  it('returns true for .png', () => {
    expect(isImagePath('photo.png')).toBe(true);
  });

  it('returns true for .PNG (case insensitive)', () => {
    expect(isImagePath('photo.PNG')).toBe(true);
  });

  it('returns true for .jpg', () => {
    expect(isImagePath('photo.jpg')).toBe(true);
  });

  it('returns true for .jpeg', () => {
    expect(isImagePath('photo.jpeg')).toBe(true);
  });

  it('returns true for .gif', () => {
    expect(isImagePath('photo.gif')).toBe(true);
  });

  it('returns true for .webp', () => {
    expect(isImagePath('image.webp')).toBe(true);
  });

  it('returns true for .bmp', () => {
    expect(isImagePath('image.bmp')).toBe(true);
  });

  it('returns true for .svg', () => {
    expect(isImagePath('image.svg')).toBe(true);
  });

  it('returns false for .pdf', () => {
    expect(isImagePath('doc.pdf')).toBe(false);
  });

  it('returns false for .txt', () => {
    expect(isImagePath('doc.txt')).toBe(false);
  });
});

describe('isHttpUrl', () => {
  it('returns true for https://', () => {
    expect(isHttpUrl('https://example.com')).toBe(true);
  });

  it('returns true for http://', () => {
    expect(isHttpUrl('http://example.com')).toBe(true);
  });

  it('returns false for local path', () => {
    expect(isHttpUrl('/local/path')).toBe(false);
  });

  it('returns false for ftp://', () => {
    expect(isHttpUrl('ftp://example.com')).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isHttpUrl('')).toBe(false);
  });
});

describe('normalizeLocalPath', () => {
  it('replaces ~ with homedir', () => {
    expect(normalizeLocalPath('~/photos/img.png')).toBe('/home/testuser/photos/img.png');
  });

  it('replaces backslashes with forward slashes', () => {
    expect(normalizeLocalPath('C:\\Users\\photos\\img.png')).toBe('C:/Users/photos/img.png');
  });

  it('leaves absolute paths unchanged', () => {
    expect(normalizeLocalPath('/absolute/path.png')).toBe('/absolute/path.png');
  });
});

describe('extractImagesFromText', () => {
  it('returns empty result for text with no images', () => {
    const result = extractImagesFromText('Hello world, no images here.');
    expect(result.images).toHaveLength(0);
    expect(result.files).toHaveLength(0);
    expect(result.all).toHaveLength(0);
    expect(result.text).toBe('Hello world, no images here.');
  });

  it('parses Markdown image with local path — sourceKind markdown', () => {
    const result = extractImagesFromText('![alt](image.png)');
    expect(result.images).toHaveLength(1);
    expect(result.images[0].source).toBe('image.png');
    expect(result.images[0].isLocal).toBe(true);
    expect(result.images[0].isHttp).toBe(false);
    expect(result.images[0].sourceKind).toBe('markdown');
  });

  it('parses Markdown image with HTTP URL — sourceKind markdown', () => {
    const result = extractImagesFromText('![alt](https://example.com/img.jpg)');
    expect(result.images).toHaveLength(1);
    expect(result.images[0].source).toBe('https://example.com/img.jpg');
    expect(result.images[0].isLocal).toBe(false);
    expect(result.images[0].isHttp).toBe(true);
    expect(result.images[0].sourceKind).toBe('markdown');
  });

  it('parses Markdown link to image file — sourceKind markdown-linked', () => {
    const result = extractImagesFromText('[link](https://example.com/img.png)');
    expect(result.images).toHaveLength(1);
    expect(result.images[0].source).toBe('https://example.com/img.png');
    expect(result.images[0].isHttp).toBe(true);
    expect(result.images[0].sourceKind).toBe('markdown-linked');
  });

  it('parses HTML img tag — sourceKind html', () => {
    const result = extractImagesFromText('<img src="photo.jpg">');
    expect(result.images).toHaveLength(1);
    expect(result.images[0].source).toBe('photo.jpg');
    expect(result.images[0].sourceKind).toBe('html');
  });

  it('parses bare path on its own line — sourceKind bare', () => {
    const result = extractImagesFromText('/path/to/photo.png');
    expect(result.images).toHaveLength(1);
    expect(result.images[0].source).toBe('/path/to/photo.png');
    expect(result.images[0].sourceKind).toBe('bare');
  });

  it('strips extracted images from text by default', () => {
    const result = extractImagesFromText('Before ![alt](image.png) After');
    expect(result.text).not.toContain('![alt](image.png)');
    expect(result.text.trim()).toBe('Before  After'.trim());
  });

  it('does not strip when stripFromText is false', () => {
    const result = extractImagesFromText('Before ![alt](image.png) After', { stripFromText: false });
    expect(result.text).toContain('![alt](image.png)');
  });

  it('sets localPath for local images', () => {
    const result = extractImagesFromText('![alt](image.png)');
    expect(result.images[0].localPath).toBeDefined();
  });

  it('does not set localPath for HTTP images', () => {
    const result = extractImagesFromText('![alt](https://example.com/img.jpg)');
    expect(result.images[0].localPath).toBeUndefined();
  });

  it('sets fileName from path basename', () => {
    const result = extractImagesFromText('![alt](/path/to/photo.png)');
    expect(result.images[0].fileName).toBe('photo.png');
  });

  it('populates all array with all extracted media', () => {
    const result = extractImagesFromText('![alt](image.png)');
    expect(result.all).toHaveLength(1);
    expect(result.all[0]).toBe(result.images[0]);
  });

  it('handles all 4 sourceKind values in one text', () => {
    const text = [
      '![md](local.png)',
      '[link](linked.jpg)',
      '<img src="html.gif">',
      '/bare/path.webp',
    ].join('\n');
    const result = extractImagesFromText(text);
    const kinds = result.images.map((i) => i.sourceKind);
    expect(kinds).toContain('markdown');
    expect(kinds).toContain('markdown-linked');
    expect(kinds).toContain('html');
    expect(kinds).toContain('bare');
  });
});

describe('extractFilesFromText', () => {
  it('parses Markdown link to non-image file — sourceKind markdown-linked', () => {
    const result = extractFilesFromText('[doc](report.pdf)');
    expect(result.files).toHaveLength(1);
    expect(result.files[0].source).toBe('report.pdf');
    expect(result.files[0].sourceKind).toBe('markdown-linked');
  });

  it('excludes image files from file extraction', () => {
    const result = extractFilesFromText('[doc](image.png)');
    expect(result.files).toHaveLength(0);
  });

  it('sets type to file on all results', () => {
    const result = extractFilesFromText('[doc](report.pdf)');
    expect(result.files[0].type).toBe('file');
  });

  it('returns empty for text with no file links', () => {
    const result = extractFilesFromText('No links here');
    expect(result.files).toHaveLength(0);
  });
});
