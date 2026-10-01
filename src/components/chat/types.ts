export type Locale = "en" | "ar";
export type ChatRole = "user" | "assistant";

export type DoctorCard = {
  id: string;
  name: string;
  specialty: string;
  city: string;
  hospital: string | null;
};

export type HospitalCard = {
  id: string;
  name: string;
  city: string;
  address: string;
};

export type ToolCall = {
  name: "searchDoctors" | "searchHospitals" | "emergencyGuidance";
  status: "success" | "empty" | "unavailable" | "completed";
  count?: number;
};

export type ChatMessage = {
  id: string;
  role: ChatRole;
  content: string;
  providerResults?: unknown;
  toolCalls?: unknown;
};