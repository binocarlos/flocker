var concat = require('concat-stream')
var hyperquest = require('hyperquest')
var async = require('async')
var utils = require('./utils')

var makeKey = utils.collectionKey

function blankCollection(){
	var ret = {
		names:{},
		shortids:{},
		ids:{}
	}
	return ret
}
function createCollection(backend, arr){
	var address = backend.docker
	var hostname = backend.hostname
	var ret = blankCollection()
	arr.forEach(function(proc){
		var shortId = proc.Id.substr(0,12)
		var procNames = proc.Names || []
		if(procNames.length>0){
			procNames.push(procNames[0] + '@' + hostname)
		}
		else{
			procNames.push(shortId + '@' + hostname)	
		}
		proc.Names = procNames
		procNames.forEach(function(name){
			ret.names[makeKey(name)] = hostname
		})
		ret.ids[makeKey(proc.Id)] = hostname
		ret.shortids[makeKey(shortId)] = hostname
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
		singleps(backend.docker, url, next)
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

function imageinfo(address, version, name, done){
	var req = hyperquest('http://' + address + '/' + version + '/images/' + name + '/json').pipe(concat(function(result){
		done(null, JSON.parse(result.toString()))
	}))
	req.on('error', done)
}

module.exports = {
	ps:ps,
	singleps:singleps,
	imageinfo:imageinfo
}