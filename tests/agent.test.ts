import { beforeEach, describe, expect, it, vi } from "vitest";

type AgentOptions = {
  tools: {
    searchDoctors: { execute: (input: { specialty?: string; city?: string }) => Promise<unknown> };
    searchHospitals: { execute: (input: { specialty?: string; city?: string }) => Promise<unknown> };
  };
};

const generateTextMock = vi.hoisted(() => vi.fn());

vi.mock("ai", () => ({
  generateText: generateTextMock,
  stepCountIs: vi.fn(() => ({ type: "step-count" })),
  tool: (definition: unknown) => definition,
}));

vi.mock("@/server/ai/provider", () => ({ getLanguageModel: vi.fn(() => "mock-model") }));
vi.mock("@/server/db", () => ({ db: { doctor: { findMany: vi.fn() }, hospital: { findMany: vi.fn() } } }));

import { db } from "@/server/db";
import { runAgent } from "@/server/ai/agent";

const doctorFindMany = vi.mocked(db.doctor.findMany);
const hospitalFindMany = vi.mocked(db.hospital.findMany);

describe("AI agent provider grounding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    doctorFindMany.mockResolvedValue([{
      id: "doctor-demo",
      name: "Dr. Demo (Demo)",
      specialty: "Cardiology",
      city: "Cairo",
      hospitalId: null,
      createdAt: new Date(0),
      updatedAt: new Date(0),
      hospital: null,
    }] as never);
    hospitalFindMany.mockResolvedValue([]);
  });

  it("uses native tool output for provider cards and never exposes invented model text", async () => {
    generateTextMock.mockImplementation(async (options: AgentOptions) => {
      await options.tools.searchDoctors.execute({ specialty: "Cardiology", city: "Cairo" });
      return { text: "Try the invented Dr. Fictional at Imaginary Hospital.", steps: [] };
    });

    const result = await runAgent({
      locale: "en",
      latestMessage: "Find a cardiologist in Cairo",
      messages: [{ role: "user", content: "Find a cardiologist in Cairo" }],
    });

    expect(result.providerResults.doctors).toEqual([expect.objectContaining({ name: "Dr. Demo (Demo)" })]);
    expect(result.message).not.toContain("Dr. Fictional");
    expect(result.toolCalls).toEqual([{ name: "searchDoctors", status: "success", count: 1 }]);
  });

  it("returns a safe unavailable response when the database tool fails", async () => {
    doctorFindMany.mockRejectedValue(new Error("private database detail"));
    generateTextMock.mockImplementation(async (options: AgentOptions) => {
      await options.tools.searchDoctors.execute({ city: "Cairo" });
      return { text: "Invented provider", steps: [] };
    });

    const result = await runAgent({
      locale: "en",
      latestMessage: "Find a doctor in Cairo",
      messages: [{ role: "user", content: "Find a doctor in Cairo" }],
    });

    expect(result.message).toContain("couldn't retrieve provider information");
    expect(result.message).not.toContain("private database detail");
    expect(result.toolCalls).toEqual([{ name: "searchDoctors", status: "unavailable" }]);
  });

  it("searches the database directly for a clear Arabic hospital-directory request", async () => {
    hospitalFindMany.mockResolvedValue([{
      id: "alexandria-demo",
      name: "Alexandria Coastal Clinic (Demo)",
      city: "Alexandria",
      address: "Demo address",
      createdAt: new Date(0),
      updatedAt: new Date(0),
    }] as never);

    const result = await runAgent({
      locale: "ar",
      latestMessage: "ما المستشفيات الموجودة في الإسكندرية؟",
      messages: [{ role: "user", content: "ما المستشفيات الموجودة في الإسكندرية؟" }],
    });

    expect(hospitalFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { city: { contains: "Alexandria", mode: "insensitive" } },
    }));
    expect(result.providerResults.hospitals).toEqual([expect.objectContaining({ city: "Alexandria" })]);
    expect(result.toolCalls).toEqual([{ name: "searchHospitals", status: "success", count: 1 }]);
    expect(generateTextMock).not.toHaveBeenCalled();
  });
});