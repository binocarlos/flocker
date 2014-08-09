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
			}, function(err, address){

				if(err){
					res.statusCode = 500
					res.end(err)
					return
				}

				// re-create the request for the actual backend docker
				var newreq = utils.cloneReq(req, JSON.stringify(container))

				emitter.emit('proxy', newreq, res, address)
			})
		}))
	}
}


function createImage(emitter){
	return function(req, res){

		var parsedURL = url.parse(req.url, true)
		var image = parsedURL.query.fromImage

		// TODO emit 'auth' event so PaaS can load registry logins
		emitter.emit('route', {
			image:image
		}, function(err, address){
			if(err){
				res.statusCode = 500
				res.end(err)
				return
			}
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
				console.log('-------------------------------------------');
				console.log('-------------------------------------------');
				console.log('result')
				console.dir(result)
				console.dir(collection)
				res.end(JSON.stringify(result))
			})
		})
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
	emitter.createImage = createImage(emitter)
	emitter.listContainers = listContainers(emitter)
	emitter.ping = ping(emitter)
	emitter.targeted = targeted(emitter)

	return emitter

}