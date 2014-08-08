var args = require('minimist')(process.argv, {
	alias:{
		
	},
	default:{
		
	}
})

var commands = {
	stub:function(){
		require('./test/stub.js')
	},
	
}

var command = args._[2]