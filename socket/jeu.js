module.exports = (io) => {

  let joueurConnectes = {};
  let partieEnCours = false;

  io.on('connection', (socket) => {
    console.log(`🟢 Joueur connecté : ${socket.id}`);

    // ===== UN JOUEUR REJOINT LA SALLE =====
    socket.on('rejoindre', (data) => {
      const { joueurId, nom } = data;
      joueurConnectes[socket.id] = { joueurId, nom, score: 0, socketId: socket.id };
      socket.join('salle-jeu');
      io.to('salle-jeu').emit('mise-a-jour-salle', {
        joueurs: Object.values(joueurConnectes),
        nombre: Object.keys(joueurConnectes).length
      });
      console.log(`👤 ${nom} a rejoint la salle`);
      if (Object.keys(joueurConnectes).length >=1 && !partieEnCours) {
        demarrerPartie();
      }
    });

    // ===== UN JOUEUR ENVOIE SON SCORE =====
    socket.on('envoyer-score', (data) => {
    if (joueurConnectes[socket.id]) {
        joueurConnectes[socket.id].score = data.score;
        io.to('salle-jeu').emit('classement', getClassement());
      }
    });

    // ===== CHAT SALLE D'ATTENTE =====
    socket.on('message-chat', (data) => {
      const joueur = joueurConnectes[socket.id];
      if (!joueur) return;
      io.to('salle-jeu').emit('nouveau-message', {
        nom: joueur.nom,
        message: data.message,
        heure: new Date().toLocaleTimeString('fr-FR', {
          hour: '2-digit',
          minute: '2-digit'
        })
      });
    });

    // ===== UN JOUEUR SE DÉCONNECTE =====
    socket.on('disconnect', () => {
      const joueur = joueurConnectes[socket.id];
      if (joueur) {
        console.log(`🔴 ${joueur.nom} s'est déconnecté`);
        delete joueurConnectes[socket.id];
        io.to('salle-jeu').emit('mise-a-jour-salle', {
          joueurs: Object.values(joueurConnectes),
          nombre: Object.keys(joueurConnectes).length
        });
      }
    });

  });

  function demarrerPartie() {
  partieEnCours = true;
  console.log('🎮 Partie démarrée !');

  let compte = 5;
  const timer = setInterval(() => {
    io.to('salle-jeu').emit('compte-rebours', { compte });
    compte--;
    if (compte < 0) {
      clearInterval(timer);
      io.to('salle-jeu').emit('partie-demarree', {
        message: 'La partie commence !'
      });

      // 100 questions x 10 secondes = 1000 secondes + 30s de marge
      const dureepartie = (100 * 10 + 30) * 1000;
      setTimeout(() => {
        // Annoncer le gagnant
        const classement = getClassement();
        if (classement.length > 0) {
          io.to('salle-jeu').emit('partie-terminee', {
            gagnant: classement[0],
            classement: classement
          });
        }
        // Réinitialiser après 10 secondes
        setTimeout(reinitialiserSalle, 10000);
      }, dureepartie);
    }
  }, 1000);
}

  // ===== CALCULER LE CLASSEMENT =====
  function getClassement() {
    return Object.values(joueurConnectes)
      .sort((a, b) => b.score - a.score)
      .map((j, index) => ({ rang: index + 1, nom: j.nom, score: j.score }));
  }

  // ===== RÉINITIALISER LA SALLE =====
  function reinitialiserSalle() {
  joueurConnectes = {};
  partieEnCours = false;
  console.log('🔄 Salle réinitialisée — prête pour une nouvelle partie');
  io.to('salle-jeu').emit('salle-reinitialise', {
    message: 'Nouvelle partie dans 10 secondes !'
  });
}

};
