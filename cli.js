var args = require('minimist')(process.argv, {
	alias:{
		
	},
	default:{
		
	}
})

console.log('hello here')
process.stdin.pipe(process.stdout)