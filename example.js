var http = require('http')
var flocker = require('./')
var hyperprox = require('hyperprox')

var allServers = [{
  hostname:'node1',
  docker:'192.168.8.120:2375'
},{
  hostname:'node2',
  docker:'192.168.8.121:2375'
},{
  hostname:'node3',
  docker:'192.168.8.122:2375'
}]

var proxy = hyperprox(function(req, next){
  next(null, '192.168.8.121:2375')
})

var backendsproxy = proxy.handler()

var dockers = flocker()

dockers.on('request', function(req, res){
  //console.log(req.method + ' ' + req.url)
})

function getAddress(container){
  var addr = allServers[parseInt(container.replace(/\D/g, ''))-1]

  console.log('-------------------------------------------');
  console.log(container)
  console.log(addr)
  return addr
}
var lastContainer = null

dockers.on('route', function(info, next){
  if(info.container){
    lastContainer = info.name
  }
  next(null, getAddress(lastContainer))
})

dockers.on('list', function(next){
  next(null, allServers)
})

var server = http.createServer(function(req, res){

  console.log('-------------------------------------------');
  console.dir(req.method + ' ' + req.url)
  console.dir(req.headers)

  res.on('finish', function(){
    console.log('RES: ' + res.statusCode)
    console.dir(res._headers)
  })

  //backendsproxy(req, res)
  dockers.handle(req, res)
})

server.listen(8080)