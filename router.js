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


	router.addRoute('/:version/containers/json', {
		GET:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			emitter.emit('containers:ps', req, res)
		}
	})

	router.addRoute('/:version/containers/create', {
		POST:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			emitter.emit('containers:create', req, res)
		}
	})

	router.addRoute('/images/create', {
		POST:function(req, res, opts){
			emitter.emit('images:create', req, res)
		}
	})

	router.addRoute('/:version/containers/:id/attach', {
		POST:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			setContainerHeader(req, opts.params.id)
			emitter.emit('containers:attach', req, res)
		}
	})

	router.addRoute('/:version/containers/:id', {
		DELETE:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			setContainerHeader(req, opts.params.id)
			emitter.emit('containers:targetid', req, res)
		}
	})

	// these requests are for a specific container therefore server
	// let the backend docker work out HTTP methods
	router.addRoute('/:version/containers/:id/:method', function(req, res, opts){
		setVersionHeader(req, opts.params.version)
		setContainerHeader(req, opts.params.id)
		emitter.emit('containers:targetid', req, res)
	})
	
	emitter.handler = router

	return emitter
}