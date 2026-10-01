"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import { Languages, LoaderCircle, MessageSquarePlus, ShieldCheck, Trash2 } from "lucide-react";
import { messages as allMessages } from "@/lib/i18n/messages";
import { trpc } from "@/lib/trpc";
import { ChatInput } from "./ChatInput";
import { MessageList } from "./MessageList";
import type { ChatMessage, Locale } from "./types";

export function Chat({ locale }: { locale: Locale }) {
  const copy = allMessages[locale];
  const utils = trpc.useUtils();
  const [sessionReady, setSessionReady] = useState(false);
  const [sessionError, setSessionError] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [requestFailed, setRequestFailed] = useState(false);
  const createInProgress = useRef(false);

  useEffect(() => {
    let active = true;
    fetch("/api/session", { credentials: "same-origin" })
      .then(async (response) => {
        if (!response.ok) throw new Error("Session unavailable");
        const result = await response.json() as { ready: boolean };
        if (!result.ready) throw new Error("Session unavailable");
        if (active) setSessionReady(true);
      })
      .catch(() => { if (active) setSessionError(true); });
    return () => { active = false; };
  }, []);

  const listQuery = trpc.conversations.list.useQuery(undefined, { enabled: sessionReady, retry: false });
  const createConversation = trpc.conversations.create.useMutation({
    onSuccess: ({ conversationId: newId }) => {
      setConversationId(newId);
      createInProgress.current = false;
      void utils.conversations.list.invalidate();
    },
    onError: () => { createInProgress.current = false; setSessionError(true); },
  });

  useEffect(() => {
    if (!sessionReady || listQuery.isLoading || conversationId || createInProgress.current || createConversation.isPending) return;
    const existing = listQuery.data?.[0];
    if (existing) {
      setConversationId(existing.id);
      return;
    }
    createInProgress.current = true;
    createConversation.mutate({ locale });
  }, [sessionReady, listQuery.isLoading, listQuery.data, conversationId, createConversation, locale]);

  const detailQuery = trpc.conversations.get.useQuery(
    { conversationId: conversationId ?? "" },
    { enabled: Boolean(conversationId), retry: false },
  );

  useEffect(() => {
    const stored = (detailQuery.data as unknown as { messages?: ChatMessage[] } | undefined)?.messages;
    if (!stored) return;
    setChatMessages(stored.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      providerResults: message.providerResults,
      toolCalls: message.toolCalls,
    })));
  }, [detailQuery.data]);

  const sendMessage = trpc.chat.sendMessage.useMutation({
    onSuccess: (result) => {
      setRequestFailed(false);
      setChatMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: "assistant",
        content: result.message,
        providerResults: result.providerResults,
        toolCalls: result.toolCalls,
      }]);
      void utils.conversations.get.invalidate({ conversationId: conversationId ?? "" });
      void utils.conversations.list.invalidate();
    },
    onError: () => setRequestFailed(true),
  });

  const removeConversation = trpc.conversations.delete.useMutation({
    onSuccess: async ({ deleted }) => {
      if (!deleted) return;
      utils.conversations.list.setData(undefined, (current) => current?.filter((item) => item.id !== conversationId));
      setConversationId(null);
      setChatMessages([]);
      setRequestFailed(false);
      await utils.conversations.list.invalidate();
    },
  });

  const submit = useCallback((text: string, retry = false) => {
    const message = text.trim();
    if (!conversationId || !message || sendMessage.isPending) return;
    if (!retry) {
      setChatMessages((current) => [...current, { id: crypto.randomUUID(), role: "user", content: message }]);
      setDraft("");
    }
    setRequestFailed(false);
    sendMessage.mutate({ conversationId, message, locale });
  }, [conversationId, locale, sendMessage]);

  const lastUserMessage = useMemo(
    () => [...chatMessages].reverse().find((message) => message.role === "user"),
    [chatMessages],
  );

  const switchLocale = locale === "en" ? "ar" : "en";
  const busy = !sessionReady || listQuery.isLoading || !conversationId;

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href={`/${locale}/chat`} aria-label={copy.brand}>
          <Image className="brand-logo" src="/logo.jpg" alt="" width={528} height={252} priority />
          <span>{copy.brand}</span>
        </a>
        <div className="topbar-actions">
          <span className="demo-label"><span />{copy.category}</span>
          <a className="icon-button" href={`/${switchLocale}/chat`} aria-label={copy.language} title={copy.language}>
            <Languages size={18} aria-hidden="true" /><span>{switchLocale === "ar" ? "عربي" : "EN"}</span>
          </a>
          <button
            className="icon-button"
            type="button"
            onClick={() => conversationId && removeConversation.mutate({ conversationId })}
            disabled={!conversationId || removeConversation.isPending || sendMessage.isPending}
            aria-label={copy.clear}
            title={copy.clear}
          >
            {removeConversation.isPending ? <LoaderCircle className="spin" size={18} /> : <Trash2 size={18} />}
          </button>
        </div>
      </header>

      <section className="workspace">
        <aside className="context-rail" aria-label={copy.brand}>
          <div className="rail-icon"><MessageSquarePlus size={19} aria-hidden="true" /></div>
          <span className="rail-rule" />
          <div className="rail-safety"><ShieldCheck size={16} aria-hidden="true" /><span>{copy.safety}</span></div>
        </aside>

        <div className="chat-stage">
          <div className="chat-heading">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />{copy.category}</div>
              <h1>{copy.title}</h1>
              <p className="intro-copy">{copy.intro}</p>
            </div>
            <div className="safety-note"><ShieldCheck size={16} aria-hidden="true" /><span>{copy.safety}</span></div>
          </div>

          <div className="conversation-area" aria-busy={busy || sendMessage.isPending}>
            {busy && !sessionError && <div className="empty-loading"><LoaderCircle className="spin" size={18} />{copy.noChat}</div>}
            {sessionError && <div className="inline-alert" role="alert">{copy.sessionError}</div>}
            {!busy && chatMessages.length === 0 && (
              <div className="welcome-state">
                <p className="welcome-kicker">{copy.assistant}</p>
                <div className="prompt-list">
                  {copy.prompts.map((prompt) => (
                    <button type="button" key={prompt} onClick={() => submit(prompt)} disabled={sendMessage.isPending}>
                      <span>{prompt}</span><span className="prompt-arrow">↗</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
            <MessageList messages={chatMessages} copy={copy} />
            {sendMessage.isPending && (
              <div className="thinking-row" role="status"><span className="thinking-mark"><LoaderCircle className="spin" size={16} /></span>{copy.thinking}</div>
            )}
            {requestFailed && (
              <div className="retry-row" role="alert">
                <span>{copy.error}</span>
                {lastUserMessage && <button type="button" onClick={() => submit(lastUserMessage.content, true)}>{copy.retry}</button>}
              </div>
            )}
          </div>

          <div className="composer-wrap">
            <ChatInput
              value={draft}
              onChange={setDraft}
              onSubmit={() => submit(draft)}
              disabled={busy || sendMessage.isPending || Boolean(sessionError)}
              placeholder={copy.placeholder}
              label={copy.send}
            />
            <div className="composer-foot"><span>{copy.safety}</span><span>{draft.length}/2000</span></div>
          </div>
        </div>
      </section>
    </main>
  );
}