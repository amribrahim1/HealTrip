import { z } from "zod";

export const ProviderSearchInput = z.object({
  specialty: z.string().trim().min(1).max(80).optional(),
  city: z.string().trim().min(1).max(80).optional(),
});

function normalizeArabicCity(city: string): string {
  return city.normalize("NFKC").replace(/[أإآ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").trim().toLocaleLowerCase();
}

const cityAliases: Array<{ canonical: string; aliases: string[] }> = [
  { canonical: "Cairo", aliases: ["cairo", "القاهره"] },
  { canonical: "Giza", aliases: ["giza", "الجيزه"] },
  { canonical: "Alexandria", aliases: ["alexandria", "الاسكندريه", "اسكندريه"] },
];

export function normalizeProviderSearchInput(input: ProviderSearchInput): ProviderSearchInput {
  const parsed = ProviderSearchInput.parse(input);
  if (!parsed.city) return parsed;

  const normalizedCity = normalizeArabicCity(parsed.city);
  const matchingCity = cityAliases.find(({ canonical, aliases }) =>
    [canonical.toLocaleLowerCase(), ...aliases].some((alias) => normalizedCity === normalizeArabicCity(alias)),
  );

  return { ...parsed, city: matchingCity?.canonical ?? parsed.city };
}

export function findProviderCity(text: string): string | undefined {
  const normalizedText = normalizeArabicCity(text);
  return cityAliases.find(({ canonical, aliases }) =>
    [canonical.toLocaleLowerCase(), ...aliases].some((alias) => normalizedText.includes(normalizeArabicCity(alias))),
  )?.canonical;
}

export const DoctorSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  specialty: z.string(),
  city: z.string(),
  hospital: z.string().nullable(),
});

export const HospitalSummarySchema = z.object({
  id: z.string(),
  name: z.string(),
  city: z.string(),
  address: z.string(),
});

export type ProviderSearchInput = z.infer<typeof ProviderSearchInput>;
export type DoctorSummary = z.infer<typeof DoctorSummarySchema>;
export type HospitalSummary = z.infer<typeof HospitalSummarySchema>;