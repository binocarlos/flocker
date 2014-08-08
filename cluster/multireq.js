var hyperquest = require('hyperquest')
var async = require('async')

module.exports = function(req, addresses, mapfn, done){

	if(arguments.length<=3){
		done = mapfn
		mapfn = null
	}

	var fns = {}
	addresses.forEach(function(address){
		fns[address] = function(next){
			var req = hyperquest.get('http://' + address + req.url).pipe(concat(function(result){
				result = mapfn ? mapfn(result) : result
				next(null, result)
			}))

			req.on('error', next)
		}
	})

	async.parallel(fns, done)

}