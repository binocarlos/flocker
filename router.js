var Router = require('routes-router')
var EventEmitter = require('events').EventEmitter

function setVersionHeader(req, version){
	req.headers['X-DOCKER-API-VERSION'] = version
}

function setContainerHeader(req, container){
	req.headers['X-FLOCKER-CONTAINER'] = container
}

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

	router.addRoute('/:version/containers/create', {
		POST:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			emitter.emit('containers:create', req, res)
		}
	})

	router.addRoute('/:version/images/create', {
		POST:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			emitter.emit('images:create', req, res)
		}
	})

	router.addRoute('/:version/containers/:id/json', {
		GET:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			setContainerHeader(req, opts.params.id)
			emitter.emit('ps', req, res)
		}
	})

	emitter.handler = router

	return emitter
}