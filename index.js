var hyperprox = require('hyperprox')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var Router = require('./router')
var Handlers = require('./handlers')
var Cluster = require('./cluster')
var through = require('through2')

function Flocker(){
	EventEmitter.call(this)
	var self = this;	
	this.router = Router()
	this.handlers = Handlers()
	this.cluster = Cluster()

	this.handlers.on('allocate', function(name, container, next){
		self.emit('allocate', name, container, function(err, address){
			if(err) return next(err)
		})
	})

	// key value store
	this.handlers.on('get', function(key, next){
		self.emit('get', key, next)
	})
	this.handlers.on('set', function(key, value, next){
		self.emit('set', key, value, next)
	})
	this.handlers.on('delete', function(key, next){
		self.emit('delete', key, next)
	})

	// we need a list of servers
	this.handlers.on('list', function(next){
		self.emit('list', next)
	})
	this.cluster.on('list', function(next){
		self.emit('list', next)
	})

	// we need to find a container in the cluster
	this.handlers.on('locate', function(container, done){
		self.cluster.find(container, done)
	})
	this.router.on('containers:create', this.handlers.createContainer)
	this.router.on('images:create', this.handlers.createimage)
	this.router.on('ping', this.handlers.ping)
	this.router.on('ps', this.handlers.ps)
	this.router.on('targeted', this.handlers.targeted)
}

util.inherits(Flocker, EventEmitter)

Flocker.prototype.handler = function(){
	return this.handle.bind(thid)
}

Flocker.prototype.handle = function(req, res){
	this.emit('request', req, res)
	this.router.handler(req, res)
}

module.exports = function(){
	return new Flocker()
}