var isInitiator;

//name = prompt("Enter your name:");
console.log(name + ' has joined the room !');

var socket = io.connect();

socket.emit('new client', name);

socket.on('empty', function (){
  isInitiator = true;
  console.log('You are the initiator!');
});

socket.on('join', function (room){
  console.log('Making request to join room ' + room);
  console.log('You are the initiator!');
});

socket.on('log', function (array){
  console.log.apply(console, array);
});
