import { describe, expect, it } from 'vitest';
import { resolveWindowChromeOptions } from '@electron/main/window-chrome';

describe('resolveWindowChromeOptions', () => {
  it('keeps macOS on hiddenInset with native frame', () => {
    expect(resolveWindowChromeOptions('darwin', {} as NodeJS.ProcessEnv)).toEqual({
      useCustomTitleBar: false,
      titleBarStyle: 'hiddenInset',
      frame: true,
      autoHideMenuBar: false,
    });
  });

  it('keeps Windows on the custom title bar path', () => {
    expect(resolveWindowChromeOptions('win32', {} as NodeJS.ProcessEnv)).toEqual({
      useCustomTitleBar: true,
      titleBarStyle: 'hidden',
      frame: false,
      autoHideMenuBar: false,
    });
  });

  it('defaults Linux to the custom title bar path', () => {
    expect(resolveWindowChromeOptions('linux', {} as NodeJS.ProcessEnv)).toEqual({
      useCustomTitleBar: true,
      titleBarStyle: 'hidden',
      frame: false,
      autoHideMenuBar: true,
    });
  });

  it('allows forcing the native Linux frame for compatibility', () => {
    expect(resolveWindowChromeOptions('linux', {
      KTCLAW_LINUX_NATIVE_FRAME: '1',
    } as NodeJS.ProcessEnv)).toEqual({
      useCustomTitleBar: false,
      titleBarStyle: 'default',
      frame: true,
      autoHideMenuBar: false,
    });
  });
});
