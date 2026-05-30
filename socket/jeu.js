// module.exports = (io) => {

//   let joueurConnectes = {};
//   let partieEnCours = false;

//   io.on('connection', (socket) => {
//     console.log(`🟢 Joueur connecté : ${socket.id}`);

//     // ===== UN JOUEUR REJOINT LA SALLE =====
//     socket.on('rejoindre', (data) => {
//       const { joueurId, nom } = data;
//       joueurConnectes[socket.id] = { joueurId, nom, score: 0, socketId: socket.id };
//       socket.join('salle-jeu');
//       io.to('salle-jeu').emit('mise-a-jour-salle', {
//         joueurs: Object.values(joueurConnectes),
//         nombre: Object.keys(joueurConnectes).length
//       });
//       console.log(`👤 ${nom} a rejoint la salle`);
//       if (Object.keys(joueurConnectes).length >=5 && !partieEnCours) {
//         demarrerPartie();
//       }
//     });

//     // ===== UN JOUEUR ENVOIE SON SCORE =====
//     socket.on('envoyer-score', (data) => {
//     if (joueurConnectes[socket.id]) {
//         joueurConnectes[socket.id].score = data.score;
//         io.to('salle-jeu').emit('classement', getClassement());
//       }
//     });

//     // ===== CHAT SALLE D'ATTENTE =====
//     socket.on('message-chat', (data) => {
//       const joueur = joueurConnectes[socket.id];
//       if (!joueur) return;
//       io.to('salle-jeu').emit('nouveau-message', {
//         nom: joueur.nom,
//         message: data.message,
//         heure: new Date().toLocaleTimeString('fr-FR', {
//           hour: '2-digit',
//           minute: '2-digit'
//         })
//       });
//     });

//     // ===== UN JOUEUR SE DÉCONNECTE =====
//     socket.on('disconnect', () => {
//       const joueur = joueurConnectes[socket.id];
//       if (joueur) {
//         console.log(`🔴 ${joueur.nom} s'est déconnecté`);
//         delete joueurConnectes[socket.id];
//         io.to('salle-jeu').emit('mise-a-jour-salle', {
//           joueurs: Object.values(joueurConnectes),
//           nombre: Object.keys(joueurConnectes).length
//         });
//       }
//     });

//   });

//   function demarrerPartie() {
//   partieEnCours = true;
//   console.log('🎮 Partie démarrée !');

//   let compte = 3;
//   const timer = setInterval(() => {
//     io.to('salle-jeu').emit('compte-rebours', { compte });
//     compte--;
//     if (compte < 0) {
//       clearInterval(timer);
//       io.to('salle-jeu').emit('partie-demarree', {
//         message: 'La partie commence !'
//       });

//       // 100 questions x 10 secondes = 1000 secondes + 30s de marge
//       const dureepartie = (100 * 15 + 30) * 1000;
//       setTimeout(() => {
//         // Annoncer le gagnant
//         const classement = getClassement();
//         if (classement.length > 0) {
//           io.to('salle-jeu').emit('partie-terminee', {
//             gagnant: classement[0],
//             classement: classement
//           });
//         }
//         // Réinitialiser après 10 secondes
//         setTimeout(reinitialiserSalle, 10000);
//       }, dureepartie);
//     }
//   }, 1000);
// }

//   // ===== CALCULER LE CLASSEMENT =====
//   function getClassement() {
//     return Object.values(joueurConnectes)
//       .sort((a, b) => b.score - a.score)
//       .map((j, index) => ({ rang: index + 1, nom: j.nom, score: j.score }));
//   }

//   // ===== RÉINITIALISER LA SALLE =====
//   function reinitialiserSalle() {
//   joueurConnectes = {};
//   partieEnCours = false;
//   console.log('🔄 Salle réinitialisée — prête pour une nouvelle partie');
//   io.to('salle-jeu').emit('salle-reinitialise', {
//     message: 'Nouvelle partie dans 10 secondes !'
//   });
// }

// };


module.exports = (io) => {

  const JOUEURS_MIN = 6;

  let joueurConnectes = {};
  let partieEnCours = false;
  let countdownEnCours = false;
  let hote = null;

  io.on('connection', (socket) => {
    console.log(`🟢 Joueur connecté : ${socket.id}`);

    // ===== UN JOUEUR REJOINT LA SALLE =====
    socket.on('rejoindre', (data) => {
      const { joueurId, nom } = data;

      if (Object.keys(joueurConnectes).length === 0) {
        hote = socket.id;
        console.log(`👑 ${nom} est l'hôte`);
      }

      joueurConnectes[socket.id] = {
        joueurId, nom, score: 0,
        socketId: socket.id,
        estHote: socket.id === hote
      };

      socket.join('salle-jeu');
      const nombre = Object.keys(joueurConnectes).length;

      io.to('salle-jeu').emit('mise-a-jour-salle', {
        joueurs: Object.values(joueurConnectes),
        nombre,
        requis: JOUEURS_MIN,
        enAttente: nombre < JOUEURS_MIN,
        hote
      });

      console.log(`👤 ${nom} a rejoint la salle (${nombre}/${JOUEURS_MIN})`);

      // Lancement automatique après 5s quand JOUEURS_MIN atteint
      if (nombre >= JOUEURS_MIN && !partieEnCours && !countdownEnCours) {
        countdownEnCours = true;
        let compte = 5;

        io.to('salle-jeu').emit('lancement-imminent', { compte });

        const timer = setInterval(() => {
          compte--;
          if (compte > 0) {
            io.to('salle-jeu').emit('lancement-imminent', { compte });
          } else {
            clearInterval(timer);
            countdownEnCours = false;
            demarrerPartie();
          }
        }, 1000);
      }
    });

    // ===== L'HÔTE LANCE MANUELLEMENT =====
    socket.on('lancer-partie', () => {
      if (socket.id !== hote) {
        socket.emit('erreur', { message: "Seul l'hôte peut lancer la partie." });
        return;
      }
      const nombre = Object.keys(joueurConnectes).length;
      if (nombre < JOUEURS_MIN) {
        socket.emit('erreur', { message: `Il faut au moins ${JOUEURS_MIN} joueurs.` });
        return;
      }
      if (partieEnCours || countdownEnCours) {
        socket.emit('erreur', { message: 'La partie démarre déjà.' });
        return;
      }
      demarrerPartie();
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

        if (socket.id === hote) {
          const restants = Object.keys(joueurConnectes);
          hote = restants.length > 0 ? restants[0] : null;
          if (hote) {
            joueurConnectes[hote].estHote = true;
            console.log(`👑 Nouvel hôte : ${joueurConnectes[hote].nom}`);
          }
        }

        const nombre = Object.keys(joueurConnectes).length;
        io.to('salle-jeu').emit('mise-a-jour-salle', {
          joueurs: Object.values(joueurConnectes),
          nombre,
          requis: JOUEURS_MIN,
          enAttente: nombre < JOUEURS_MIN,
          hote
        });
      }
    });

  });

  // ===== DÉMARRER LA PARTIE =====
  function demarrerPartie() {
    partieEnCours = true;
    console.log('🎮 Partie démarrée !');

    let compte = 3;
    const timer = setInterval(() => {
      io.to('salle-jeu').emit('compte-rebours', { compte });
      compte--;
      if (compte < 0) {
        clearInterval(timer);
        io.to('salle-jeu').emit('partie-demarree', {
          message: 'La partie commence !'
        });

        const dureepartie = (100 * 15 + 30) * 1000;
        setTimeout(() => {
          const classement = getClassement();
          if (classement.length > 0) {
            io.to('salle-jeu').emit('partie-terminee', {
              gagnant: classement[0],
              classement
            });
          }
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
    countdownEnCours = false;
    hote = null;
    console.log('🔄 Salle réinitialisée — prête pour une nouvelle partie');
    io.to('salle-jeu').emit('salle-reinitialise', {
      message: 'Nouvelle partie dans 10 secondes !'
    });
  }

};