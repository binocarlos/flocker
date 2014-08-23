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

function getAddress(container){
  return allServers[parseInt(container.replace(/\D/g, ''))-1]
}
var lastContainer = null


var dockers = flocker()

dockers.on('request', function(req, res){
  console.log(req.method)
  console.dir(req.url)
})

dockers.on('route', function(info, next){
  if(info.container){
    lastContainer = info.name
  }
  next(null, getAddress(lastContainer))
})


dockers.on('list', function(next){
  next(null, allServers)
})

dockers.on('map', function(name, container, image, next){
  if(!name.match(/^stub/)){
    throw new Error('stub name map')
  }

  if(container.Image!='binocarlos/bring-a-ping'){
    throw new Error('container image map')
  }

  if(image.Config.Entrypoint[1]!='cli.js'){
    throw new Error('image entrypoint map')
  }

  // test changing the request
  container.Env.push('TESTAPPLES=20')

  next()
})

dockers.on('start', function(name, container, image, bootRecord, next){
  if(!name.match(/^stub/)){
    throw new Error('stub name map')
  }

  if(container.Config.Image!='binocarlos/bring-a-ping'){
    throw new Error('container image map')
  }

  if(image.Config.WorkingDir!='/srv/app'){
    throw new Error('image record')
  }

  if(bootRecord.Privileged!==false){
    throw new Error('boot record')
  }

  next()
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

function getStubArgs(name){
  return [
    'run',
    '-d',
    '--name',
    name,
    'binocarlos/bring-a-ping',
    '--timeout',
    '1000'
  ]
}

function createStub(name, done){
  runProxyDockerStream(getStubArgs(name), done)
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


tape('docker ps', function(t){

  runProxyDocker([
    'ps'
  ], function(err, result){
    if(err){
      t.fail(err, 'ps')
      t.end()
      return
    }
    console.log(result)
    t.ok(result.indexOf('stub1')>0, 'stub1')
    t.ok(result.indexOf('stub1@node1')>0, 'stub1@node1')
    t.ok(result.indexOf('stub2')>0, 'stub2')
    t.ok(result.indexOf('stub2@node2')>0, 'stub2@node2')
    t.ok(result.indexOf('stub3')>0, 'stub3')
    t.ok(result.indexOf('stub3@node3')>0, 'stub3@node3')

    dockers.removeAllListeners('map')
    t.end()
  })
})

tape('no double named containers', function(t){

  runProxyDocker(getStubArgs('stub2'), function(err){
    t.ok(err.toString().indexOf('container: stub2 already exists on 192.168.8.121:2375')>0, 'error message has denied the container')
    t.end()
  })
  
})


tape('ensure containers have a name', function(t){

  runProxyDocker([
    'run',
    '-d',
    'binocarlos/bring-a-ping',
    '--timeout',
    '1000'
  ], function(err){
    t.ok(err.toString().indexOf('please supply a --name flag for the container')>0, 'error message has rejected no name')
    t.end()
  })
  
})



tape('find a container', function(t){

  dockers.find('stub1', function(err, server){
    if(err){
      t.fail(err, 'find')
      t.end()
      return
    }
    t.equal(server.hostname, 'node1', 'container is on node1')
    t.end()
  })
  
})



tape('destroy stubs', function(t){
  removeStubs(function(){
    t.end()
  })
})


tape('stop server', function(t){
  stopServer()
  t.end()
})