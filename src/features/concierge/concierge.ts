/**
 * AI Banking Concierge — PUBLIC CONTRACT (Developer C).
 *
 * Offline-first: deterministic prepared explanations always work.
 * Optional live AI is attempted only when EXPO_PUBLIC_CONCIERGE_AI_URL points
 * at a server-side proxy that holds the real API key. Secrets never ship in
 * the Expo client.
 *
 * Contract: ConciergeContract { explain, simplify, translate }.
 * Every method returns `{ text, usedFallback }` so the UI can be honest about
 * whether AI produced the text.
 *
 * Safety: this module never imports PayNow, never calls confirmTransaction,
 * and never mutates transfer state.
 */

import type { ConciergeContract, ConciergeResponse } from '@/types/contracts';
import type { FinancialContextInput } from '@/features/financial-context';
import {
  LANGUAGE_LABELS,
  type BankingPurpose,
  type Language,
} from '@/types/preferences';

import {
  answerContextualFinancialQuestion,
  redactFinancialFigures,
} from './contextualFinance';
import { tryAiChat, tryAiProvider, type ChatTurn } from './provider/aiProvider';

/** Plain-language explanations for known transfer contexts. */
const EXPLANATIONS: Record<string, string> = {
  'paynow-recipient':
    'The recipient is the person you want to pay. Check that the selected recipient matches the person you intended to pay. If the displayed name is unexpected, pause and verify their details through a trusted contact method before continuing.',

  'paynow-amount':
    'Enter the amount you intend to send in Singapore dollars. For example, 10.50 means ten dollars and fifty cents. Check the amount carefully before continuing. Asking for help does not change the amount you entered.',

  'paynow-review':
    'This screen lets you check your transfer before sending. Check the recipient and amount carefully. If anything is wrong, go back and correct it. Opening this explanation does not confirm or send your transfer.',

  'paynow-proxy':
    'A PayNow proxy is an identifier, such as a registered mobile number, linked to a bank account. It lets you identify a recipient without entering their bank account number. Check the recipient name shown before continuing.',

  default:
    'Choose a help topic for a prepared explanation. If you are still unsure, pause and request human assistance. This help cannot change or confirm your transfer.',
};

/** Shorter, everyday versions of the same explanations (rule-based simplify). */
const SIMPLIFIED: Record<string, string> = {
  'paynow-recipient':
    'This is who will receive the money. Make sure the name is the person you mean to pay. If it looks wrong, stop and check with them another way.',

  'paynow-amount':
    'Type how much to send in Singapore dollars. Example: 10.50 means ten dollars and fifty cents. Help does not change what you typed.',

  'paynow-review':
    'Check the name and amount one more time. If something is wrong, go back and fix it. Reading this does not send any money.',

  'paynow-proxy':
    'A PayNow proxy is usually a mobile number linked to a bank account. You can pay someone with it instead of a full account number. Always check the name shown.',

  default:
    'This is a short explanation of the current step. It cannot change or send your transfer. Ask for a person if you still feel unsure.',
};

/** Prepared Mandarin translations keyed by context (not by English string). */
const TRANSLATIONS_ZH: Record<string, string> = {
  'paynow-recipient':
    '收款人是你想转账给的人。请确认所选收款人与你原本想付款的对象一致。如果显示的姓名与你预期的不符，请暂停操作，并通过可信的联系方式核实收款资料后再继续。',

  'paynow-amount':
    '请输入你打算转账的新加坡元金额。例如，10.50 表示十元五角。继续之前，请仔细检查金额。查看帮助不会更改你输入的金额。',

  'paynow-review':
    '此页面让你在转账前核对资料。请仔细检查收款人和金额。如果资料有误，请返回修改。打开此说明不会确认转账，也不会转出任何款项。',

  'paynow-proxy':
    'PayNow 识别资料是与银行账户关联的资料，例如已注册的手机号码。你可以使用这些资料识别收款人，无需输入对方的银行账号。继续之前，请核对显示的收款人姓名。',

  default:
    '请选择一个帮助主题以查看说明。如果仍有疑问，请暂停并寻求人工协助。此帮助无法更改或确认你的转账。',
};

/** Reverse lookup: English prepared text → context key (for translate/simplify of known copy). */
const TEXT_TO_CONTEXT: Map<string, string> = (() => {
  const map = new Map<string, string>();
  for (const [key, text] of Object.entries(EXPLANATIONS)) {
    map.set(text, key);
  }
  for (const [key, text] of Object.entries(SIMPLIFIED)) {
    map.set(text, key);
  }
  return map;
})();

function fallback(text: string): ConciergeResponse {
  return { text, usedFallback: true };
}

function aiOk(text: string): ConciergeResponse {
  return { text, usedFallback: false };
}

function resolveContextKey(contextOrText: string): string | undefined {
  if (contextOrText in EXPLANATIONS) {
    return contextOrText;
  }
  return TEXT_TO_CONTEXT.get(contextOrText);
}

/**
 * Lightweight rule-based simplification for arbitrary banking copy when no
 * prepared short version exists. Keeps meaning, cuts filler, never invents facts.
 */
function ruleBasedSimplify(text: string): string {
  let out = text.trim();
  if (out.length === 0) {
    return out;
  }

  const replacements: Array<[RegExp, string]> = [
    [/\bverify their details through a trusted contact method\b/gi, 'check with them another way'],
    [/\bidentifier, such as a registered mobile number, linked to a bank account\b/gi, 'mobile number linked to a bank account'],
    [/\bdoes not confirm or send your transfer\b/gi, 'does not send any money'],
    [/\bAsking for help does not change the amount you entered\b/gi, 'Help does not change what you typed'],
    [/\bOpening this explanation does not confirm or send your transfer\b/gi, 'Reading this does not send any money'],
    [/\bSingapore dollars\b/gi, 'SGD'],
    [/\bfor example,\s*/gi, 'Example: '],
  ];

  for (const [pattern, replacement] of replacements) {
    out = out.replace(pattern, replacement);
  }

  out = out.replace(/\s+/g, ' ').trim();

  const sentences = out.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length > 2 && out.length > 220) {
    out = sentences.slice(0, 2).join(' ');
  }

  return out;
}

async function explain(context: string): Promise<ConciergeResponse> {
  const prepared = EXPLANATIONS[context] ?? EXPLANATIONS.default;

  const aiText = await tryAiProvider({
    task: 'explain',
    context,
    text: prepared,
  });

  if (aiText) {
    return aiOk(aiText);
  }

  return fallback(prepared);
}

async function simplify(text: string): Promise<ConciergeResponse> {
  const trimmed = text.trim();
  const key = resolveContextKey(trimmed);
  const prepared = key ? SIMPLIFIED[key] ?? ruleBasedSimplify(trimmed) : ruleBasedSimplify(trimmed);

  const aiText = await tryAiProvider({
    task: 'simplify',
    context: key,
    text: trimmed,
  });

  if (aiText) {
    return aiOk(aiText);
  }

  return fallback(prepared);
}

async function translate(
  text: string,
  language: Language,
): Promise<ConciergeResponse> {
  const trimmed = text.trim();

  if (language === 'en') {
    const key = resolveContextKey(trimmed);
    if (key && EXPLANATIONS[key]) {
      return fallback(EXPLANATIONS[key]);
    }
    return fallback(trimmed);
  }

  if (language === 'zh') {
    const key = resolveContextKey(trimmed);
    const preparedZh = key ? TRANSLATIONS_ZH[key] : undefined;

    const aiText = await tryAiProvider({
      task: 'translate',
      context: key,
      text: trimmed,
      language: 'zh',
    });

    if (aiText) {
      return aiOk(aiText);
    }

    if (preparedZh) {
      return fallback(preparedZh);
    }
  }

  const aiText = await tryAiProvider({
    task: 'translate',
    text: trimmed,
    language,
  });

  if (aiText) {
    return aiOk(aiText);
  }

  return fallback(
    `${trimmed}\n\nTranslation to ${LANGUAGE_LABELS[language]} is currently unavailable. The original text is shown above.`,
  );
}

export const concierge: ConciergeContract = {
  explain,
  simplify,
  translate,
};

/** Context keys the UI can offer. Safe to import from screens. */
export const CONCIERGE_CONTEXTS = [
  'paynow-recipient',
  'paynow-amount',
  'paynow-review',
  'paynow-proxy',
] as const;

export type ConciergeContext = (typeof CONCIERGE_CONTEXTS)[number];

/* ------------------------------------------------------------------ *
 * Multi-turn chat (banking education).
 *
 * Live AI is attempted via the backend proxy (`/concierge/chat`). When the
 * proxy is unconfigured/unreachable/rate-limited, we fall back to a
 * deterministic, offline topic responder so the Concierge always answers.
 *
 * SAFETY: a client-side guard mirrors the server so even in OFFLINE mode the
 * Concierge refuses to act on money, never asks for credentials, and gives no
 * personalised investment advice. This module never touches transfer state.
 * ------------------------------------------------------------------ */

export type ConciergeGuidance = 'quick' | 'balanced' | 'guided';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type ConciergeAnswerSource = 'prepared-financial-context' | 'prepared-general' | 'live-ai';

export interface ConciergeChatResponse extends ConciergeResponse {
  source: ConciergeAnswerSource;
}

/** Offline safety guard (mirrors server/src/safety.ts). */
const CHAT_CREDENTIAL = /\b(password|passcode|otp|one[-\s]?time|pin|cvv|card number|account number|login|credential)\b/i;
const CHAT_TRANSACTION = /\b(confirm|approve|authorise|authorize|execute|send|transfer|pay|cancel|move)\b[^.?!]{0,40}\b(my|the|this)\b[^.?!]{0,20}\b(transfer|payment|transaction|money|funds|fds?|fixed deposit)\b/i;
const CHAT_ADVICE = /\b(should i|what should i|which should i|recommend|best (stock|bond|fund|investment)|guarantee|how much will i (earn|make))\b/i;

function offlineRefusal(text: string): string | null {
  if (CHAT_CREDENTIAL.test(text)) {
    return "Please don't share passwords, OTPs, PINs, or card or account numbers with me or anyone. FlexBank never asks for them. I can still explain banking in general.";
  }
  if (CHAT_TRANSACTION.test(text)) {
    return "I can't make, confirm, or cancel any transfer — only you can do that in the app, on the review screen. I can explain how it works, though.";
  }
  if (CHAT_ADVICE.test(text)) {
    return "I can't tell you what to buy or sell or promise returns. I can explain how products like fixed deposits or bonds work in general — their value can change, and this is general information, not advice.";
  }
  return null;
}

/** Deterministic offline topic answers (short, beginner-friendly). */
const OFFLINE_TOPICS: Array<{ match: RegExp; answer: string }> = [
  {
    match: /\bfixed deposit|time deposit|\bfd\b/i,
    answer:
      'A fixed deposit lets you lock a sum of money away for a set period (the tenure). In return you earn a fixed interest rate. You get your money plus interest back at the end (maturity). Taking it out early usually means less or no interest.',
  },
  {
    match: /\bbond|coupon|maturity\b/i,
    answer:
      'A bond is like lending money to a government or company. They pay you regular interest (the coupon) and return the original amount at the end (maturity). Bond values can go up or down if you sell early. This is general information, not advice.',
  },
  {
    match: /\binterest rate|\bp\.?a\.?\b|per annum|apy|aer\b/i,
    answer:
      'An interest rate is the percentage you earn (or pay) over a year. "Per annum" (p.a.) means "per year". For example, 3% p.a. on S$1,000 is about S$30 of interest over a year.',
  },
  {
    match: /\bpaynow|transfer|send money\b/i,
    answer:
      'PayNow lets you send money using a recipient you choose or a registered mobile number. In FlexBank you pick the recipient, enter the amount, review the details, then confirm. Nothing is sent until you confirm it yourself.',
  },
  {
    match: /\bbudget|spending|save money|savings\b/i,
    answer:
      'A simple way to manage money: track what you spend by category, set a monthly limit, and move a fixed amount to savings first. An emergency fund of about 3–6 months of expenses is a common goal.',
  },
];

function offlineChatAnswer(question: string): string {
  const refusal = offlineRefusal(question);
  if (refusal) return refusal;

  const hit = OFFLINE_TOPICS.find((t) => t.match.test(question));
  if (hit) return hit.answer;

  return "I can explain banking topics like savings, fixed deposits, bonds, interest rates, PayNow and budgeting in simple terms. Try asking about one of those. For anything account-specific, use in-app help or request human assistance.";
}

/**
 * Ask the Concierge a free-form banking question with optional prior turns.
 * Returns `{ text, usedFallback }`. `usedFallback` is true when the offline
 * responder produced the answer (no AI used).
 */
export async function chat(
  question: string,
  history: ChatMessage[] = [],
  options: { language?: Language; guidanceLevel?: ConciergeGuidance } = {},
): Promise<ConciergeResponse> {
  const trimmed = question.trim();
  if (!trimmed) {
    return fallback('Ask a banking question and I will explain it in simple terms.');
  }

  // Offline safety guard runs regardless of whether live AI is configured.
  const refusal = offlineRefusal(trimmed);
  if (refusal) {
    return fallback(refusal);
  }

  const turns: ChatTurn[] = history
    .filter((m) => (m.role === 'user' || m.role === 'model') && m.text.trim().length > 0)
    .map((m) => ({ role: m.role, text: m.text }));

  const aiText = await tryAiChat({
    question: trimmed,
    history: turns,
    language: options.language,
    guidanceLevel: options.guidanceLevel,
  });

  if (aiText) {
    return aiOk(aiText);
  }

  return fallback(offlineChatAnswer(trimmed));
}

/**
 * Account-aware entry point used by the existing chat UI. Financial questions
 * are resolved locally before the general chat path can reach the AI proxy.
 */
export async function chatWithFinancialContext(
  question: string,
  history: ChatMessage[] = [],
  options: {
    language?: Language;
    guidanceLevel: ConciergeGuidance;
    bankingPurposes: BankingPurpose[];
    financialContext: FinancialContextInput | null;
    balanceHidden: boolean;
    selectedInsightId?: string | null;
    /** Per-session, explicit consent for a standalone general question only. */
    allowRemoteAi?: boolean;
    /** Blocks remote use after any record-derived turn, even if history is redacted. */
    conversationContainsFinancialContext?: boolean;
  },
): Promise<ConciergeChatResponse> {
  const trimmed = question.trim();
  const refusal = offlineRefusal(trimmed);
  if (refusal) {
    return protectChatResponse(
      { ...fallback(refusal), source: 'prepared-general' },
      options.balanceHidden,
    );
  }

  const contextual = answerContextualFinancialQuestion({
    question: trimmed,
    context: options.financialContext,
    bankingPurposes: options.bankingPurposes,
    guidanceLevel: options.guidanceLevel,
    balanceHidden: options.balanceHidden,
    selectedInsightId: options.selectedInsightId,
  });
  if (contextual) {
    return protectChatResponse({
      text: contextual.text,
      usedFallback: true,
      source: contextual.source,
    }, options.balanceHidden);
  }

  // Fail closed. Keyword routing is not an authorisation boundary: without an
  // explicit opt-in, or when any prior turn exists, answer locally. Remote AI
  // is limited to a strict allowlist of standalone general-education asks and
  // receives no history or financial context.
  if (
    !options.allowRemoteAi ||
    options.conversationContainsFinancialContext === true ||
    history.length > 0 ||
    !isSafeStandaloneGeneralQuestion(trimmed)
  ) {
    return protectChatResponse({
      ...fallback(offlineChatAnswer(trimmed)),
      source: 'prepared-general',
    }, options.balanceHidden);
  }

  const response = await chat(trimmed, [], {
    language: options.language,
    guidanceLevel: options.guidanceLevel,
  });
  return protectChatResponse({
    ...response,
    source: response.usedFallback ? 'prepared-general' : 'live-ai',
  }, options.balanceHidden);
}

const REMOTE_GENERAL_QUESTION = /^(?:what (?:is|are)|how (?:does|do)|explain|define)\s+(?:(?:a|an|the)\s+)?(?:fixed deposits?|time deposits?|bonds?|bond coupons?|coupons?|bond maturity|maturity|interest rates?|per annum|apy|aer|paynow)(?:\s+work)?[?.!]*$/i;
const REMOTE_PRIVATE_SIGNAL = /\b(i|my|mine|me|myself|our|ours|us|personal|private|account|balance|transaction|spending|expense|income|salary|goal|portfolio|holding|subscription|recipient)\b|\d|S\$|\$/i;

/** Conservative allowlist; false means use a prepared local answer. */
export function isSafeStandaloneGeneralQuestion(question: string): boolean {
  const trimmed = question.trim();
  return trimmed.length > 0 &&
    trimmed.length <= 240 &&
    REMOTE_GENERAL_QUESTION.test(trimmed) &&
    !REMOTE_PRIVATE_SIGNAL.test(trimmed) &&
    offlineRefusal(trimmed) === null;
}

function protectChatResponse(
  response: ConciergeChatResponse,
  balanceHidden: boolean,
): ConciergeChatResponse {
  return balanceHidden
    ? { ...response, text: redactFinancialFigures(response.text) }
    : response;
}
