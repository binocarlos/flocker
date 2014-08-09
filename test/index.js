/*

  NOTE - this test assumes 3 servers with docker

  it uses the Vagrantfile from:

  https://github.com/binocarlos/viking-dev
  

  the point of these tests is to ensure the standard cli docker client
  works with the proxy
*/

var fs = require('fs')
var cp = require('child_process')
var path = require('path')
var flocker = require('../')
var tape     = require('tape')
var http = require('http')
var url = require('url')
var async = require('async')
var through = require('through2')
var concat = require('concat-stream')

var allServers = [
  '192.168.8.120:2375',
  '192.168.8.121:2375',
  '192.168.8.122:2375'
]

var dockers = flocker()

dockers.on('request', function(req, res){
  console.log(req.method)
  console.dir(req.url)
})

function getAddress(container){
  return allServers[parseInt(container.replace(/\D/g, ''))-1]
}
var lastContainer = null

dockers.on('route', function(info, next){

  if(info.container){
    lastContainer = info.name
  }
  console.log(lastContainer)
  console.log(getAddress(lastContainer))
  next(null, getAddress(lastContainer))
})

dockers.on('list', function(next){
  next(null, allServers.splice(1))
})

var server = http.createServer(function(req, res){
  dockers.handle(req, res)
})

function startServer(){
  server.listen(8080)
}

function stopServer(){
  server.close()
}

function runDockerStream(args, done){
  args = args || []

  var ps = cp.spawn('docker', args, {
    stdio:'inherit'
  })

  ps.on('error', done)
  ps.on('close', done)
}

function runDocker(args, done){
  var cmd = 'docker ' + (args || []).join(' ')
  cp.exec(cmd, function(err, stdout, stderr){
    if(err || stderr){
      return done(err || stderr.toString())
    }
    done(null, stdout.toString())
  })
}

function runTargetedDocker(address, args, done){
  runDocker([
    '-H',
    'tcp://' + address
  ].concat(args), done)
}

function runProxyDocker(args, done){
  runDocker([
    '-H',
    'tcp://192.168.8.120:8080'
  ].concat(args), done)
}

function runProxyDockerStream(args, done){
  runDockerStream([
    '-H',
    'tcp://192.168.8.120:8080'
  ].concat(args), done) 
}

function removeStub(address, name, done){
  runTargetedDocker(address, [
    'stop',
    name
  ], function(err, result){
    runTargetedDocker(address, [
      'rm',
      name
    ], function(err, result){
      runTargetedDocker(address, [
        'rmi',
        '--no-prune',
        'binocarlos/bring-a-ping'
      ], done)
    })
  })
}

function removeStubs(done){

  async.series([
    function(next){
      removeStub('192.168.8.120:2375', 'stub1', next)
    },
    function(next){
      removeStub('192.168.8.121:2375', 'stub2', next)
    },
    function(next){
      removeStub('192.168.8.122:2375', 'stub3', next)
    },
  ], done)
}


function createStub(name, done){
  runProxyDockerStream([
    'run',
    '-d',
    '--name',
    name,
    'binocarlos/bring-a-ping'
  ], done)
  
}

function createStubs(done){
  async.series([
    function(next){
      createStub('stub1', done)
    },
    function(next){
      createStub('stub2', function(err, result){
        console.log(result)
        next()
      })
    },
    function(next){
      createStub('stub3', function(err, result){
        console.log(result)
        next()
      })
    }
  ], done)
}

tape('destroy stubs', function(t){
  removeStubs(function(){
    t.end()
  })
})

startServer()


tape('start server', function(t){
  setTimeout(function(){
    t.end()
  }, 1000)
})


tape('create stubs', function(t){
  createStubs(function(){
    setTimeout(function(){
      t.end()
    }, 1000)
  })
})

/*
tape('docker ps', function(t){

  runProxyDocker([
    'ps'
  ], function(err, result){
    if(err){
      t.fail(err, 'ps')
      t.end()
      return
    }
    t.ok(result.indexOf('stub1')>0, 'stub1')
    t.ok(result.indexOf('stub2')>0, 'stub1')
    t.ok(result.indexOf('stub3')>0, 'stub1')
    t.end()
  })
})
*/

tape('destroy stubs', function(t){
  removeStubs(function(){
    t.end()
  })
})


tape('stop server', function(t){
  stopServer()
  t.end()
})