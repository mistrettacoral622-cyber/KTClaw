import { describe, it, expect } from 'vitest';
import { checkDmPolicy, checkGroupPolicy } from '@electron/channels/shared/policy';

describe('checkDmPolicy', () => {
  it('open policy always allows any senderId', () => {
    expect(checkDmPolicy({ dmPolicy: 'open', senderId: 'user-1' })).toEqual({ allowed: true });
  });

  it('open policy allows empty senderId', () => {
    expect(checkDmPolicy({ dmPolicy: 'open', senderId: '' })).toEqual({ allowed: true });
  });

  it('pairing policy allows any senderId with new_pairing reason', () => {
    const result = checkDmPolicy({ dmPolicy: 'pairing', senderId: 'user-1' });
    expect(result.allowed).toBe(true);
    expect(result.reason).toBe('new_pairing');
  });

  it('pairing policy allows unknown senderId', () => {
    const result = checkDmPolicy({ dmPolicy: 'pairing', senderId: 'unknown-user' });
    expect(result.allowed).toBe(true);
  });

  it('allowlist policy allows senderId in allowFrom', () => {
    expect(
      checkDmPolicy({ dmPolicy: 'allowlist', senderId: 'user-1', allowFrom: ['user-1', 'user-2'] })
    ).toEqual({ allowed: true });
  });

  it('allowlist policy denies senderId not in allowFrom', () => {
    const result = checkDmPolicy({
      dmPolicy: 'allowlist',
      senderId: 'user-99',
      allowFrom: ['user-1', 'user-2'],
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('sender_not_in_allowlist');
  });

  it('allowlist policy denies when allowFrom is empty', () => {
    const result = checkDmPolicy({ dmPolicy: 'allowlist', senderId: 'user-1', allowFrom: [] });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('sender_not_in_allowlist');
  });

  it('allowlist policy denies when allowFrom is undefined', () => {
    const result = checkDmPolicy({ dmPolicy: 'allowlist', senderId: 'user-1' });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('sender_not_in_allowlist');
  });
});

describe('checkGroupPolicy', () => {
  it('disabled policy always denies', () => {
    const result = checkGroupPolicy({
      groupPolicy: 'disabled',
      conversationId: 'group-1',
      requireMention: false,
      mentionedBot: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('group_messages_disabled');
  });

  it('open policy without requireMention allows', () => {
    expect(
      checkGroupPolicy({
        groupPolicy: 'open',
        conversationId: 'group-1',
        requireMention: false,
        mentionedBot: false,
      })
    ).toEqual({ allowed: true });
  });

  it('open policy with requireMention=true and bot not mentioned denies', () => {
    const result = checkGroupPolicy({
      groupPolicy: 'open',
      conversationId: 'group-1',
      requireMention: true,
      mentionedBot: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('mention_required');
  });

  it('open policy with requireMention=true and bot mentioned allows', () => {
    expect(
      checkGroupPolicy({
        groupPolicy: 'open',
        conversationId: 'group-1',
        requireMention: true,
        mentionedBot: true,
      })
    ).toEqual({ allowed: true });
  });

  it('allowlist policy allows conversationId in groupAllowFrom', () => {
    expect(
      checkGroupPolicy({
        groupPolicy: 'allowlist',
        conversationId: 'group-1',
        groupAllowFrom: ['group-1', 'group-2'],
        requireMention: false,
        mentionedBot: false,
      })
    ).toEqual({ allowed: true });
  });

  it('allowlist policy denies conversationId not in groupAllowFrom', () => {
    const result = checkGroupPolicy({
      groupPolicy: 'allowlist',
      conversationId: 'group-99',
      groupAllowFrom: ['group-1', 'group-2'],
      requireMention: false,
      mentionedBot: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('group_not_in_allowlist');
  });

  it('allowlist policy denies when groupAllowFrom is empty', () => {
    const result = checkGroupPolicy({
      groupPolicy: 'allowlist',
      conversationId: 'group-1',
      groupAllowFrom: [],
      requireMention: false,
      mentionedBot: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('group_not_in_allowlist');
  });

  it('allowlist policy with mention check: allowed group + mention required + bot mentioned => allowed', () => {
    expect(
      checkGroupPolicy({
        groupPolicy: 'allowlist',
        conversationId: 'group-1',
        groupAllowFrom: ['group-1'],
        requireMention: true,
        mentionedBot: true,
      })
    ).toEqual({ allowed: true });
  });

  it('allowlist policy with mention check: allowed group + mention required + bot NOT mentioned => denied', () => {
    const result = checkGroupPolicy({
      groupPolicy: 'allowlist',
      conversationId: 'group-1',
      groupAllowFrom: ['group-1'],
      requireMention: true,
      mentionedBot: false,
    });
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('mention_required');
  });
});
