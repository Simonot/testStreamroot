Test Dev 5-1
Stage Streamroot
Simon Duvergier
lien heroku : https://pure-lowlands-2079.herokuapp.com/
lien GitHub : https://github.com/Simonot/testStreamroot

////////////////////////////////////////////////////////////////////////////////////////////////
Nous allons décrire dans ce fichier les difficultés rencontrées lors de ce test ainsi que
les possibilités d'amélioration de l'application :

- L'option conversation :
	C'est là qu'a résidé le plus de difficultés pour moi. Il m'a fallu penser à un système
	de réseau P2P et l'implémenter. J'aurais pu penser à une architecture ou on rajoute une
	RTCPeerConnection à double sens pour chaque membre de la conversation. Ainsi chacun est
	en lien direct avec tout le monde. Le problème est alors que chaque Peer en conversation
	à un tableau de RTCPeerConnection pouvant monter jusqu'à 5 (ce qui fait 10 connections
	en comptant la connexion pour envoyer et la connexion pour recevoir). J'ai donc choisi
	une architecture circulaire où les membres de la conversation s'insèrent dans le cercle
	(cf README pour des exemples). Cette architecture permet donc d'économiser en mémoire 
	(seulement 2 RTCPeerConnection pour la conversation par Peer) mais il m'a fallu bien
	réfléchir et tester beaucoup de choses afin d'arriver à insérer un nouveau membre. Il
	fallait en effet avoir un cas pour la première insertion et un pour les suivantes. Ne
	voulant pas alourdir les échanges de messages de signalisation inutilement il m'a fallu
	faire plusieurs tests et bien réfléchir aux différents tests à réaliser pour que les 
	messages de signalisation trouve leur chemin dans tous les cas.
	L'architecture ayant été mise en place, il m'a ensuite été plus simple de trouver un
	moyen pour permettre aux utilisateurs de quitter la conversation.
	
- Le transfert d'image :
	N'ayant pas plus de formation que ça sur le transfert de fichier dans le réseau j'ai 
	du me pencher sur les différents formats utilisés pour transmettre les images (par
	exemple le Uint8ClampedArray utilisé pour transmettre le pixel ligne par ligne). Ceci
	combiné au fait que l'API DataChannel est en constante évolution fait que j'ai mis du
	temps à trouver un moyen pour transmettre et récupérer les données au format adéquat 
	pour pouvoir les traiter.
	
- Le transfert de vidéo :
	Je n'ai pas eu le temps de me pencher sur le problème de transfert de video. Il n'est
	pas si loin du problème de transfert d'image et j'aurai donc pu surement l'implemeneter
	avec plus de temps.
	
- La compatibilité Firefox/Chrome :
	J'ai commencer par tout développer sur firefox en utilisant un adapter.js pour traiter
	les différences entre Chorme et Firefox mais à la fin il me reste un problème non résolu
	et je n'ai pas su trouver d'où vient le problème. D'autant plus qu'il n'est présent que 
	pour la mise en place de la conversation.
	Je peux : 
		* ajouter des membres à une conversation Firefox <-> Firefox ou Chrome <-> Chrome
		* transfert des données Firefox -> Firefox, Firefox -> Chrome, Chrome -> Chrome,
		  Chrome -> Firefox et même avoir du transfert de donnée Firefox <-> Chrome en
		  même temps (le client Firefox se connecte au client Chrome et le Chrome au Firefox)
	Je ne peux pas :
		* ajouter des membres à une conversation FireFox <-> Chrome. La pile d'execution de
		  transfert de message se déroule normalement sauf au moment où Chrome doit répondre
		  à une offer venant de Firefox. Lors de l'appel de createAnswer on a une erreur
		  disant : CreateAnswer can't be called before SetRemoteDescription.
		  Je ne comprends pas pourquoi ce problème n'a pas lieu quand je fais une offer via
		  le button "Start", ie quand je veux transferer des données avec une connexion
		  Firefox -> Chrome ...
		  
- la mise en place sur la PaaS heroku :
	problème de binding du port qui était choisi statiquement avant. Problème dans une boucle
	for( var in Array) transformé en for(var i=0; i<Array.length; i++)
	=> nombreux commits inutiles sur la fin

		  
- Pistes d'amélioration de l'application :
	* permettre d'envoyer des petites images/videos dans la conversation
	* permettre l'option vidéo-conférence dans la conversation avec  webRTC et le getUserMedia
	* permettre plusieurs conversations en même temps avec des tableaux de RTCPeerConnection
	  pour permettre de gérer les différentes conversation.
	  => gestion de la mémoire libérée quand on ferme une conversation
	* penser à une structure de modérateur ayant seulement eux le droit de bannir
	  => système d'authentification
	  => sécurité
	  
////////////////////////////////////////////////////////////////////////////////////////////////