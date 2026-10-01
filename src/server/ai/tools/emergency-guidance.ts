import { z } from "zod";

export const EmergencyResultSchema = z.object({
  isEmergency: z.boolean(),
  messageKey: z.enum(["urgent_chest_pain", "clarify_chest_pain", "no_red_flags"]),
  reasonCodes: z.array(z.enum([
    "SEVERE_CHEST_PAIN",
    "CHEST_PAIN_WITH_BREATHING_DIFFICULTY",
    "CHEST_PAIN_WITH_FAINTING",
    "CHEST_PAIN_WITH_SEVERE_SWEATING",
    "CHEST_PAIN_RADIATING_TO_ARM_OR_JAW",
  ])),
});

export type EmergencyResult = z.infer<typeof EmergencyResultSchema>;

const chestPainEnglish = /\b(chest pain|pain in (my|the) chest|chest hurts)\b/i;
const chestPainArabic = /(ألم|وجع).{0,12}(الصدر|صدري)|(الصدر|صدري).{0,12}(ألم|وجع)/;

const flagPatterns: Array<[EmergencyResult["reasonCodes"][number], RegExp, RegExp]> = [
  ["SEVERE_CHEST_PAIN", /\b(severe|sudden|worsening|getting worse|intense|crushing)(?!\s+sweating)\b.{0,24}\b(chest pain|chest hurts)\b|\b(chest pain|chest hurts)\b.{0,24}\b(severe|sudden|worsening|getting worse|intense|crushing)(?!\s+sweating)\b/i, /(شديد|قوي|مفاجئ|يزداد|يتفاقم).{0,15}(ألم|وجع).{0,10}(الصدر|صدري)|(ألم|وجع).{0,10}(الصدر|صدري).{0,15}(شديد|قوي|مفاجئ|يزداد|يتفاقم)/],
  ["CHEST_PAIN_WITH_BREATHING_DIFFICULTY", /\b(shortness of breath|difficulty breathing|trouble breathing|can't breathe)\b/i, /(ضيق التنفس|صعوبة في التنفس|صعوبة بالتنفس|لا أستطيع التنفس)/],
  ["CHEST_PAIN_WITH_FAINTING", /\b(faint(ed|ing)?|passed out|lost consciousness)\b/i, /(إغماء|أغمي علي|فقدت الوعي)/],
  ["CHEST_PAIN_WITH_SEVERE_SWEATING", /\b(severe sweating|heavy sweating|profuse sweating|cold sweat)\b/i, /(تعرق شديد|تعرق غزير|عرق بارد)/],
  ["CHEST_PAIN_RADIATING_TO_ARM_OR_JAW", /\b(spread(ing)?|radiat(e|ing)|go(es|ing)? down)\b.{0,35}\b(arm|jaw)\b|\b(arm|jaw) pain\b/i, /(يمتد|ينتشر|يمتد إلى).{0,20}(الذراع|الفك)|(ألم|وجع).{0,12}(الذراع|الفك)/],
];

function hasPositiveMatch(message: string, pattern: RegExp): boolean {
  const matcher = new RegExp(pattern.source, `${pattern.flags}g`);
  const englishNegation = /\b(no|not|never|without|denies|denied|isn't|aren't|don't|doesn't|didn't)\b(?:\s+[\w'-]+){0,4}\s*$/i;
  const arabicNegation = /(لا|ليس|ليست|بدون|لم|لن)(?:\s+[^\s]+){0,4}\s*$/;

  for (const match of message.matchAll(matcher)) {
    const prefix = message.slice(Math.max(0, (match.index ?? 0) - 40), match.index);
    if (!englishNegation.test(prefix) && !arabicNegation.test(prefix)) return true;
  }
  return false;
}

export function emergencyGuidance(message: string): EmergencyResult {
  const hasChestPain = chestPainEnglish.test(message) || chestPainArabic.test(message);
  if (!hasChestPain) {
    return { isEmergency: false, messageKey: "no_red_flags", reasonCodes: [] };
  }

  const reasonCodes = flagPatterns
    .filter(([, englishPattern, arabicPattern]) => hasPositiveMatch(message, englishPattern) || hasPositiveMatch(message, arabicPattern))
    .map(([reasonCode]) => reasonCode);

  if (reasonCodes.length) {
    return EmergencyResultSchema.parse({ isEmergency: true, messageKey: "urgent_chest_pain", reasonCodes });
  }

  return EmergencyResultSchema.parse({ isEmergency: false, messageKey: "clarify_chest_pain", reasonCodes: [] });
}

export function emergencyResponse(locale: "en" | "ar", result: EmergencyResult): string | null {
  if (result.messageKey === "urgent_chest_pain") {
    return locale === "ar"
      ? "قد يتطلب ألم الصدر مع هذه العلامات تقييماً عاجلاً. يرجى الاتصال بخدمات الطوارئ المحلية أو التوجه إلى أقرب قسم طوارئ الآن. هذا النظام نموذج أولي ولا يقدم تشخيصاً طبياً."
      : "Chest pain with these warning signs may require urgent evaluation. Please contact your local emergency services or go to the nearest emergency department now. This prototype does not provide a medical diagnosis.";
  }

  if (result.messageKey === "clarify_chest_pain") {
    return locale === "ar"
      ? "ألم الصدر قد يتطلب أحياناً تقييماً عاجلاً. هل الألم موجود الآن؟ هل هو شديد أو مفاجئ أو يزداد؟ وهل لديك ضيق في التنفس أو إغماء أو تعرق شديد أو ألم يمتد إلى الذراع أو الفك؟ إذا ظهرت أي من هذه العلامات، اطلب المساعدة الطبية العاجلة."
      : "Chest pain can sometimes require urgent evaluation. Is it happening now? Is it severe, sudden, or getting worse? Do you have difficulty breathing, fainting, severe sweating, or pain spreading to your arm or jaw? If any of these are present, seek urgent medical care.";
  }

  return null;
}

export function emergencyResponseForConversation(
  locale: "en" | "ar",
  latestUserMessage: string,
  recentUserMessages: string,
): string | null {
  const recentResult = emergencyGuidance(recentUserMessages);
  if (recentResult.isEmergency) return emergencyResponse(locale, recentResult);

  const currentResult = emergencyGuidance(latestUserMessage);
  return currentResult.messageKey === "clarify_chest_pain"
    ? emergencyResponse(locale, currentResult)
    : null;
}