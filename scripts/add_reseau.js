const fs = require('fs');
const db = JSON.parse(fs.readFileSync('./data/db.json','utf8'));
const maxId = Math.max(...db.exercices.map(e => e.id));
const maxFcId = Math.max(...db.flashcards.map(f => f.id));

const newExos = [
  {
    id: maxId+1, mat: 'SIN', freq: 'chaque-annee', difficulte: 'facile',
    titre: 'Role du protocole TCP vs UDP',
    enonce: 'Quelle est la principale difference entre TCP et UDP ?',
    options: ['TCP garantit la livraison des donnees, UDP non', 'UDP est plus lent que TCP', 'TCP ne peut pas transmettre de video', 'UDP utilise des adresses IP, TCP non'],
    correct: 0,
    explication: 'TCP etablit une connexion et garantit que tous les paquets arrivent dans le bon ordre. UDP est plus rapide mais sans garantie — utilise pour la video, les jeux en ligne.',
    aide: { formule: 'TCP = fiable + lent\nUDP = rapide + sans garantie', methode: '1. TCP : connexion SYN/ACK\n2. TCP : accuses de reception\n3. UDP : envoi direct sans controle', piege: 'UDP n\'est pas inferieur : il est choisi quand la vitesse prime (streaming, VoIP).' }
  },
  {
    id: maxId+2, mat: 'SIN', freq: 'chaque-annee', difficulte: 'facile',
    titre: 'Role du protocole DHCP',
    enonce: 'A quoi sert le protocole DHCP dans un reseau local ?',
    options: ['Traduire les noms de domaine en adresses IP', 'Attribuer automatiquement une adresse IP a un appareil', 'Chiffrer les communications sur le reseau', 'Router les paquets entre deux reseaux'],
    correct: 1,
    explication: 'DHCP (Dynamic Host Configuration Protocol) attribue automatiquement une adresse IP, un masque, une passerelle et un serveur DNS a chaque appareil qui se connecte.',
    aide: { formule: 'DHCP -> IP automatique\nDNS -> nom -> IP\nHTTP -> web', methode: '1. DHCP Discover\n2. Serveur repond avec IP dispo\n3. ACK', piege: 'DHCP != DNS. DHCP donne l\'IP, DNS traduit les noms.' }
  },
  {
    id: maxId+3, mat: 'SIN', freq: 'chaque-annee', difficulte: 'facile',
    titre: 'Role du protocole DNS',
    enonce: 'Que fait un serveur DNS quand tu tapes "www.google.com" dans un navigateur ?',
    options: ['Il chiffre la connexion HTTPS', 'Il traduit le nom de domaine en adresse IP', 'Il attribue une adresse IP a ton ordinateur', 'Il route les paquets vers Google'],
    correct: 1,
    explication: 'DNS (Domain Name System) traduit les noms de domaine (www.google.com) en adresses IP numeriques (142.250.74.196). C\'est l\'annuaire d\'Internet.',
    aide: { formule: 'DNS : nom de domaine -> adresse IP', methode: '1. Navigateur interroge le DNS\n2. DNS retourne l\'IP\n3. Connexion etablie avec cette IP', piege: 'Sans DNS tu devrais taper directement l\'IP. Le cache DNS accelere les requetes.' }
  },
  {
    id: maxId+4, mat: 'SIN', freq: 'chaque-annee', difficulte: 'moyen',
    titre: 'Modele TCP/IP — couches',
    enonce: 'Dans le modele TCP/IP, a quelle couche appartient le protocole HTTP ?',
    options: ['Couche reseau (Internet)', 'Couche transport', 'Couche application', 'Couche acces reseau'],
    correct: 2,
    explication: 'HTTP est a la couche Application. Les 4 couches TCP/IP : Application (HTTP, DNS, FTP), Transport (TCP, UDP), Internet (IP), Acces reseau (Ethernet, WiFi).',
    aide: { formule: '4. Application : HTTP, DNS, FTP, SMTP\n3. Transport : TCP, UDP\n2. Internet : IP, ICMP\n1. Acces reseau : Ethernet, WiFi', methode: 'Bas vers haut : Acces -> Internet -> Transport -> Application', piege: 'Ne pas confondre avec OSI a 7 couches. STI2D utilise TCP/IP a 4 couches.' }
  },
  {
    id: maxId+5, mat: 'SIN', freq: 'chaque-annee', difficulte: 'moyen',
    titre: 'Role de la passerelle (gateway)',
    enonce: 'A quoi sert la passerelle par defaut dans une configuration reseau ?',
    options: ['Attribuer des adresses IP aux machines', 'Permettre la communication entre reseaux differents', 'Chiffrer les donnees transmises', 'Convertir les adresses MAC en adresses IP'],
    correct: 1,
    explication: 'La passerelle (routeur) permet de sortir du reseau local vers d\'autres reseaux. Si la destination n\'est pas dans le reseau local, le paquet est envoye a la passerelle.',
    aide: { formule: 'Si IP_dest dans mon reseau -> direct\nSinon -> via passerelle', methode: '1. Comparer IP destination avec masque\n2. Meme reseau -> direct\n3. Sinon -> via passerelle', piege: 'La passerelle est toujours dans le meme reseau. Ex: machine 192.168.1.10/24 -> gateway 192.168.1.1.' }
  },
  {
    id: maxId+6, mat: 'SIN', freq: 'chaque-annee', difficulte: 'facile',
    titre: 'Codes de reponse HTTP',
    enonce: 'Qu\'indique le code HTTP 404 ?',
    options: ['La connexion est securisee', 'La requete a reussi', 'La ressource demandee n\'existe pas', 'Le serveur est indisponible'],
    correct: 2,
    explication: '404 Not Found = ressource introuvable. Codes cles : 200 OK, 301 redirection, 403 interdit, 404 non trouve, 500 erreur serveur.',
    aide: { formule: '2xx = succes\n3xx = redirection\n4xx = erreur client\n5xx = erreur serveur', methode: 'Retenir la famille (1er chiffre)', piege: '403 = tu n\'as pas le droit. 404 = ca n\'existe pas.' }
  },
  {
    id: maxId+7, mat: 'SIN', freq: 'regulier', difficulte: 'moyen',
    titre: 'Adresse MAC vs adresse IP',
    enonce: 'Quelle est la difference principale entre une adresse MAC et une adresse IP ?',
    options: ['La MAC est attribuee par DHCP, l\'IP est fixe', 'La MAC identifie le materiel, l\'IP identifie la position reseau', 'L\'IP est sur 48 bits, la MAC sur 32 bits', 'La MAC change a chaque connexion'],
    correct: 1,
    explication: 'MAC : 48 bits, gravee dans la carte reseau, unique au monde. IP : 32 bits (IPv4), attribuee par le reseau, peut changer (DHCP). ARP fait le lien MAC <-> IP.',
    aide: { formule: 'MAC : 48 bits, fixe, physique (AA:BB:CC:11:22:33)\nIP : 32 bits, logique, peut changer', methode: '1. MAC = identite physique\n2. IP = adresse logique\n3. ARP lie les deux', piege: 'La MAC ne change pas avec le reseau. L\'IP peut changer (DHCP).' }
  },
];

const newFlashcards = [
  {
    id: maxFcId+1, mat: 'SIN', freq: 'chaque-annee',
    q: 'Modele TCP/IP — les 4 couches et leurs protocoles',
    a: '4. Application : HTTP, HTTPS, DNS, FTP, SMTP, SSH\n3. Transport : TCP (fiable), UDP (rapide)\n2. Internet : IP, ICMP (ping)\n1. Acces reseau : Ethernet, WiFi\n\nMnemo : "ATIA" Application-Transport-Internet-Acces'
  },
  {
    id: maxFcId+2, mat: 'SIN', freq: 'chaque-annee',
    q: 'TCP vs UDP — differences cles',
    a: 'TCP :\n-> Connexion SYN/ACK etablie\n-> Accuses de reception\n-> Donnees ordonnees et completes\n-> Plus lent\n-> HTTP, FTP, SSH, email\n\nUDP :\n-> Sans connexion\n-> Pas d\'accuse\n-> Plus rapide\n-> Streaming, VoIP, jeux, DNS'
  },
  {
    id: maxFcId+3, mat: 'SIN', freq: 'chaque-annee',
    q: 'Protocoles reseau essentiels — role de chacun',
    a: 'DHCP -> attribue IP automatiquement\nDNS -> nom de domaine -> IP\nHTTP/HTTPS -> pages web (S = chiffre TLS)\nFTP -> transfert fichiers\nSSH -> acces distant securise\nSMTP -> envoi email\nICMP -> diagnostic (ping)\nARP -> IP -> MAC'
  },
  {
    id: maxFcId+4, mat: 'SIN', freq: 'chaque-annee',
    q: 'Codes HTTP les plus importants',
    a: '200 OK -> succes\n201 Created -> ressource creee\n301 Moved -> redirection permanente\n400 Bad Request -> requete incorrecte\n401 Unauthorized -> auth requise\n403 Forbidden -> acces interdit\n404 Not Found -> introuvable\n500 Server Error -> bug serveur'
  },
  {
    id: maxFcId+5, mat: 'SIN', freq: 'chaque-annee',
    q: 'Structure trame Ethernet et adresse MAC',
    a: 'Trame Ethernet :\n- Preambule (8o) : synchronisation\n- MAC dest (6o)\n- MAC source (6o)\n- Type (2o) : 0x0800=IPv4\n- Donnees (46-1500o)\n- FCS (4o) : CRC\n\nMAC : 48 bits, 6 octets en hexa\nEx: AA:BB:CC:DD:EE:FF\nUnique par carte reseau'
  },
];

db.exercices.push(...newExos);
db.flashcards.push(...newFlashcards);
fs.writeFileSync('./data/db.json', JSON.stringify(db, null, 2));
console.log('Ajoute', newExos.length, 'QCM et', newFlashcards.length, 'flashcards reseau SIN');
