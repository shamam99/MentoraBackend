const { Server } = require("socket.io");
const { getQuestions } = require("../utils/questionProvider");
const { generatePinCode } = require("../utils/pinGenerator");
const Room = require("../models/Room");
const GameResult = require("../models/GameResult");
const User = require("../models/User");

// Room mapping: roomId → player sockets
const roomPlayers = {};

function socketHandler(server) {
  const io = new Server(server, { cors: { origin: "*" } });

  io.on("connection", (socket) => {
    console.log(`Connected: ${socket.id}`);

    // --- SOLO GAME ---
    socket.on("soloStartGame", async ({ userId }) => {
      try {
        const questions = getQuestions(5);
        let currentIndex = 0;
        let score = 0;
        let correctAnswers = 0;

        const savedQuestions = questions.map(q => ({
          questionText: q.question,
          choices: q.choices,
          correct: q.correct,
        }));

        const newRoom = await Room.create({
          hostUser: userId,
          isSolo: true,
          players: [userId],
          status: "active",
          questions: [],
          startedAt: new Date(),
        });

        socket.emit("soloQuestion", {
          index: currentIndex + 1,
          total: savedQuestions.length,
          question: {
            text: savedQuestions[currentIndex].questionText,
            choices: savedQuestions[currentIndex].choices,
          },
        });

        socket.on("soloAnswer", async (answer) => {
          if (currentIndex >= savedQuestions.length) return;

          const currentQ = savedQuestions[currentIndex];
          const correctAnswer = currentQ.correct;
          const isCorrect = answer.trim().toLowerCase() === correctAnswer.toLowerCase();

          if (isCorrect) {
            score++;
            correctAnswers++;
          }

          socket.emit("soloAnswerResult", {
            correct: isCorrect,
            correctAnswer,
          });

          currentIndex++;

          if (currentIndex < savedQuestions.length) {
            setTimeout(() => {
              socket.emit("soloQuestion", {
                index: currentIndex + 1,
                total: savedQuestions.length,
                question: {
                  text: savedQuestions[currentIndex].questionText,
                  choices: savedQuestions[currentIndex].choices,
                },
              });
            }, 1200);
          } else {
            await GameResult.create({
              roomId: newRoom._id,
              playerId: userId,
              score,
              correctAnswers,
              totalQuestions: savedQuestions.length,
            });

            const user = await User.findById(userId);
            if (user) {
              user.streak = (user.streak || 0) + 1;
              user.hearts += 1;
              await user.save();
            }

            await Room.findByIdAndUpdate(newRoom._id, {
              endedAt: new Date(),
              status: "completed",
            });

            socket.emit("soloGameOver", {
              score,
              total: savedQuestions.length,
            });
          }
        });
      } catch (err) {
        console.error("Solo game error:", err);
        socket.emit("soloError", { message: "Failed to start solo game" });
      }
    });

    // --- MULTIPLAYER: CREATE ROOM ---
    socket.on("createRoom", async ({ hostUser }) => {
      try {
        const pinCode = generatePinCode();

        const room = await Room.create({
          hostUser,
          isSolo: false,
          pinCode,
          players: [hostUser],
          status: "waiting",
        });

        roomPlayers[room._id] = { [hostUser]: socket };

        socket.join(room._id.toString());
        socket.emit("roomCreated", { roomId: room._id, pinCode });
      } catch (err) {
        console.error("Error creating room:", err);
        socket.emit("error", { message: "Failed to create room" });
      }
    });

    // --- MULTIPLAYER: JOIN ROOM ---
    socket.on("joinRoom", async ({ pinCode, userId }) => {
      try {
        const room = await Room.findOne({ pinCode, status: "waiting" });
        if (!room) {
          return socket.emit("joinError", { message: "Room not found or already started" });
        }

        room.players.push(userId);
        await room.save();

        if (!roomPlayers[room._id]) roomPlayers[room._id] = {};
        roomPlayers[room._id][userId] = socket;

        socket.join(room._id.toString());

        io.to(room._id.toString()).emit("playerJoined", {
          players: room.players,
          roomId: room._id,
        });
      } catch (err) {
        console.error("Join room error:", err);
        socket.emit("joinError", { message: "Failed to join room" });
      }
    });

    // --- MULTIPLAYER: START GAME ---
    socket.on("startMultiplayerGame", async ({ roomId }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room || room.status !== "waiting") {
          return socket.emit("startError", { message: "Room not found or invalid state" });
        }

        const questions = getQuestions(5);
        const questionList = questions.map(q => ({
          questionText: q.question,
          choices: q.choices,
          correct: q.correct,
        }));

        room.status = "active";
        room.startedAt = new Date();
        await room.save();

        const players = room.players;
        const playerScores = {};
        let currentIndex = 0;

        // Initialize scores
        players.forEach(uid => {
          playerScores[uid] = {
            score: 0,
            correctAnswers: 0,
          };
        });

        // Emit question to all players
        const emitQuestion = () => {
          if (currentIndex >= questionList.length) {
            return endGame();
          }

          const q = questionList[currentIndex];
          io.to(roomId.toString()).emit("multiplayerQuestion", {
            index: currentIndex + 1,
            total: questionList.length,
            question: {
              text: q.questionText,
              choices: q.choices,
            },
          });
        };

        // Handle answers
        const answeredPlayers = new Set();

        socket.on("submitMultiplayerAnswer", async ({ userId, answer }) => {
          if (answeredPlayers.has(userId)) return;

          const correctAnswer = questionList[currentIndex].correct;
          const isCorrect = answer.trim().toLowerCase() === correctAnswer.toLowerCase();

          if (isCorrect) {
            playerScores[userId].score++;
            playerScores[userId].correctAnswers++;
          }

          if (roomPlayers[roomId] && roomPlayers[roomId][userId]) {
            roomPlayers[roomId][userId].emit("answerResult", {
              correct: isCorrect,
              correctAnswer,
            });
          }

          answeredPlayers.add(userId);

          // Wait for all players or timeout
          if (answeredPlayers.size >= players.length) {
            currentIndex++;
            answeredPlayers.clear();
            setTimeout(emitQuestion, 1200);
          }
        });

        // End game
        const endGame = async () => {
          await Promise.all(players.map(async (uid) => {
            await GameResult.create({
              roomId,
              playerId: uid,
              score: playerScores[uid].score,
              correctAnswers: playerScores[uid].correctAnswers,
              totalQuestions: questionList.length,
            });

            const user = await User.findById(uid);
            if (user) {
              user.hearts += 1;
              user.streak = (user.streak || 0) + 1;
              await user.save();
            }

            if (roomPlayers[roomId] && roomPlayers[roomId][uid]) {
              roomPlayers[roomId][uid].emit("multiplayerGameOver", {
                score: playerScores[uid].score,
                total: questionList.length,
              });
            }
          }));

          await Room.findByIdAndUpdate(roomId, {
            endedAt: new Date(),
            status: "completed",
          });
        };

        // Start first question
        emitQuestion();
      } catch (err) {
        console.error("Start multiplayer error:", err);
        socket.emit("startError", { message: "Failed to start multiplayer game" });
      }
    });
  });
}

module.exports = socketHandler;
