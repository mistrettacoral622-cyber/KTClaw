import { describe, expect, it } from 'vitest';
import { MessageDeduplicator } from '../../electron/channels/shared/dedup';
import { createFeishuInbound } from '../../electron/channels/feishu/bot';
import type { InboundContext } from '../../electron/channels/types';

describe('createFeishuInbound', () => {
  it('builds a standardized inbound context for group messages', () => {
    const inbound = createFeishuInbound();

    const ctx = inbound.buildContext({
      text: 'hello team',
      rawText: '@bot hello team',
      accountId: 'default',
      chatId: 'oc_group_1',
      senderId: 'ou_sender_1',
      messageId: 'om_message_1',
      timestamp: 12345,
      chatType: 'group',
      wasMentioned: true,
      agentId: 'main',
    });

    expect(ctx).toEqual<InboundContext>({
      body: 'hello team',
      rawBody: '@bot hello team',
      from: 'feishu:ou_sender_1',
      to: 'chat:oc_group_1',
      sessionKey: 'agent:main:feishu:group:oc_group_1',
      accountId: 'default',
      chatType: 'group',
      senderId: 'ou_sender_1',
      provider: 'feishu',
      messageSid: 'om_message_1',
      timestamp: 12345,
      wasMentioned: true,
      originatingChannel: 'feishu',
    });
  });

  it('keeps direct-message session scoping account-aware', () => {
    const inbound = createFeishuInbound();

    const ctx = inbound.buildContext({
      text: 'hello dm',
      accountId: 'account-a',
      senderId: 'ou_sender_dm',
      messageId: 'om_message_dm',
      timestamp: 54321,
      chatType: 'direct',
      agentId: 'main',
    });

    expect(ctx.sessionKey).toBe('agent:main:feishu:direct:account-a:ou_sender_dm');
    expect(ctx.to).toBe('user:ou_sender_dm');
  });

  it('drops duplicate inbound messages before dispatching', async () => {
    const dispatched: InboundContext[] = [];
    const inbound = createFeishuInbound({
      deduplicator: new MessageDeduplicator(),
      dispatchMessage: async (ctx) => {
        dispatched.push(ctx);
      },
    });

    const ctx = inbound.buildContext({
      text: 'hello once',
      accountId: 'default',
      chatId: 'oc_group_dup',
      senderId: 'ou_sender_dup',
      messageId: 'om_dup_1',
      timestamp: 123,
      chatType: 'group',
      agentId: 'main',
    });

    await inbound.dispatch(ctx);
    await inbound.dispatch(ctx);

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]?.messageSid).toBe('om_dup_1');
  });
});
