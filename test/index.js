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
var concat = require('concat-stream')

var allServers = [
  '192.168.8.120:2375',
  '192.168.8.121:2375',
  '192.168.8.122:2375'
]

var dockers = flocker()

dockers.on('request', function(req, res){
  console.log('-------------------------------------------');
  console.log(req.method)
  console.dir(req.url)
})

dockers.on('allocate', function(name, container, next){
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
    var err = result.toString()
    if(err && err.length>0){
      console.log('-------------------------------------------');
      console.log('error')
      console.log(err)
    }
  }))

  ps.on('error', function(error){
    done(error)
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

function removeStubImage(address, done){
  runTargetedDocker(address, [
    'rmi',
    '--no-prune',
    'binocarlos/bring-a-ping'
  ], function(err, result){
    console.log(result)
    done()
  })
}

function removeStubImages(done){
  async.series([
    function(next){
      removeStubImage('192.168.8.120:2375', next)
    },
    function(next){
      removeStubImage('192.168.8.121:2375', next)
    },
    function(next){
      removeStubImage('192.168.8.122:2375', next)
    },
  ], done)
}


function createStub(name, done){
  runProxyDocker([
    'run',
    '-d',
    '-v',
    __dirname + ':/app',
    '-e',
    'APPLES=10',
    '--name',
    name,
    'binocarlos/bring-a-ping:apples',
    '/app/test/stub.js'
  ], done)
  
}

function createStubs(done){
  async.series([
    function(next){
      createStub('stub1', function(err, result){
        console.log('-------------------------------------------');
        console.log('-------------------------------------------');
        console.log('after')
        console.log(result)
        next()
      })
    }/*,
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
    }*/
  ], done)
}

function destroyStubs(done){
  cp.exec("docker stop stub1 stub2 stub3 && docker rm stub1 stub2 stub3", done)
}

function removeImage(done){
  cp.exec("docker rmi --no-prune binocarlos/bring-a-ping", done)
}


tape('destroy stubs', function(t){
  destroyStubs(function(){
    removeImage(function(){
      t.end()  
    })
    
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
  destroyStubs(function(){
    t.end()
  })
})

tape('stop server', function(t){
  stopServer()
  t.end()
})