flocker
-------

treat a flock of dockers as a single docker

## install

```
$ npm install flocker
```

## usage

A flocker proxy will route HTTP requests from the standard docker client back to a collection of docker hosts.

```js
var http = require('http')
var flocker = require("flocker")

var dockers = flocker()

// we need to route a container onto a single server
dockers.on('route', function(info, next){
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

#### `dockers.on('route', function(info, next){})`

Called when the proxy needs to route a request to a single container

info is an object with the following properties:

 * id - the container id
 * name - the name of the container
 * req - the actual request

Call next with a string representing the docker server to send the request to e.g. `127.0.0.1:2375`

#### `dockers.on('list', function(next){})`

Called when the proxy needs a list of all current servers

An array of docker endpoint strings should be returned

## license

MIT