var fs = require('fs')
var cp = require('child_process')
var path = require('path')
var flocker = require('./')
var tape     = require('tape')
var http = require('http')
var url = require('url')
var concat = require('concat-stream')

var allServers = [
  '192.168.8.120:2375',
  '192.168.8.121:2375',
  '192.168.8.122:2375'
]

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
    dockers.handle(req, res)  
  })

  server.listen(8080)
}

function stopServer(){
  server.close()
}

tape('docker ps', function(t){

  var ps = cp.spawn('docker', [
    '-H',
    'http://192.168.8.120:8080',
    'ps'
  ])

  ps.pipe(concat(function(result){
    result = result.toString()
  }))

  ps.on('error', function(error){
    t.fail(err, 'error')
    t.end()
    return
  })
})