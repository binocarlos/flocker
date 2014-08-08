flocker
-------

treat a flock of dockers as a single docker similar to the [libswarm](https://github.com/docker/libswarm) aggregate backend

## install

```
$ npm install flocker
```

## usage

A flocker proxy will route HTTP requests from the standard docker client back to a collection of docker hosts.

You pass functions to decide on routing and to list the current inventory.

```js
var http = require('http')
var flocker = require("flocker")

var dockers = flocker()

// we need to route a container onto a single server
dockers.on('allocate', function(info, next){
	// use info to decide which server to route to
	chooseServer(info, function(err, address){
		if(err) return next(err)
		// address is 127.0.0.1:2375 style string
		next(null, address)
	})
})

// we need a list of all servers for aggregate commands
dockers.on('list', function(next){

	// we can load the list from a database
	// it should return a comma delimited string of addresses
	listServers(next)
})

var server = http.createServer(function(req, res){

	// we can do custom auth/routing logic here
	dockers.handle(req, res)	
})

// we now have a multi-docker server compatable with the standard docker client
server.listen(80)
```

## api

#### `var dockers = flocker()`

Create a new docker proxy

## events

#### `dockers.on('allocate', function(info, next){})`

Called when a new container needs allocating to a docker server

This function is your chance to customize your network by changing what server / environment variables etc

info is an object with the following properties:

 * name - the name of the container
 * container - the JSON object describing the container

Call next with a string representing the docker server to send the request to e.g. `127.0.0.1:2375`

Any changes made to the info will apply to the forwarded request - this lets you intercepts create requests and route them where you choose and change environment variables etc

```js
dockers.on('allocate', function(info, next){
	doSomeAsyncStuff(function(err, meta){
		info.container.name = meta.name
		next(null, meta.server)
	})
})
```

#### `dockers.on('list', function(next){})`

Called when the proxy needs a list of all current servers

An array of docker endpoint strings should be returned

```js
var dockerServers = ['192.168.8.120:2375','192.168.8.121:2375','192.168.8.122:2375']

dockers.on('list', function(next){
	next(null, dockerServers.join(','))
})
```

## license

MIT