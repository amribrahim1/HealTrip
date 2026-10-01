import "server-only";
import { z } from "zod";
import { db } from "@/server/db";

export const ProviderSearchInput = z.object({
  specialty: z.string().trim().min(1).max(80).optional(),
  city: z.string().trim().min(1).max(80).optional(),
});

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

export async function searchDoctors(input: ProviderSearchInput): Promise<DoctorSummary[]> {
  const parsed = ProviderSearchInput.parse(input);
  const records = await db.doctor.findMany({
    where: {
      ...(parsed.city ? { city: { contains: parsed.city, mode: "insensitive" } } : {}),
      ...(parsed.specialty ? { specialty: { contains: parsed.specialty, mode: "insensitive" } } : {}),
    },
    include: { hospital: { select: { name: true } } },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    take: 20,
  });

  return records.map((doctor) => DoctorSummarySchema.parse({
    id: doctor.id,
    name: doctor.name,
    specialty: doctor.specialty,
    city: doctor.city,
    hospital: doctor.hospital?.name ?? null,
  }));
}

export async function searchHospitals(input: ProviderSearchInput): Promise<HospitalSummary[]> {
  const parsed = ProviderSearchInput.parse(input);
  const records = await db.hospital.findMany({
    where: {
      ...(parsed.city ? { city: { contains: parsed.city, mode: "insensitive" } } : {}),
      ...(parsed.specialty
        ? { doctors: { some: { specialty: { contains: parsed.specialty, mode: "insensitive" } } } }
        : {}),
    },
    orderBy: [{ city: "asc" }, { name: "asc" }],
    take: 20,
  });

  return records.map((hospital) => HospitalSummarySchema.parse(hospital));
}