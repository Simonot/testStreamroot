Normal execution stack :

I. Getting the user name :
	- when the user change the input field, nameClientAdd is called
	- nameClientAdd verify that the chosen name is not already existing
	- if the user name is valid, the rest of the app appears and the input field is disabled
	
II. Rest of the app :

	A) clientConnected div :
		- classic search and ban input field
		
		! Notice here that all is made to keep updated the nameList (for example if someone is banned, 
		 we have to send a message to all the client for telling them to update nameList)
		  
	B) messageContenair div :
		- We first chose a name to be able to send him a message
		- We call startSendingSession by clicking the startSendSession button
		=>  verify that the nameToSend is connected
			+ closing the previous RTCPeerConnection if a message has already been send previously
			+ starting a new RTCPeerConnection with DataChannel (pcSend)
			+ initializing sendChannel
			+ send message 'want to send message' to ask the other peer to prepare his RTCPeerConnection
		=>  The other peer receive 'want to send message' and call startReceivingSession
		=>  closing the previous RTCPeerConnection if a message has already been received
			+ starting a new RTCPeerConnection with DataChannel (pcReceive)
			+ preparing the handler of a dataChannel with receiveChannel
			+ send message 'ready to receive'
		=> The sender receive 'ready to receive' and create and offer
		=> The receiver receive the answer and create and answer
		=> The sender receive the answer
		- When the connection is ready, the state of SendChannel becomes 'ready' and handleSendChannelStateChange is called
		=> The sendButton becomes available and you can send the data which will appears in the receiveArea of the receiver
		
		! Notice that there is two RTCPeerConnection in order to be able to send and receive at the same time (pcSend and pcReceive)
		! Notice that the var name, nameSender and nameToSend are here to make possible signaling with the server in order to send to message to the name chosen

	C) conversationConterair div :
		- The choice to handle the P2P conversation is to have a circle model. each client of the conversation has a SendData connection with the next
		  name in the conversation and a ReceiveData connection with the name before, making a circle.
		  ex : (S is for sendChannel and R for ReceiveChannel)
			* 3 clients : Peer1 S<->R Peer2 S<->R Peer3 S<->R Peer1 
			* 2 clients : Peer1 S<->R Peer2 S<->R Peer1
          This choice make that each client has only tow RTCPeerConnection, one for sending and one for receiving
		  To add a peer, between 2 and 3 for example, we we put in the circle between peer 2 and 3
		  ex : 
			after the insertion :  Peer1 S<->R Peer2(old Peer2) S<->R Peer3(new Peer) S<->R Peer4(old Peer3) S<->R Peer1
		  With this choice, to send a message to the other of the conversation we just have to send a counter initiate with the number of the names in the Conversation
		  and then decrease this counter each time you send to message
		  
		- Add name :
		=> verify that the name is correct (connected and not the name of the user)
		=> send message to verify that the name added is not in conversation
		=> if not in conversation (cf message.message == 'in conversation') tow choice :
			* if is the first name added to the conversation just call startSendingConversationSession (cf if (numberConversation == 1))
			* if is not the first name added, first transmit to the other names in the conversation that there is a new member, then call startSession
		=> startSendingSession
		=> sending 'want to add conversation'
		=> we have different choices here :
			* we are the first name added, so we only want to start a SendingSession with the name which added us (cf message.nameToConnect == null && numberConversation == 1)
			* we are the name added (and not the first one), we want to start a receivingSession with the name which added us and start a SendingSession to the name which was next in the circle (cf message.nameToConnect != null
		=> in all case we start a receivingSession (and for some case another SendingSession)
		=> similar to sendingSession with a sending of the message 'ready for conversation'
		=> starting the offer answer exchange and start the send and receive channels
		=> the sendConversationButton is available and we notify the user that he is now in a conversation
		- Update the namesInConversation :
			during all the exchange of messages we manage to keep this list update
			=> when we had a new member we notify this name to the other members of the conversation (dataConversation.newNameAdded == 'true')
			+  the new name added ask for the list of the name currently in the conversation
		- Send message is easy with our organisation, we simply use a counter initiate with the number of the names in the conversation
		
			
	D) Sending Image to the other peer :
		- We can here use to two RTCPeerConnection pcSend and pcReceive to send an image instead of a message
		- We first verify that the file selected is an image file with verifyImageFile
		- sending and receiving the file is classic. We divide the image in CHUNKS of 64Kb we send it one by one and we reassemble all the CHUNKS in the receiver's side
		
For any question do not hesitate to contact me in GitHub, I will be happy to answer you ! 