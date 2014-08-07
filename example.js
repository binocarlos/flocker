var http = require('http')
var flocker = require('./')

var server = null
var dockers = null

function startServer(){
  dockers = flocker()

  dockers.on('request', function(req, res){
    console.log(req.url)
  })

  dockers.on('route', function(info, next){
    next(null, allServers[0])
  })

  dockers.on('list', function(next){
    next(null, allServers)
  })

  server = http.createServer(function(req, res){
    //dockers.handle(req, res)
    res.end('ok')
  })

  server.listen(8080)
}

startServer()