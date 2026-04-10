import { describe, expect, it } from 'vitest';
import {
  buildConversationExportFileName,
  buildConversationMarkdownExport,
} from '@/lib/chat-session-export';
import type { RawMessage } from '@/stores/chat';

describe('chat export helpers', () => {
  it('preserves Unicode content in markdown exports', () => {
    const messages: RawMessage[] = [
      { role: 'user', content: '你好，世界' },
      { role: 'assistant', content: '已为你整理完成。' },
    ];

    const markdown = buildConversationMarkdownExport(messages, 'agent:main:main');

    expect(markdown).toContain('# Chat Conversation Export');
    expect(markdown).toContain('## 1. User');
    expect(markdown).toContain('你好，世界');
    expect(markdown).toContain('## 2. Assistant');
    expect(markdown).toContain('已为你整理完成。');
    expect(markdown).toContain('`agent:main:main`');
  });

  it('normalizes session keys into filesystem-safe export filenames', () => {
    const fileName = buildConversationExportFileName('agent:main:feishu/group 01');

    expect(fileName).toMatch(/^agent-main-feishu-group-01-/);
    expect(fileName).toMatch(/\.md$/);
    expect(fileName).not.toContain(':');
    expect(fileName).not.toContain('/');
    expect(fileName).not.toContain(' ');
  });
});
