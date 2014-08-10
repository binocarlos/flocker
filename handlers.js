var url = require('url')
var EventEmitter = require('events').EventEmitter
var concat = require('concat-stream')
var async = require('async')
var through = require('through2')
var hyperquest = require('hyperquest')
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

				emitter.emit('proxy', newreq, res, backend.docker)
			})
		}))
	}
}

function attachContainer(emitter){

	return function(req, res){

		loadContainerServerAddress(emitter, req, res, function(err, address){

			var backend = hyperquest('http://' + address + req.url, {
				method:'POST',
				headers:req.headers
			})

			res.setHeader('transfer-encoding', '')
			res.setHeader('connection', '')

			backend.on('response', function(r){

				res.setHeader('content-type', r.headers['content-type'])
				res.statusCode = r.statusCode
			})

			req.pipe(backend).pipe(res)
			
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



function containerRequest(emitter){
	return function(req, res){

		loadContainerServerAddress(emitter, req, res, function(err, address){
			emitter.emit('proxy', req, res, address)
		})

	}
}


/*

	these are parallel and hit all dockers
	
*/
function ping(emitter){
	return function(req, res){
		
	}
}


/*

	directed towards a specific container
	we need to find the container first
	
*/
function targeted(emitter){
	return function(req, res){

	}
}

module.exports = function(){

	var emitter = new EventEmitter()

	emitter.createContainer = createContainer(emitter)
	emitter.attachContainer = attachContainer(emitter)
	emitter.createImage = createImage(emitter)
	emitter.containerRequest = containerRequest(emitter)
	emitter.listContainers = listContainers(emitter)
	emitter.ping = ping(emitter)
	emitter.targeted = targeted(emitter)

	return emitter

}