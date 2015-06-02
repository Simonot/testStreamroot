/* Before starting reading the code make sure you have red README.md
to understand the normal execution stack (https://github.com/Simonot/testStreamroot/)
*/

var pcSend = null;
var pcReceive = null;
var sendChannel = null
var receiveChannel = null;
var name = null;
var nameSender;
var nameToSend;
var nameList = [];
var banned;
// var for the conversation use, see README(II.C)
var pcConversationSend = null;
var pcConversationReceive = null;
var numberConversation = 1;
var sendChannel_Conversation;
var receiveChannel_Conversation;
var nameNextConversation = null;
var nameBeforeConversation = null;
var dataConversation;
var isConversationSender = false;
var namesInConversation = [];

var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

var socket = io.connect();
//////////////////////////////////////
// only an utility function
Array.prototype.inArray = function (value) {
 // Returns true if the passed value is found in the
 // array. Returns false if it is not.
 	var i;
 	for (i=0; i < this.length; i++) {
 		if (this[i] == value)
 			return true;
 	}
 	return false;
};

// two utility function for developpement 
socket.on('log', function (array){
  console.log.apply(console, array);
});

function trace(text) {
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

//////////////////////////////////////
trace('new client connected');

/*First part : getting the user name. 
If valide delete hidden attribute of contenairsDiv */
var nameClient = document.getElementById("nameClient");
nameClient.disabled = false;
nameClient.value= "";
nameClient.onchange = nameClientAdd;

//getting the name list of the client already connected to be sure your name is valide
socket.emit('want name list');
socket.on('name list', function(nameListReceived) {
	nameList = nameListReceived;
	trace("nameList :");
	nameList.forEach(function(name, index) {
  		trace(name);
	});
});

function nameClientAdd() {
	name = nameClient.value;
	if (nameList.inArray(name)) {
		nameClient.value = "";
		document.getElementById("nameClientError").hidden = false;
	} else {
		document.getElementById("nameClientError").hidden = true;
		document.getElementById("contenairsDiv").hidden = false;
		startSendSession.disabled = false;
		nameClient.disabled = true;
		nameToSendInput.disabled = false;
		nameList.push(name);
		socket.emit('new client connected', name);
    namesInConversation.push(name);
	}
}

socket.on('new client connected', function(name) {
	trace('new client connected, named ' + name);
	nameList.push(name);
	nameList.forEach(function(name, index) {
  		trace(name);
	});
});

//////////////////////////////////////
// clientConnected div, implementation of search and ban
var nameSerachedInput = document.getElementById("nameSearched");
var nameBannedInput = document.getElementById("nameBanned");
nameSerachedInput.value = "";
nameBannedInput.value = "";
nameSerachedInput.onchange = searchName;
nameBannedInput.onchange = banName;

function searchName() {
	var nameSearched = nameSerachedInput.value;
	var test = nameList.inArray(nameSearched);
	if (nameSearched == "") {
		document.getElementById("nameSearchedYes").hidden = true;
		document.getElementById("nameSearchedNo").hidden = true;
		document.getElementById("nameSearchedError").hidden = false;
	} else if(test) {
		document.getElementById("nameSearchedNo").hidden = true;
		document.getElementById("nameSearchedError").hidden = true;
		document.getElementById("nameSearchedYes").hidden = false;
	} else {
		document.getElementById("nameSearchedYes").hidden = true;
		document.getElementById("nameSearchedError").hidden = true;
		document.getElementById("nameSearchedNo").hidden = false;
	}
}

function banName() {
	var nameBanned = nameBannedInput.value;
	var test = nameList.inArray(nameBanned);
	if (nameBanned == "") {
		document.getElementById("nameBannedYes").hidden = true;
		document.getElementById("nameBannedNo").hidden = true;
		document.getElementById("nameBannedError").hidden = false;
	} else if(test) {
		document.getElementById("nameBannedError").hidden = true;
		document.getElementById("nameBannedNo").hidden = true;
		document.getElementById("nameBannedYes").hidden = false;
		trace(nameBanned);
		socket.emit('banned client', nameBanned);
		nameList.splice(nameList.indexOf(nameBanned), 1);
		//following part just in case the name had been searched just before banned
		nameSerachedInput.value = "";
		document.getElementById("nameSearchedYes").hidden = true;
		document.getElementById("nameSearchedError").hidden = true;
		document.getElementById("nameSearchedNo").hidden = true;
	} else {
		document.getElementById("nameBannedYes").hidden = true;
		document.getElementById("nameBannedError").hidden = true;
		document.getElementById("nameBannedNo").hidden = false;
	}
}

function banProcedure() {
  nameList = [];
  if (pcReceive != null) {
    receiveChannel.close()
    receiveChannel = null;
    pcReceive.close();
    pcReceive = null;
  }
  if (pcSend != null) {
    sendChannel.close();
    pcSend.close();
    pcSend = null;
  }
  document.getElementById("contenairsDiv").hidden = true;
  document.getElementById("bannedDiv").hidden = false;
  socket.emit('I am banned', name);
  socket.disconnect();
}

socket.on('you have been banned', function() {
  if (numberConversation > 1) {
    trace('start ban');
    banned = true;
    leaveConversation();
  }
  else
    banProcedure();
});

//////////////////////////////////////
// conversationContenair div implementation, again read README to understand to P2P network chosen
var nameAddedInput = document.getElementById("nameAdded");
var sendConversationMessageInput = document.getElementById("sendConversationMessage");
var addNameButton = document.getElementById("addNameButton");
var sendConversationButton = document.getElementById("sendConversationButton");
var namesInButton = document.getElementById("namesInButton");
var leaveConversationButton = document.getElementById("leaveConversationButton");
document.getElementById("inConversation").hidden = true;
nameAddedInput.value = "";
sendConversationMessageInput.value = "";
sendConversationMessageInput.value = "Press Add first";
sendConversationMessageInput.disabled = true;
namesInButton.disabled = true;
leaveConversationButton.disabled = true;
addNameButton.disabled = false;
addNameButton.onclick = verifyNameAdded;
sendConversationButton.onclick = makeItSenderAndSend;
namesInButton.onclick = displayNamesConversation;
leaveConversationButton.onclick = leaveConversation;

document.getElementById("inConversation").hidden = true;
sendConversationMessageInput.value = "Press Add first";
sendConversationMessageInput.disabled = true;
namesInButton.disabled = true;
leaveConversationButton.disabled = true;
// initiate the 10 div contening the messages of the conversation
var conversationMessageDiv, pseudoSpanConversation, messageSpanConversation;
for(var i = 0; i < 10; i++) {
  conversationMessageDiv = document.createElement('div');
  pseudoSpanConversation = document.createElement('span');
  messageSpanConversation = document.createElement('span');
  pseudoSpanConversation.className = 'pseudoSpanConversation';
  messageSpanConversation.className = 'messageSpanConversation';
  conversationMessageDiv.appendChild(pseudoSpanConversation);
  conversationMessageDiv.appendChild(messageSpanConversation);

  document.getElementById("conversationMessages").appendChild(conversationMessageDiv);
}

function verifyNameAdded() {
  if (numberConversation == 5) {
    document.getElementById("addNameError").hidden = true;
    document.getElementById("addNameError2").hidden = true;
    document.getElementById("addNameError3").hidden = true;
    document.getElementById("addNameError4").hidden = true;
    document.getElementById("addNameError5").hidden = false;
  } else {
    nameAdded = nameAddedInput.value;
    var test = nameList.inArray(nameAdded);
    if (nameAdded == "") {
      document.getElementById("addNameError2").hidden = true;
      document.getElementById("addNameError3").hidden = true;
      document.getElementById("addNameError4").hidden = true;
      document.getElementById("addNameError5").hidden = true;
      document.getElementById("addNameError").hidden = false;
      nameAddedInput.value = "";
    } else if ((namesInConversation.inArray(nameAdded))) {
      document.getElementById("addNameError").hidden = true;
      document.getElementById("addNameError3").hidden = true;
      document.getElementById("addNameError4").hidden = true;
      document.getElementById("addNameError5").hidden = true;
      document.getElementById("addNameError2").hidden = false;
      nameAddedInput.value = "";
    } else if(!test) {
      document.getElementById("addNameError").hidden = true;
      document.getElementById("addNameError2").hidden = true;
      document.getElementById("addNameError4").hidden = true;
      document.getElementById("addNameError5").hidden = true;
      document.getElementById("addNameError3").hidden = false;
    } else {
      namesInConversation.push(nameAdded);
      sendMessage({
        nameTo: nameAdded,
        nameFrom: name,
        message: 'are you in conversation'});
    }
  }
}

function makeItSenderAndSend() {
  isConversationSender = true;
  sendConversationData();
}

function displayConversationMessage(pseudo, message) {
  // display the 10 last message of the conversation
  var currentDiv = document.getElementById("conversationMessages").lastChild;
  for(var i = 0; i < 9; i++) {
    currentDiv = currentDiv.previousSibling;
    currentDiv.nextSibling.firstChild.innerHTML = currentDiv.firstChild.innerHTML;
    currentDiv.nextSibling.lastChild.innerHTML =  currentDiv.lastChild.innerHTML;
    }

  currentDiv.firstChild.innerHTML = pseudo;
  currentDiv.lastChild.innerHTML = message;
}

function displayNamesConversation() {
  trace(namesInConversation.length);
  var conversationNames = document.getElementById("conversationNames");
  conversationNames.removeChild(document.getElementById("conversationNamesDiv"));
  
  var conversationNamesDiv = document.createElement('div');
  conversationNamesDiv.id = "conversationNamesDiv";
  conversationNames.appendChild(conversationNamesDiv)
  for(var i=0;  i < namesInConversation.length; i++) {
    NameDiv = document.createElement('div');
    NameDiv.innerHTML = '  - ' + namesInConversation[i];
    document.getElementById("conversationNamesDiv").appendChild(NameDiv);
  }
}

function leaveConversation() {
  trace('leave conversation with number conversation' + numberConversation);
  if (numberConversation == 2) {
    sendMessage({
    nameTo: nameNextConversation,
    nameFrom: null,
    message: 'leaving the conversation'});
    leavingProcedure();
  } else
    sendMessage({
      nameTo: nameNextConversation,
      nameFrom: name,
      message: 'leaving the conversation'});
}

function leavingProcedure() {
  sendChannel_Conversation.close();
  sendChannel_Conversation = null;
  pcConversationSend.close();
  pcConversationSend = null;
  receiveChannel_Conversation.close();
  receiveChannel_Conversation = null;
  pcConversationReceive.close();
  pcConversationReceive = null;
  numberConversation = 1;
  nameNextConversation = null;
  nameBeforeConversation = null;
  namesInConversation = [name];

  document.getElementById("inConversation").hidden = true;
  document.getElementById("conversationNamesDiv").hidden = true;
  sendConversationMessageInput.value = "Press Add first";
  sendConversationMessageInput.disabled = true;
  namesInButton.disabled = true;
  leaveConversationButton.disabled = true;

  document.getElementById("addNameError").hidden = true;
  document.getElementById("addNameError2").hidden = true;
  document.getElementById("addNameError3").hidden = true;
  document.getElementById("addNameError4").hidden = true;
  document.getElementById("addNameError5").hidden = true;

  if (banned)
    banProcedure();
}

function startSendingConversationSession() {
  //verify to we havent yet a pcConversationSend (ie we are already in the conversation) and make it to
  // null if is the case (in order to add the new name which be connected to the new pcConversationSend)
	if (pcConversationSend != null) {
    sendChannel_Conversation.close();
    sendChannel_Conversation = null;
    pcConversationSend.close();
    pcConversationSend = null;
  }
	try {
  	pcConversationSend = new RTCPeerConnection(null, {optional: [{RtpDataChannels: true}]});
  	pcConversationSend.onicecandidate = handleIceCandidate_ConversationSend;
  	trace('Created RTCPeerConnection');
  	try {
  		// Reliable Data Channels not yet supported in Chrome
  		sendChannel_Conversation = pcConversationSend.createDataChannel("sendDataChannel", {reliable: false});
  		trace('Created send data channel');
   		} catch (e) {
   		alert('Failed to create data channel. ' +
     			  'You need Chrome M25 or later with RtpDataChannel enabled');
   		trace('createDataChannel() failed with exception: ' + e.message);
   		return;
    	}
  	 	sendChannel_Conversation.onopen = handleSendChannelStateChange_Conversation;
  	  sendChannel_Conversation.onclose = handleSendChannelStateChange_Conversation;
  	} catch (e) {
      trace('Failed to create PeerConnection, exception: ' + e.message);
    	alert('Cannot create RTCPeerConnection object.');
    	return;
  	}
    sendMessage({
      nameFrom: name,
      nameTo: nameAdded,
      numberNames: numberConversation,
      nameToConnect: nameNextConversation,
      message: 'want to add to conversation'});
    numberConversation = numberConversation + 1;
}

function startReceivingConversationSession() {
  if (pcConversationReceive != null) {
    receiveChannel_Conversation.close();
    receiveChannel_Conversation = null;
    pcConversationReceive.close();
    pcConversationReceive = null;
  }
	try {
    	pcConversationReceive = new RTCPeerConnection(null, {optional: [{RtpDataChannels: true}]});
    	pcConversationReceive.onicecandidate = handleIceCandidate_ConversationReceive;
  		pcConversationReceive.ondatachannel = gotReceiveChannel_Conversation;
  		trace('Created RTCPeerConnection');
  	} catch (e) {
  		trace('Failed to create PeerConnection, exception: ' + e.message);
    	alert('Cannot create RTCPeerConnection object.');
    	return;
  	}
  	sendMessage({
  		nameFrom: name,
  		nameTo: nameBeforeConversation,
  		message: 'ready for conversation'});
}

function sendConversationData() {
  if (isConversationSender) {
    dataConversation = {
      newNameAdded: 'false',
      newNameLeaving: 'false',
      nameSender: name,
      counter: numberConversation,
      message: sendConversationMessageInput.value};
    isConversationSender = false;
    sendConversationMessageInput.value = "";
  }
  if (dataConversation.newNameAdded == 'false')
    if (dataConversation.newNameLeaving == 'false')
      displayConversationMessage(dataConversation.nameSender, dataConversation.message);
    else //newNameLeaving == 'true'
    {
      namesInConversation.forEach(function(name, index) {
      trace(name);
      });
      trace('deleting name leaving');
      namesInConversation.splice(namesInConversation.indexOf(dataConversation.newName), 1);
      namesInConversation.forEach(function(name, index) {
      trace(name);
      });
      numberConversation = numberConversation - 1;
      document.getElementById("conversationNamesDiv").hidden = true;
    }  
  dataConversation.counter = dataConversation.counter - 1;
  if (dataConversation.counter != 0) {
    var data = JSON.stringify(dataConversation);
    sendChannel_Conversation.send(data);
    trace('Sent conversation data: ' + data);
  }
}

function gotReceiveChannel_Conversation(event) {
  trace('Receive Channel Callback');
  receiveChannel_Conversation = event.channel;
  receiveChannel_Conversation.onmessage = handleMessage_Conversation;
  receiveChannel_Conversation.onopen = handleReceiveChannelStateChange_Conversation;
  receiveChannel_Conversation.onclose = handleReceiveChannelStateChange_Conversation;
}

function setLocalAndSendMessage_ConversationSend(sessionDescription) {
  pcConversationSend.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  socket.emit('message', {
  	nameTo: nameNextConversation,
  	type: 'offer',
  	conversation: 'true',
  	message: sessionDescription});
}

function setLocalAndSendMessage_ConversationReceive(sessionDescription) {
  pcConversationReceive.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  socket.emit('message', {
  	nameTo: nameBeforeConversation,
  	type: 'answer',
  	conversation: 'true',
  	message: sessionDescription});
}

function handleMessage_Conversation(event) {
  trace('Received message: ' + event.data);
  dataConversation = JSON.parse(event.data);
  if (dataConversation.newNameAdded == 'true') {
    numberConversation = dataConversation.number;
    document.getElementById("conversationNamesDiv").hidden = true;
    if( !(namesInConversation.inArray(dataConversation.newName)) )
      namesInConversation.push(dataConversation.newName);
  }
  sendConversationData();
}

function handleSendChannelStateChange_Conversation() {
  var readyState = sendChannel_Conversation.readyState;
  trace('Send channel conversation state is: ' + readyState);
  if (readyState == "open") {
    sendConversationMessageInput.disabled = false;
    namesInButton.disabled = false;
    leaveConversationButton.disabled = false;
    sendConversationMessageInput.focus();
    sendConversationMessageInput.value = "";
    nameAddedInput.value = "";
    document.getElementById("inConversation").hidden = false;
    if (nameBeforeConversation != null && namesInConversation.length == 1)
      sendMessage({
        nameTo: nameBeforeConversation,
        nameFrom: name,
        message: 'want names in conversation'});
    document.getElementById("conversationNamesDiv").hidden = true;
  } else {
    sendConversationMessageInput.disabled = true;
  }
}

function handleReceiveChannelStateChange_Conversation() {
  var readyState = receiveChannel_Conversation.readyState;
  trace('Receive conversation channel state is: ' + readyState);
}

function handleIceCandidate_ConversationSend(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      nameTo: nameNextConversation,
      conversation: 'true',
      sender: 'true',
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    console.log('End of candidates.');
  }
}

function handleIceCandidate_ConversationReceive(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      nameTo: nameBeforeConversation,
      conversation: 'true',
      sender: 'false',
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    console.log('End of candidates.');
  }
}



//////////////////////////////////////
// messageContenair div implementation, all the webRTC exanging messages and function

// utility function to follow exange of messaging with the server
function sendMessage(message){
	console.log('Client sending message: ', message);
  	socket.emit('message', message);
}

// again, be sure to have red README (II.B) to understand to normal stack exange of messages
socket.on('message', function (message){
  console.log('Client received message:', message);
  if (message.message == 'want to send message') {
  		nameSender = message.nameFrom;
  		startReceivingSession();
  }  
  else if (message.message == 'ready to receive') {
  	nameToSend = message.nameFrom;
  	console.log('Sending offer to peer');
  	pcSend.createOffer(setLocalAndSendMessage_Send, handleCreateOfferError);
  } 
  else if (message.message == 'are you in conversation') {
  	if (pcConversationReceive != null)
  		sendMessage({
  			nameFrom: name,
			  nameTo: message.nameFrom,
        inConversation: 'true',
			  message: 'in conversation'});
    else
      sendMessage({
        nameFrom: name,
        nameTo: message.nameFrom,
        inConversation: 'false',
        message: 'in conversation'});
  }
  else if (message.message == 'in conversation') {
    if (message.inConversation == 'true') {
	    document.getElementById("addNameError").hidden = true;
	    document.getElementById("addNameError2").hidden = true;
	    document.getElementById("addNameError3").hidden = true;
      document.getElementById("addNameError5").hidden = true;
	    document.getElementById("addNameError4").hidden = false;
      namesInConversation.pop();
    } else if (message.inConversation == 'false')
      if (numberConversation == 1) {
        startSendingConversationSession();
      }
      else {
        dataConversation = {
          newNameAdded: 'true',
          newNameLeaving: 'false',
          newName: nameAdded,
          number: (numberConversation+1),
          counter: numberConversation};
        sendConversationData();
        startSendingConversationSession();
      }
  } 
  else if (message.message == 'want names in conversation') {
    sendMessage({
      nameTo: message.nameFrom,
      nameFrom: name,
      names: namesInConversation,
      message: 'names in conversation'});
  }
  else if (message.message == 'names in conversation') {
    namesInConversation = message.names;
  }
  else if (message.message == 'want to add to conversation') {
  // See README (II.C) to understand that all the condition are their to make sure
  // that the adding operacion process is made well
    if (numberConversation <= message.numberNames) {
      numberConversation = message.numberNames;
    }
    if (message.nameToConnect == null) {
      // verify the case first add, must be to avoid a loop for the first add
      // if I am the first name addded I will start a sendingSession with message.nameFrom
      if (numberConversation == 1) {
        nameAdded = message.nameFrom;
        namesInConversation.push(nameAdded);
        startSendingConversationSession();
      }
      // In all case I will start the receivingSession, the test is only to avoid the name which has
      // initiate the first add to restart a sending session (if he does it, it will be a loop)
      nameBeforeConversation = message.nameFrom;
      startReceivingConversationSession();
    } 
    // again here we avoid a loop in the insertion of a new name, only the new name (nameToConnect == nameNextConversation != null)
    // has to start the sendingSession (the name already in the conversation will receive a message with nameToConnect = nameNextConversation == null)
    else if (message.nameToConnect != null) {
      nameAdded = message.nameToConnect;
      startSendingConversationSession();
      nameBeforeConversation = message.nameFrom;
      startReceivingConversationSession();
    }
  }
  else if (message.message == 'ready for conversation') {
   	nameNextConversation = message.nameFrom;
   	console.log('Sending offer to peer');
   	pcConversationSend.createOffer(setLocalAndSendMessage_ConversationSend, handleCreateOfferError);
  }
  else if (message.message == 'leaving the conversation') {
    if (message.nameFrom == null) {
      leavingProcedure();
    } else if (message.nameFrom == nameBeforeConversation) {
      dataConversation = {
          newNameAdded: 'false',
          newNameLeaving: 'true',
          newName: message.nameFrom,
          counter: (numberConversation-1)};
      sendConversationData();
      sendMessage({
        nameTo: message.nameFrom,
        nameFrom: name,
        message: 'you can leave'});
    } else if (message.nameFrom == nameNextConversation) {
      nameNextConversation = null;
      nameAdded = message.nameToConnect;
      numberConversation = numberConversation - 1;
      startSendingConversationSession();
    }
  }
  else if (message.message == 'you can leave') {
    sendMessage({
        nameTo: nameBeforeConversation,
        nameFrom: name,
        nameToConnect: nameNextConversation,
        message: 'leaving the conversation'});
    leavingProcedure();
  }
  else if (message.type === 'offer') {
  	if (message.conversation === 'false') {
   		pcReceive.setRemoteDescription(new RTCSessionDescription(message.message));
   		console.log('Sending answer to peer');
  		pcReceive.createAnswer(setLocalAndSendMessage_Receive, handleCreateAnswerError);
  	} else if (message.conversation === 'true') {
  		pcConversationReceive.setRemoteDescription(new RTCSessionDescription(message.message));
   		console.log('Sending answer to peer');
  		pcConversationReceive.createAnswer(setLocalAndSendMessage_ConversationReceive, handleCreateAnswerError);
  	}
  } 
  else if (message.type === 'answer') {
  	if (message.conversation === 'false')
    	pcSend.setRemoteDescription(new RTCSessionDescription(message.message));
    else if (message.conversation === 'true') {
      pcConversationSend.setRemoteDescription(new RTCSessionDescription(message.message));
    }
  } 
  else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    if (message.sender === 'true')
      if (message.conversation === 'true')
        pcConversationReceive.addIceCandidate(candidate);
      else
    	  pcReceive.addIceCandidate(candidate);
    else if (message.sender === 'false')
      if (message.conversation === 'true')
        pcConversationSend.addIceCandidate(candidate);
      else
        pcSend.addIceCandidate(candidate);
  }
});

// connection free STUN TURN Server google
if (location.hostname != "localhost") {
  requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
}

var nameToSendInput = document.getElementById("nameToSend");
var startSendSession = document.getElementById("startSendSession");
var sendButton = document.getElementById("sendButton");
var messageToSend = document.getElementById("messageToSend");
messageToSend.value = "Press Start Sending, enter some text, then press Send.";
nameToSendInput.value = "";
messageToSend.disabled = true;
sendButton.disabled = true;
startSendSession.onclick = startSendingSession;
sendButton.onclick = sendData;

function startSendingSession() {
	nameToSend = nameToSendInput.value;
	if (nameToSend == "" || nameToSend == name) {
		document.getElementById("nameToSendError2").hidden = true;
		document.getElementById("nameToSendError1").hidden = false;
		return;
	}
	if (!nameList.inArray(nameToSend)) {
		document.getElementById("nameToSendError1").hidden = true;
		document.getElementById("nameToSendError2").hidden = false;
		return;
	}
	document.getElementById("nameToSendError1").hidden = true;
	document.getElementById("nameToSendError2").hidden = true;
	trace("starting sending session")
	if (pcSend != null) {
		sendChannel.close();
		pcSend.close();
		pcSend = null;
	}
	try {
    	pcSend = new RTCPeerConnection(null, {optional: [{RtpDataChannels: true}]});
    	pcSend.onicecandidate = handleIceCandidate_Send;
    	trace('Created RTCPeerConnection');
  		try {
    		// Reliable Data Channels not yet supported in Chrome
    		sendChannel = pcSend.createDataChannel("sendDataChannel", {reliable: false});
   			trace('Created send data channel');
  		} catch (e) {
    		alert('Failed to create data channel. ' +
        		  'You need Chrome M25 or later with RtpDataChannel enabled');
    		trace('createDataChannel() failed with exception: ' + e.message);
    		return;
  		}
  		sendChannel.onopen = handleSendChannelStateChange;
  		sendChannel.onclose = handleSendChannelStateChange;
  	} catch (e) {
  		trace('Failed to create PeerConnection, exception: ' + e.message);
    	alert('Cannot create RTCPeerConnection object.');
    	return;
  	}
	sendMessage({
		message: 'want to send message', 
		nameFrom: name,
		nameTo: nameToSend});
}

function startReceivingSession() {
	if (pcReceive != null) {
		receiveChannel.close()
		receiveChannel = null;
		pcReceive.close();
		pcReceive = null;
	}
	try {
    	pcReceive = new RTCPeerConnection(null, {optional: [{RtpDataChannels: true}]});
    	pcReceive.onicecandidate = handleIceCandidate_Receive;
  		pcReceive.ondatachannel = gotReceiveChannel;
  		trace('Created RTCPeerConnection');
  	} catch (e) {
  		trace('Failed to create PeerConnection, exception: ' + e.message);
    	alert('Cannot create RTCPeerConnection object.');
    	return;
  	}
  	sendMessage({
  		message: 'ready to receive',
  		nameFrom: name,
  		nameTo: nameSender});
}

function sendData() {
  var data = messageToSend.value;
  sendChannel.send(data);
  trace('Sent data: ' + data);
}

function gotReceiveChannel(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = handleMessage;
  receiveChannel.onopen = handleReceiveChannelStateChange;
  receiveChannel.onclose = handleReceiveChannelStateChange;
}

function setLocalAndSendMessage_Send(sessionDescription) {
  pcSend.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  socket.emit('message', {
  	nameTo: nameToSend,
  	type: 'offer',
  	conversation: 'false',
  	message: sessionDescription});
}

function setLocalAndSendMessage_Receive(sessionDescription) {
  pcReceive.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  socket.emit('message', {
  	nameTo: nameSender,
  	type: 'answer',
  	conversation: 'false',
  	message: sessionDescription});
}

function handleMessage(event) {
  trace('Received message: ' + event.data);
  document.getElementById("messsageReceivedFrom").innerHTML = nameSender;
  document.getElementById("messageReceived").value = event.data;
}

function handleSendChannelStateChange() {
  var readyState = sendChannel.readyState;
  trace('Send channel state is: ' + readyState);
  if (readyState == "open") {
    messageToSend.disabled = false;
    messageToSend.focus();
    messageToSend.value = "";
    sendButton.disabled = false;
  } else {
    messageToSend.disabled = true;
    sendButton.disabled = true;
  }
}

function handleReceiveChannelStateChange() {
  var readyState = receiveChannel.readyState;
  trace('Receive channel state is: ' + readyState);
}

function handleCreateOfferError(event){
  console.log('createOffer() error: ', event);
}

function handleCreateAnswerError(event){
  console.log('createAnswer() error: ', event);
}

function handleIceCandidate_Send(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      nameTo: nameToSend,	
      conversation: 'false',
      sender: 'true',
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    console.log('End of candidates.');
  }
}

function handleIceCandidate_Receive(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      nameTo: nameSender,
      conversation: 'false',
      sender: 'false',
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate});
  } else {
    console.log('End of candidates.');
  }
}

function requestTurn(turn_url) {
  var turnExists = false;
  for (var i in pc_config.iceServers) {
    if (pc_config.iceServers[i].url.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turn_url);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
      	console.log('Got TURN server: ', turnServer);
        pc_config.iceServers.push({
          'url': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turn_url, true);
    xhr.send();
  }
}