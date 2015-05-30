var static = require('node-static');
var http = require('http');
var file = new(static.Server)();

var port = 2015

var app = http.createServer(function (req, res) {
  file.serve(req, res);
}).listen(port, function() {
	log_comment("server listening (port "+port+")");
});

//socket.io functions
var io = require('socket.io').listen(app);
io.sockets.on('connection', function (socket){

	function log(){
		var array = [">>> Message from server: "];
	  for (var i = 0; i < arguments.length; i++) {
	  	array.push(arguments[i]);
	  }
	    socket.emit('log', array);
	}

	socket.on('', function(){
		socket.broadcast.emit('');
	});

	socket.on('message', function (message) {
		log('Got message: ', message);

		if (message.type === 'offer') {
			socket.emit('message', message);
		} 
		else if (message.type === 'answer') {
			socket.emit('message', message);
		} 
		else if (message === 'bye') {
		}
		else
			socket.broadcast.emit('message', message);
	});
});

//utility function
function log_comment(comment) {
	console.log((new Date())+" "+comment);
}