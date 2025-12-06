interface ConnectionStatusProps {
  isConnected: boolean;
  myClientId: string | null;
  instanceId: string | null;
  onReconnect: () => void;
}

export function ConnectionStatus({
  isConnected,
  myClientId,
  instanceId,
  onReconnect,
}: ConnectionStatusProps) {
  return (
    <div className="bg-gray-800 border-b border-gray-700 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div
              className={`w-3 h-3 rounded-full ${
                isConnected ? "bg-green-500" : "bg-red-500"
              }`}
            />
            <span className="text-sm text-gray-300">
              {isConnected ? "Connected" : "Disconnected"}
            </span>
          </div>
          {myClientId && (
            <div className="text-sm text-gray-400">
              ID:{" "}
              <code className="bg-gray-700 px-2 py-0.5 rounded text-blue-400">
                {myClientId.slice(0, 8)}...
              </code>
            </div>
          )}
          {instanceId && (
            <div className="text-sm text-gray-400">
              Instance:{" "}
              <code className="bg-gray-700 px-2 py-0.5 rounded text-purple-400">
                {instanceId.slice(0, 8)}...
              </code>
            </div>
          )}
        </div>
        {!isConnected && (
          <button
            onClick={onReconnect}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
          >
            Reconnect
          </button>
        )}
      </div>
    </div>
  );
}
