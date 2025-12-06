interface ClientListProps {
  clients: string[];
  myClientId: string | null;
  selectedClient: string | null;
  onSelectClient: (clientId: string | null) => void;
  onRefresh: () => void;
}

export function ClientList({
  clients,
  myClientId,
  selectedClient,
  onSelectClient,
  onRefresh,
}: ClientListProps) {
  const otherClients = clients.filter((id) => id !== myClientId);

  return (
    <div className="w-64 bg-gray-800 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-white">Clients</h2>
          <button
            onClick={onRefresh}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
            title="Refresh client list"
            aria-label="Refresh client list"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
        </div>
        <button
          onClick={() => onSelectClient(null)}
          className={`w-full px-4 py-2 text-left rounded-lg transition-colors ${
            selectedClient === null
              ? "bg-purple-600 text-white"
              : "bg-gray-700 text-gray-300 hover:bg-gray-600"
          }`}
        >
          📢 Broadcast
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {otherClients.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No other clients connected
          </p>
        ) : (
          <div className="space-y-2">
            {otherClients.map((clientId) => (
              <button
                key={clientId}
                onClick={() => onSelectClient(clientId)}
                className={`w-full px-4 py-3 text-left rounded-lg transition-colors ${
                  selectedClient === clientId
                    ? "bg-blue-600 text-white"
                    : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                }`}
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <code className="text-sm">{clientId.slice(0, 8)}...</code>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t border-gray-700">
        <p className="text-xs text-gray-500 text-center">
          {clients.length} client{clients.length !== 1 ? "s" : ""} connected
        </p>
      </div>
    </div>
  );
}
