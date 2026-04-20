export interface WindowChromeOptions {
  useCustomTitleBar: boolean;
  titleBarStyle: 'hiddenInset' | 'hidden' | 'default';
  frame: boolean;
  autoHideMenuBar: boolean;
}

export function resolveWindowChromeOptions(
  platform: NodeJS.Platform,
  env: NodeJS.ProcessEnv = process.env,
): WindowChromeOptions {
  const isMac = platform === 'darwin';
  const isWindows = platform === 'win32';
  const isLinux = platform === 'linux';
  const forceNativeLinuxFrame = isLinux && env.KTCLAW_LINUX_NATIVE_FRAME === '1';
  const useCustomTitleBar = isWindows || (isLinux && !forceNativeLinuxFrame);

  return {
    useCustomTitleBar,
    titleBarStyle: isMac ? 'hiddenInset' : useCustomTitleBar ? 'hidden' : 'default',
    frame: isMac || !useCustomTitleBar,
    autoHideMenuBar: isLinux && useCustomTitleBar,
  };
}
