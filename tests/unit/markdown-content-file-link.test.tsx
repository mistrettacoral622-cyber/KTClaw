import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import MarkdownContent from '@/pages/Chat/MarkdownContent';

const { invokeIpcMock } = vi.hoisted(() => ({
  invokeIpcMock: vi.fn(async () => ''),
}));

vi.mock('@/lib/api-client', () => ({
  invokeIpc: (...args: unknown[]) => invokeIpcMock(...args),
}));

describe('MarkdownContent local file links', () => {
  it('opens local file links through the renderer API client', async () => {
    render(<MarkdownContent content="[open image](file:///home/user/My%20Photos/cat.jpg)" />);

    fireEvent.click(screen.getByRole('link', { name: 'open image' }));

    await waitFor(() => {
      expect(invokeIpcMock).toHaveBeenCalledWith('shell:openPath', '/home/user/My Photos/cat.jpg');
    });
  });
});
