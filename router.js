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

	var containerjson = {
		GET:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			emitter.emit('containers:ps', req, res)
		}
	}

	var containerCreate = {
		POST:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			emitter.emit('containers:create', req, res)
		}
	}

	var containerStart = {
		POST:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			setContainerHeader(req, opts.params.id)
			emitter.emit('containers:start', req, res)
		}
	}

	var imageCreate = {
		POST:function(req, res, opts){
			emitter.emit('images:create', req, res)
		}
	}

	var attach = {
		POST:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			setContainerHeader(req, opts.params.id)
			emitter.emit('containers:attach', req, res)
		}
	}

	var deleteContainer = {
		DELETE:function(req, res, opts){
			setVersionHeader(req, opts.params.version)
			setContainerHeader(req, opts.params.id)
			emitter.emit('containers:targetid', req, res)
		}
	}

	var targetedContainer = function(req, res, opts){
		setVersionHeader(req, opts.params.version)
		setContainerHeader(req, opts.params.id)
		emitter.emit('containers:targetid', req, res)
	}

	router.addRoute('/:version/containers/json', containerjson)
	router.addRoute('/containers/json', containerjson)

	router.addRoute('/:version/containers/create', containerCreate)
	router.addRoute('/containers/create', containerCreate)

	router.addRoute('/:version/containers/:id/start', containerStart)
	router.addRoute('/containers/:id/start', containerStart)

	router.addRoute('/images/create', imageCreate)

	router.addRoute('/:version/containers/:id/attach', attach)
	router.addRoute('/containers/:id/attach', attach)

	router.addRoute('/:version/containers/:id', deleteContainer)
	router.addRoute('/containers/:id', deleteContainer)

	// these requests are for a specific container therefore server
	// let the backend docker work out HTTP methods
	router.addRoute('/:version/containers/:id/:method', targetedContainer)
	router.addRoute('/containers/:id/:method', targetedContainer)
	
	emitter.handler = router

	return emitter
}