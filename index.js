var hyperprox = require('hyperprox')
var EventEmitter = require('events').EventEmitter
var util = require('util')
var Router = require('./router')
var Handlers = require('./handlers')

function Flocker(){
	EventEmitter.call(this)
	var self = this;	
	this.router = Router()
	this.handlers = Handlers()
	this.proxy = hyperprox(function(req, next){
		if(!req.headers['X-VIKING-HOST']){
			return next('no viking docker host found')
		}
		next(null, req.headers['X-VIKING-HOST'])
	})
	this.handlers.on('allocate', function(info, next){
		self.emit('allocate', info, next)
	})
	this.handlers.on('list', function(next){
		self.emit('list', next)
	})
	this.handlers.on('proxy', function(req, res){
		self.proxy(res, res)
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