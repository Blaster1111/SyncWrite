import { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import './App.css';

function App() {
    const [document, setDocument] = useState("");
    const [socket, setSocket] = useState(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState(null);
    const [roomId, setRoomId] = useState("");
    const [isInRoom, setIsInRoom] = useState(false);
    const [roomError, setRoomError] = useState("");
    const [participants, setParticipants] = useState(0);

    useEffect(() => {
        const socketIo = io("https://syncwrite-jjsg.onrender.com");

        socketIo.on("connect", () => {
            console.log("Socket.IO connected");
            setIsConnected(true);
            setError(null);
            setSocket(socketIo);
        });

        socketIo.on("disconnect", () => {
            console.log("Socket.IO disconnected");
            setIsConnected(false);
        });

        socketIo.on("roomCreated", (newRoomId) => {
            setRoomId(newRoomId);
            setIsInRoom(true);
            setRoomError("");
        });

        socketIo.on("roomJoined", ({ roomId, document: initialDocument, participants }) => {
            setRoomId(roomId);
            setDocument(initialDocument);
            setIsInRoom(true);
            setParticipants(participants);
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
        const newDocument = e.target.value;
        setDocument(newDocument);

        if (socket && socket.connected && roomId) {
            socket.emit("documentUpdate", { roomId, document: newDocument });
        }
    }, [socket, roomId]);

    const handleCreateRoom = () => {
        if (socket && socket.connected) {
            const generateRoomId = () => {
                const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789abcdefghijklmnopqrstuvwxyz';
                let roomId = '';
                for (let i = 0; i < 5; i++) {
                    const randomIndex = Math.floor(Math.random() * characters.length);
                    roomId += characters[randomIndex];
                }
                return roomId;
            };
    
            const newRoomId = generateRoomId();
            socket.emit("createRoom", newRoomId);
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

    return (
        <div className="App">
            <h1>SyncWrite</h1>
            <div className="status">
                <div>Status: {isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
                {isInRoom && <div>Participants: {participants}</div>}
                {error && <div className="error">{error}</div>}
                {roomError && <div className="error">{roomError}</div>}
            </div>

            {!isInRoom && (
                <div className="room-controls">
                    <button onClick={handleCreateRoom}>Create Room</button>
                    
                    <button onClick={handleJoinRoom}>Join Room</button>
                </div>
            )}

            {isInRoom && (
                <div className="editor">
                    <h3>Room ID: {roomId}</h3>
                    <textarea
                        value={document}
                        onChange={handleChange}
                        rows="500"
                        cols="80    "
                        placeholder="Start typing..."
                    />
                    <div className="status-message">
                        {isConnected 
                            ? "You can start typing. Changes will sync automatically."
                            : "Attempting to connect..."}
                    </div>
                </div>
            )}
        </div>
    );
}

export default App;