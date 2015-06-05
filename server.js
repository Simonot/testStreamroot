var static = require('node-static');
var http = require('http');
var file = new(static.Server)();

var port = process.env.PORT;

var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(port, function() {
	log_comment("server listening (port "+port+")");
});

//socket.io functions
var nameClientSockets = {};
var nameList = [];

var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket){

	// utility developement facility function
	function log(){
		var array = [">>> Message from server: "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}

	socket.on('new client connected', function(name) {
		log_comment('name added ' +name);
		nameClientSockets[name] = socket;
		nameList.push(name);
		socket.broadcast.emit('new client connected', name);
	});

	socket.on('client disconnected', function(name) {
		log_comment('name disconnected ' +name);
		nameList.splice(nameList.indexOf(name), 1);
		socket.broadcast.emit('name list', nameList);
	});

	socket.on('want name list', function() {
		socket.emit('name list', nameList);
	});

	socket.on('banned client', function(nameBanned) {
		log_comment('name banned ' + nameBanned);
		nameClientSockets[nameBanned].emit('you have been banned');
	});

	socket.on('I am banned', function(nameBanned) {
		nameClientSockets[nameBanned].disconnect();
		nameList.splice(nameList.indexOf(nameBanned), 1);
		socket.broadcast.emit('name list', nameList);
	});

	socket.on('message', function (message) {
		log('Got message: ', message);

		// you can only put nameClientSockets[message.nameTo].emit('message', message);
		// but that way if I want to add some action in the signialing process, i can
		if (message.message === 'want to send message') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'ready to receive') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'want to add to conversation') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'are you in conversation') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'in conversation') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'ready for conversation') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'want names in conversation') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'names in conversation') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'leaving the conversation') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'you can leave') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.message === 'bye sender') {
			nameClientSockets[message.nameTo].emit('bye sender');
		} else if (message.type === 'offer') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.type === 'answer') {
			nameClientSockets[message.nameTo].emit('message', message);
		} else if (message.type === 'candidate') {
			nameClientSockets[message.nameTo].emit('message', message);
		}
		else
			socket.broadcast.emit('message', message);
	});
});

//utility function
function log_comment(comment) {
	console.log((new Date())+" "+comment);
}