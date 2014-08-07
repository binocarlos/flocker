var hyperprox = require('hyperprox')
var EventEmitter = require('events').EventEmitter
var util = require('util')

function Flocker(){
	EventEmitter.call(this)
	var self = this;
	this.proxy = hyperprox(function(req, next){
		self.emit('route', {
			req:req
		}, next)
	})
	this.proxy.on('request', function(req, res){
		self.emit('request', req, res)
	})
	this.proxyhandler = this.proxy.handler()
}

util.inherits(Flocker, EventEmitter)

Flocker.prototype.handler = function(){
	return this.handle.bind(thid)
}

Flocker.prototype.handle = function(req, res){
	this.proxyhandler(req, res)
}

module.exports = function(){
	return new Flocker()
}