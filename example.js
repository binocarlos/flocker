var http = require('http')
var flocker = require('./')

var allServers = [
  '192.168.8.120:2375',
  '192.168.8.121:2375',
  '192.168.8.122:2375'
]

var dockers = flocker()

dockers.on('request', function(req, res){
  console.log(req.method)
  console.dir(req.url)
  console.dir(req.headers)
})

dockers.on('route', function(info, next){
  next(null, allServers[0])
})

dockers.on('list', function(next){
  next(null, allServers)
})

var server = http.createServer(function(req, res){
  dockers.handle(req, res)
})

server.listen(8080)