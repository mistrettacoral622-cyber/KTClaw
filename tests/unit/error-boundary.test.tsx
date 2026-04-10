import { createRef } from 'react';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('renders the default fallback UI when a child throws', () => {
    function BrokenChild() {
      throw new Error('boom');
    }

    render(
      <ErrorBoundary>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('heading', { name: 'Something went wrong' })).toBeInTheDocument();
    expect(screen.getByText('An unexpected error occurred. Please try again.')).toBeInTheDocument();
    expect(screen.getByText('boom')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('resets back to child content when the error condition clears', async () => {
    const boundaryRef = createRef<ErrorBoundary>();

    render(
      <ErrorBoundary ref={boundaryRef}>
        <div>Healthy child</div>
      </ErrorBoundary>,
    );

    await act(async () => {
      boundaryRef.current?.setState({
        hasError: true,
        error: new Error('temporary failure'),
      });
    });

    expect(screen.getByText('temporary failure')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    expect(screen.getByText('Healthy child')).toBeInTheDocument();
  });

  it('renders a custom fallback when provided', () => {
    function BrokenChild() {
      throw new Error('custom fallback failure');
    }

    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <BrokenChild />
      </ErrorBoundary>,
    );

    expect(screen.getByText('Custom fallback')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Something went wrong' })).not.toBeInTheDocument();
  });
});
