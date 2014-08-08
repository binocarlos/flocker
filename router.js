var Router = require('routes-router')
var EventEmitter = require('events').EventEmitter

module.exports = function(){
	var emitter = new EventEmitter()
	var router = Router({
	  errorHandler: function (req, res) {
	  	console.log('-------------------------------------------');
	  	console.log(';error')
	    res.statusCode = 500
	    res.end("no u")
	  },
	  notFound: function (req, res) {
	  	console.log('not found')
	    res.statusCode = 404
	    res.end("oh noes")
	  }
	})

	router.addRoute('/:version/containers/create', function(req, res){
		console.log('-------------------------------------------');
		console.log('create')
		emitter.emit('create', res, res)
	})

	router.addRoute('/*', function(req, res){
		console.log('-------------------------------------------');
		console.log('generic')
		emitter.emit('generic', res, res)
	})

	emitter.handler = function(req, res){
		console.log('-------------------------------------------');
		console.dir(req.url)
		router(req, res)
	}

	return emitter
}