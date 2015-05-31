var pcSend = null;
var pcReceive = null;
var sendChannel = null
var receiveChannel = null;
var name = null;
var nameSender;
var nameToSend;

var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

//////////////////////////////////////
trace('new client connected');

var nameClient = document.getElementById("nameClient");
nameClient.disabled = false;
nameClient.value= "";
nameClient.onchange = nameClientAdd;


function nameClientAdd() {
	name = nameClient.value;
	//if (searchName(name)) {
	//	nameClient.value = "";
	//	document.getElementById("nameClientError").hidden = false;
	//} else {
		document.getElementById("nameClientError").hidden = true;
		document.getElementById("contenairsDiv").hidden = false;
		startSendSession.disabled = false;
		nameClient.disabled = true;
		nameToSendInput.disabled = false;
		socket.emit('new client connected', name);
}
//////////////////////////////////////
var socket = io.connect();

socket.on('new client connected', function(name) {
	trace('new client connected, named ' + name);
});

socket.on('log', function (array){
  console.log.apply(console, array);
});

function trace(text) {
  console.log((performance.now() / 1000).toFixed(3) + ": " + text);
}

function sendMessage(message){
	console.log('Client sending message: ', message);
  // if (typeof message === 'object') {
  //   message = JSON.stringify(message);
  // }
  socket.emit('message', message);
}

socket.on('message', function (message){
  console.log('Client received message:', message);
  if (message.message == 'want to send message') {
  		nameSender = message.nameFrom;
  		startReceivingSession();
  }  
  else if (message.message == 'ready to receive') {
  	console.log('Sending offer to peer');
  	nameToSend = message.nameFrom;
  	pcSend.createOffer(setLocalAndSendMessage_Send, handleCreateOfferError);
  } 
  else if (message.type === 'offer') {
   	pcReceive.setRemoteDescription(new RTCSessionDescription(message));
   	console.log('Sending answer to peer');
  	pcReceive.createAnswer(setLocalAndSendMessage_Receive, handleCreateAnswerError);
  } 
  else if (message.type === 'answer') {
    pcSend.setRemoteDescription(new RTCSessionDescription(message));
  } 
  else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    if(message.sender === 'true')
    	pcReceive.addIceCandidate(candidate);
    else if (message.sender === 'false')
    	pcSend.addIceCandidate(candidate);
  }
});

if (location.hostname != "localhost") {
  requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
}

//////////////////////////////////////
var nameToSendInput = document.getElementById("nameToSend");
var startSendSession = document.getElementById("startSendSession");
var sendButton = document.getElementById("sendButton");
var messageToSend = document.getElementById("messageToSend");
messageToSend.value = "Press Start Sending, enter some text, then press Send.";
nameToSendInput.disabled = true;
nameToSendInput.value = "";
messageToSend.disabled = true;
sendButton.disabled = true;
startSendSession.onclick = startSendingSession;
sendButton.onclick = sendData;

function startSendingSession() {
	nameToSend = nameToSendInput.value;
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
  isSending = false;
}

function gotReceiveChannel(event) {
  trace('Receive Channel Callback');
  receiveChannel = event.channel;
  receiveChannel.onmessage = handleMessage;
  receiveChannel.onopen = handleReceiveChannelStateChange;
  receiveChannel.onclose = handleReceiveChannelStateChange;
}

function setLocalAndSendMessage_Send(sessionDescription) {
  sessionDescription['nameTo'] = nameToSend;
  pcSend.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  socket.emit('message', {
  	nameTo: nameToSend,
  	type: 'offer',
  	message: sessionDescription});
}

function setLocalAndSendMessage_Receive(sessionDescription) {
  pcReceive.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  socket.emit('message', {
  	nameTo: nameSender,
  	type: 'answer',
  	message: sessionDescription});
}

function handleMessage(event) {
  trace('Received message: ' + event.data);
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