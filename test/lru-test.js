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

/* global describe, it, expect */

"use strict" ;



const lruKit = require( '..' ) ;
const Promise = require( 'seventh' ) ;



describe( "LRU Map" , () => {

	it( "Set and Get 1M times with no key collision" , () => {
		var i , key , value ,
			lru = new lruKit.LRUMap( 100000 , 4 ) ;
		
		for ( i = 0 ; i < 1000000 ; i ++ ) {
			key = 'key_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}
	} ) ;

	it( "Set and Get 1M times with some random key collisions" , () => {
		var i , key , value ,
			lru = new lruKit.LRUMap( 100000 , 4 ) ;
		
		for ( i = 0 ; i < 1000000 ; i ++ ) {
			key = 'key_' + Math.floor( 10000 * Math.random() ) ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}
	} ) ;

	it( "Key lifetime" , () => {
		var i , key , value ,
			lru = new lruKit.LRUMap( 100000 , 4 ) ;
		
		lru.set( 'unique' , 'value' ) ;
		expect( lru.get( 'unique' ) ).to.be( 'value' ) ;
		
		// 50k (same block)
		for ( i = 0 ; i < 50000 ; i ++ ) {
			key = 'key_r1_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		expect( lru.get( 'unique' ) ).to.be( 'value' ) ;

		// another 100k (2nd block)
		for ( i = 0 ; i < 100000 ; i ++ ) {
			key = 'key_r2_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		expect( lru.get( 'unique' ) ).to.be( 'value' ) ;

		// another 300k (4th block)
		for ( i = 0 ; i < 300000 ; i ++ ) {
			key = 'key_r3_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		expect( lru.get( 'unique' ) ).to.be( 'value' ) ;
		
		// another 400k (out of blocks!)
		for ( i = 0 ; i < 400000 ; i ++ ) {
			key = 'key_r4_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		expect( lru.get( 'unique' ) ).to.be.undefined() ;
	} ) ;
} ) ;



describe( "LRU Cache Map" , () => {

	it( "Set and Get 1M times with no key collision" , () => {
		var i , key , value ,
			lru = new lruKit.LRUCacheMap( 1000 , 100000 , 4 ) ;
		
		for ( i = 0 ; i < 1000000 ; i ++ ) {
			key = 'key_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}
	} ) ;

	it( "Set and Get 1M times with some random key collisions" , () => {
		var i , key , value ,
			lru = new lruKit.LRUCacheMap( 1000 , 100000 , 4 ) ;
		
		for ( i = 0 ; i < 1000000 ; i ++ ) {
			key = 'key_' + Math.floor( 10000 * Math.random() ) ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}
	} ) ;

	it( "Key lifetime, with the refreshingGet option turned on" , () => {
		var i , key , value ,
			lru = new lruKit.LRUCacheMap( 1000 , 100000 , 4 , true ) ;
		
		lru.set( 'unique' , 'value' ) ;
		expect( lru.get( 'unique' ) ).to.be( 'value' ) ;
		
		// 50k (same block)
		for ( i = 0 ; i < 50000 ; i ++ ) {
			key = 'key_r1_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		expect( lru.get( 'unique' ) ).to.be( 'value' ) ;

		// another 100k (2nd block)
		for ( i = 0 ; i < 100000 ; i ++ ) {
			key = 'key_r2_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		expect( lru.get( 'unique' ) ).to.be( 'value' ) ;

		// another 300k (4th block)
		for ( i = 0 ; i < 300000 ; i ++ ) {
			key = 'key_r3_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		expect( lru.get( 'unique' ) ).to.be( 'value' ) ;
		
		// another 400k (out of blocks!)
		for ( i = 0 ; i < 400000 ; i ++ ) {
			key = 'key_r4_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			lru.set( key , value ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		expect( lru.get( 'unique' ) ).to.be.undefined() ;
	} ) ;

	it( "Key should expire after the given time" , async function() {
		//this.timeout( 4000 ) ;

		var i , key , value ,
			lru = new lruKit.LRUCacheMap( 100 , 100000 , 4 ) ;
		
		lru.set( 'key' , 'value' ) ;
		expect( lru.get( 'key' ) ).to.be( 'value' ) ;

		await Promise.resolveTimeout( 75 ) ;
		lru.set( 'key2' , 'value2' ) ;
		expect( lru.get( 'key' ) ).to.be( 'value' ) ;
		expect( lru.get( 'key2' ) ).to.be( 'value2' ) ;

		await Promise.resolveTimeout( 75 ) ;
		expect( lru.get( 'key' ) ).to.be( undefined ) ;
		expect( lru.get( 'key2' ) ).to.be( 'value2' ) ;

		await Promise.resolveTimeout( 75 ) ;
		expect( lru.get( 'key' ) ).to.be( undefined ) ;
		expect( lru.get( 'key2' ) ).to.be( undefined ) ;
	} ) ;

	it( "100 keys should expire after the given time" , async function() {
		//this.timeout( 4000 ) ;

		var i , key , value ,
			map = new Map() ,
			lru = new lruKit.LRUCacheMap( 100 , 100000 , 4 ) ;
		
		for ( i = 0 ; i < 100 ; i ++ ) {
			key = 'key_' + i ;
			value = Math.floor( 1000000 * Math.random() ) ;
			map.set( key , value ) ;
			lru.set( key , value ) ;
		}
		
		for ( i = 0 ; i < 100 ; i ++ ) {
			key = 'key_' + i ;
			value = map.get( key ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		await Promise.resolveTimeout( 75 ) ;
		
		for ( i = 0 ; i < 100 ; i ++ ) {
			key = 'key_' + i ;
			value = map.get( key ) ;
			expect( lru.get( key ) ).to.be( value ) ;
		}

		await Promise.resolveTimeout( 75 ) ;
		
		for ( i = 0 ; i < 100 ; i ++ ) {
			key = 'key_' + i ;
			value = map.get( key ) ;
			expect( lru.get( key ) ).to.be( undefined ) ;
		}
	} ) ;
} ) ;



describe( "LRU Buffer Map" , () => {

	it( "Set and Get 1M times with no key collision (fixed length items)" , () => {
		var i , key , value1 , value2 ,
			lru = new lruKit.LRUBufferMap( [ 'int32' , 'float' ] , null , 800000 , 100000 , 4 ) ;
		
		for ( i = 0 ; i < 1000000 ; i ++ ) {
			key = 'key_' + i ;
			value1 = 1000000 * Math.random() / 1024 ;
			value2 = Math.floor( 1000000 * Math.random() ) / 1024 ;	// Make it float (single) compatible
			lru.set( key , value1 , value2 ) ;
			expect( lru.get( key ) ).to.be.like( [ Math.floor( value1 ) , value2 ] ) ;
		}
	} ) ;

	it( "Test double/float64 precision" , () => {
		var i , key , value1 ,
			lru = new lruKit.LRUBufferMap( [ 'float64' ] , null , 800000 , 100000 , 4 ) ;
		
		for ( i = 0 ; i < 100000 ; i ++ ) {
			key = 'key_' + i ;
			value1 = 1000000 * Math.random() ;
			lru.set( key , value1 ) ;
			expect( lru.get( key ) ).to.be.like( [ value1 ] ) ;
		}
	} ) ;

	it( "Set and Get 1M times with no key collision and variable arguments" , () => {
		var i , j , key , value , varArgs = new Array( 100 ) ,
			lru = new lruKit.LRUBufferMap( [ 'float' ] , 'int32' , 800000 , 100000 , 4 ) ;
		
		for ( i = 0 ; i < 1000000 ; i ++ ) {
			key = 'key_' + i ;
			value = Math.floor( 1000000 * Math.random() ) / 1024 ;	// Make it float (single) compatible
			varArgs.length = Math.floor( 100 * Math.random() ) ;
			for ( j = 0 ; j < varArgs.length ; j ++ ) { varArgs[ j ] = Math.floor( 1000000 * Math.random() ) ; }
			lru.set( key , value , ... varArgs ) ;
			expect( lru.get( key ) ).to.be.like( [ value , ... varArgs ] ) ;
		}
	} ) ;

	it( "Set and Get 1M times with some random key collisions (fixed length items)" , () => {
		var i , key , value1 , value2 ,
			lru = new lruKit.LRUBufferMap( [ 'int32' , 'float' ] , null , 800000 , 100000 , 4 ) ;
		
		for ( i = 0 ; i < 1000000 ; i ++ ) {
			key = 'key_' + Math.floor( 10000 * Math.random() ) ;
			value1 = 1000000 * Math.random() / 1024 ;
			value2 = Math.floor( 1000000 * Math.random() ) / 1024 ;	// Make it float (single) compatible
			lru.set( key , value1 , value2 ) ;
			expect( lru.get( key ) ).to.be.like( [ Math.floor( value1 ) , value2 ] ) ;
		}
	} ) ;

	it( "Key lifetime (fixed length items)" , () => {
		var i , key , value1 , value2 ,
			lru = new lruKit.LRUBufferMap( [ 'int32' , 'float' ] , null , 800000 , 100000 , 4 ) ;
		
		lru.set( 'unique' , 123 , 123.125 ) ;
		expect( lru.get( 'unique' ) ).to.be.like( [ 123 , 123.125 ] ) ;
		
		// 50k (same block)
		for ( i = 0 ; i < 50000 ; i ++ ) {
			key = 'key_r1' + i ;
			value1 = 1000000 * Math.random() / 1024 ;
			value2 = Math.floor( 1000000 * Math.random() ) / 1024 ;	// Make it float (single) compatible
			lru.set( key , value1 , value2 ) ;
			expect( lru.get( key ) ).to.be.like( [ Math.floor( value1 ) , value2 ] ) ;
		}

		expect( lru.get( 'unique' ) ).to.be.like( [ 123 , 123.125 ] ) ;

		// another 100k (2nd block)
		for ( i = 0 ; i < 100000 ; i ++ ) {
			key = 'key_r2' + i ;
			value1 = 1000000 * Math.random() / 1024 ;
			value2 = Math.floor( 1000000 * Math.random() ) / 1024 ;	// Make it float (single) compatible
			lru.set( key , value1 , value2 ) ;
			expect( lru.get( key ) ).to.be.like( [ Math.floor( value1 ) , value2 ] ) ;
		}

		expect( lru.get( 'unique' ) ).to.be.like( [ 123 , 123.125 ] ) ;

		// another 300k (4th block)
		for ( i = 0 ; i < 300000 ; i ++ ) {
			key = 'key_r3' + i ;
			value1 = 1000000 * Math.random() / 1024 ;
			value2 = Math.floor( 1000000 * Math.random() ) / 1024 ;	// Make it float (single) compatible
			lru.set( key , value1 , value2 ) ;
			expect( lru.get( key ) ).to.be.like( [ Math.floor( value1 ) , value2 ] ) ;
		}

		expect( lru.get( 'unique' ) ).to.be.like( [ 123 , 123.125 ] ) ;
		
		// another 400k (out of blocks!)
		for ( i = 0 ; i < 400000 ; i ++ ) {
			key = 'key_r4' + i ;
			value1 = 1000000 * Math.random() / 1024 ;
			value2 = Math.floor( 1000000 * Math.random() ) / 1024 ;	// Make it float (single) compatible
			lru.set( key , value1 , value2 ) ;
			expect( lru.get( key ) ).to.be.like( [ Math.floor( value1 ) , value2 ] ) ;
		}

		expect( lru.get( 'unique' ) ).to.be.null() ;
	} ) ;
} ) ;

