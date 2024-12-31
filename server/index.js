import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import dotenv from 'dotenv'

const app = express();
dotenv.config({ path: './.env' });
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();

const getRoomParticipants = (roomId) => {
    return io.sockets.adapter.rooms.get(roomId)?.size || 0;
};

io.on("connection", (socket) => {
    console.log("New client connected:", socket.id);
    socket.on("createRoom", (roomId) => {
        if (rooms.has(roomId)) {
            socket.emit("error", "Room already exists");
            return;
        }
        rooms.set(roomId, {
            document: "",
            creator: socket.id
        });

        socket.join(roomId);
        socket.emit("roomCreated", roomId);
        
        io.to(roomId).emit("participantUpdate", getRoomParticipants(roomId));
        
        console.log(`Room created: ${roomId}`);
    });

    socket.on("joinRoom", (roomId) => {
        if (!rooms.has(roomId)) {
            socket.emit("error", "Room does not exist");
            return;
        }

        socket.join(roomId);
        
        socket.emit("roomJoined", {
            roomId,
            document: rooms.get(roomId).document,
            participants: getRoomParticipants(roomId)
        });

        io.to(roomId).emit("participantUpdate", getRoomParticipants(roomId));
        
        console.log(`Client ${socket.id} joined room: ${roomId}`);
    });

    socket.on("documentUpdate", ({ roomId, document }) => {
        if (!rooms.has(roomId)) {
            socket.emit("error", "Room does not exist");
            return;
        }

        rooms.get(roomId).document = document;
        
        io.to(roomId).emit("documentUpdate", document);
        
        console.log(`Document updated in room ${roomId}`);
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);
        
        for (const [roomId, room] of rooms.entries()) {
            if (io.sockets.adapter.rooms.get(roomId)) {
                io.to(roomId).emit("participantUpdate", getRoomParticipants(roomId));
            } else {
                rooms.delete(roomId);
                console.log(`Room ${roomId} deleted - no participants remaining`);
            }
        }
    });
});

const port = process.env.port;
server.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});