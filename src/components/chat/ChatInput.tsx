"use client";

import { FormEvent, useRef } from "react";
import { ArrowUp } from "lucide-react";

export function ChatInput({
  value,
  onChange,
  onSubmit,
  disabled,
  placeholder,
  label,
}: {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  disabled: boolean;
  placeholder: string;
  label: string;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (value.trim() && !disabled) {
      onSubmit();
      if (textareaRef.current) textareaRef.current.style.height = "auto";
    }
  }

  return (
    <form className="composer" onSubmit={submit}>
      <label className="sr-only" htmlFor="chat-message">{placeholder}</label>
      <textarea
        id="chat-message"
        ref={textareaRef}
        value={value}
        rows={1}
        maxLength={2000}
        placeholder={placeholder}
        disabled={disabled}
        onChange={(event) => {
          onChange(event.target.value);
          event.target.style.height = "auto";
          event.target.style.height = `${Math.min(event.target.scrollHeight, 144)}px`;
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            event.currentTarget.form?.requestSubmit();
          }
        }}
      />
      <button className="send-button" type="submit" disabled={disabled || !value.trim()} aria-label={label} title={label}>
        <ArrowUp size={18} aria-hidden="true" />
      </button>
    </form>
  );
}