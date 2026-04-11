const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
if (process.env.NODE_ENV !== 'production') {
  require('dotenv').config();
}

const app = express();
const serveurHttp = http.createServer(app);
const io = new Server(serveurHttp, {
  cors: {
    origin: ['http://127.0.0.1:5500', 'https://codedbyduel.netlify.app'],
    methods: ['GET', 'POST']
  }
});

// ===== MIDDLEWARES =====
app.use(cors({
  origin: ['http://127.0.0.1:5500', 'https://codedbyduel.netlify.app'],
  methods: ['GET', 'POST', 'PUT', 'DELETE']
}));
app.use(express.json());

// ===== ROUTES =====
app.use('/api/joueurs', require('./routes/joueurs'));
app.use('/api/parties', require('./routes/parties'));
app.use('/api/paiement', require('./routes/paiement'));

// ===== SOCKET.IO =====
require('./socket/jeu')(io);

// ===== CONNEXION MONGODB =====
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('✅ MongoDB connecté');
    serveurHttp.listen(process.env.PORT || 3000, () => {
      console.log(`🚀 Serveur lancé sur le port ${process.env.PORT || 3000}`);
    });
  })
  .catch(err => console.error('❌ Erreur MongoDB :', err));