import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WorkbenchEmptyState } from '@/components/workbench/workbench-empty-state';

describe('WorkbenchEmptyState', () => {
  it('renders the premium hero and 2x2 suggestion cards', () => {
    render(<WorkbenchEmptyState />);

    expect(screen.getByText('✦')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '有什么我可以帮你的？' })).toBeInTheDocument();

    const titles = ['代码重构方案', '检查系统健康度', '撰写周报汇总', '查看团队记忆'];
    for (const title of titles) {
      expect(screen.getByText(title)).toBeInTheDocument();
    }
    expect(screen.getAllByRole('article')).toHaveLength(4);
  });
});
