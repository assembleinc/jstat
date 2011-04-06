/**
 * jStat - JavaScript Statistical Library
 * Copyright (c) 2011
 * This document is licensed as free software under the terms of the
 * MIT License: http://www.opensource.org/licenses/mit-license.php */
this.jstat = (function( Math, undefined ) {

// global function
var jstat = function() {
		return new jstat.fn.init( slice.call( arguments ));
	},

	// for quick reference
	slice = Array.prototype.slice,
	toString = Object.prototype.toString,

	// ascending/descending functions for sort
	ascNum = function( a, b ) { return a - b; },
	descNum = function( a, b ) { return b - a; },

	// test if array
	isArray = function( arg ) {
		return toString.call( arg ) === "[object Array]";
	},

	// test if function
	isFunction = function( arg ) {
		return toString.call( arg ) === "[object Function]";
	},

	// test if object
	isObject = function( arg ) {
		return toString.call( arg ) === "[object Object]";
	},

	// simple method to run functions in setTimeout
	callLater = function( func, context, values ) {
		setTimeout( function() {
			func.apply( context, values );
		}, 10 );
	};

jstat.fn = jstat.prototype = {
	constructor : jstat,
	init : function( args ) {
		// if first argument is an array, must be vector or matrix
		if ( isArray( args[0] )) {
			if ( isArray( args[0][0] )) {
				for ( var i = 0; i < args[0].length; i++ ) {
					this.push( args[0][i] );
				};
			} else {
				this.push( args[0] );
			};
		// if first argument is number, assume creation of sequence
		} else if ( !isNaN( args[0] )) {
			this.push( jstat.seq.apply( this, args ));
		};
		return this;
	},

	// default length
	length : 0,

	// return clean array
	toArray : function() {
		return slice.call( this, 0 );
	},

	// only to be used internally
	push : Array.prototype.push,
	sort : [].sort,
	splice : [].splice
};
jstat.fn.init.prototype = jstat.fn;

// TODO: there's got to be an easy way to combine these two
// create method for easy extension
jstat.extend = function( obj ) {
	var args = slice.call( arguments ), i = 1, j;
	if ( args.length === 1 ) {
		for ( var i in obj ) {
			jstat[i] = obj[i];
		};
		return this;
	};
	for ( ; i < args.length; i++ ) {
		for ( j in args[i] ) obj[j] = args[i][j];
	};
	return obj;
};
jstat.fn.extend = function( obj ) {
	for ( var i in obj ) {
		jstat.fn[i] = obj[i];
	};
	return this;
};

// extend jstat.fn with single single parameter static methods
(function( funcs ) {
	for ( var i = 0; i < funcs.length; i++ ) (function( passfunc ) {
		jstat.fn[ passfunc ] = function( func ) {
			var arr = [], j = 0;
			if ( isFunction( func )) {
				for ( ; j < this.length; j++ ) {
					callLater( func, jstat( this[j] ), [ jstat[ passfunc ]( this[j][0] )]);
				};
				return this;
			} else {
				for ( ; j < this.length; j++ ) {
					arr.push( jstat[ passfunc ]( this[j][0] ));
				};
				return arr.length === 1 && !isArray( arr[0] ) ? arr[0] : jstat( arr );
			};
		};
	})( funcs[i] );
})( 'sum min max mean median mode range variance stdev meandev meddev quartiles'.split(' '));

// extend jstat.fn
jstat.fn.extend({

	// transpose a vector or matrix
	transpose : function() {
		var rows = this.rows(),
			cols = this.cols(),
			elements = [],
			ni = cols,
			i, nj, j;
		do {
			i = cols - ni;
			elements[i] = [];
			nj = rows;
			do {
				j = rows - nj;
				elements[i][j] = this[j][i];
			} while (--nj);
		} while (--ni);
		return jstat( elements );
	},

	// map one matrix to another
	map : function( func ) {
		var row = 0,
			nrow = this.rows(),
			ncol = this.cols(),
			res = [],
			col;
		for( ; row < nrow; row ++) {
			res[row] = []
			for( col = 0; col < ncol; col++ ) {
				res[row][col] = func( this[row][col], row, col );
			}
		}
		return jstat(res);
	},

	// apply a function to each element in the matrix
	apply : function( func ) {
		var row = 0, nrow = this.rows(), col, ncol = this.cols();
		for( ; row < nrow; row ++) {
			for( col = 0; col < ncol; col++ ) {
				this[row][col] = func( this[row][col], row, col );
			}
		}
		return this;
	},

	// add a vector or scalar to the vector
	add : function( k ) {
		if( isNaN( k ) ) {
			return this.map( function( value, row, col ) { return value + k[row][col] })
		} else {
			return this.map( function ( value ) { return value + k; } );
		}
	},

	// TODO: Implement matrix division
	// matrix division
	divide : function( k ) {
		if( isNaN( k ) ) {
			// unsupported operation
		} else {
			return this.map( function ( value ) { return value / k; } );
		}
	},

	// matrix multiplication
	multiply : function( k ) {
		var row,col,nrescols,nrow=this.rows(),ncol = this.cols(), sum = 0,
		res = jstat.zeros(nrow, nrescols = ( isNaN( k ) ) ? k.cols() : ncol),
		rescols = 0;

		if( isNaN(k) ) {
			for( ; rescols < nrescols; rescols++ ) {
				for( row = 0; row < nrow; row++ ) {
					sum = 0;
					for( col = 0; col < ncol; col++ ) {
						sum += this[row][col] * k[col][rescols];
					}
					res[row][rescols] = sum;
				}
			}
			return ( nrow == 1 && rescols == 1 ) ? res[0][0] : res;
		} else {
			return this.map( function ( value ) { return value * k; } );
		}
		
	},

	// subtract a vector or scalar from the vector
	subtract : function( k ) {
		if( isNaN( k ) ) {
			return this.map( function( value, row, col ) { return value - k[row][col] })
		} else {
			return this.map( function ( value ) { return value - k; } );
		}
	},

	// Returns the dot product of two matricies
	dot : function( k ) {
		// convert column to row vector
		var left = ( this.cols() === 1 && this.rows() !== 1 ) ? this.transpose() : this,
			right = ( k.cols() === 1 && k.rows() !== 1 ) ? k.transpose() : k,
			sum, res = [], row = 0, col, nrow = left.rows(), ncol = left.cols();
		
		for( ; row < nrow; row++ ) {
			res[row] = [];
			sum = 0;
			for( col = 0; col < ncol; col++ ) {
				sum += left[row][col] * right[row][col];
			}
			res[row] = sum;
		}
		return ( res.length === 1 ) ? res[0] : jstat(res);
	},

	// raise every element by a scalar or vector
	pow : function( k ) {
		return this.map( function( value ) { return Math.pow( value, k ); } );
	},

	// generate the absolute values of the vector
	abs : function() {
		return this.map( function( value ) { return Math.abs( value ); } );
	},

	// set all values to zero
	clear : function() {
		return this.apply( function() { return 0; } );
	},

	// Returns the dimensions of the object { rows: i, cols: j }
	dimensions : function() {
		return { rows: this.rows(), cols: this.cols() };
	},

	// Returns the largest value of the matrix
	max : function() {
		var row = 0, nrow = this.rows(), max = -Infinity, tMax;
		for( ; row < nrow; row++ ) {
			tMax = jstat.max( this[row] )
			if( tMax > max ) max = tMax;
		}
		return max;
	},

	// Returns the smallest value of the matrix
	min : function() {
		var row = 0, nrow = this.rows(), min = Infinity, tMin;
		for( ; row < nrow; row++ ) {
			tMin = jstat.min( this[row] )
			if( tMin < min ) min = tMin;
		}
		return min;
	},

	// Returns the sum of each column in the matrix
	sum : function() {
		var  col = 0, ncol = this.cols(), res = [ncol];
		for( ; col < ncol; col++ ) {
			res[col] = +jstat.sum( this.col(col) )
		}
		return jstat( res );
	},

	// Returns the mean of each column in the matrix
	mean : function() {
		var  col = 0, ncol = this.cols(), res = [ncol];
		for( ; col < ncol; col++ ) {
			res[col] = +jstat.mean( this.col(col) )
		}
		return jstat( res );
	},

	// Returns the standard deviation of each column in the matrix
	std : function() {
		var  col = 0, ncol = this.cols(), res = [ncol];
		for( ; col < ncol; col++ ) {
			res[col] = +jstat.stdev( this.col(col) )
		}
		return jstat( res );
	},

	// Returns the variance of each column in the matrix
	variance : function() {
		var  col = 0, ncol = this.cols(), res = [ncol];
		for( ; col < ncol; col++ ) {
			res[col] = +jstat.variance( this.col(col) )
		}
		return jstat( res );
	},

	// BUG: Does not work for matrices
	// computes the norm of the vector
	norm : function() {
		if( this.rows() > 1 && this.cols() > 1 ) {
			// matrix norm
		} else {
			// vector norm
			return Math.sqrt( this.dot( this ) );
		}
	},

	// BUG: Does not work for matrices
	// computes the angle between two vectors
	angle : function( k ) {
		 return Math.acos( this.dot( k ) / ( this.norm() * k.norm() ) );
	},


	// Tests whether a matrix is symmetric
	symmetric : function() {
		var issymmetric = true, row = 0, size = this.rows(), col;
		for ( ; (row < size) & issymmetric; row++ ) {
			for ( col = 0; (col < size) & issymmetric; col++ ) {
				issymmetric = ( this[col][row] == this[row][col] );
			}
		}
		return issymmetric;
	},

	// Returns the number of rows in the matrix
	rows: function() {
		return this.length || 1;
	},

	// Returns the number of columns in the matrix
	cols: function() {
		return this[0].length || 1;
	},

	// Returns a specified row as a vector
	row: function( index ) {
	    return jstat( this[index] );
	},

	// Returns the specified column as a vector
	col: function( index ) {
	    var column = [], i = 0;
	    for( ; i < this.length; i ++) {
		column[i] = [this[i][index]];
	    }
	    return jstat(column);
	},

	// Returns the diagonal of the matrix
	diag : function() {
		var row = 0, nrow = this.rows(), res = [];
		for( ; row < nrow; row ++ ) {
			res[row] = [this[row][row]];
		}
		return jstat( res );
	},

	// Returns the anti-diagonal of the matrix
	antidiag : function() {
		var nrow = this.rows()  -1, res = [], i = 0;
		for( ; nrow >= 0; nrow--,i++ ) {
			res[i] = [this[i][nrow]];
		}
		return jstat( res );
	}
});


// static methods //

jstat.extend({

	// general mathematical calculations //

	// creates a rows x cols matrix of zeros
	zeros : function( rows, cols ) {
		return jstat.create( rows, cols, function() { return 0; } );
	},

	// creates a rows x cols matrix of ones
	ones: function( rows, cols ) {
		return jstat.create( rows, cols, function() { return 1; } );
	},

	// Creates a rows x cols matrix of uniformly random numbers
	rand: function( rows, cols ) {
		return jstat.create( rows, cols, function() { return Math.random(); } );
	},

	// Creates an identity matrix of size row x cols
	identity : function( rows, cols ) {
		return jstat.create( rows, cols, function( i, j ) { return ( i === j ) ? 1 : 0; } );
	},

	// creates a rows x cols matrix according to the supplied function
	create: function ( rows, cols, func ) {
		var i, j, res = [];
		for( i = 0; i < rows; i++ ) {
			res[i]  = [];
			for( j = 0; j < cols; j++ ) {
				res[i][j] = func( i, j );
			}
		}
		return jstat( res );
	},

	// factorial of n
	factorial : function( n ) {
		var fval = 1;
		if ( n < 0 ) return NaN;
		if ( n != Math.floor( n ) ) return jstat.gamma( n + 1 );
		for( ; n > 0; n-- ) {
			fval *= n;
		};
		return fval;
	},

	// combinations of n, m
	combination : function( n, m ) {
		return ( jstat.factorial( n ) / jstat.factorial( m ) ) / jstat.factorial( n - m );
	},

	// permutations of n, m
	permutation : function( n, m ) {
		return jstat.factorial( n ) / jstat.factorial( n - m );
	},

	// gamma of x
	gamma : function( x ) {
		var v = 1,
			w;
		if ( x == Math.floor( x ) ) return jstat.factorial( x - 1 );
		while ( x < 8 ) {
			v *= x;
			x++;
		};
		w = 1 / (x * x);
		return Math.exp((((((((-3617 / 122400 * w + 7 / 1092) * w - 691 / 360360) * w + 5 / 5940) * w - 1 / 1680)  * w + 1 / 1260) * w - 1 / 360) * w + 1 / 12) / x + 0.5 * Math.log(2 * Math.PI) - Math.log(v) - x + (x - 0.5) * Math.log(x));
	},

	// Log-gamma function
	gammaln : function( xx ) {
		var x, y, tmp, ser,j = 0,
			cof = [76.18009172947146, -86.50532032941677, 24.01409824083091,
				-1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];

		y = x = xx;
		tmp = x + 5.5;
		tmp -= ( x + 0.5 ) * Math.log( tmp );
		ser = 1.000000000190015;
		for( ; j < 5; j++ ) ser += cof[j] / ++y;

		return -tmp + Math.log( 2.5066282746310005 * ser / x);
	},

	// lower incomplete gamma function
	lgamma : function( x, s, dt ) {
		dt = dt || 0.1;
		var sum = 0,
			i = 0;
		for ( ; i <= x; i += dt ) {
			sum += Math.pow( i, s - 1 ) * Math.exp( -i ) * dt;
		};
		return sum;
	},

	// calcualte sum of f(x) from a to b
	sumFunc : function( a, b, func ) {
		var sum = 0;
		while ( a <= b ) {
			sum += func( a++ );
		};
		return sum;
	},

	// generate sequence
	seq : function( min, max, length, func ) {
		var arr = [],
			step = ( max - min ) / ( length - 1 );
		// TODO: replace toFixed value to user configurable parameter
		for ( ; min <= max; min += step ) arr.push(+( func ? func.call( null, min ) : min ).toFixed(6));
		return arr;
	},

	// vector/matrix specific functionality //

	// sum of an array
	sum : function( arr ) {
		var sum = 0,
			i = arr.length;
		while ( --i >= 0 ) {
			sum += +arr[i];
		};
		return sum;
	},

	// minimum value of an array
	min : function( arr ) {
		return Math.min.apply( null, arr );
	},

	// maximum value of an array
	max : function( arr ) {
		return Math.max.apply( null, arr );
	},

	// mean value of an array
	mean : function( arr ) {
		return jstat.sum( arr ) / arr.length;
	},

	// median of an array
	median : function( arr ) {
		var arrlen = arr.length,
			_arr = arr.slice().sort( ascNum );

		// check if array is even or odd, then return the appropriate
		return !( arrlen & 1 ) ? ( _arr[ ( arrlen / 2 ) - 1 ] + _arr[ ( arrlen / 2 ) ] ) / 2 : _arr[ Math.floor( arrlen / 2 ) ];
	},

	// mode of an array
	mode : function( arr ) {
		var arrLen = arr.length,
			_arr = arr.slice().sort( ascNum ),
			count = 1,
			maxCount = 0,
			numMaxCount = 0,
			i = 0,
			maxNum;
		for ( ; i < arrLen; i++ ) {
			if ( _arr[ i ] === _arr[ i + 1 ] ) {
				count++;
			} else {
				if ( count > maxCount ) {
					maxNum = _arr[i];
					maxCount = count;
					count = 1;
					numMaxCount = 0;
				} else {

					// are there multiple max counts
					if ( count === maxCount ) {
						numMaxCount++;

					// count is less than max count, so reset values
					} else {
						count = 1;
					};
				};
			};
		};

		return ( numMaxCount === 0 ) ? maxNum : false;
	},

	// range of an array
	range : function( arr ) {
		var _arr = arr.slice().sort( ascNum );
		return _arr[ _arr.length - 1 ] - _arr[0];
	},

	// variance of an array
	variance : function( arr ) {
		var mean = jstat.mean( arr ),
			stSum = 0,
			i = arr.length - 1;
		for( ; i >= 0; i-- ) {
			stSum += Math.pow( ( arr[i] - mean ), 2 );
		};
		return stSum / ( arr.length - 1 );
	},

	// standard deviation of an array
	stdev : function( arr ) {
		return Math.sqrt( jstat.variance( arr ) );
	},

	// mean deviation (mean absolute deviation) of an array
	meandev : function( arr ) {
		var devSum = 0,
			mean = jstat.mean( arr ),
			i = arr.length - 1;
		for ( ; i >= 0; i-- ) {
			devSum += Math.abs( arr[ i ] - mean );
		};
		return devSum / arr.length;
	},

	// median deviation (median absolute deviation) of an array
	meddev : function( arr ) {
		var devSum = 0,
			median = jstat.median( arr ),
			i = arr.length - 1;
		for ( ; i >= 0; i-- ) {
			devSum += Math.abs( arr[ i ] - median );
		};
		return devSum / arr.length;
	},

	// quartiles of an array
	quartiles : function( arr ) {
		var arrlen = arr.length,
			_arr = arr.slice().sort( ascNum );
		return [ _arr[ Math.round( ( arrlen ) / 4 ) - 1 ], _arr[ Math.round( ( arrlen ) / 2 ) - 1 ], _arr[ Math.round( ( arrlen ) * 3 / 4 ) - 1 ] ];
	},

	// covariance of two arrays
	covariance : function( arr1, arr2 ) {
		var u = jstat.mean( arr1 ),
			v = jstat.mean( arr2 ),
			sq_dev = [],
			arr1Len = arr1.length,
			i = 0;
		for ( ; i < arr1Len; i++ ) {
			sq_dev[ i ] = ( arr1[ i ] - u ) * ( arr2[ i ] - v );
		};
		return jstat.sum( sq_dev ) / arr1Len;
	},

	// Returns the incomplete beta function I_x(a,b)
	incompleteBeta : function( x, a, b ) {

		if( isNaN( x ) ) {
			// run for all values in matrix
			return x.map( function( value ) { return jstat.incompleteBeta( value, a, b ) } );
		}

		// Evaluates the continued fraction for incomplete beta function
		// by modified Lentz's method.
		function betacf( x, a, b ) {
			// TODO: make fpmin constant?
			var m = 1, m2, aa, c, d, del, h, qab, qam, qap, fpmin = 1e-30;

			// These q's will be used in factors that occur in the coefficients
			qab = a + b;
			qap = a + 1;
			qam = a - 1;

			c = 1;
			d = 1 - qab * x / qap;

			if( Math.abs( d ) < fpmin ) d = fpmin;

			d = 1 / d;
			h = d;

			// TODO: replace 100 with MAXIT constant
			for ( ; m <= 100; m++ ) {
				m2 = 2 * m;
				aa = m * ( b - m ) * x / ( ( qam + m2 ) * ( a + m2 ) );
				d = 1 + aa * d;	// One step (the even one) of the recurrence

				// TODO: Make precision check function?
				if( Math.abs( d ) < fpmin ) d = fpmin;

				c = 1 + aa / c;

				if( Math.abs( c ) < fpmin ) c = fpmin;

				d = 1 / d;

				h *= d * c;

				aa = -( a + m ) * ( qab + m ) * x / ( ( a + m2 ) * ( qap + m2 ) );
				d = 1 + aa * d;	// Next step of the recurrence (the odd one)

				if( Math.abs( d ) < fpmin ) d = fpmin;

				c = 1 + aa / c;

				if( Math.abs( c ) < fpmin ) c = fpmin;

				d = 1 / d;

				del = d * c;

				h *= del;

				// TODO: make 3e-7 a constant
				if( Math.abs( del - 1.0 ) < 3e-7 ) break;	// Are we done?
			}

			return h;
		}

		var bt = ( x === 0 || x === 1 ) ?  0 :
			Math.exp(jstat.gammaln( a + b ) - jstat.gammaln( a ) -
			jstat.gammaln( b ) + a * Math.log( x ) + b *
			Math.log( 1 - x ));	// Factors in front of the continued fraction.

		if( x < ( a + 1 ) / ( a + b + 2 ) )
			// Use continued fraction directly.
			return bt * betacf( x, b, a ) / a;

		// else use continued fraction after making the symmetry transformation.
		return 1 - bt * betacf( 1 - x, b, a ) / b;

	},

	// correlation coefficient of two arrays
	corrcoeff : function( arr1, arr2 ) {
		return jstat.covariance( arr1, arr2 ) / jstat.stdev( arr1 ) / jstat.stdev( arr2 );
	},


	// statistical distribution calculations //

	// beta distribution
	beta : {

		pdf : function( x, alpha, beta ) {
			return jstat.gamma( alpha + beta ) / ( jstat.gamma( alpha ) * jstat.gamma( beta )) * Math.pow( x, alpha - 1 ) * Math.pow( 1 - x, beta - 1 );
		},

		// cumulative beta distribution
		// BUG: returns Infinity when a < 1
		cdf : function( x, alpha, beta, dt ) {
			var ab1 = alpha + beta - 1,
				fact = jstat.factorial,
				gamma = jstat.gamma,
				ab1fact = fact( ab1 ),
				j = alpha,
				sum = 0;

			// quick calculation if a and b are integers
			if ( alpha === Math.floor( alpha ) && beta === Math.floor( beta )) {
				for ( ; j <= ab1; j++ ) {
					sum += ab1fact / ( fact( j ) * fact( ab1 - j )) * Math.pow( x, j ) * Math.pow( 1 - x, ab1 - j );
				};
				return sum;
			};

			// otherwise will have to integrate
			dt = dt || 0.1;
			for ( j = 0.1; j <= x; j += dt ) {
				sum += jstat.beta( j, alpha, beta ) * dt;
			};
			return sum;
		},

		mean : function( alpha, beta ) {
			return alpha / ( alpha + beta );
		},

		median : function( alpha, beta ) {
			// TODO: implement beta median
		},

		mode : function( alpha, beta ) {
			return ( alpha * beta ) / ( Math.pow( alpha + beta, 2 ) * ( alpha + beta + 1 ));
		}
	},

	// cauchy distribution
	cauchy : {

		pdf : function( x, xn, l ) {
			return ( l / ( Math.pow( x - xn, 2) + Math.pow( l, 2 ))) / Math.PI;
		},

		// cumulative probability for cauchy distribution
		cdf : function( x, xn, l ) {
			return Math.atan(( x - xn) / l ) / Math.PI + 0.5;
		}
	},

	// chi-square distribution
	chisquare : {
		
		pdf : function( x, k ) {
			return (Math.pow( x, k / 2 - 1) * Math.exp( -x / 2 )) / ( Math.pow( 2, k / 2) * jstat.gamma( k / 2 ));
		},

		// cumulative uniform distribution
		cdf : function( x, k ) {
			return jstat.lgamma( x / 2, k / 2 ) / jstat.gamma( k / 2 );
		}
	},

	// uniform distribution
	uniform : function( x, a, b ) {
		return ( x < a || x > b ) ? 0 : 1 / ( b - a );
	},

	// uniform distribution in terms of mean and standard dev
	uniformmv : function( x, m, s ) {
		var sqrtt = Math.sqrt( -3 );
		return ( -s * sqrtt <= x - m || x - m <= s * sqrtt )
			? 1 / ( 2 * s * sqrtt )
		: 0;
	},

	// cumulative uniform distribution
	uniformcdf : function( x, a, b ) {
		if ( x < a ) {
			return 0;
		} else if ( x < b ) {
			return ( x - a ) / ( b - a );
		};
		return 1;
	},

	// cumulative uniform distribution in terms of mean and standard dev
	uniformdcdfmv : function( x, m, s ) {
		var sqrtt = Math.sqrt( -3 );
		return ( x - m < -s * sqrtt )
			? 0
		: ( x - m >= s * sqrtt )
			? 1
		: 0.5 * (( x - m ) / ( s * sqrtt ) + 1 );
	},

	// binomial distribution - probability mass
	binomial : function( k, n, p ) {
		return jstat.combination( n, k ) * Math.pow( p, k ) * Math.pow( 1 - p, n - k );
	},

	// cumulative binomial distribution
	binomialcdf : function( x, n, p ) {
		var binomarr = [],
			k = 0,
			i = 0,
			sum = 0;
		if ( x < 0 ) {
			return 0;
		};
		if ( x < n ) {
			for ( ; k < n; k++ ) {
				binomarr[ k ] = jstat.binomial( k, n, p );
			};
			for ( ; i <= x; i++ ) {
				sum += binomarr[ i ];
			};
			return sum;
		};
		return 1;
	},

	// weibull distribution of x
	weibull : function( x, a, b ) {
		return x < 0 ? 0 : ( a / b ) * Math.pow(( x / b ),( a - 1 )) * Math.exp(-( Math.pow(( x / b ), a )));
	},

	// cumulative probability of x for weibull distibution
	weibullcdf : function( x, a, b ) {
		return x < 0 ? 0 : 1 - Math.exp( Math.pow(-( x / b ), a ));
	},

	// negative binomial distribution
	negbin : function( k, r, p ) {
		return k !== Math.floor( k )
			? false
		: k < 0
			? 0
		: jstat.combination( k + r - 1, k ) * Math.pow( 1 - p, r ) * Math.pow( p, k );
	},

	// cumulative probability for negative binomial distribution
	negbincdf : function( x, r, p ) {
		var sum = 0,
			k = 0;
		if ( x < 0 ) return 0;
		for ( ; k <= x; k++ ) {
			sum += jstat.negbin( k, r, p );
		};
		return sum;
	},

	// hypogeometric distribution
	hypgeom : function( k, N, m, n ) {
		return x !== Math.floor( x )
			? false
		: ( x < 0)
			? 0
		: jstat.combination( m, k ) * jstat.combination( N - m , n - k ) / jstat.combination( N, n );
	},

	// cumulative probability for hypogeometric distribution
	hypgeomcdf : function( x, N, m, n ) {
		var sum = 0,
			k = 0;
		if ( x < 0 ) return 0;
		for ( ; k <= x; k++ ) {
			sum += jstat.hypgeom( k, N, m, n );
		};
		return sum;
	},

	// exponential distribution
	exponential : function( x, l ) {
		return x < 0 ? 0 : l * Math.exp( -l * x );
	},

	// cumulative probability for exponential distribution
	exponentialcdf : function( x, l ) {
		return x < 0 ? 0 : 1 - Math.exp( -l * x );
	},

	// poisson distribution
	poisson : function( k, l ) {
		return Math.pow( l, k ) * Math.exp( -l ) / jstat.factorial( k );
	},

	// cumulative probability for poisson distribution
	poissoncdf : function( x, l ) {
		var sum = 0,
			k = 0;
		if ( x < 0 ) return 0;
		for ( ; k <= x; k++ ) {
			sum += jstat.poisson( k, l );
		};
		return sum;
	}
});

// exposing jstat
return jstat;

})( Math );
