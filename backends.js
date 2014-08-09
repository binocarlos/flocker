var hyperquest = require('hyperquest')
var async = require('async')

function singleps(address, url, done){
	var req = hyperquest('http://' + address + '/' + url).pipe(concat(function(result){
		result = JSON.parse(result.toString())
		done(null, result)
	}))
	req.on('error', done)
}

function ps(backends, url, done){
	async.map(backends, function(backend, next){
		singleps(backend, url, next)
	}, function(err, multiarr){
		if(err) return done(err)
		var ret = []
		multiarr.forEach(function(arr){
			ret = ret.concat(arr)
		})
		done(null, ret)
	})
}

module.exports = {
	ps:ps,
	singleps:singleps
}