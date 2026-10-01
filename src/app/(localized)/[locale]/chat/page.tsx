import { notFound } from "next/navigation";
import { Chat } from "@/components/chat/Chat";

export default async function ChatPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (locale !== "en" && locale !== "ar") notFound();
  return <Chat locale={locale} />;
}