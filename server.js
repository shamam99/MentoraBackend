const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const morgan = require('morgan');
const http = require("http");
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const socketHandler = require('./sockets/socketHandler');

dotenv.config();
connectDB();

const app = express();
const server = http.createServer(app); // Create HTTP server for socket support

// Core Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware (skip in tests)
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Routes
app.use('/auth', require('./routes/authRoutes'));
app.use('/user', require('./routes/userRoutes'));
app.use('/rooms', require('./routes/roomRoutes'));
app.use("/games", require("./routes/gameRoutes"));
app.use("/solo", require("./routes/soloRoutes"));
app.use('/multiplayer', require('./routes/multiplayerRoutes'));
app.use("/history", require("./routes/historyRoutes"));
app.use("/questions", require("./routes/questionRoutes"));


// Global error handler (must be last)
app.use(errorHandler);

// Socket.IO setup
socketHandler(server);

// Start server
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
