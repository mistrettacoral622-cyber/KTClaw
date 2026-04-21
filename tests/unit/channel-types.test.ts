import { describe, expect, it } from 'vitest';
import {
  CHANNEL_ICONS,
  CHANNEL_META,
  CHANNEL_NAMES,
  CHANNEL_WORKBENCH_TYPES,
  getAllChannels,
  getPrimaryChannels,
} from '@/types/channel';

const EXPECTED_CHANNELS = ['dingtalk', 'feishu', 'wecom', 'qqbot', 'wechat'] as const;
const EXPECTED_CHANNEL_SET = [...EXPECTED_CHANNELS].sort();

describe('channel type registry', () => {
  it('keeps only the supported five channel families in exported registries', () => {
    expect([...CHANNEL_WORKBENCH_TYPES].sort()).toEqual(EXPECTED_CHANNEL_SET);
    expect([...getPrimaryChannels()].sort()).toEqual(EXPECTED_CHANNEL_SET);
    expect([...getAllChannels()].sort()).toEqual(EXPECTED_CHANNEL_SET);
    expect(Object.keys(CHANNEL_NAMES).sort()).toEqual(EXPECTED_CHANNEL_SET);
    expect(Object.keys(CHANNEL_ICONS).sort()).toEqual(EXPECTED_CHANNEL_SET);
    expect(Object.keys(CHANNEL_META).sort()).toEqual(EXPECTED_CHANNEL_SET);
  });

  it('preserves metadata for the retained plugin-backed channels', () => {
    expect(CHANNEL_META.feishu.id).toBe('feishu');
    expect(CHANNEL_META.feishu.isPlugin).toBe(true);
    expect(CHANNEL_META.wechat.id).toBe('wechat');
    expect(CHANNEL_META.wechat.isPlugin).toBe(true);
  });
});
