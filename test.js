var fs = require('fs')
var cp = require('child_process')
var path = require('path')
var flocker = require('./')
var tape     = require('tape')
var http = require('http')
var url = require('url')
var async = require('async')
var concat = require('concat-stream')

var allServers = [
  '192.168.8.120:2375',
  '192.168.8.121:2375',
  '192.168.8.122:2375'
]

var dockers = flocker()

dockers.on('request', function(req, res){
  console.log(req.url)
})

dockers.on('route', function(info, next){
  console.log('-------------------------------------------');
  console.log('route')
  next(null, allServers[0])
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


function runDocker(args, done){
  args = args || []
  var ps = cp.spawn('docker', args, {
    stdio:'pipe'
  })

  ps.stdout.pipe(concat(function(result){
    done(null, result.toString())
  }))

  ps.stderr.pipe(concat(function(result){
    console.log(result.toString())
  }))

  ps.on('error', function(error){
    done(error)
  })
}

function runProxyDocker(args, done){
  runDocker([
    '-H',
    'tcp://192.168.8.120:8080'
  ].concat(args), done)
}

function createStub(name, done){

  var local = path.join(__dirname, 'stub.js')

  runDocker([
    '-d',
    '-v',
    __dirname + ':/app',
    '--name',
    name,
    'binocarlos/nodejs',
    '/app/stub.js'
  ], done)
  
}

function createStubs(done){
  async.series([
    function(next){
      createStub('stub1', next)
    },
    function(next){
      createStub('stub2', next)
    },
    function(next){
      createStub('stub3', next)
    }
  ], done)
}

function destroyStubs(done){
  cp.exec('docker stop stub1 stub2 stub3 && docker rm stub1 stub2 stub3', done)
}

startServer()

tape('create stubs', function(t){
  createStubs(function(){
    t.end()
  })
})

tape('start server', function(t){
  setTimeout(function(){
    t.end()
  }, 100)
})

tape('docker ps', function(t){

  runDocker([
    'ps',
    '-a'
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

tape('destroy stubs', function(t){
  destroyStubs(function(){
    t.end()
  })
})

tape('stop server', function(t){
  stopServer()
  t.end()
})