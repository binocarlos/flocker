var url = require('url')
var EventEmitter = require('events').EventEmitter
var concat = require('concat-stream')
var async = require('async')
var hyperquest = require('hyperquest')
var utils = require('./utils')

function saveAllocation(emitter, name, image, address, done){

	// run the initial /containers/create and if 404

	async.parallel([

		/*
		
			write the address to /image/<imagename> so the next /images/create?fromImage=<image>
			will get routed to address
			
		*/
		function(next){
			emitter.emit('set', '/image/' + image, address, next)
		},

		/*
		
			write the address to /container/<name> so the next /containers/create?name=<name>
			will get routed to address
			
		*/
		function(next){
			emitter.emit('set', '/container/' + name, address, next)
		}
	], done)
}

function loadContainerAllocation(emitter, name, done){
	emitter.emit('get', '/container/' + name, done)
}

function loadImageAllocation(emitter, imagename, done){
	emitter.emit('get', '/image/' + imagename, done)
}

function createContainer(emitter){
	return function(req, res){

		var parsedURL = url.parse(req.url, true)
		var name = parsedURL.query.name
		
		req.pipe(concat(function(container){
			try{
				container = JSON.parse(container.toString())	
			} catch(err){
				res.statusCode = 500
				res.end(err)
				return
			}
			var image = container.Image

			/*
			
				check for an existing allocation
				
			*/

			emitter.emit('allocate', name, container, function(err, address){
				
				var newreq = utils.cloneReq(req, JSON.stringify(container))

				var backend = hyperquest(address + newreq.url, {
					method:newreq.method,
					headers:newreq.headers
				})

				backend.on('error', function(err){
					res.statusCode = 500
					res.end(err)
					return
				})

				backend.on('response', function(backendres){

					function pipeResponse(){
						res.statusCode = backendres.statusCode
						res.headers = backendres.headers
						backendres.pipe(res)
					}

					/*
					
						this means the image is not on the server and we need to get ready for a client pull request arriving again shortly
						
					*/
					if(backendres.statusCode==404){
						saveAllocation(emitter, name, image, address, pipeResponse)
					}
					/*
					
						otherwise just proxy the response back to the docker client
						
					*/
					else{
						pipeResponse()
					}
				})

				newreq.pipe(backend)

			})
			
		}))
	}
}


function createImage(emitter){
	return function(req, res){

		var parsedURL = url.parse(req.url, true)
		var image = parsedURL.query.fromImage
		
		console.log('-------------------------------------------');
		console.log(image)
	}
}


/*

	these are parallel and hit all dockers
	
*/
function ping(emitter){
	return function(req, res){
		
	}
}

function ps(emitter){
	return function(req, res){
		console.log('-------------------------------------------');
		console.log('PS')
		console.log('-------------------------------------------');
		console.dir(req.headers)
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
	emitter.ping = ping(emitter)
	emitter.ps = ps(emitter)
	emitter.targeted = targeted(emitter)

	return emitter

}