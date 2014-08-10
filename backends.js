var concat = require('concat-stream')
var hyperquest = require('hyperquest')
var async = require('async')

function blankCollection(){
	var ret = {
		names:{},
		shortids:{},
		ids:{}
	}
	return ret
}
function createCollection(address, arr){
	var ret = blankCollection()
	arr.forEach(function(proc){
		(proc.Names || []).forEach(function(name){
			ret.names[name] = address
		})
		var shortId = proc.Id.substr(0,12)
		ret.ids[proc.Id] = address
		ret.shortids[shortId] = address
	})
	return ret
}

function mergeCollection(master, collection){
	Object.keys(collection.names || {}).forEach(function(key){
		master.names[key] = collection.names[key]
	})
	Object.keys(collection.shortids || {}).forEach(function(key){
		master.shortids[key] = collection.shortids[key]
	})
	Object.keys(collection.ids || {}).forEach(function(key){
		master.ids[key] = collection.ids[key]
	})
}

function singleps(address, url, done){
	var req = hyperquest('http://' + address + url)
	.pipe(concat(function(result){
		result = result.toString()
		if(!result){
			result = '[]'
		}
		result = JSON.parse(result)
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
		var collection = blankCollection()
		multiarr.forEach(function(arr, i){
			mergeCollection(collection, createCollection(backends[i], arr))
			ret = ret.concat(arr)
		})
		done(null, ret, collection)
	})
}

module.exports = {
	ps:ps,
	singleps:singleps
}