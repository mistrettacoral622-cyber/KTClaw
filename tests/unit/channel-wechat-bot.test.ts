import { describe, expect, it } from 'vitest';
import { MessageDeduplicator } from '../../electron/channels/shared/dedup';
import { createWeChatInbound } from '../../electron/channels/wechat/bot';
import type { InboundContext } from '../../electron/channels/types';

describe('createWeChatInbound', () => {
  it('builds a standardized inbound context for group messages', () => {
    const inbound = createWeChatInbound();

    const ctx = inbound.buildContext({
      text: 'hello team',
      rawText: 'hello team',
      accountId: 'default',
      chatId: 'room_1',
      senderId: 'wxid_sender_1',
      messageId: 'msg_1',
      timestamp: 12345,
      chatType: 'group',
      agentId: 'main',
    });

    expect(ctx).toEqual<InboundContext>({
      body: 'hello team',
      rawBody: 'hello team',
      from: 'wechat:wxid_sender_1',
      to: 'chat:room_1',
      sessionKey: 'agent:main:wechat:group:room_1',
      accountId: 'default',
      chatType: 'group',
      senderId: 'wxid_sender_1',
      provider: 'wechat',
      messageSid: 'msg_1',
      timestamp: 12345,
      wasMentioned: false,
      originatingChannel: 'wechat',
    });
  });

  it('keeps direct-message session scoping account-aware', () => {
    const inbound = createWeChatInbound();

    const ctx = inbound.buildContext({
      text: 'hello dm',
      accountId: 'account-a',
      senderId: 'wxid_dm_1',
      messageId: 'msg_dm_1',
      timestamp: 54321,
      chatType: 'direct',
      agentId: 'main',
    });

    expect(ctx.sessionKey).toBe('agent:main:wechat:direct:account-a:wxid_dm_1');
    expect(ctx.to).toBe('user:wxid_dm_1');
  });

  it('drops duplicate inbound messages before dispatching', async () => {
    const dispatched: InboundContext[] = [];
    const inbound = createWeChatInbound({
      deduplicator: new MessageDeduplicator(),
      dispatchMessage: async (ctx) => {
        dispatched.push(ctx);
      },
    });

    const ctx = inbound.buildContext({
      text: 'hello once',
      accountId: 'default',
      chatId: 'room_dup',
      senderId: 'wxid_dup',
      messageId: 'msg_dup_1',
      timestamp: 123,
      chatType: 'group',
      agentId: 'main',
    });

    await inbound.dispatch(ctx);
    await inbound.dispatch(ctx);

    expect(dispatched).toHaveLength(1);
    expect(dispatched[0]?.messageSid).toBe('msg_dup_1');
  });
});
