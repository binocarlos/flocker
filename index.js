var hyperprox = require('hyperprox')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var Router = require('./router')
var Handlers = require('./handlers')

function Flocker(){
	EventEmitter.call(this)
	var self = this;
	this.handlers = Handlers()
	this.router = Router()
	this.proxy = hyperprox(function(req, next){
		next(null, req._dockerHost)
	})
	this.proxyhandler = this.proxy.handler()
	this.setupRouterEvents()
}

util.inherits(Flocker, EventEmitter)

Flocker.prototype.setupRouterEvents = function(){
	this.router.on('create', )
}

Flocker.prototype.route = function(done){
	this.emit('route', {
		req:req
	}, next)
}

Flocker.prototype.handler = function(){
	return this.handle.bind(thid)
}

Flocker.prototype.handle = function(req, res){
	this.router.handler(req, res)
}

module.exports = function(){
	return new Flocker()
}