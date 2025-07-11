/*
	LRU Kit

	Copyright (c) 2021 - 2025 Cédric Ronvel

	The MIT License (MIT)

	Permission is hereby granted, free of charge, to any person obtaining a copy
	of this software and associated documentation files (the "Software"), to deal
	in the Software without restriction, including without limitation the rights
	to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
	copies of the Software, and to permit persons to whom the Software is
	furnished to do so, subject to the following conditions:

	The above copyright notice and this permission notice shall be included in all
	copies or substantial portions of the Software.

	THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
	IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
	FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
	AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
	LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
	OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
	SOFTWARE.
*/

"use strict" ;



function LRUMap( sectorMaxItem = 250000 , sectorCount = 4 ) {
	this.sectorMaxItem = sectorMaxItem ;
	this.sectorCount = sectorCount ;
	this.maps = new Array( this.sectorCount ) ;

	for ( let i = 0 ; i < this.sectorCount ; i ++ ) {
		this.maps[ i ] = new Map() ;
	}

	this.opCount = 0 ;
}

module.exports = LRUMap ;



// Set a key/value pair in the “hot” sector.
// Note: undefined is not supported, it does nothing.
LRUMap.prototype.set = function( key , value ) {
	if ( value === undefined ) { return ; }
	if ( this.opCount >= this.sectorMaxItem ) { this.cycle() ; }
	this.maps[ 0 ].set( key , value ) ;
	this.opCount ++ ;
	return this ;
} ;



// Get a key/value, moving it in the “hot” sector
LRUMap.prototype.get = function( key ) {
	var value = this.maps[ 0 ].get( key ) ;
	if ( value !== undefined ) { return value ; }

	for ( let i = 1 ; i < this.sectorCount ; i ++ ) {
		value = this.maps[ i ].get( key ) ;
		if ( value !== undefined ) {
			this.set( key , value ) ;
			this.maps[ i ].delete( key ) ;
			return value ;
		}
	}
} ;



// Check if we have the key without moving it
LRUMap.prototype.has = function( key ) {
	for ( let i = 0 ; i < this.sectorCount ; i ++ ) {
		if ( this.maps[ i ].has( key ) ) { return true ; }
	}

	return false ;
} ;



LRUMap.prototype.delete = function( key ) {
	// Because .set() does not check/delete key in map >= 1, we need to delete that key from all maps, so this is a slow operation.
	for ( let i = 0 ; i < this.sectorCount ; i ++ ) {
		this.maps[ i ].delete( key ) ;
	}
} ;



LRUMap.prototype.cycle = function() {
	for ( let i = this.sectorCount - 1 ; i >= 1 ; i -- ) {
		this.maps[ i ] = this.maps[ i - 1 ] ;
	}

	// Or use last map .clear()???
	// This way we let the GC handles how and when to do it
	this.maps[ 0 ] = new Map() ;
	this.opCount = 0 ;
} ;



// Note that it doesn't give the number of keys, since they can be duplicated
LRUMap.prototype.getSize = function() {
	var size = 0 ;

	for ( let i = 0 ; i < this.sectorCount ; i ++ ) {
		size += this.maps[ i ].size ;
	}

	return size ;
} ;



// Common facilities



LRUMap.prototype.keys = function() {
	var keySet = new Set() ,
		keys = [] ;

	for ( let map of this.maps ) {
		for ( let key of map.keys() ) {
			if ( ! keySet.has( key ) ) {
				keySet.add( key ) ;
				keys.push( key ) ;
			}
		}
	}

	return keys ;
} ;



LRUMap.prototype.values = function() {
	var keySet = new Set() ,
		values = [] ;

	for ( let map of this.maps ) {
		for ( let entry of map ) {
			if ( ! keySet.has( entry[ 0 ] ) ) {
				keySet.add( entry[ 0 ] ) ;
				values.push( entry[ 1 ] ) ;
			}
		}
	}

	return values ;
} ;



LRUMap.prototype.entries = function() {
	var keySet = new Set() ,
		entries = [] ;

	for ( let map of this.maps ) {
		for ( let entry of map ) {
			if ( ! keySet.has( entry[ 0 ] ) ) {
				keySet.add( entry[ 0 ] ) ;
				entries.push( entry ) ;
			}
		}
	}

	return entries ;
} ;



LRUMap.prototype[Symbol.iterator] = function*() {
	var keySet = new Set() ;

	for ( let map of this.maps ) {
		for ( let [ key , value ] of map ) {
			if ( ! keySet.has( key ) ) {
				keySet.add( key ) ;
				yield [ key , value ] ;
			}
		}
	}
} ;

