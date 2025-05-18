const { Server } = require("socket.io");
const { getQuestions } = require("../utils/questionProvider");
const { generatePinCode } = require("../utils/pinGenerator");
const Room = require("../models/Room");
const GameResult = require("../models/GameResult");
const User = require("../models/User");
const { soloQuestions, roomQuestions } = require("../utils/questionsCache");
const mongoose = require("mongoose");

const roomPlayers = {};
const gameSessions = {};

let io;

function socketHandler(server) {
  io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    // --- SOLO GAME ---
    socket.on("soloStartGame", async ({ userId }) => {
      try {
        const questions = soloQuestions[userId];

        if (!questions || !Array.isArray(questions) || questions.length === 0) {
          return socket.emit("soloError", { message: "No questions uploaded yet" });
        }

        const formattedQuestions = questions.map((q) => ({
          questionText: q.statement || q.question || "Untitled",
          choices: ["True", "False"],
          correct: q.is_true ? "True" : "False"
        }));

        const room = await Room.create({
          hostUser: userId,
          isSolo: true,
          players: [userId],
          status: "active",
          startedAt: new Date(),
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

            // Clean up used questions
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
    
        const roomId = room._id.toString(); //  Define first
    
        const allSockets = Object.keys(roomPlayers[roomId] || {}); //  Then debug it
        console.log(`[DEBUG] Current players in memory for room ${roomId}:`, allSockets);
    
        //  Force memory socket registration
        roomPlayers[roomId] = roomPlayers[roomId] || {};

        // ✅ Prevent overwriting if same socket is already present
        if (!roomPlayers[roomId][userId]) {
          roomPlayers[roomId][userId] = socket;
          console.log(`[SOCKET][joinMultiplayerRoom] Registered socket for user: ${userId}`);
        } else {
          console.log(`[SOCKET][joinMultiplayerRoom] Already registered socket for user: ${userId}`);
        }
    
        //  Critical: ensure socket joins the actual Socket.IO room
        socket.join(roomId);    
        const users = await User.find({ _id: { $in: room.players } });
    
        io.to(roomId).emit("multiplayerLobbyUpdate", {
          pinCode: room.pinCode,
          players: users.map(u => u.displayName),
          hostId: room.hostUser.toString(),
        });
      } catch (err) {
        console.error("[SOCKET][joinMultiplayerRoom] Error:", err);
        socket.emit("joinError", { message: "Failed to join room" });
      }
    });
    

      // --- START MULTIPLAYER GAME ---
      socket.on("startMultiplayerGame", async ({ userId, roomId }) => {
        console.log("[SOCKET] 'startMultiplayerGame' received from:", userId);
      
        try {
          if (!roomId) {
            return socket.emit("startError", { message: "Missing roomId in request" });
          }
      
          const room = await Room.findById(roomId);
          if (!room || room.status !== "waiting") {
            return socket.emit("startError", { message: "Invalid room or already active" });
          }

          const resolvedRoomId = room._id.toString();

          // Ensure host socket is tracked correctly
          roomPlayers[roomId] = roomPlayers[roomId] || {};
          if (!roomPlayers[roomId][userId]) {
            roomPlayers[roomId][userId] = socket;
            console.warn(`[SOCKET][startGame] Host socket was missing and has been added manually for: ${userId}`);
          }

          let rawQuestions = roomQuestions[room.hostUser.toString()];
          console.log(`[SOCKET][startGame] Room found (${roomId}), questions: ${rawQuestions?.length || 0}`);

          if (!rawQuestions || rawQuestions.length === 0) {
            console.log("[SOCKET][startGame] No uploaded questions found. Using fallback.");
            rawQuestions = getQuestions(5);
          }

          console.log("=== RAW QUESTIONS FROM CACHE ===");
          console.dir(roomQuestions[room.hostUser.toString()], { depth: null });


          const formattedQuestions = rawQuestions.map((q, i) => {
            const correctChoice = typeof q.correct === "string" ? q.correct : "";
          
            const choices = Array.isArray(q.choices)
              ? q.choices.map(c => typeof c === "string" ? c : (
                  typeof c === "object" && typeof c.answer === "string" ? c.answer : null
                )).filter(c => c !== null)
              : [];
          
            return {
              question: q.question || q.statement || `Untitled #${i}`,
              choices,
              correct: correctChoice
            };
          });          
          

          console.log("=== DEBUG QUESTION FORMAT ===");
          console.log(JSON.stringify(formattedQuestions, null, 2));
          

          console.log(`[SOCKET][startGame] Formatted ${formattedQuestions.length} questions`);

          // ✅ Use real-time connected players from roomPlayers[roomId]
          const socketsInRoom = roomPlayers[roomId] || {};
          const allPlayerIds = Object.keys(socketsInRoom);
          console.log(`[SOCKET][startGame] Live connected players: ${allPlayerIds.length}`);

          gameSessions[roomId] = {
            currentIndex: 0,
            questions: formattedQuestions,
            playerScores: {},
            answeredPlayers: new Set(),
            completedPlayers: new Set(),
            leftPlayers: new Set()
          };

          for (const uid of allPlayerIds) {
            gameSessions[roomId].playerScores[uid] = { score: 0, correctAnswers: 0 };
            const playerSocket = socketsInRoom[uid];
            if (playerSocket) {
              console.log(`[SOCKET][startGame] Binding answer listener for user: ${uid}`);
              playerSocket.removeAllListeners("submitMultiplayerAnswer");
              playerSocket.on("submitMultiplayerAnswer", (data) => {
                if (!data || typeof data !== "object" || !data.userId || !data.answer) {
                  console.log("[SOCKET][submitAnswer] Invalid data received", data);
                  return;
                }
                handleMultiplayerAnswer(roomId, data.userId, data.answer);
              });
            } else {
              console.warn(`[SOCKET][startGame] No socket found for user: ${uid}`);
            }
          }

          // ✅ Keep DB in sync
          room.status = "active";
          room.startedAt = new Date();
          await room.save();
          console.log(`[SOCKET][startGame] Room (${roomId}) marked as active`);

          // ✅ Emit start event after a short delay for full sync
          setTimeout(() => {
            io.to(roomId).emit("multiplayerGameStarted");
            console.log(`[SOCKET][startGame] Emitted 'multiplayerGameStarted' to room ${roomId}`);
            emitMultiplayerQuestion(roomId);
          }, 300);

        } catch (err) {
          console.error("[SOCKET][startGame] Error:", err);
          socket.emit("startError", { message: "Failed to start game" });
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

// --- HELPERS ---

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


function emitMultiplayerQuestion(roomId) {
  const session = gameSessions[roomId];
  if (!session || session.currentIndex >= session.questions.length) {
    console.warn(`[emitMultiplayerQuestion] Invalid session or end of questions for room ${roomId}`);
    return;
  }

  const q = session.questions[session.currentIndex];
  console.log(`[emitMultiplayerQuestion] Sending Q${session.currentIndex + 1} to room ${roomId}:`, q);

  io.to(roomId).emit("multiplayerQuestion", {
    index: session.currentIndex + 1,
    total: session.questions.length,
    question: {
      text: q.question || q.statement || "No question provided",
      choices: q.choices || [],
      correct: q.correct || "" 
    }
  });
}


async function handleMultiplayerAnswer(roomId, userId, answer) {
  const session = gameSessions[roomId];
  if (!session || session.answeredPlayers.has(userId)) return;

  const question = session.questions[session.currentIndex];
  const isCorrect = String(answer).trim().toLowerCase() === String(question.correct).trim().toLowerCase();
  

  if (isCorrect) {
    session.playerScores[userId].score++;
    session.playerScores[userId].correctAnswers++;
  }

  const socket = roomPlayers[roomId]?.[userId];
  if (socket) {
    socket.emit("multiplayerAnswerResult", {
      player: userId,
      score: session.playerScores[userId].score,
    });
  }

  session.answeredPlayers.add(userId);
  const totalPlayers = Object.keys(session.playerScores).length;
  if (session.answeredPlayers.size >= totalPlayers) {
    session.currentIndex++;
    session.answeredPlayers.clear();

    if (session.currentIndex >= session.questions.length) {
      session.completedPlayers = new Set(Object.keys(session.playerScores));
      checkIfShouldEndGame(roomId);
    } else {
      setTimeout(() => emitMultiplayerQuestion(roomId), 1200);
    }
  }
}

async function checkIfShouldEndGame(roomId) {
  const session = gameSessions[roomId];
  if (!session) return;

  const totalPlayers = Object.keys(session.playerScores).length;
  const finished = session.completedPlayers.size + session.leftPlayers.size;
  if (finished >= totalPlayers) {
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
      finalScores[user.displayName] = scoreData.score;

      await GameResult.create({
        roomId,
        playerId: uid,
        score: scoreData.score,
        correctAnswers: scoreData.correctAnswers,
        totalQuestions: session.questions.length,
        finishedAt: new Date(),
      });

      user.streak += 1;
      user.hearts += 1;
      await user.save();
    }
  }

  await Room.findByIdAndUpdate(roomId, {
    status: "completed",
    endedAt: new Date(),
  });

  io.to(roomId).emit("multiplayerGameOver", finalScores);
  delete gameSessions[roomId];
  delete roomPlayers[roomId];
}

module.exports = socketHandler;
