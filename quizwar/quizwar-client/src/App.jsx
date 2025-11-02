import { useEffect, useState } from 'react'
import { io } from 'socket.io-client';
import axios from "axios";

const SERVER_URL = "http://localhost:3000";
const socket = io(SERVER_URL, { autoConnect: false });

function App() {

  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [players, setPlayers] = useState([]);
  const [connectedRoom, setConnectedRoom] = useState(null);
  const [phase, setPhase] = useState("enterCode");

  useEffect(() => {
    socket.on("joinedRoom", (data) => {
      setConnectedRoom(data.roomCode);
      setPlayers(data.players);
    });

    socket.on("roomUpdated", (data) => {
      if (data.roomCode === connectedRoom) setPlayers(data.players);
    });

    socket.on('errorMessage', (e) => alert(e.message));

    return () => {
      socket.off("joinedRoom");
      socket.off("roomUpdated");
      socket.off("errorMessage");
    };
  }, [connectedRoom]);

  const handleEnterCode = async () => {
    if(!roomCode) return alert("Enter a code!");
    try {
      await axios.get(`${SERVER_URL}/rooms/${roomCode}`);
      setPhase("enterName");
    } catch (error) {
      alert("Room not found")
    }
  }

  const handleCreateRoom = async () => {
    if (!name) return alert("Enter your name first");
    const res = await axios.post(`${SERVER_URL}/create-room`, { hostName: name });
    const code = res.data.roomCode;
    socket.connect();
    socket.emit("joinRoom", { roomCode: code, name, isHost: true });
  };

  const handleJoinRoom = () => {
    if (!name || !roomCode) return alert("Enter name and room code");
    socket.connect();
    socket.emit("joinRoom", { roomCode: roomCode.toUpperCase(), name, isHost: false });
    setPhase('inRoom');
  }

  const handleLeave = () => {
    if (!connectedRoom) return;
    socket.emit("leaveRoom", { roomCode: connectedRoom });
    socket.disconnect(); setConnectedRoom(null);
    setPlayers([]);
  }

  if (phase === "enterCode")
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Enter Game Code</h2>
        <input
          placeholder="Room Code"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          style={{ marginRight: "1rem" }}
        />
        <button onClick={handleEnterCode}>Next</button>
      </div>
    );

  if (phase === "enterName")
    return (
      <div style={{ padding: "2rem" }}>
        <h2>Enter Your Name</h2>
        <input
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          style={{ marginRight: "1rem" }}
        />
        <button onClick={handleJoinRoom}>Join</button>
        <div style={{ marginTop: "1rem" }}>
          <button onClick={() => setPhase("enterCode")}>Back</button>
        </div>
      </div>
    );

  if (phase === "inRoom")
    return (
      <div style={{ padding: "2rem" }}>
        <h2>
          Room <code>{roomCode}</code>
        </h2>
        <h3>Players:</h3>
        <ul>
          {players.map((p, i) => (
            <li key={i}>
              {p.name} {p.isHost ? "(Host)" : ""}
            </li>
          ))}
        </ul>
        <button onClick={handleLeave}>Leave</button>
      </div>
    );

  return null;
}

export default App
