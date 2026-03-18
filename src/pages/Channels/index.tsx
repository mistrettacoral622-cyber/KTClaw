/**
 * Channels Page — Frame 04
 * IM 频道 / 多 Agent 对话：团队内部消息流
 */
import { useState } from 'react';
import { cn } from '@/lib/utils';

/* ─── Static data ─── */

const CHANNEL_TYPES = [
  { id: 'feishu', label: '飞书接入', icon: '🪶' },
  { id: 'dingtalk', label: '钉钉接入', icon: '💙' },
  { id: 'wecom', label: '企微接入', icon: '🍀' },
  { id: 'qq', label: 'QQ接入', icon: '🐧' },
];

const GROUPS = [
  {
    id: 'devops',
    name: '研发中心 DevOps 总群',
    tags: ['+', ''],
    agents: ['KTClaw', 'DataAnalyst'],
    active: true,
  },
  {
    id: 'data',
    name: '数据分析项目组',
    tags: [],
    agents: ['KTClaw', 'DataAnalyst'],
    active: false,
  },
  {
    id: 'ops',
    name: '运营推广组（AI仪）',
    tags: [],
    agents: ['Monkey', 'SEO Agent'],
    active: false,
  },
];

interface Message {
  id: string;
  type: 'system' | 'human' | 'agent';
  sender?: string;
  avatar?: string;
  avatarBg?: string;
  time: string;
  content: string;
  toolCall?: { name: string; duration: string };
  toolResult?: string;
  mentionColor?: string;
}

const MESSAGES: Message[] = [
  {
    id: 'sys1',
    type: 'system',
    time: '今天 09:00',
    content: '飞书机器人「KTClaw主脑」已加入群聊',
  },
  {
    id: 'm1',
    type: 'human',
    sender: '李明（人类）',
    avatar: '李',
    avatarBg: '#8e8e93',
    time: '09:01',
    content: '@KTClaw 帮我查一下昨天晚上的构建日志，好像有个服务 OOM 了。',
    mentionColor: '#10b981',
  },
  {
    id: 'm2',
    type: 'agent',
    sender: 'KTClaw',
    avatar: '✦',
    avatarBg: '#10b981',
    time: '09:02',
    content:
      '好的，我这就去排查昨天 20:00-08:00 的 Kubernetes 集群日志。',
    toolCall: { name: 'query_k8s_logs', duration: '3.2s' },
    toolResult:
      '查到了。昨晚 23:45 payment-service-v2 发生了 OOMKilled。监控显示在崩溃前 5 分钟内，内存突增了 4GB。需要我找回当时的慢 SQL 记录吗？',
  },
  {
    id: 'm3',
    type: 'agent',
    sender: '沉思小助手',
    avatar: '🔍',
    avatarBg: '#3b82f6',
    time: '09:03',
    content:
      '我自动补充一下：根据历史缺陷知识库，payment-service-v2 在上个月也发生过类似 OOM，当时的原因是批量导出账单接口未作分页限制（相关工单：#BUG-4421）。',
    mentionColor: '#3b82f6',
  },
  {
    id: 'm4',
    type: 'human',
    sender: '李明（人类）',
    avatar: '李',
    avatarBg: '#8e8e93',
    time: '09:05',
    content: '确实如此。@KTClaw 帮我把慢 SQL 记录拉出来，然后帮我建一个修复任务。',
    mentionColor: '#10b981',
  },
];

/* ─── Components ─── */

export function Channels() {
  const [activeChannel, setActiveChannel] = useState('feishu');
  const [activeGroup, setActiveGroup] = useState('devops');
  const [composerValue, setComposerValue] = useState('');

  const currentGroup = GROUPS.find((g) => g.id === activeGroup) ?? GROUPS[0];

  return (
    <div className="-m-6 flex h-[calc(100vh-2.5rem)] flex-row overflow-hidden bg-[#f2f2f7]">

      {/* Panel 1: Channel type list */}
      <div className="flex w-[164px] shrink-0 flex-col border-r border-black/[0.06] bg-white">
        <div className="flex h-[52px] shrink-0 items-center justify-between px-4">
          <span className="text-[13px] font-semibold text-[#000000]">CHANNEL 频道</span>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[16px] text-[#3c3c43] hover:bg-[#f2f2f7]"
          >
            +
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
          {CHANNEL_TYPES.map((ch) => (
            <button
              key={ch.id}
              type="button"
              onClick={() => setActiveChannel(ch.id)}
              className={cn(
                'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[14px] transition-colors',
                activeChannel === ch.id
                  ? 'bg-[#f2f2f7] font-medium text-[#000000]'
                  : 'text-[#3c3c43] hover:bg-[#f2f2f7]',
              )}
            >
              <span className="text-[16px]">{ch.icon}</span>
              <span className="truncate">{ch.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Panel 2: Group / chat list */}
      <div className="flex w-[252px] shrink-0 flex-col border-r border-black/[0.06] bg-white">
        {/* Panel header */}
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-black/[0.06] px-4">
          <span className="text-[14px] font-semibold text-[#000000]">飞书配置详情</span>
          <button
            type="button"
            className="flex h-6 w-6 items-center justify-center rounded-md text-[16px] text-[#3c3c43] hover:bg-[#f2f2f7]"
          >
            +
          </button>
        </div>

        {/* Search */}
        <div className="shrink-0 px-3 py-2">
          <div className="flex items-center gap-2 rounded-lg bg-[#f2f2f7] px-3 py-1.5">
            <span className="text-[13px] text-[#8e8e93]">🔍</span>
            <span className="text-[13px] text-[#8e8e93]">搜索群聊或机器人...</span>
          </div>
        </div>

        {/* Group list */}
        <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-2 pb-2">
          {GROUPS.map((group) => (
            <button
              key={group.id}
              type="button"
              onClick={() => setActiveGroup(group.id)}
              className={cn(
                'flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition-colors',
                activeGroup === group.id
                  ? 'bg-[#f0f7ff]'
                  : 'hover:bg-[#f2f2f7]',
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-[#000000] truncate pr-1">
                  {group.name}
                </span>
                {activeGroup === group.id && (
                  <span className="shrink-0 text-[12px] text-[#8e8e93]">✎</span>
                )}
              </div>
              {group.agents.length > 0 && (
                <span className="mt-0.5 text-[11px] text-[#8e8e93] truncate">
                  {group.agents.join(', ')}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Panel 3: Chat view */}
      <div className="flex flex-1 flex-col overflow-hidden bg-white">
        {/* Chat header */}
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-black/[0.06] px-5">
          <div className="flex items-center gap-2">
            <span className="text-[14px] font-semibold text-[#000000]">
              {currentGroup.name}
            </span>
            <span className="flex items-center gap-1 rounded-full border border-[#007aff]/20 bg-[#007aff]/8 px-2 py-0.5 text-[11px] text-[#007aff]">
              🪶 飞书同步中
            </span>
          </div>
          <span className="text-[13px] text-[#8e8e93]">4 Agent / 12 人类</span>
        </div>

        {/* Messages */}
        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
          {MESSAGES.map((msg) => {
            if (msg.type === 'system') {
              return (
                <div key={msg.id} className="flex items-center justify-center">
                  <span className="rounded-full bg-[#f2f2f7] px-3 py-1 text-[11px] text-[#8e8e93]">
                    + {msg.content} · {msg.time}
                  </span>
                </div>
              );
            }

            return (
              <div key={msg.id} className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px] text-white"
                  style={{ background: msg.avatarBg }}
                >
                  {msg.avatar}
                </div>

                {/* Bubble */}
                <div className="flex flex-1 flex-col">
                  <div className="mb-1 flex items-baseline gap-2">
                    <span className="text-[13px] font-semibold text-[#000000]">
                      {msg.sender}
                    </span>
                    <span className="text-[11px] text-[#8e8e93]">{msg.time}</span>
                  </div>

                  <p className="text-[14px] leading-[1.6] text-[#1c1c1e]">
                    {msg.content}
                  </p>

                  {/* Tool call block */}
                  {msg.toolCall && (
                    <div className="mt-2 rounded-lg border border-black/[0.06] bg-[#f9f9f9] px-3 py-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-mono text-[#3c3c43]">
                          ⚡ {msg.toolCall.name}{' '}
                          <span className="text-[#8e8e93]">({msg.toolCall.duration})</span>
                        </span>
                        <span className="text-[11px] text-[#007aff]">▾ 展开详情</span>
                      </div>
                    </div>
                  )}

                  {/* Tool result */}
                  {msg.toolResult && (
                    <p className="mt-2 text-[14px] leading-[1.6] text-[#1c1c1e]">
                      {msg.toolResult}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Composer */}
        <div className="shrink-0 border-t border-black/[0.06] px-4 py-3">
          <div className="flex items-center gap-3 rounded-xl border border-black/[0.06] bg-white px-3 py-2.5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
            <button
              type="button"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[#8e8e93] hover:bg-[#f2f2f7]"
            >
              🎤
            </button>

            {/* Model pill */}
            <div className="flex shrink-0 items-center gap-1 rounded-full border border-black/10 bg-[#f2f2f7] px-2 py-0.5 text-[12px] text-[#3c3c43]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#10b981]" />
              <span className="font-medium">GLM-5</span>
              <span className="text-[#8e8e93]">▾</span>
            </div>

            <input
              value={composerValue}
              onChange={(e) => setComposerValue(e.target.value)}
              placeholder="在群聊发送消息（将同步至飞书）..."
              className="flex-1 bg-transparent text-[14px] text-[#000000] outline-none placeholder:text-[#8e8e93]"
            />

            <button
              type="button"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#10b981] text-white shadow-sm transition-colors hover:bg-[#059669]"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Channels;
