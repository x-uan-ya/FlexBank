/**
 * Server-side input guards (second safety layer; the system prompt is the first).
 *
 * These catch obviously unsafe requests before we spend a Gemini call, and
 * guarantee a safe canned response even if a model ever misbehaves.
 */

export interface SafetyVerdict {
  safe: boolean;
  /** Customer-friendly refusal text when not safe. */
  refusal?: string;
}

/** Requests to act on money / accounts — the assistant must never do this. */
const TRANSACTION_INTENT =
  /\b(confirm|approve|authorise|authorize|execute|send|transfer|pay|cancel|move)\b[^.?!]{0,40}\b(my|the|this)\b[^.?!]{0,20}\b(transfer|payment|transaction|money|funds|fds?|fixed deposit)\b/i;

/** Requests for, or disclosure of, real credentials. */
const CREDENTIAL_INTENT =
  /\b(password|passcode|otp|one[-\s]?time[-\s]?(pin|password|code)|\bpin\b|cvv|card number|account number|login|credential)\b/i;

/** Asking for personalised buy/sell advice. */
const ADVICE_INTENT =
  /\b(should i|what should i|which should i|recommend|tell me what to|best (stock|bond|fund|investment)|guarantee|how much will i (earn|make))\b/i;

const REFUSAL_TRANSACTION =
  "I can't make, confirm, or cancel any transfer or payment — only you can do that in the app, on the review screen. I can explain how it works, though.";

const REFUSAL_CREDENTIAL =
  "Please don't share passwords, OTPs, PINs, or card or account numbers with me or anyone. FlexBank never asks for them. I can still help explain banking in general.";

const REFUSAL_ADVICE =
  "I can't tell you what to buy or sell or promise returns. I can explain how products like fixed deposits or bonds work in general — remember their value can change, and this is general information, not advice.";

/**
 * Inspect user-supplied free text (chat question / text to simplify) for unsafe
 * intent. `context`/`task` are trusted enum values and are not scanned.
 */
export function checkUserText(text: string | undefined): SafetyVerdict {
  if (!text) return { safe: true };
  const t = text.toLowerCase();

  if (CREDENTIAL_INTENT.test(t)) {
    return { safe: false, refusal: REFUSAL_CREDENTIAL };
  }
  if (TRANSACTION_INTENT.test(t)) {
    return { safe: false, refusal: REFUSAL_TRANSACTION };
  }
  if (ADVICE_INTENT.test(t)) {
    return { safe: false, refusal: REFUSAL_ADVICE };
  }
  return { safe: true };
}
