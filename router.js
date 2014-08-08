var Router = require('routes-router')
var EventEmitter = require('events').EventEmitter

module.exports = function(){
	var emitter = new EventEmitter()
	var router = Router({
	  errorHandler: function (req, res) {
	    res.statusCode = 500
	    res.end("error")
	  },
	  notFound: function (req, res) {
	    res.statusCode = 404
	    res.end("not found")
	  }
	})

	router.addRoute('/:version/containers/create', function(req, res){
		emitter.emit('create', req, res)
	})

	emitter.handler = router

	return emitter
}