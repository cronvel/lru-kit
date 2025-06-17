/*
	LRU Kit

	Copyright (c) 2021 Cédric Ronvel

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



/*
	Same than LRUMap, but an entry will expire after a duration, because a sector-cycle is forced based on a timer.
	The provided expirationTime is the minimum.
	The true expiration time is between   expirationTime   and   expirationTime * sectors / ( sectors - 1 )   and   expirationTime.
	E.g. for 4 sectors, it is between expirationTime and 4/3 expirationTime.
*/
function LRUCacheMap( expirationTime = 10000 , sectorMaxItem = 250000 , sectorCount = 4 , refreshingGet = false ) {
	this.expirationTime = expirationTime ;
	this.sectorMaxItem = sectorMaxItem ;
	this.sectorCount = sectorCount ;
	this.refreshingGet = !! refreshingGet ;
	this.maps = new Array( this.sectorCount ) ;

	for ( let i = 0 ; i < this.sectorCount ; i ++ ) {
		this.maps[ i ] = new Map() ;
	}

	this.opCount = 0 ;
	this.isEmpty = true ;
	this.sectorExpirationTime = this.expirationTime / ( this.sectorCount - 1 || 0.5 ) ;
	this.timer = null ;
}

module.exports = LRUCacheMap ;



// Set a key/value pair in the “hot” sector.
// Note: undefined is not supported, it does nothing.
LRUCacheMap.prototype.set = function( key , value ) {
	if ( value === undefined ) { return ; }
	if ( this.opCount >= this.sectorMaxItem ) { this.cycle() ; }
	this.maps[ 0 ].set( key , value ) ;
	this.opCount ++ ;
	this.isEmpty = false ;

	if ( ! this.timer ) {
		this.timer = setTimeout( () => this.cycle() , this.sectorExpirationTime ) ;
	}

	return this ;
} ;



// Get a key/value, moving it in the “hot” sector
LRUCacheMap.prototype.get = function( key ) {
	var value = this.maps[ 0 ].get( key ) ;
	if ( value !== undefined ) { return value ; }

	for ( let i = 1 ; i < this.sectorCount ; i ++ ) {
		value = this.maps[ i ].get( key ) ;
		if ( value !== undefined ) {
			// In opposite to LRUMap, we do not set it again to move it into the “hot” sector except if refreshingGet is on
			if ( this.refreshingGet ) {
				this.set( key , value ) ;
				this.maps[ i ].delete( key ) ;
			}
			return value ;
		}
	}
} ;



// Check if we have the key without moving it
LRUCacheMap.prototype.has = function( key ) {
	for ( let i = 0 ; i < this.sectorCount ; i ++ ) {
		if ( this.maps[ i ].has( key ) ) { return true ; }
	}

	return false ;
} ;



LRUCacheMap.prototype.delete = function( key ) {
	var size = 0 ;

	// Because .set() does not check/delete key in map >= 1, we need to delete that key from all maps, so this is a slow operation.
	for ( let i = 0 ; i < this.sectorCount ; i ++ ) {
		this.maps[ i ].delete( key ) ;
		size += this.maps[ i ].size ;
	}

	this.isEmpty = ! size ;

	if ( this.isEmpty && this.timer ) {
		clearTimeout( this.timer ) ;
		this.timer = null ;
	}
} ;



LRUCacheMap.prototype.cycle = function() {
	if ( this.timer ) {
		clearTimeout( this.timer ) ;
		this.timer = null ;
	}

	var size = 0 ;

	for ( let i = this.sectorCount - 1 ; i >= 1 ; i -- ) {
		this.maps[ i ] = this.maps[ i - 1 ] ;
		size += this.maps[ i ].size ;
	}

	// Or use last map .clear()???
	// This way we let the GC handles how and when to do it
	this.maps[ 0 ] = new Map() ;
	this.opCount = 0 ;
	this.isEmpty = ! size ;

	if ( ! this.empty ) {
		this.timer = setTimeout( () => this.cycle() , this.sectorExpirationTime ) ;
	}
} ;



// Note that it doesn't give the number of keys, since they can be duplicated
LRUCacheMap.prototype.getSize = function() {
	var size = 0 ;

	for ( let i = 0 ; i < this.sectorCount ; i ++ ) {
		size += this.maps[ i ].size ;
	}

	return size ;
} ;

