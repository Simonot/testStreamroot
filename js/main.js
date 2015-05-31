var isInitiator;

//name = prompt("Enter your name:");
console.log(name + ' has joined the room !');

var socket = io.connect();

socket.on('log', function (array){
  console.log.apply(console, array);
});

var pc = null;
var isSending = false;
var sendChannel = null
var receiveChannel = null;

var pc_config = {'iceServers': [{'url': 'stun:stun.l.google.com:19302'}]};
var pc_constraints = {'optional': [{'DtlsSrtpKeyAgreement': true}]};

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
  if (message == 'want to send message') {
  	if (isSending) {
  		sendMessage('wait client end sending')
  	} else
  		startReceivingSession();
  } 
  else if (message == 'wait client end sending') {
  	startSendingSession();
  } 
  else if (message == 'ready to receive') {
  	console.log('Sending offer to peer');
  	pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
  } 
  else if (message.type === 'offer') {
   	pc.setRemoteDescription(new RTCSessionDescription(message));
   	console.log('Sending answer to peer');
  	pc.createAnswer(setLocalAndSendMessage, handleCreateAnswerError);
  } 
  else if (message.type === 'answer') {
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } 
  else if (message.type === 'candidate') {
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    pc.addIceCandidate(candidate);
  }
});

if (location.hostname != "localhost") {
  requestTurn('https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913');
}

///////////////////////////////////////
var startSendSession = document.getElementById("startSendSession");
var sendButton = document.getElementById("sendButton");
var messageToSend = document.getElementById("messageToSend");
messageToSend.value = "Press Start Sending, enter some text, then press Send.";
messageToSend.disabled = true;
sendButton.disabled = true;
startSendSession.onclick = startSendingSession;
sendButton.onclick = sendData;

function startSendingSession() {
	trace("starting sending session")
	if (pc != null) {
		if (sendChannel != null) {
			sendChannel.close();
			sendChannel = null;
		}
		if (receiveChannel != null) {
			receiveChannel.close()
			receiveChannel = null;
		}
		pc.close();
		pc = null;
	}
	try {
    	pc = new RTCPeerConnection(null, {optional: [{RtpDataChannels: true}]});
    	pc.onicecandidate = handleIceCandidate;
    	trace('Created RTCPeerConnection');
  		try {
    		// Reliable Data Channels not yet supported in Chrome
    		sendChannel = pc.createDataChannel("sendDataChannel", {reliable: false});
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
	isSending = true;
	sendMessage('want to send message');
}

function startReceivingSession() {
	if (pc != null) {
		if (sendChannel != null) {
			sendChannel.close();
			sendChannel = null;
		}
		if (receiveChannel != null) {
			receiveChannel.close()
			receiveChannel = null;
		}
		pc.close();
		pc = null;
	}
	try {
    	pc = new RTCPeerConnection(null, {optional: [{RtpDataChannels: true}]});
    	pc.onicecandidate = handleIceCandidate;
  		pc.ondatachannel = gotReceiveChannel;
  		trace('Created RTCPeerConnection');
  	} catch (e) {
  		trace('Failed to create PeerConnection, exception: ' + e.message);
    	alert('Cannot create RTCPeerConnection object.');
    	return;
  	}
  	sendMessage('ready to receive');
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

function setLocalAndSendMessage(sessionDescription) {
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message' , sessionDescription);
  sendMessage(sessionDescription);
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

function handleIceCandidate(event) {
  console.log('handleIceCandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      origin: 'cient',
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