var hyperprox = require('hyperprox')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var Router = require('./router')
var Handlers = require('./handlers')
var Cluster = require('./cluster')

function Flocker(){
	EventEmitter.call(this)
	var self = this;	
	this.router = Router()
	this.handlers = Handlers()
	this.cluster = Cluster()
	this.proxy = hyperprox(function(req, next){
		if(!req.headers['X-FLOCKER-HOST']){
			return next('no viking docker host found')
		}
		var address = req.headers['X-FLOCKER-HOST']
		address = address.indexOf('http')==0 ? address : 'http://' + address
		next(null, req.headers['X-FLOCKER-HOST'])
	})
	this.proxyhandler = this.proxy.handler()
	this.handlers.on('allocate', function(name, container, next){
		self.emit('allocate', name, container, next)
	})
	this.handlers.on('list', function(next){
		self.emit('list', next)
	})
	this.cluster.on('list', function(next){
		self.emit('list', next)
	})
	this.handlers.on('proxy', function(req, res){
		self.proxyhandler(req, res)
	})
	this.handlers.on('find', function(container, done){
		self.cluster.find(container, done)
	})
	this.router.on('create', this.handlers.create)
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