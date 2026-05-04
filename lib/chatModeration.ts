export type ModerationAction = 'allow' | 'mask' | 'block' | 'flag';

export type ModerationResult = {
  action: ModerationAction;
  displayText: string;
  reasons: string[];
};

const EMAIL_RE = /\b[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-z]{2,}\b/gi;
const PHONE_RE =
  /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(?\d{2,4}\)?[\s.-]?)?\d{3,4}[\s.-]?\d{3,4}\b/g;
const LINK_RE = /\b(?:https?:\/\/|www\.)[^\s]+/gi;
const HANDLE_RE = /(?:@[\w.]{3,}|t\.me\/[\w_]{3,}|wa\.me\/\d{6,})/gi;
const PLATFORM_RE = /\b(telegram|whatsapp|signal|wechat|line|viber|instagram|facebook|skype)\b/gi;
const CONTACT_EXCHANGE_RE =
  /\b(contact me|call me|text me|reach me|dm me|message me|my number|my phone|my email|outside the app)\b/gi;

function safeReplace(input: string, re: RegExp, reason: string, reasons: Set<string>): string {
  try {
    return input.replace(re, (matched) => {
      reasons.add(reason);
      return '*'.repeat(Math.max(3, Math.min(12, matched.length)));
    });
  } catch {
    return input;
  }
}

export function moderateMessage(text: string): ModerationResult {
  try {
    const input = typeof text === 'string' ? text : '';
    const reasons = new Set<string>();
    let masked = input;

    masked = safeReplace(masked, EMAIL_RE, 'email_detected', reasons);
    masked = safeReplace(masked, PHONE_RE, 'phone_detected', reasons);
    masked = safeReplace(masked, LINK_RE, 'link_detected', reasons);
    masked = safeReplace(masked, HANDLE_RE, 'contact_handle_detected', reasons);

    const lower = input.toLowerCase();
    if (PLATFORM_RE.test(lower)) reasons.add('external_platform_detected');
    if (CONTACT_EXCHANGE_RE.test(lower)) reasons.add('contact_exchange_pattern');

    if (reasons.size === 0) {
      return { action: 'allow', displayText: input, reasons: [] };
    }

    if (reasons.has('contact_exchange_pattern')) {
      return {
        action: 'flag',
        displayText: masked,
        reasons: Array.from(reasons),
      };
    }

    return {
      action: 'mask',
      displayText: masked,
      reasons: Array.from(reasons),
    };
  } catch {
    return { action: 'allow', displayText: text, reasons: [] };
  }
}

