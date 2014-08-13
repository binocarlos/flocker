var url = require('url')
var EventEmitter = require('events').EventEmitter
var concat = require('concat-stream')
var net = require('net')
var async = require('async')
var utils = require('./utils')
var hyperquest = require('hyperquest')
var backends = require('./backends')

function createContainer(emitter){

	return function(req, res){
		var parsedURL = url.parse(req.url, true)
		var name = parsedURL.query.name
		var dockerVersion = req.headers['X-DOCKER-API-VERSION']

		if(!name){
			res.statusCode = 500
			res.end('please supply a --name flag for the container')
			return
		}

		// check for double named containers
		getContainerServerAddress(emitter, name, function(err, address){

			if(err){
				res.statusCode = 500
				res.end(err)
				return
			}

			if(address){
				res.statusCode = 500
				res.end('container: ' + name + ' already exists on ' + address)
				return
			}

			// we need to grab the container JSON
			// so we can make routing decisions
			req.pipe(concat(function(container){
				try{
					container = JSON.parse(container.toString())	
				} catch(err){
					res.statusCode = 500
					res.end(err)
					return
				}
				var image = container.Image

				// get the routing decision
				emitter.emit('route', {
					name:name,
					image:image,
					container:container
				}, function(err, backend){

					if(!backend){
						err = 'no backend found'
					}

					if(err){
						res.statusCode = 500
						res.end(err)
						return
					}

					async.waterfall([
						function(next){

							var address = dockerVersion ? backend.docker + '/' + dockerVersion : backend.docker
							// now we want to check if the image is downloaded on the target machine
							var req = hyperquest('http://' + address + '/images/' + image + '/json')

							req.on('response', function(r){

								// return the 404 back to the docker client
								// this will result in a hit to /images/create next
								if(r.statusCode==404){
									res.statusCode = 404
									res.end('no such image')
									return
								}
								else{

									r.pipe(concat(function(content){
										content = JSON.parse(content.toString())
										next(null, content)
									}))
									
									
								}
							})

							req.on('error', next)
						},

						function(imageInfo, next){

							emitter.emit('map', name, container, imageInfo, next)
							
						}

					], function(err){

						if(err){
							res.statusCode = 500
							res.end(err)
							return
						}

						// re-create the request for the actual backend docker
						var newreq = utils.cloneReq(req, JSON.stringify(container))
						emitter.emit('proxy', newreq, res, backend.docker)
					})
				})
			}))
		})
		
	}
}

function createImage(emitter){
	return function(req, res){

		var parsedURL = url.parse(req.url, true)
		var image = parsedURL.query.fromImage

		// TODO emit 'auth' event so PaaS can load registry logins
		emitter.emit('route', {
			image:image
		}, function(err, backend){
			if(err){
				res.statusCode = 500
				res.end(err)
				return
			}
			emitter.emit('proxy', req, res, backend.docker)
		})

	}
}


/*

	this needs some work to allow for data to be piped into containers

	as soon as the response headers are written - the docker client starts streaming
	input assuming the attach is setup and buffering

	however - getting to that stream once the response headers have been sent seems hard in node

	the solution could be to have 2 sockets listening with some basic HTTP parsing
	to check if its an attach method and if not then tcp proxy to the HTTP server

	seems complicated though - so gonna leave it for now

	the main idea is to boot servers anyway but piping data into containers dynamically
	allocated is cool
	
*/
function attachContainer(emitter){

	return function(req, res){

		loadContainerServerAddress(emitter, req, res, function(err, address){

			var host = address.split(':')[0]
			var port = address.split(':')[1]

		  var client = net.connect({
		  	host:host,
		  	port:port
		  })

		  client.on('error', function(err) {
		  	res.statusCode = 500
		  	res.end(err)
		  })

		  client.on('connect', function() {
		    client.write('POST ' + req.url + ' HTTP/1.1\r\n' +
					'Content-Type: application/vnd.docker.raw-stream\r\n\r\n');

		    // this looks after the response HTTP headers
		    client.pipe(res.connection)
		    res.on('error', function(){
		    	client.destroy()
		    })
		    res.on('close', function(){
		    	client.destroy()
		    })
		  })

		})
	}
}




function listContainers(emitter){
	return function(req, res){
		emitter.emit('list', function(err, servers){
			if(err){
				res.statusCode = 500
				res.end(err)
				return
			}
			backends.ps(servers, req.url, function(err, result, collection){
				if(err){
					res.statusCode = 500
					res.end(err)
					return
				}
				res.setHeader('content-type', 'application/json')
				res.end(JSON.stringify(result))
			})
		})
	}
}

function getContainerServerAddress(emitter, id, done){
	emitter.emit('list', function(err, servers){
		backends.ps(servers, '/containers/json?all=1', function(err, result, collection){

			if(err){
				return done(err)
			}

			var hostname = utils.searchCollection(collection, id)
			var backend = utils.getServerByHostname(servers, hostname)
			if(!backend){
				return done()
			}
			done(null, backend.docker)
		})
	})
}

function loadContainerServerAddress(emitter, req, res, done){

	if(!req.headers['X-FLOCKER-CONTAINER']){
		res.statusCode = 500
		res.end('no container header')
		return
	}

	var id = req.headers['X-FLOCKER-CONTAINER']

	getContainerServerAddress(emitter, id, function(err, address){
		if(err){
			res.statusCode = 500
			res.end(err)
			return
		}

		if(!address){
			res.statusCode = 404
			res.end('container: ' + id + ' not found')
			return
		}

		// this is the name used when we get back to the real docker server
		var actualname = id.split('@')[0]
		req.url = req.url.replace(id, actualname)

		done(null, address)
	})
}



function targetid(emitter){
	return function(req, res){

		loadContainerServerAddress(emitter, req, res, function(err, address){
			emitter.emit('proxy', req, res, address)
		})

	}
}

module.exports = function(){

	var emitter = new EventEmitter()

	emitter.createContainer = createContainer(emitter)
	emitter.attachContainer = attachContainer(emitter)
	emitter.createImage = createImage(emitter)
	emitter.targetid = targetid(emitter)
	emitter.listContainers = listContainers(emitter)

	return emitter

}