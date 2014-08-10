var from = require('from2')

// make a readable stream from a string
function fromString(string) {
  return from(function(size, next) {
    if (string.length <= 0) return this.push(null)
    var chunk = string.slice(0, size)
    string = string.slice(size)
    next(null, chunk)
  })
}

// make a clone of a HTTP request but with a new body ready to stream
function cloneReq(req, newContent){
	var newReq = fromString(newContent)
	newReq.url = req.url
	newReq.method = req.method
	newReq.headers = req.headers
	return newReq
}

function searchCollection(collection, name){
	return collection.ids[collectionKey(name)] || collection.shortids[collectionKey(name)] || collection.names[collectionKey(name, true)]
}

function collectionKey(st, isName){
	return 'container:' + (isName ? '/' : '') + st
}

function getServerByHostname(servers, hostname){
	var backend = null
	servers.forEach(function(b){
		if(b.hostname==hostname){
			backend = b
		}
	})
	return backend
}

module.exports = {
	cloneReq:cloneReq,
	fromString:fromString,
	searchCollection:searchCollection,
	collectionKey:collectionKey,
	getServerByHostname:getServerByHostname
}