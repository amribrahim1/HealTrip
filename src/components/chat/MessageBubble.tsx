import { z } from "zod";
import { Building2, MapPin, Stethoscope } from "lucide-react";
import type { Messages } from "@/lib/i18n/messages";
import { ToolStatus } from "./ToolStatus";
import type { ChatMessage, DoctorCard, HospitalCard, ToolCall } from "./types";

const providerResultsSchema = z.object({
  doctors: z.array(z.object({ id: z.string(), name: z.string(), specialty: z.string(), city: z.string(), hospital: z.string().nullable() })),
  hospitals: z.array(z.object({ id: z.string(), name: z.string(), city: z.string(), address: z.string() })),
});

const toolCallsSchema = z.array(z.object({
  name: z.enum(["searchDoctors", "searchHospitals", "emergencyGuidance"]),
  status: z.enum(["success", "empty", "unavailable", "completed"]),
  count: z.number().int().nonnegative().optional(),
}));

export function MessageBubble({ message, copy }: { message: ChatMessage; copy: Messages }) {
  const isUser = message.role === "user";
  const results = providerResultsSchema.safeParse(message.providerResults);
  const parsedCalls = toolCallsSchema.safeParse(message.toolCalls);
  const doctors = results.success ? results.data.doctors : [];
  const hospitals = results.success ? results.data.hospitals : [];
  const toolCalls: ToolCall[] = parsedCalls.success ? parsedCalls.data : [];

  return (
    <article className={`message-row ${isUser ? "message-row-user" : "message-row-assistant"}`}>
      <div className="message-meta">{isUser ? copy.you : copy.assistant}</div>
      <div className={`message-bubble ${isUser ? "message-user" : "message-assistant"}`}>
        <p>{message.content}</p>
      </div>
      {!isUser && <ToolStatus toolCalls={toolCalls} copy={copy} />}
      {!isUser && (doctors.length > 0 || hospitals.length > 0) && (
        <section className="provider-results" aria-label={copy.options}>
          <div className="source-label"><span className="source-dot" />{copy.source}</div>
          {doctors.map((doctor: DoctorCard) => (
            <div className="provider-row" key={doctor.id}>
              <div className="provider-icon"><Stethoscope size={17} aria-hidden="true" /></div>
              <div className="provider-copy">
                <strong>{doctor.name}</strong>
                <span>{doctor.specialty} · {doctor.city}</span>
                {doctor.hospital && <span>{doctor.hospital}</span>}
              </div>
            </div>
          ))}
          {hospitals.map((hospital: HospitalCard) => (
            <div className="provider-row" key={hospital.id}>
              <div className="provider-icon provider-icon-coral"><Building2 size={17} aria-hidden="true" /></div>
              <div className="provider-copy">
                <strong>{hospital.name}</strong>
                <span><MapPin size={13} aria-hidden="true" />{hospital.city}</span>
                <span>{hospital.address}</span>
              </div>
            </div>
          ))}
        </section>
      )}
    </article>
  );
}