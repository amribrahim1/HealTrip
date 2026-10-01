import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/server/db", () => ({
  db: {
    doctor: { findMany: vi.fn() },
    hospital: { findMany: vi.fn() },
  },
}));

import { db } from "@/server/db";
import { searchDoctors, searchHospitals } from "@/server/services/providers";

const doctorFindMany = vi.mocked(db.doctor.findMany);
const hospitalFindMany = vi.mocked(db.hospital.findMany);

describe("provider search services", () => {
  beforeEach(() => vi.clearAllMocks());

  it("searches doctors by specialty and city using a bounded Prisma query", async () => {
    doctorFindMany.mockResolvedValue([{
      id: "doctor-demo",
      name: "Dr. Demo",
      specialty: "Cardiology",
      city: "Cairo",
      hospitalId: "hospital-demo",
      createdAt: new Date(0),
      updatedAt: new Date(0),
      hospital: { name: "Demo Heart Center" },
    }] as never);

    const doctors = await searchDoctors({ specialty: "cardio", city: "cairo" });

    expect(doctorFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        city: { contains: "cairo", mode: "insensitive" },
        specialty: { contains: "cardio", mode: "insensitive" },
      },
      take: 20,
    }));
    expect(doctors).toEqual([{
      id: "doctor-demo",
      name: "Dr. Demo",
      specialty: "Cardiology",
      city: "Cairo",
      hospital: "Demo Heart Center",
    }]);
  });

  it("returns an empty doctor list when there are no matches", async () => {
    doctorFindMany.mockResolvedValue([]);
    await expect(searchDoctors({ specialty: "oncology", city: "Giza" })).resolves.toEqual([]);
  });

  it("searches hospitals by city and the specialties of associated doctors", async () => {
    hospitalFindMany.mockResolvedValue([{
      id: "hospital-demo",
      name: "Demo Medical House",
      city: "Alexandria",
      address: "Fictional street",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }] as never);

    await searchHospitals({ specialty: "neurology", city: "Alexandria" });

    expect(hospitalFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        city: { contains: "Alexandria", mode: "insensitive" },
        doctors: { some: { specialty: { contains: "neurology", mode: "insensitive" } } },
      },
    }));
  });
});