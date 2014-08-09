var http = require('http')
var flocker = require('./')

var auth = require('http-auth');
var basic = auth.basic({
        realm: "Simon Area."
    }, function (username, password, callback) { // Custom authentication method.
        callback(username === "Tina" && password === "Bullock");
    }
);

var allServers = [
  '192.168.8.120:2375',
  '192.168.8.121:2375',
  '192.168.8.122:2375'
]

var dockers = flocker()

dockers.on('request', function(req, res){
  console.log(req.url)
})

dockers.on('allocate', function(name, container, next){
  next(null, allServers[0])
})

dockers.on('list', function(next){
  next(null, allServers.splice(1))
})

var server = http.createServer(basic, function(req, res){
  console.log('-------------------------------------------');
  console.log('-------------------------------------------');
  console.dir(req.method)
  console.dir(req.url)
  console.dir(req.headers)
  var auth = new Buffer(req.headers['x-registry-auth'], 'base64').toString()
  console.log(auth)
  res.end('ok')
})

server.listen(8080)