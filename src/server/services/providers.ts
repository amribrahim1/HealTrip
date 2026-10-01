import "server-only";
import { db } from "@/server/db";
import { DoctorSummarySchema, HospitalSummarySchema, normalizeProviderSearchInput, ProviderSearchInput, type DoctorSummary, type HospitalSummary } from "@/server/services/provider-schemas";

export { DoctorSummarySchema, HospitalSummarySchema, ProviderSearchInput } from "@/server/services/provider-schemas";
export type { DoctorSummary, HospitalSummary } from "@/server/services/provider-schemas";

export async function searchDoctors(input: ProviderSearchInput): Promise<DoctorSummary[]> {
  const parsed = normalizeProviderSearchInput(input);
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
  const parsed = normalizeProviderSearchInput(input);
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