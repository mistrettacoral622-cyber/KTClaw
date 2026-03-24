const CODE_BLOCK_RE = /```[\s\S]*?```/g;
const SMALL_TALK_RE = /^(ok|okay|thanks|thank\s+you|got\s+it|roger|收到|明白|好的|行|嗯)[.!? ]*$/i;
const QUESTION_PREFIX_RE = /^(请问|问下|如何|怎么|为什么|啥|what|who|why|how|when|where|which|can|could|would|is|are|do|does|did)\b/i;
const QUESTION_SUFFIX_RE = /(吗|么|呢|是否|是不是|可不可以|能不能|right)\s*$/i;
const PROCEDURAL_RE = /(run\s+(?:the\s+)?following\s+command|\b(?:cd|npm|pnpm|yarn|node|python|bash|sh|git|curl|wget)\b|\$[A-Z_][A-Z0-9_]*|&&|--[a-z0-9-]+|\/tmp\/|\.sh\b|\.bat\b|\.ps1\b|报错|错误|修复|排查|帮我|请帮|命令|安装依赖)/i;
const TRANSIENT_RE = /(今天|昨天|刚刚|刚才|这周|本周|本月|临时|暂时|today|yesterday|this\s+week|this\s+month|temporary|for\s+now)/i;
const NON_DURABLE_RE = /(我有个问题|有个问题|报错|错误|exception|stack\s*trace|todo|临时任务|一次性)/i;
const REQUEST_STYLE_RE = /^(?:请|麻烦|帮我|请你|帮忙|请帮我|use|please|can you|could you|would you)/i;

const PROFILE_RE = /(我叫|我的名字是|我是|我住在|我来自|我在.*工作|my\s+name\s+is|i\s+am|i['’]m|i\s+live\s+in|i['’]m\s+from|i\s+work\s+as)/i;
const OWNERSHIP_RE = /(我有(?!\s*(?:个|一个)\s*问题)|我养了|我家有|i\s+have|i\s+own|my\s+(?:dog|cat|child|daughter|son))/i;
const PREFERENCE_RE = /(我喜欢|我偏好|我习惯|我通常|我常用|i\s+prefer|i\s+like|i\s+usually|i\s+often)/i;
const STYLE_INTRO_RE = /(以后请|请默认|请始终|请以后|默认|always|default)/i;
const STYLE_TARGET_RE = /(回复|回答|语言|中文|英文|格式|风格|语气|markdown|respond|reply|language|format|style|tone)/i;

const EXPLICIT_ADD_RE = /^(?:请(?:你)?\s*)?(?:记住|记下|保存到记忆|写入记忆|记到记忆里|remember(?:\s+this|\s+that)?|store\s+(?:this|that)\s+in\s+memory)\s*[:：,-]?\s*(.+)$/i;
const EXPLICIT_ADD_ALT_RE = /^请(?:你)?把(.+?)(?:记住|记下)$/i;
const EXPLICIT_DELETE_RE = /^(?:请(?:你)?\s*)?(?:忘掉|忘记|删除记忆|从记忆中删除|forget\s+this|remove\s+from\s+memory)\s*[:：,-]?\s*(.+)$/i;

export type MemoryGuardLevel = 'strict' | 'standard' | 'relaxed';

export interface MemoryExtractMessage {
  role: string;
  content: unknown;
}

export interface MemoryCandidate {
  action: 'add' | 'delete';
  text: string;
  confidence: number;
  reason: string;
  explicit: boolean;
}

export interface MemoryJudgeOptions {
  enabled?: boolean;
  endpoint?: string;
  model?: string;
  apiKey?: string;
  timeoutMs?: number;
}

export interface MemoryExtractOptions {
  guardLevel?: MemoryGuardLevel;
  maxCandidates?: number;
  judge?: MemoryJudgeOptions;
}

export interface MemoryExtractResult {
  candidates: MemoryCandidate[];
  judge: {
    enabled: boolean;
    attempted: number;
    fallbacks: number;
  };
}

interface LlmJudgeDecision {
  accepted: boolean;
  confidence: number;
}

// ── LLM Judge Cache ──────────────────────────────────────────────

const LLM_CACHE_MAX_SIZE = 256;
const LLM_CACHE_TTL_MS = 10 * 60 * 1000;
const LLM_INPUT_MAX_CHARS = 280;
const LLM_BORDERLINE_MARGIN = 0.08;

interface CachedJudgeResult {
  decision: LlmJudgeDecision;
  createdAt: number;
}

const llmJudgeCache = new Map<string, CachedJudgeResult>();

function buildCacheKey(candidate: MemoryCandidate, guardLevel: MemoryGuardLevel): string {
  return `${guardLevel}|${candidate.explicit ? 1 : 0}|${normalizeText(candidate.text)}`;
}

function getCachedJudge(key: string): LlmJudgeDecision | null {
  const cached = llmJudgeCache.get(key);
  if (!cached) return null;
  if (Date.now() - cached.createdAt > LLM_CACHE_TTL_MS) {
    llmJudgeCache.delete(key);
    return null;
  }
  return cached.decision;
}

function setCachedJudge(key: string, decision: LlmJudgeDecision): void {
  llmJudgeCache.set(key, { decision, createdAt: Date.now() });
  while (llmJudgeCache.size > LLM_CACHE_MAX_SIZE) {
    const oldestKey = llmJudgeCache.keys().next().value;
    if (!oldestKey || typeof oldestKey !== 'string') break;
    llmJudgeCache.delete(oldestKey);
  }
}

export function clearLlmJudgeCache(): void {
  llmJudgeCache.clear();
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function splitIntoSentences(value: string): string[] {
  return value
    .replace(CODE_BLOCK_RE, ' ')
    .split(/[。！？!?；;\n\r]+/g)
    .map((line) => normalizeText(line))
    .filter(Boolean);
}

function sanitizeCandidate(value: string): string {
  return normalizeText(value.replace(/^[-*•]\s*/, '').replace(/[,:;，：；]+$/, ''));
}

function isQuestionLike(value: string): boolean {
  const text = normalizeText(value).replace(/[。！!]+$/g, '');
  if (!text) return false;
  if (/[?？]$/.test(text)) return true;
  if (QUESTION_PREFIX_RE.test(text)) return true;
  if (QUESTION_SUFFIX_RE.test(text)) return true;
  return false;
}

function shouldKeepCandidate(value: string, allowShort = false): boolean {
  const text = normalizeText(value);
  if (!text) return false;
  if (!allowShort && text.length < 6) return false;
  if (SMALL_TALK_RE.test(text)) return false;
  if (isQuestionLike(text)) return false;
  if (PROCEDURAL_RE.test(text)) return false;
  return true;
}

function scoreImplicitCandidate(text: string): { confidence: number; reason: string } | null {
  const normalized = normalizeText(text);
  if (!normalized) return null;
  if (isQuestionLike(normalized)) return null;
  if (SMALL_TALK_RE.test(normalized)) return null;

  let score = 0.5;
  let strongestReason = 'neutral';

  const isProfile = PROFILE_RE.test(normalized);
  const isOwnership = OWNERSHIP_RE.test(normalized);
  const isPreference = PREFERENCE_RE.test(normalized);
  const isStylePreference = STYLE_INTRO_RE.test(normalized) && STYLE_TARGET_RE.test(normalized);

  if (isProfile) {
    score += 0.28;
    strongestReason = 'implicit:profile';
  }
  if (isOwnership) {
    score += 0.22;
    if (strongestReason === 'neutral') strongestReason = 'implicit:ownership';
  }
  if (isPreference) {
    score += 0.18;
    if (strongestReason === 'neutral') strongestReason = 'implicit:preference';
  }
  if (isStylePreference) {
    score += 0.14;
    if (strongestReason === 'neutral') strongestReason = 'implicit:assistant-style';
  }

  if (REQUEST_STYLE_RE.test(normalized)) {
    score -= 0.14;
    if (strongestReason === 'neutral') strongestReason = 'request-like';
  }
  if (TRANSIENT_RE.test(normalized)) {
    score -= 0.18;
    if (strongestReason === 'neutral') strongestReason = 'transient-like';
  }
  if (PROCEDURAL_RE.test(normalized)) {
    score -= 0.4;
    strongestReason = 'procedural-like';
  }
  if (NON_DURABLE_RE.test(normalized)) {
    score -= 0.2;
    if (strongestReason === 'neutral') strongestReason = 'non-durable';
  }

  // Length-based adjustments (profile/ownership exempt from short-text penalty)
  if (normalized.length < 6 && !isProfile && !isOwnership) {
    score -= 0.2;
  } else if (normalized.length <= 120) {
    score += 0.06;
  } else if (normalized.length > 240) {
    score -= 0.08;
  }

  const clampedScore = Math.max(0, Math.min(1, score));
  if (strongestReason === 'neutral') return null;

  return { confidence: clampedScore, reason: strongestReason };
}

function thresholdFor(guardLevel: MemoryGuardLevel, explicit: boolean): number {
  if (explicit) {
    if (guardLevel === 'strict') return 0.72;
    if (guardLevel === 'relaxed') return 0.52;
    return 0.62;
  }
  if (guardLevel === 'strict') return 0.84;
  if (guardLevel === 'relaxed') return 0.58;
  return 0.68;
}

function shouldRunJudge(candidate: MemoryCandidate, guardLevel: MemoryGuardLevel): boolean {
  if (candidate.action !== 'add' || candidate.explicit) return false;
  if (candidate.reason === 'procedural-like') return false;
  const threshold = thresholdFor(guardLevel, false);
  return Math.abs(candidate.confidence - threshold) <= LLM_BORDERLINE_MARGIN;
}

function dedupeCandidates(candidates: MemoryCandidate[], maxCandidates: number): MemoryCandidate[] {
  const deduped: MemoryCandidate[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    const key = `${candidate.action}|${candidate.text.toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(candidate);
    if (deduped.length >= maxCandidates) break;
  }

  return deduped;
}

function extractRuleCandidates(messages: MemoryExtractMessage[], maxCandidates: number): MemoryCandidate[] {
  const candidates: MemoryCandidate[] = [];
  for (const message of messages) {
    if (message.role !== 'user' || typeof message.content !== 'string') continue;

    const sentences = splitIntoSentences(message.content);
    for (const sentence of sentences) {
      const explicitAdd = sentence.match(EXPLICIT_ADD_RE) ?? sentence.match(EXPLICIT_ADD_ALT_RE);
      if (explicitAdd) {
        const text = sanitizeCandidate(explicitAdd[1] ?? '');
        if (shouldKeepCandidate(text)) {
          candidates.push({
            action: 'add',
            text,
            confidence: 0.99,
            reason: 'explicit:add',
            explicit: true,
          });
        }
        continue;
      }

      const explicitDelete = sentence.match(EXPLICIT_DELETE_RE);
      if (explicitDelete) {
        const text = sanitizeCandidate(explicitDelete[1] ?? '');
        if (shouldKeepCandidate(text)) {
          candidates.push({
            action: 'delete',
            text,
            confidence: 0.99,
            reason: 'explicit:delete',
            explicit: true,
          });
        }
        continue;
      }

      const implicit = scoreImplicitCandidate(sanitizeCandidate(sentence));
      if (!implicit) continue;
      candidates.push({
        action: 'add',
        text: sanitizeCandidate(sentence),
        confidence: implicit.confidence,
        reason: implicit.reason,
        explicit: false,
      });
    }
  }

  return dedupeCandidates(candidates, maxCandidates);
}

function extractResponseText(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const data = payload as Record<string, unknown>;
  const content = data.content;
  if (Array.isArray(content)) {
    return content
      .map((entry) => {
        if (!entry || typeof entry !== 'object') return '';
        const block = entry as Record<string, unknown>;
        return typeof block.text === 'string' ? block.text : '';
      })
      .filter(Boolean)
      .join('\n')
      .trim();
  }
  if (typeof content === 'string') return content.trim();
  if (typeof data.output_text === 'string') return data.output_text.trim();
  return '';
}

function parseJudgeDecision(text: string): LlmJudgeDecision | null {
  if (!text.trim()) return null;
  const trimmed = text.trim();
  const fenced = /```(?:json)?\s*([\s\S]*?)```/i.exec(trimmed);
  const payload = (fenced?.[1] ?? trimmed).trim();
  const left = payload.indexOf('{');
  const right = payload.lastIndexOf('}');
  if (left < 0 || right <= left) return null;

  try {
    const data = JSON.parse(payload.slice(left, right + 1)) as Record<string, unknown>;
    const acceptedRaw = data.accepted;
    const decisionRaw = data.decision;
    const confidenceRaw = data.confidence;
    const accepted =
      typeof acceptedRaw === 'boolean'
        ? acceptedRaw
        : typeof decisionRaw === 'string'
          ? /(accept|allow|yes|true|pass)/i.test(decisionRaw)
          : false;
    const confidenceValue =
      typeof confidenceRaw === 'number'
        ? confidenceRaw
        : typeof confidenceRaw === 'string'
          ? Number(confidenceRaw)
          : 0;
    const confidence = Number.isFinite(confidenceValue) ? Math.max(0, Math.min(1, confidenceValue)) : 0;
    if (confidence < 0.55) return null;
    return { accepted, confidence };
  } catch {
    return null;
  }
}

async function runLlmJudge(
  candidate: MemoryCandidate,
  options: MemoryJudgeOptions,
  guardLevel: MemoryGuardLevel,
): Promise<LlmJudgeDecision | null> {
  if (!options.enabled) return null;
  const endpoint = typeof options.endpoint === 'string' ? options.endpoint.trim() : '';
  const model = typeof options.model === 'string' ? options.model.trim() : '';
  const apiKey = typeof options.apiKey === 'string' ? options.apiKey.trim() : '';
  if (!endpoint || !model || !apiKey) return null;

  const cacheKey = buildCacheKey(candidate, guardLevel);
  const cached = getCachedJudge(cacheKey);
  if (cached) return cached;

  const normalizedText = normalizeText(candidate.text).slice(0, LLM_INPUT_MAX_CHARS);
  if (!normalizedText) return null;

  const timeoutMs = Math.max(300, Math.min(10_000, options.timeoutMs ?? 5000));
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const systemPrompt = [
    'You classify whether a sentence is durable long-term user memory.',
    'Accept only stable personal facts or stable assistant preferences.',
    'Reject questions, temporary context, one-off tasks, and procedural command text.',
    'Return JSON only: {"accepted":boolean,"confidence":number,"reason":string}',
  ].join(' ');

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 120,
        temperature: 0,
        system: systemPrompt,
        messages: [
          {
            role: 'user',
            content: JSON.stringify({
              text: normalizedText,
              action: candidate.action,
              is_explicit: candidate.explicit,
              rule_score: Number(candidate.confidence.toFixed(3)),
              threshold: Number(thresholdFor(guardLevel, candidate.explicit).toFixed(3)),
              rule_reason: candidate.reason,
            }),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    const payload = await response.json();
    const text = extractResponseText(payload);
    const decision = parseJudgeDecision(text);
    if (decision) {
      setCachedJudge(cacheKey, decision);
    }
    return decision;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export async function extractMemoryFromMessages(
  messages: MemoryExtractMessage[],
  options: MemoryExtractOptions = {},
): Promise<MemoryExtractResult> {
  const guardLevel: MemoryGuardLevel = options.guardLevel ?? 'standard';
  const maxCandidates = Math.max(1, Math.min(8, options.maxCandidates ?? 6));
  const ruleCandidates = extractRuleCandidates(messages, maxCandidates);

  const accepted: MemoryCandidate[] = [];
  let attempted = 0;
  let fallbacks = 0;

  for (const candidate of ruleCandidates) {
    const threshold = thresholdFor(guardLevel, candidate.explicit);
    let acceptedByFinalDecision = candidate.confidence >= threshold;
    if (candidate.action === 'delete' && candidate.explicit) {
      acceptedByFinalDecision = true;
    }

    const shouldJudge = shouldRunJudge(candidate, guardLevel);
    if (shouldJudge && options.judge?.enabled) {
      attempted += 1;
      const judged = await runLlmJudge(candidate, options.judge, guardLevel);
      if (judged) {
        acceptedByFinalDecision = judged.accepted;
      } else {
        fallbacks += 1;
      }
    }

    if (!acceptedByFinalDecision) continue;
    accepted.push(candidate);
  }

  return {
    candidates: dedupeCandidates(accepted, maxCandidates),
    judge: {
      enabled: Boolean(options.judge?.enabled),
      attempted,
      fallbacks,
    },
  };
}
