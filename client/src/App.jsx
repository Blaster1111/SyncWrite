import { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { Users, Wifi, WifiOff, Copy } from 'lucide-react';

function App() {
    const [document, setDocument] = useState("");
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [roomId, setRoomId] = useState("");
    const [isInRoom, setIsInRoom] = useState(false);
    const [roomError, setRoomError] = useState("");
    const [participants, setParticipants] = useState(0);
    const [isEditable, setIsEditable] = useState(true);
    const [showModeDialog, setShowModeDialog] = useState(false);
    const [copySuccess, setCopySuccess] = useState(false);
    const [textCopySuccess, setTextCopySuccess] = useState(false);

    useEffect(() => {
        const socketIo = io("localhost:3001");

        socketIo.on("connect", () => {
            setIsConnected(true);
            setError(null);
            setSocket(socketIo);
        });

        socketIo.on("disconnect", () => {
            setIsConnected(false);
        });

        socketIo.on("roomCreated", ({ roomId, isEditable }) => {
            setRoomId(roomId);
            setIsInRoom(true);
            setIsEditable(isEditable);
            setRoomError("");
        });

        socketIo.on("roomJoined", ({ roomId, document: initialDocument, participants, isEditable }) => {
            setRoomId(roomId);
            setDocument(initialDocument);
            setIsInRoom(true);
            setParticipants(participants);
            setIsEditable(isEditable);
            setRoomError("");
        });

        socketIo.on("participantUpdate", (count) => {
            setParticipants(count);
        });

        socketIo.on("documentUpdate", (newDocument) => {
            setDocument(newDocument);
        });

        socketIo.on("error", (err) => {
            setRoomError(err);
            setIsInRoom(false);
        });

        return () => {
            if (socketIo) {
                socketIo.disconnect();
            }
        };
    }, []);

    const handleChange = useCallback((e) => {
        if (!isEditable) return;
        
        const newDocument = e.target.value;
        setDocument(newDocument);

        if (socket && socket.connected && roomId) {
            socket.emit("documentUpdate", { roomId, document: newDocument });
        }
    }, [socket, roomId, isEditable]);

    const generateRoomId = () => {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
        let roomId = '';
        for (let i = 0; i < 5; i++) {
            const randomIndex = Math.floor(Math.random() * characters.length);
            roomId += characters[randomIndex];
        }
        return roomId;
    };

    const handleCreateRoom = (mode) => {
        if (socket && socket.connected) {
            const newRoomId = generateRoomId();
            socket.emit("createRoom", { roomId: newRoomId, mode });
            setShowModeDialog(false);
        }
    };

    const handleJoinRoom = () => {
        if (socket && socket.connected) {
            const roomIdToJoin = prompt("Enter Room ID to join:");
            if (roomIdToJoin) {
                socket.emit("joinRoom", roomIdToJoin);
            }
        }
    };

    const copyRoomId = () => {
        navigator.clipboard.writeText(roomId);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
    };

    const copyText = () => {
        navigator.clipboard.writeText(document);
        setTextCopySuccess(true);
        setTimeout(() => setTextCopySuccess(false), 2000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
            <div className="w-full h-full flex flex-col">
                <header className="w-full bg-white/80 backdrop-blur-sm shadow-sm">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                            <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                SyncWrite
                            </h1>
                            <div className="flex flex-wrap items-center gap-3">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm">
                                    {isConnected ? (
                                        <Wifi className="w-4 h-4 text-green-500" />
                                    ) : (
                                        <WifiOff className="w-4 h-4 text-red-500" />
                                    )}
                                    <span className={`text-sm ${isConnected ? 'text-green-500' : 'text-red-500'}`}>
                                        {isConnected ? 'Connected' : 'Disconnected'}
                                    </span>
                                </div>
                                {isInRoom && (
                                    <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white shadow-sm">
                                        <Users className="w-4 h-4 text-blue-500" />
                                        <span className="text-sm text-gray-600">{participants}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </header>

                <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    {(error || roomError) && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-600">
                            {error || roomError}
                        </div>
                    )}

                    {!isInRoom ? (
                        <div className="flex flex-col items-center gap-4 p-6 sm:p-8 bg-white rounded-xl shadow-lg">
                            <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-4">
                                Start Collaborating
                            </h2>
                            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
                                <button
                                    onClick={() => setShowModeDialog(true)}
                                    className="w-full sm:w-auto px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                >
                                    Create Room
                                </button>
                                <button
                                    onClick={handleJoinRoom}
                                    className="w-full sm:w-auto px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                                >
                                    Join Room
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6 h-[calc(100vh-12rem)]">
                            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
                                <div className="flex flex-wrap items-center gap-2">
                                    <h3 className="text-lg font-medium text-gray-700">Room ID:</h3>
                                    <code className="px-3 py-1 bg-gray-100 rounded-md text-sm font-mono">
                                        {roomId}
                                    </code>
                                    <button
                                        onClick={copyRoomId}
                                        className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                                        title="Copy Room ID"
                                    >
                                        <Copy className="w-4 h-4 text-gray-500" />
                                    </button>
                                    {copySuccess && (
                                        <span className="text-sm text-green-500">Copied!</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={copyText}
                                        className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                                        title="Copy Text"
                                    >
                                        <Copy className="w-4 h-4" />
                                        Copy Text
                                    </button>
                                    {textCopySuccess && (
                                        <span className="text-sm text-green-500">Copied!</span>
                                    )}
                                </div>
                            </div>

                            <div className="h-[calc(100%-5rem)]">
                                <textarea
                                    value={document}
                                    onChange={handleChange}
                                    placeholder={isEditable ? 'Start typing...' : 'Room owner is typing...'}
                                    readOnly={!isEditable}
                                    className={`w-full h-full p-4 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none ${
                                        !isEditable ? 'bg-gray-50 cursor-not-allowed' : 'bg-white'
                                    }`}
                                />
                            </div>
                            <div className="mt-4 text-sm text-gray-500 italic">
                                {isConnected 
                                    ? isEditable 
                                        ? "Changes sync automatically in real-time"
                                        : "This is a read-only document"
                                    : "Attempting to connect..."}
                            </div>
                        </div>
                    )}
                </main>
            </div>

            {showModeDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl p-6 max-w-md w-full m-4">
                        <h2 className="text-2xl font-semibold text-gray-800 mb-6">
                            Choose Room Type
                        </h2>
                        <div className="space-y-4">
                            <button
                                onClick={() => handleCreateRoom('collaborative')}
                                className="w-full p-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                Collaborative Editor
                            </button>
                            <button
                                onClick={() => handleCreateRoom('readonly')}
                                className="w-full p-4 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            >
                                Share Text (Read-only for others)
                            </button>
                        </div>
                        <button 
                            className="mt-6 w-full p-3 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            onClick={() => setShowModeDialog(false)}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;