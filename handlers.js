var url = require('url')
var EventEmitter = require('events').EventEmitter
var concat = require('concat-stream')
var async = require('async')
var through = require('through2')
var net = require('net')
var hyperquest = require('hyperquest')
var from = require('from2')
var utils = require('./utils')
var backends = require('./backends')

function createContainer(emitter){

	return function(req, res){
		var parsedURL = url.parse(req.url, true)
		var name = parsedURL.query.name
		
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

			// get the routing done
			emitter.emit('route', {
				name:name,
				image:image,
				container:container
			}, function(err, backend){

				if(err){
					res.statusCode = 500
					res.end(err)
					return
				}

				// re-create the request for the actual backend docker
				var newreq = utils.cloneReq(req, JSON.stringify(container))

				var backendreq = hyperquest('http://' + backend.docker + newreq.url, {
					method:newreq.method,
					headers:newreq.headers
				})

				backendreq.on('response', function(r){
					if(r.statusCode==404){
						res.statusCode = r.statusCode
						res.headers = r.headers
						r.pipe(res)
					}
					else{
						backends.imageinfo(backend.docker, req.headers['X-DOCKER-API-VERSION'], image, function(err, imageinfo){
							console.log('-------------------------------------------');
							console.dir(imageinfo)
							process.exit()
						})
					}
				})

				newreq.pipe(backendreq)
			})
		}))
	}
}


function attachContainer(emitter){

	return function(req, res){

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

function loadContainerServerAddress(emitter, req, res, done){

	if(!req.headers['X-FLOCKER-CONTAINER']){
		res.statusCode = 500
		res.end('no container header')
		return
	}

	var id = req.headers['X-FLOCKER-CONTAINER']

	emitter.emit('list', function(err, servers){
		backends.ps(servers, '/containers/json?all=1', function(err, result, collection){

			if(err){
				res.statusCode = 500
				res.end(err)
				return
			}

			// this is the name used when we get back to the real docker server
			var actualname = id.split('@')[0]
			req.url = req.url.replace(id, actualname)

			var hostname = utils.searchCollection(collection, id)
			var backend = utils.getServerByHostname(servers, hostname)
			if(!backend){
				res.statusCode = 404
				res.end('container: ' + id + ' not found')
				return
			}
			done(null, backend.docker)
		})
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