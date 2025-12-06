import { type FormEvent, useState } from "react";

interface MessageInputProps {
  selectedClient: string | null;
  isConnected: boolean;
  onSendChat: (targetClientId: string, message: string) => void;
  onSendBroadcast: (message: string) => void;
}

export function MessageInput({
  selectedClient,
  isConnected,
  onSendChat,
  onSendBroadcast,
}: MessageInputProps) {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim() || !isConnected) return;

    if (selectedClient) {
      onSendChat(selectedClient, message.trim());
    } else {
      onSendBroadcast(message.trim());
    }
    setMessage("");
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-4 bg-gray-800 border-t border-gray-700"
    >
      <div className="flex items-center gap-2">
        <div className="flex-1 relative">
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={
              isConnected
                ? selectedClient
                  ? `Message to ${selectedClient.slice(0, 8)}...`
                  : "Broadcast to all clients..."
                : "Connecting..."
            }
            disabled={!isConnected}
            className="w-full px-4 py-3 bg-gray-700 text-white placeholder-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          />
          {selectedClient === null && isConnected && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-purple-400 text-sm">
              📢 Broadcast
            </span>
          )}
        </div>
        <button
          type="submit"
          disabled={!isConnected || !message.trim()}
          className={`px-6 py-3 rounded-lg font-medium transition-colors ${
            selectedClient
              ? "bg-blue-600 hover:bg-blue-700"
              : "bg-purple-600 hover:bg-purple-700"
          } text-white disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          Send
        </button>
      </div>
    </form>
  );
}
