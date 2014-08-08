var EventEmitter = require('events').EventEmitter

/*

	create requires allocate routing
	
*/
function create(emitter){
	return function(req, res){
			
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