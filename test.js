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
    next(null, allServers.splice(1))
  })

  server = http.createServer(function(req, res){
    //dockers.handle(req, res)
    res.end('ok')
  })

  server.listen(8080)
}

function stopServer(){
  server.close()
}

function runDocker(args, done){
  var ps = cp.spawn('docker', [
    '-H',
    'tcp://192.168.8.120:8080'
  ].concat(args), {
    stdio:'pipe'
  })

  ps.stdout.pipe(concat(function(result){
    done(null, result.toString())
  }))

  ps.stderr.pipe(concat(function(result){
    done(result.toString())
  }))

  ps.on('error', function(error){
    done(error)
  })
}

tape('start server', function(t){
  startServer()
  setTimeout(function(){
    t.end()
  }, 100)
})

tape('docker ps', function(t){
  runDocker([

  ], function(err, result){
    if(err){
      t.fail(err, 'ps')
      t.end()
      return
    }
    console.log(result)
    t.end()
  })
})

tape('stop server', function(t){
  stopServer()
  t.end()
})