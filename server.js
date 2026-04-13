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

const originesAutorisees = [
  'http://127.0.0.1:5500',
  'https://codedbyduel.netlify.app'
];

const io = new Server(serveurHttp, {
  cors: {
    origin: originesAutorisees,
    methods: ['GET', 'POST'],
    credentials: true
  },
  transports: ['websocket', 'polling']
});

// ===== MIDDLEWARES =====
app.use(cors({
  origin: originesAutorisees,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// ===== HEALTH CHECK =====
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// ===== KEEP ALIVE =====
const https = require('https');
setInterval(() => {
  https.get('https://codeduel-backend.onrender.com/health', (res) => {
    console.log('💓 Keep-alive:', res.statusCode);
  }).on('error', (err) => {
    console.log('Keep-alive error:', err.message);
  });
}, 10 * 60 * 1000);

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