import { useState } from "react";
import { ClientList } from "./components/ClientList";
import { ConnectionStatus } from "./components/ConnectionStatus";
import { MessageInput } from "./components/MessageInput";
import { MessageList } from "./components/MessageList";
import { useWebSocket } from "./hooks/useWebSocket";

const WS_URL = import.meta.env.VITE_WS_URL || "ws://localhost:3000";

function App() {
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const {
    isConnected,
    myClientId,
    instanceId,
    clients,
    messages,
    sendChat,
    sendBroadcast,
    requestClients,
    reconnect,
  } = useWebSocket({ url: WS_URL });

  return (
    <div className="h-screen flex flex-col bg-gray-900 text-white">
      <ConnectionStatus
        isConnected={isConnected}
        myClientId={myClientId}
        instanceId={instanceId}
        onReconnect={reconnect}
      />

      <div className="flex-1 flex overflow-hidden">
        <ClientList
          clients={clients}
          myClientId={myClientId}
          selectedClient={selectedClient}
          onSelectClient={setSelectedClient}
          onRefresh={requestClients}
        />

        <div className="flex-1 flex flex-col">
          <div className="bg-gray-800 border-b border-gray-700 px-4 py-3">
            <h2 className="text-lg font-medium">
              {selectedClient ? (
                <>
                  Chat with{" "}
                  <code className="bg-gray-700 px-2 py-0.5 rounded text-blue-400">
                    {selectedClient.slice(0, 8)}...
                  </code>
                </>
              ) : (
                <>
                  <span className="text-purple-400">📢 Broadcast</span> to all
                  clients
                </>
              )}
            </h2>
          </div>

          <MessageList messages={messages} />

          <MessageInput
            selectedClient={selectedClient}
            isConnected={isConnected}
            onSendChat={sendChat}
            onSendBroadcast={sendBroadcast}
          />
        </div>
      </div>
    </div>
  );
}

export default App;
