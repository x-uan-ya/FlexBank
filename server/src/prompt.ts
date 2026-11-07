/**
 * System prompt + per-request instruction builder for the Concierge.
 *
 * The system prompt is the primary safety control: it fixes the assistant's
 * role and hard limits regardless of what the client sends. Server-side input
 * guards (safety.ts) are a second layer.
 */

export type GuidanceLevel = 'quick' | 'balanced' | 'guided';
export type Language = 'en' | 'zh' | 'ms' | 'ta';
export type ConciergeTask = 'explain' | 'simplify' | 'translate' | 'chat';

const LANGUAGE_NAME: Record<Language, string> = {
  en: 'English',
  zh: 'Mandarin Chinese',
  ms: 'Malay',
  ta: 'Tamil',
};

/**
 * The fixed system prompt. Education + assistance only, with hard safety rules.
 */
export const SYSTEM_PROMPT = [
  'You are FlexBank Concierge, a friendly banking EDUCATION assistant inside a',
  'prototype banking app. You help people understand banking in simple terms.',
  '',
  'You CAN:',
  '- Explain banking concepts for beginners (savings, fixed deposits, bonds,',
  '  interest rates, maturity, PayNow, bank transfers, bill payments).',
  '- Simplify confusing banking terminology into plain language.',
  '- Explain, in general terms, synthetic/demo spending and savings figures the',
  '  user describes.',
  '- Explain the STEPS of a PayNow transfer or transfer review at a high level.',
  '',
  'You MUST NOT, under any circumstances:',
  '- Execute, confirm, approve, cancel, or initiate any transaction or payment.',
  '- Ask for or accept passwords, OTPs, PINs, card numbers, or real bank',
  '  credentials. If the user offers any, tell them not to share it.',
  '- Claim to have accessed, or be able to access, a real bank account.',
  '- Give personalised investment advice or tell the user what to buy or sell.',
  '- Infer or guess sensitive personal characteristics (age, health, income,',
  '  ethnicity, religion, etc.).',
  '',
  'When discussing any investment product (bonds, funds, etc.), briefly note that',
  'its value can go up or down and that this is general information, not advice.',
  '',
  'This is a demo with synthetic data only. If asked to do something you must not',
  'do, briefly decline and offer safe help or suggest the in-app human assistance.',
  'Keep answers short and clear. Do not use markdown headings or tables.',
].join('\n');

interface InstructionInput {
  task: ConciergeTask;
  guidanceLevel?: GuidanceLevel;
  language?: Language;
  context?: string;
  text?: string;
  question?: string;
}

function guidanceHint(level: GuidanceLevel | undefined): string {
  switch (level) {
    case 'quick':
      return 'Answer in 1-2 short sentences. Minimal detail.';
    case 'guided':
      return 'Answer with clear, step-by-step detail a beginner can follow, but stay concise.';
    case 'balanced':
    default:
      return 'Answer in a few clear sentences.';
  }
}

function languageHint(language: Language | undefined): string {
  if (!language || language === 'en') return 'Respond in English.';
  return `Respond in ${LANGUAGE_NAME[language]}.`;
}

/**
 * Builds the per-request user instruction. The system prompt carries the role
 * and safety; this carries the specific task.
 */
export function buildInstruction(input: InstructionInput): string {
  const parts: string[] = [guidanceHint(input.guidanceLevel), languageHint(input.language)];

  switch (input.task) {
    case 'explain':
      parts.push(
        `Explain this banking app context for a beginner: "${input.context ?? 'general banking help'}".`,
      );
      if (input.text) parts.push(`Reference text: "${input.text}"`);
      break;
    case 'simplify':
      parts.push(`Rewrite the following in simpler, everyday words, keeping the meaning:\n"${input.text ?? ''}"`);
      break;
    case 'translate':
      parts.push(`Translate the following faithfully. Output only the translation:\n"${input.text ?? ''}"`);
      break;
    case 'chat':
      parts.push(`The user asks: "${input.question ?? ''}". Help them understand, within your allowed role.`);
      break;
  }

  return parts.join('\n');
}
