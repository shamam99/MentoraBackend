const { Server } = require("socket.io");
const { getQuestions } = require("../utils/questionProvider");
const { generatePinCode } = require("../utils/pinGenerator");
const Room = require("../models/Room");
const GameResult = require("../models/GameResult");
const User = require("../models/User");
const { soloQuestions, roomQuestions } = require("../utils/questionsCache");

const roomPlayers = {};
const gameSessions = {};

let io;

function socketHandler(server) {
  io = new Server(server, { cors: { origin: "*" } });

  // === Multiplayer Answer Handler must be defined before usage ===
  async function handleMultiplayerAnswer(roomId, userId, answer) {
    const session = gameSessions[roomId];
    if (!session || session.answeredPlayers.has(userId)) return;

    const currentQ = session.questions[session.currentIndex];
    const isCorrect = String(answer).trim().toLowerCase() === String(currentQ.correct).trim().toLowerCase();

    if (isCorrect) {
      session.playerScores[userId].score++;
      session.playerScores[userId].correctAnswers++;
    }

    const socket = roomPlayers[roomId]?.[userId];
    if (socket) {
      socket.emit("multiplayerAnswerResult", {
        player: userId,
        score: session.playerScores[userId].score,
        correctAnswer: currentQ.correct
      });
    }

    session.answeredPlayers.add(userId);
    const totalPlayers = Object.keys(roomPlayers[roomId] || {}).length;

    if (session.answeredPlayers.size >= totalPlayers && totalPlayers > 0){
      session.currentIndex++;
      session.answeredPlayers.clear();

      if (session.currentIndex >= session.questions.length) {
        session.completedPlayers = new Set(Object.keys(session.playerScores));
        checkIfShouldEndGame(roomId);
      } else {
        setTimeout(() => emitMultiplayerQuestion(roomId), 1000);
      }
    }
  }

  async function checkIfShouldEndGame(roomId) {
    const session = gameSessions[roomId];
    if (!session) return;

    const total = Object.keys(session.playerScores).length;
    const finished = session.completedPlayers.size + session.leftPlayers.size;

    if (finished >= total) {
      await endMultiplayerGame(roomId);
    }
  }

  async function endMultiplayerGame(roomId) {
    const session = gameSessions[roomId];
    const room = await Room.findById(roomId);
    if (!room || !session) return;

    const finalScores = {};

    for (const [uid, scoreData] of Object.entries(session.playerScores)) {
      const user = await User.findById(uid);
      if (user) {
        finalScores[uid] = {
          displayName: user.displayName,
          score: scoreData.score
        };
    
        await GameResult.create({
          roomId,
          playerId: uid,
          score: scoreData.score,
          correctAnswers: scoreData.correctAnswers,
          totalQuestions: session.questions.length,
          finishedAt: new Date()
        });
    
        user.streak += 1;
        user.hearts += 1;
        await user.save();
      }
    }
    
    await Room.findByIdAndUpdate(roomId, {
      status: "completed",
      endedAt: new Date()
    });
    
    io.to(roomId).emit("multiplayerGameOver", finalScores);    

    delete gameSessions[roomId];
    delete roomPlayers[roomId];
  }

  function emitMultiplayerQuestion(roomId) {
    const session = gameSessions[roomId];
    if (!session || session.currentIndex >= session.questions.length) return;
  
    const q = session.questions[session.currentIndex];
  
    console.log(`[emitMultiplayerQuestion] Emitted to room ${roomId}:`, JSON.stringify(q, null, 2));
  
    for (const uid of Object.keys(roomPlayers[roomId])) {
      const s = roomPlayers[roomId][uid];
      console.log(`--> Question sent to ${uid}: ${s?.id}`);
    }
  
    io.to(roomId).emit("multiplayerQuestion", {
      index: session.currentIndex + 1,
      total: session.questions.length,
      question: {
        text: q.question || q.statement || "Untitled",
        choices: q.choices || [],
        correct: q.correct || ""
      }
    });
  }
  

  function sendSoloQuestion(socket, session) {
    const q = session.savedQuestions[session.currentIndex];
    socket.emit("soloQuestion", {
      index: session.currentIndex + 1,
      total: session.savedQuestions.length,
      question: {
        text: q.questionText,
        choices: q.choices
      }
    });
  }

  io.on("connection", (socket) => {
    console.log(`[SOCKET] Client connected: ${socket.id}`);

    socket.on("soloStartGame", async ({ userId }) => {
      try {
        const questions = soloQuestions[userId];
        if (!questions || !Array.isArray(questions) || questions.length === 0) {
          return socket.emit("soloError", { message: "No questions uploaded yet" });
        }

        const formattedQuestions = questions.map(q => ({
          questionText: q.statement || q.question || "Untitled",
          choices: ["True", "False"],
          correct: q.is_true ? "True" : "False"
        }));

        const room = await Room.create({
          hostUser: userId,
          isSolo: true,
          players: [userId],
          status: "active",
          startedAt: new Date()
        });

        const session = {
          roomId: room._id,
          currentIndex: 0,
          score: 0,
          correctAnswers: 0,
          savedQuestions: formattedQuestions
        };

        sendSoloQuestion(socket, session);

        socket.on("soloAnswer", async (answer) => {
          if (session.currentIndex >= session.savedQuestions.length) return;

          const currentQ = session.savedQuestions[session.currentIndex];
          const isCorrect = String(answer).trim().toLowerCase() === currentQ.correct.toLowerCase();

          if (isCorrect) {
            session.score++;
            session.correctAnswers++;
          }

          socket.emit("soloAnswerResult", {
            correct: isCorrect,
            correctAnswer: currentQ.correct
          });

          session.currentIndex++;

          if (session.currentIndex < session.savedQuestions.length) {
            setTimeout(() => sendSoloQuestion(socket, session), 1000);
          } else {
            await GameResult.create({
              roomId: session.roomId,
              playerId: userId,
              score: session.score,
              correctAnswers: session.correctAnswers,
              totalQuestions: session.savedQuestions.length,
              finishedAt: new Date()
            });

            await Room.findByIdAndUpdate(session.roomId, {
              status: "completed",
              endedAt: new Date()
            });

            const user = await User.findById(userId);
            if (user) {
              user.streak += 1;
              user.hearts += 1;
              await user.save();
            }

            socket.emit("soloGameOver", {
              score: session.score,
              total: session.savedQuestions.length
            });

            delete soloQuestions[userId];
          }
        });
      } catch (err) {
        console.error("Solo Game Error:", err);
        socket.emit("soloError", { message: "Solo game failed to start" });
      }
    });

    socket.on("joinMultiplayerRoom", async ({ userId, displayName, pinCode }) => {
      try {
        let room;
        if (!pinCode) {
          room = await Room.findOne({ hostUser: userId, status: "waiting" });
          if (!room) {
            room = await Room.create({
              hostUser: userId,
              players: [userId],
              pinCode: generatePinCode(),
              status: "waiting",
              isSolo: false,
              createdAt: new Date()
            });
          }
        } else {
          room = await Room.findOne({ pinCode, status: "waiting" });
          if (!room) return socket.emit("joinError", { message: "Room not found or already started" });

          if (!room.players.includes(userId)) {
            room.players.push(userId);
            await room.save();
          }
        }

        const roomId = room._id.toString();
        roomPlayers[roomId] = roomPlayers[roomId] || {};
        roomPlayers[roomId][userId] = socket;
        socket.join(roomId);

        const users = await User.find({ _id: { $in: room.players } });
        io.to(roomId).emit("multiplayerLobbyUpdate", {
          pinCode: room.pinCode,
          players: users.map(u => u.displayName),
          hostId: room.hostUser.toString(),
          roomId: room._id.toString(),
        });
      } catch (err) {
        socket.emit("joinError", { message: "Failed to join room" });
      }
    });

    socket.on("startMultiplayerGame", async ({ userId, roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room || room.status !== "waiting") {
          return socket.emit("startError", { message: "Invalid room or already started" });
        }

        const resolvedRoomId = room._id.toString();
        roomPlayers[resolvedRoomId] = roomPlayers[resolvedRoomId] || {};

        const rawQuestions = roomQuestions[room.hostUser.toString()] || getQuestions(5);
        const formattedQuestions = rawQuestions.map((q, i) => ({
          question: q.question || q.statement || `Untitled #${i}`,
          choices: (q.choices || []).map(c => typeof c === "string" ? c : (c?.answer || "")),
          correct: typeof q.correct === "string" ? q.correct : ""
        }));

        const allPlayerIds = Object.keys(roomPlayers[resolvedRoomId]);
        gameSessions[resolvedRoomId] = {
          currentIndex: 0,
          questions: formattedQuestions,
          playerScores: {},
          answeredPlayers: new Set(),
          completedPlayers: new Set(),
          leftPlayers: new Set()
        };

        for (const uid of allPlayerIds) {
          gameSessions[resolvedRoomId].playerScores[uid] = { score: 0, correctAnswers: 0 };
          const playerSocket = roomPlayers[resolvedRoomId][uid];
          playerSocket.removeAllListeners("submitMultiplayerAnswer");
          playerSocket.on("submitMultiplayerAnswer", ({ userId, answer }) => {
            handleMultiplayerAnswer(resolvedRoomId, userId, answer);
          });
        }

        room.status = "active";
        room.startedAt = new Date();
        await room.save();

        setTimeout(() => {
          io.to(resolvedRoomId).emit("multiplayerGameStarted");
          emitMultiplayerQuestion(resolvedRoomId);
        }, 300);
      } catch (err) {
        console.error("[SOCKET][startMultiplayerGame] Error:", err);
        socket.emit("startError", { message: "Start failed" });
      }
    });

    socket.on("leaveMultiplayerGame", ({ userId }) => {
      for (const [roomId, players] of Object.entries(roomPlayers)) {
        if (players[userId]) {
          delete players[userId];
          if (gameSessions[roomId]) {
            gameSessions[roomId].leftPlayers.add(userId);
            checkIfShouldEndGame(roomId);
          }
        }
      }
    });

    socket.on("disconnect", () => {
      for (const [roomId, players] of Object.entries(roomPlayers)) {
        for (const [uid, sock] of Object.entries(players)) {
          if (sock.id === socket.id) {
            delete players[uid];
            if (gameSessions[roomId]) {
              gameSessions[roomId].leftPlayers.add(uid);
              checkIfShouldEndGame(roomId);
            }
          }
        }
      }
    });
  });
}

module.exports = socketHandler;
