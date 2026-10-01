import { MessageBubble } from "./MessageBubble";
import type { ChatMessage } from "./types";
import type { Messages } from "@/lib/i18n/messages";

export function MessageList({ messages, copy }: { messages: ChatMessage[]; copy: Messages }) {
  return (
    <div className="message-list" aria-live="polite" aria-relevant="additions text">
      {messages.map((message) => <MessageBubble key={message.id} message={message} copy={copy} />)}
    </div>
  );
}