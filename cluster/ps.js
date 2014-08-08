var multireq = require('./multireq')

module.exports = function(version, query, addresses, done){

	multireq('/' + version + '/containers/json?' + query, addresses, function(result){
		return JSON.parse(result.toString())
	})
	
}