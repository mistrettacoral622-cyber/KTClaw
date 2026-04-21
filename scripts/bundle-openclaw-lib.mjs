export function getBundleRootPackages() {
  return [
    'openclaw',
    // '@whiskeysockets/baileys', // WhatsApp Web API — disabled
  ];
}

export function getBundledNestedDependencyRepairs() {
  return [
    {
      packageName: 'hosted-git-info',
      dependencyName: 'lru-cache',
    },
  ];
}
