import { useEffect, useRef } from "react";
import type { Message } from "../types";

interface MessageListProps {
  messages: Message[];
}

export function MessageList({ messages }: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: scroll when message count changes
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const getMessageStyle = (type: Message["type"]) => {
    switch (type) {
      case "sent":
        return "bg-blue-600 text-white ml-auto";
      case "received":
        return "bg-gray-700 text-gray-100";
      case "broadcast":
        return "bg-purple-600/30 text-purple-200 border border-purple-500/50";
      case "system":
        return "bg-gray-800 text-gray-400 text-center text-sm italic";
      default:
        return "bg-gray-700 text-gray-100";
    }
  };

  const getMessageIcon = (type: Message["type"]) => {
    switch (type) {
      case "sent":
        return "➡️";
      case "received":
        return "⬅️";
      case "broadcast":
        return "📢";
      case "system":
        return "ℹ️";
      default:
        return "";
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.length === 0 ? (
        <div className="flex items-center justify-center h-full text-gray-500">
          <p>No messages yet. Start chatting!</p>
        </div>
      ) : (
        messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[80%] px-4 py-2 rounded-lg ${getMessageStyle(
              message.type,
            )} ${message.type === "system" ? "mx-auto max-w-md" : ""}`}
          >
            <div className="flex items-start gap-2">
              <span>{getMessageIcon(message.type)}</span>
              <div className="flex-1">
                {message.clientId && message.type !== "sent" && (
                  <div className="text-xs opacity-70 mb-1">
                    From: {message.clientId.slice(0, 8)}...
                  </div>
                )}
                <p className="break-words">{message.content}</p>
                <div className="text-xs opacity-50 mt-1">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
      <div ref={bottomRef} />
    </div>
  );
}
