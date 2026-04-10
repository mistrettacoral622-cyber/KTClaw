# Setup Onboarding Shell Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make first-run Setup reliably navigable on all supported viewport sizes and ensure the Provider step only unlocks progression after persisted provider/default-provider state is verified.

**Architecture:** Extract a reusable `WizardShell` layout component that owns the responsive onboarding scaffold and sticky footer actions, then migrate `Setup` onto it. Split the Provider step out of the current large `Setup` file so its save-and-verify flow can be tested in isolation without coupling layout work to provider persistence details.

**Tech Stack:** React 19, TypeScript, Zustand, host-api routes, Vitest, Testing Library

---

## File Structure

- `src/components/wizard/wizard-shell.tsx`
  - New reusable shell component for stepper/header/scroll body/sticky footer layout.
- `src/pages/Setup/index.tsx`
  - Keeps top-level step state, step selection, and navigation handlers; stops owning raw shell layout details.
- `src/pages/Setup/provider-step.tsx`
  - New extracted Provider step component that owns save, OAuth, and post-save persisted-state verification.
- `tests/unit/setup-layout.test.tsx`
  - New focused tests for shell/footer/back-navigation responsiveness.
- `tests/unit/setup-provider-step.test.tsx`
  - New focused tests for provider save verification behavior.
- `tests/unit/setup-gate.test.tsx`
  - Existing routing gate regression to keep first-run redirect behavior stable.

## Chunk 1: Responsive Setup Shell

### Task 1: Add layout regression tests before changing Setup

**Files:**
- Create: `tests/unit/setup-layout.test.tsx`
- Modify: `src/pages/Setup/index.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('shows a previous action on provider step and keeps the action footer rendered', async () => {
  render(<MemoryRouter initialEntries={['/setup']}><Setup /></MemoryRouter>);

  await user.click(screen.getByRole('button', { name: /next/i }));
  await user.click(screen.getByRole('button', { name: /next/i }));

  expect(screen.getByRole('button', { name: /back|previous/i })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: /next/i })).toBeInTheDocument();
  expect(screen.getByTestId('wizard-footer')).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/setup-layout.test.tsx`
Expected: FAIL because `Setup` does not expose the new shell/footer contract yet.

- [ ] **Step 3: Write minimal implementation**

Create `src/components/wizard/wizard-shell.tsx` with a layout contract like:

```tsx
export function WizardShell(props: {
  steps: Array<{ id: string; title: string }>;
  activeStep: number;
  title: string;
  description: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-background text-foreground">
      <TitleBar />
      <div className="flex min-h-0 flex-1 flex-col">
        <header className="shrink-0 px-4 pt-6 md:px-8">{/* stepper + heading */}</header>
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-28 md:px-8 md:pb-32">
          {props.children}
        </main>
        <footer
          data-testid="wizard-footer"
          className="sticky bottom-0 z-10 shrink-0 border-t bg-background/95 px-4 py-3 backdrop-blur md:px-8"
        >
          {props.footer}
        </footer>
      </div>
    </div>
  );
}
```

Then refactor `src/pages/Setup/index.tsx` to render all step content inside `WizardShell` and move the navigation controls into the shell footer.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/setup-layout.test.tsx`
Expected: PASS

- [ ] **Step 5: Run route-gate regression**

Run: `pnpm test -- tests/unit/setup-gate.test.tsx tests/unit/setup-layout.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/wizard/wizard-shell.tsx src/pages/Setup/index.tsx tests/unit/setup-layout.test.tsx tests/unit/setup-gate.test.tsx
git commit -m "feat: add responsive setup wizard shell"
```

## Chunk 2: Provider Step Persisted Verification

### Task 2: Add failing tests for real provider-step completion

**Files:**
- Create: `tests/unit/setup-provider-step.test.tsx`
- Create: `src/pages/Setup/provider-step.tsx`
- Modify: `src/pages/Setup/index.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
it('keeps next disabled until the saved account is also the default account', async () => {
  hostApiFetchMock
    .mockResolvedValueOnce(initialSnapshotWithoutConfiguredProvider)
    .mockResolvedValueOnce({ success: true, account: createdAccount })
    .mockResolvedValueOnce({ success: true })
    .mockResolvedValueOnce(snapshotWhereAccountExistsButDefaultIsDifferent);

  render(<ProviderStep {...props} />);
  await user.click(screen.getByRole('button', { name: /save|validate and save/i }));

  expect(props.onConfiguredChange).not.toHaveBeenCalledWith(true);
  expect(screen.getByText(/default provider/i)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm test -- tests/unit/setup-provider-step.test.tsx`
Expected: FAIL because the current step marks success optimistically.

- [ ] **Step 3: Write minimal implementation**

Extract the current Provider step into `src/pages/Setup/provider-step.tsx` and add a helper like:

```tsx
async function verifyPersistedProviderSelection(expectedAccountId: string): Promise<boolean> {
  const snapshot = await fetchProviderSnapshot();
  const accountExists = snapshot.accounts.some((account) => account.id === expectedAccountId);
  return accountExists && snapshot.defaultAccountId === expectedAccountId;
}
```

Use it after successful save/default calls:

```tsx
const verified = await verifyPersistedProviderSelection(accountIdForSave);
if (!verified) {
  setKeyValid(false);
  onConfiguredChange(false);
  toast.error('Provider save did not persist as the active default provider.');
  return;
}

setSelectedAccountId(accountIdForSave);
onConfiguredChange(true);
toast.success(t('provider.valid'));
```

Keep Ollama/local handling intact by continuing to use `resolveProviderApiKeyForSave('ollama', apiKey)` and skipping API-key validation when the provider profile is `none`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm test -- tests/unit/setup-provider-step.test.tsx`
Expected: PASS

- [ ] **Step 5: Add positive-path verification test**

Add a second test proving a verified saved/default account enables progression:

```tsx
expect(props.onConfiguredChange).toHaveBeenCalledWith(true);
```

Run: `pnpm test -- tests/unit/setup-provider-step.test.tsx`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/pages/Setup/provider-step.tsx src/pages/Setup/index.tsx tests/unit/setup-provider-step.test.tsx
git commit -m "fix: verify persisted provider state before advancing setup"
```

## Chunk 3: Setup Flow Regression Hardening

### Task 3: Protect installing/complete/back-navigation behavior

**Files:**
- Modify: `tests/unit/setup-layout.test.tsx`
- Modify: `tests/unit/setup-gate.test.tsx`
- Modify: `src/pages/Setup/index.tsx`

- [ ] **Step 1: Write failing regression tests**

Add tests for:

```tsx
it('does not render manual next during installing step', async () => {
  // step state forced to installing
  expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
});

it('shows previous on complete step before get started', async () => {
  // step state forced to complete
  expect(screen.getByRole('button', { name: /back|previous/i })).toBeInTheDocument();
});
```

- [ ] **Step 2: Run tests to verify they fail or expose regressions**

Run: `pnpm test -- tests/unit/setup-layout.test.tsx tests/unit/setup-gate.test.tsx`
Expected: FAIL until the new shell/footer logic preserves these contracts.

- [ ] **Step 3: Write minimal implementation**

Update `src/pages/Setup/index.tsx` footer action construction so:

```tsx
const footer = safeStepIndex === STEP.INSTALLING ? null : (
  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div>{!isFirstStep ? <Button variant="ghost" onClick={handleBack}>...</Button> : <span />}</div>
    <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
      {!isLastStep && safeStepIndex !== STEP.RUNTIME ? <Button variant="ghost" onClick={handleSkip}>...</Button> : null}
      <Button onClick={handleNext} disabled={!canProceed}>...</Button>
    </div>
  </div>
);
```

- [ ] **Step 4: Run targeted regression suite**

Run: `pnpm test -- tests/unit/setup-layout.test.tsx tests/unit/setup-provider-step.test.tsx tests/unit/setup-gate.test.tsx`
Expected: PASS

- [ ] **Step 5: Run broader setup/settings smoke tests**

Run: `pnpm test -- tests/unit/setup-gate.test.tsx tests/unit/settings-app-redirects.test.tsx tests/unit/settings-persistence.test.ts tests/unit/gateway-events.test.ts`
Expected: PASS

- [ ] **Step 6: Review docs impact**

Check whether the onboarding flow description/screenshots in:

- `README.md`
- `README.zh-CN.md`
- `README.ja-JP.md`

need updates. If no onboarding behavior is documented there, note “No doc change required” in the implementation summary.

- [ ] **Step 7: Commit**

```bash
git add src/pages/Setup/index.tsx tests/unit/setup-layout.test.tsx tests/unit/setup-provider-step.test.tsx tests/unit/setup-gate.test.tsx README.md README.zh-CN.md README.ja-JP.md
git commit -m "test: harden setup wizard navigation regressions"
```

## Notes For Execution

- Follow @superpowers:test-driven-development for every behavior change.
- Do not change Feishu/WeChat/Migration wizard behavior in this implementation.
- Keep `WizardShell` generic but only wire it into `Setup` for now.
- Preserve the current real provider runtime sync path; the bug is around verification and UX, not around replacing the backend.

