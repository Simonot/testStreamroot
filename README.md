Normal execution stack :

I. Getting the user name :
	- when the user change the input field, nameClientAdd is called
	- nameClientAdd verify that the chosen name is not already existing
	- if the user name is valid, the rest of the app appears and the input field is disabled
	
II. Rest of the app :

	A) clientConnected div :
		- classic search and ban input field
		- We can notice here that all is made to keep updated the nameList (for example if someone is banned, 
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
		TODO

	D) Sending Image/Video to the other peer :
		TODO