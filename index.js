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

	// the api handlers that target a specific server
	// will set the X-FLOCKER-HOST header to do the routing
	this.backends = hyperprox(function(req, next){
		if(!req.headers['X-FLOCKER-HOST']){
			return next('no flocker host found')
		}
		var address = req.headers['X-FLOCKER-HOST']
		address = address.indexOf('http')==0 ? address : 'http://' + address
		next(null, req.headers['X-FLOCKER-HOST'])
	})
	this.handlers.on('allocate', function(name, container, next){
		self.emit('allocate', name, container, function(err, address){
			if(err) return next(err)
		})
	})
	this.handlers.on('list', function(next){
		self.emit('list', next)
	})
	this.cluster.on('list', function(next){
		self.emit('list', next)
	})
	this.handlers.on('duplex', function(req, res, done){
		var duplex = self.backends.duplex(req, res)
		var inputFilter = through(function(chunk, enc, next){
			console.log('INPUT: ' + chunk.toString())
			this.push(chunk)
			next()
		})
		var outputFilter = through(function(chunk, enc, next){
			chunk = chunk.toString().replace(/\(tag: \w+\)/, '(tag: pears)')
			console.log('OUTPUT: ' + chunk.toString())
			this.push(chunk)
			next()
		})
		req.pipe(inputFilter).pipe(duplex).pipe(outputFilter).pipe(res)
	})
	// run the backend request but dont auto forward to the response
	this.handlers.on('run', function(req, done){
		var duplex = self.backends.duplex(req, res)
		var inputFilter = through(function(chunk, enc, next){
			console.log('RUN INPUT: ' + chunk.toString())
			this.push(chunk)
			next()
		})
		var outputFilter = through(function(chunk, enc, next){
			chunk = chunk.toString().replace(/\(tag: \w+\)/, '(tag: pears)')
			console.log('RUN OUTPUT: ' + chunk.toString())
			this.push(chunk)
			next()
		})
		req.pipe(inputFilter).pipe(duplex).pipe(outputFilter).pipe(concat(function(result){
			done(null, result)
		}))
		duplex.on('error', done)
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