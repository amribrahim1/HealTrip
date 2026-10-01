import { Check, Search, ShieldAlert } from "lucide-react";
import type { Messages } from "@/lib/i18n/messages";
import type { ToolCall } from "./types";

export function ToolStatus({ toolCalls, copy }: { toolCalls: ToolCall[]; copy: Messages }) {
  if (!toolCalls.length) return null;

  return (
    <ul className="tool-list" aria-label={copy.source}>
      {toolCalls.map((call, index) => {
        const Icon = call.name === "emergencyGuidance" ? ShieldAlert : call.status === "success" ? Check : Search;
        const label = copy.tool[call.name];
        const detail = call.status === "success" && typeof call.count === "number"
          ? `${call.count} ${copy.tool.success}`
          : copy.tool[call.status];
        return (
          <li className="tool-item" key={`${call.name}-${index}`}>
            <Icon size={14} aria-hidden="true" />
            <span>{label}</span>
            {detail && <span className="tool-detail">{detail}</span>}
          </li>
        );
      })}
    </ul>
  );
}