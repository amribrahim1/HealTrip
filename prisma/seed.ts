import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL is required to seed the database.");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const hospitals = [
  { id: "demo-cairo-heart", name: "Cairo Heart Center (Demo)", city: "Cairo", address: "12 Nile View Road, Cairo (demo address)" },
  { id: "demo-nile-medical", name: "Nile Medical House (Demo)", city: "Cairo", address: "8 Garden District, Cairo (demo address)" },
  { id: "demo-giza-care", name: "Giza Community Hospital (Demo)", city: "Giza", address: "21 Pyramids Avenue, Giza (demo address)" },
  { id: "demo-alexandria", name: "Alexandria Coastal Clinic (Demo)", city: "Alexandria", address: "5 Harbor Street, Alexandria (demo address)" },
];

const doctors = [
  { id: "demo-doctor-01", name: "Dr. Lina Farouk (Demo)", specialty: "Cardiology", city: "Cairo", hospitalId: "demo-cairo-heart" },
  { id: "demo-doctor-02", name: "Dr. Omar Nabil (Demo)", specialty: "Neurology", city: "Cairo", hospitalId: "demo-nile-medical" },
  { id: "demo-doctor-03", name: "Dr. Salma Youssef (Demo)", specialty: "Orthopedics", city: "Giza", hospitalId: "demo-giza-care" },
  { id: "demo-doctor-04", name: "Dr. Karim Adel (Demo)", specialty: "Dermatology", city: "Alexandria", hospitalId: "demo-alexandria" },
  { id: "demo-doctor-05", name: "Dr. Mariam Fawzi (Demo)", specialty: "Gastroenterology", city: "Cairo", hospitalId: "demo-nile-medical" },
  { id: "demo-doctor-06", name: "Dr. Youssef Samir (Demo)", specialty: "General Practice", city: "Giza", hospitalId: "demo-giza-care" },
  { id: "demo-doctor-07", name: "Dr. Hana Mostafa (Demo)", specialty: "Cardiology", city: "Alexandria", hospitalId: "demo-alexandria" },
  { id: "demo-doctor-08", name: "Dr. Tarek Amin (Demo)", specialty: "Neurology", city: "Cairo", hospitalId: "demo-cairo-heart" },
  { id: "demo-doctor-09", name: "Dr. Nadia Hassan (Demo)", specialty: "Dermatology", city: "Giza", hospitalId: "demo-giza-care" },
  { id: "demo-doctor-10", name: "Dr. Hadeer Nassar (Demo)", specialty: "Dermatology", city: "Cairo", hospitalId: "demo-nile-medical" },
];

async function main() {
  for (const hospital of hospitals) {
    await prisma.hospital.upsert({ where: { id: hospital.id }, update: hospital, create: hospital });
  }

  for (const doctor of doctors) {
    await prisma.doctor.upsert({ where: { id: doctor.id }, update: doctor, create: doctor });
  }
}

main()
  .catch(() => {
    console.error("Unable to seed demo provider data.");
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());