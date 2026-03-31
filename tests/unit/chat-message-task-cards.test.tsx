/**
 * ChatMessage Task Cards Tests
 * Phase 02-04: Task proposal and anchor rendering in chat
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatMessage } from '@/pages/Chat/ChatMessage';
import type { RawMessage } from '@/stores/chat';

// Mock dependencies
vi.mock('@/pages/Chat/MarkdownContent', () => ({
  default: ({ content }: { content: string }) => <div>{content}</div>,
}));

vi.mock('@/pages/Chat/message-utils', () => ({
  extractText: (msg: RawMessage) => typeof msg.content === 'string' ? msg.content : '',
  extractThinking: () => null,
  extractImages: () => [],
  extractToolGroups: () => [],
  formatTimestamp: () => '10:00 AM',
  isSystemInjectedUserMessage: () => false,
}));

vi.mock('@/pages/Chat/TaskCreationBubble', () => ({
  TaskCreationBubble: ({ title, onConfirm, onCancel }: any) => (
    <div data-testid="task-creation-bubble">
      <div>{title}</div>
      <button onClick={onConfirm}>确认</button>
      <button onClick={onCancel}>取消</button>
    </div>
  ),
}));

describe('ChatMessage - Task Cards', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders TaskCreationBubble for messages with _taskProposal', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: '我建议创建以下任务',
      _taskProposal: {
        title: 'Implement login feature',
        description: 'Add OAuth login',
        assigneeId: 'agent-1',
        priority: 'high',
      },
    };

    render(<ChatMessage message={message} showThinking={false} />);

    expect(screen.getByTestId('task-creation-bubble')).toBeInTheDocument();
    expect(screen.getByText('Implement login feature')).toBeInTheDocument();
  });

  it('renders task anchor card for messages with _taskAnchor', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: '',
      _taskAnchor: {
        taskId: 'task-123',
        title: 'Implement login feature',
      },
    };

    render(<ChatMessage message={message} showThinking={false} />);

    expect(screen.getByText('✓ 任务已创建')).toBeInTheDocument();
    expect(screen.getByText('Implement login feature')).toBeInTheDocument();
    expect(screen.getByText('查看看板 →')).toBeInTheDocument();
  });

  it('anchor card has link to kanban board', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: '',
      _taskAnchor: {
        taskId: 'task-123',
        title: 'Implement login feature',
      },
    };

    // Mock window.location
    delete (window as any).location;
    window.location = { href: '' } as any;

    render(<ChatMessage message={message} showThinking={false} />);

    const link = screen.getByText('查看看板 →');
    fireEvent.click(link);

    expect(window.location.href).toBe('/kanban');
  });

  it('hides task bubble after confirmation', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: '我建议创建以下任务',
      _taskProposal: {
        title: 'Implement login feature',
        description: 'Add OAuth login',
      },
    };

    const { rerender } = render(<ChatMessage message={message} showThinking={false} />);

    const confirmButton = screen.getByText('确认');
    fireEvent.click(confirmButton);

    // After confirmation, bubble should be hidden
    rerender(<ChatMessage message={message} showThinking={false} />);
    expect(screen.queryByTestId('task-creation-bubble')).not.toBeInTheDocument();
  });

  it('hides task bubble after cancellation', () => {
    const message: RawMessage = {
      role: 'assistant',
      content: '我建议创建以下任务',
      _taskProposal: {
        title: 'Implement login feature',
        description: 'Add OAuth login',
      },
    };

    const { rerender } = render(<ChatMessage message={message} showThinking={false} />);

    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);

    // After cancellation, bubble should be hidden
    rerender(<ChatMessage message={message} showThinking={false} />);
    expect(screen.queryByTestId('task-creation-bubble')).not.toBeInTheDocument();
  });
});
