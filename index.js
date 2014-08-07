var EventEmitter = require('events').EventEmitter
var util = require('util')

function Flocker(){
	EventEmitter.call(this)
}

util.inherits(Flocker, EventEmitter)

Flocker.prototype.handle = function(req, res){
	res.end('ok')
}

module.exports = function(){
	return new Flocker()
}