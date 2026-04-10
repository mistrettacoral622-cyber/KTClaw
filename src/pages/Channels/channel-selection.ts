import type { Channel, ChannelType } from '@/types/channel';

const CHANNEL_PLACEHOLDER_LABELS: Partial<Record<ChannelType, string>> = {
  feishu: '飞书',
  wechat: '微信',
  dingtalk: '钉钉',
  wecom: '企微',
  qqbot: 'QQ',
};

export function getChannelWorkbenchLabel(channelType: ChannelType): string {
  return CHANNEL_PLACEHOLDER_LABELS[channelType] ?? channelType;
}

function parseChannelTypeFromId(channelId: string | null): string | null {
  if (!channelId) return null;
  const separatorIndex = channelId.indexOf('-');
  if (separatorIndex === -1) return channelId;
  return channelId.slice(0, separatorIndex);
}

export function resolveSelectedChannel(
  channels: Channel[],
  activeChannelId: string | null,
  requestedChannel: ChannelType | null,
): Channel | null {
  if (activeChannelId) {
    const exactMatch = channels.find((channel) => channel.id === activeChannelId);
    if (exactMatch) {
      return exactMatch;
    }

    const activeChannelType = parseChannelTypeFromId(activeChannelId);
    if (activeChannelType) {
      const sameTypeMatch = channels.find((channel) => channel.type === activeChannelType);
      if (sameTypeMatch) {
        return sameTypeMatch;
      }
    }
  }

  if (requestedChannel) {
    return channels.find((channel) => channel.type === requestedChannel) ?? null;
  }

  return null;
}

export function buildWorkbenchComposerPlaceholder(
  channelType: ChannelType,
  sessionType: 'group' | 'private' | undefined,
): string {
  const channelLabel = getChannelWorkbenchLabel(channelType);
  if (channelType !== 'wechat') {
    if (sessionType === 'private') {
      return `在私聊发送消息（将同步至${channelLabel}）...`;
    }
    return `在群聊发送消息（将同步至${channelLabel}）...`;
  }
  if (sessionType === 'private') {
    return `在${channelLabel}私聊发送消息（将同步至${channelLabel}）...`;
  }
  return `在${channelLabel}发送消息（将同步至${channelLabel}）...`;
}
