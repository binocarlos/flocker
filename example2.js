var through = require('through2')
var net = require('net')

var tcpproxy = net.createServer({
  allowHalfOpen:true
}, function (socket) {
  var serviceSocket = new net.Socket()
  
  socket.pipe(through(function(chunk,enc,next){
    console.log(chunk.toString())
    this.push(chunk)
    next()
  })).pipe(serviceSocket).pipe(through(function(chunk,enc,next){
    console.log(chunk.toString())
    this.push(chunk)
    next()
  })).pipe(socket)

  serviceSocket.connect(2375, '192.168.8.121')
})

tcpproxy.listen(8080)