var url = require('url')
var EventEmitter = require('events').EventEmitter
var concat = require('concat-stream')
var utils = require('./utils')

/*

	create requires allocate routing
	
*/
function create(emitter){
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
			emitter.emit('allocate', name, container, function(err, address){
				req.headers['X-VIKING-HOST'] = address
				var newreq = utils.cloneReq(req, JSON.stringify(container))
				emitter.emit('proxy', newreq, res)
			})
			
		}))
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

	emitter.create = create(emitter)
	emitter.ping = ping(emitter)
	emitter.ps = ps(emitter)
	emitter.targeted = targeted(emitter)

	return emitter

}