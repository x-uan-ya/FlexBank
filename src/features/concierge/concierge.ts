/**
 * AI Banking Concierge — PUBLIC CONTRACT (Developer C).
 *
 * This foundation ships a DETERMINISTIC FALLBACK only. There is NO AI wired in
 * yet, and we make no AI claims. Dev C will add a real provider behind the same
 * contract, and MUST keep this deterministic fallback working so the core
 * banking simulation functions even when AI is unavailable (safety principles
 * 9 & 10).
 *
 * Contract: ConciergeContract { explain, simplify, translate }.
 * Every method returns `{ text, usedFallback }` so the UI can indicate when the
 * deterministic fallback produced the response.
 */

import type { ConciergeContract, ConciergeResponse } from '@/types/contracts';
import { LANGUAGE_LABELS, type Language } from '@/types/preferences';

/** Plain-language explanations for known contexts. Dev C can expand. */
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

function fallback(text: string): ConciergeResponse {
  return { text, usedFallback: true };
}

async function explain(context: string): Promise<ConciergeResponse> {
  return fallback(EXPLANATIONS[context] ?? EXPLANATIONS.default);
}

async function simplify(text: string): Promise<ConciergeResponse> {
  // Prepared fallback: returns the original text without simplifying it.
  return fallback(text.trim());
}

async function translate(
  text: string,
  language: Language,
): Promise<ConciergeResponse> {
  if (language === 'en') {
    return fallback(text);
  }

  if (language === 'zh') {
    const translations: Record<string, string> = {
      [EXPLANATIONS['paynow-recipient']]:
        '收款人是你想转账给的人。请确认所选收款人与你原本想付款的对象一致。如果显示的姓名与你预期的不符，请暂停操作，并通过可信的联系方式核实收款资料后再继续。',

      [EXPLANATIONS['paynow-amount']]:
        '请输入你打算转账的新加坡元金额。例如，10.50 表示十元五角。继续之前，请仔细检查金额。查看帮助不会更改你输入的金额。',

      [EXPLANATIONS['paynow-review']]:
        '此页面让你在转账前核对资料。请仔细检查收款人和金额。如果资料有误，请返回修改。打开此说明不会确认转账，也不会转出任何款项。',

      [EXPLANATIONS['paynow-proxy']]:
        'PayNow 识别资料是与银行账户关联的资料，例如已注册的手机号码。你可以使用这些资料识别收款人，无需输入对方的银行账号。继续之前，请核对显示的收款人姓名。',
    };

    const translatedText = translations[text];

    if (translatedText) {
      return fallback(translatedText);
    }
  }

  return fallback(
    `${text}\n\nTranslation to ${LANGUAGE_LABELS[language]} is currently unavailable. The original text is shown above.`,
  );
}

export const concierge: ConciergeContract = {
  explain,
  simplify,
  translate,
};

