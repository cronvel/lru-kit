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



function LRUBufferMap( types , varType = null , sectorBufferSize = 1000000 , sectorMaxItem = 250000 , sectorCount = 4 ) {
	this.sectorMaxItem = sectorMaxItem ;
	this.sectorBufferSize = sectorBufferSize ;
	this.sectorCount = sectorCount ;

	this.maps = new Array( this.sectorCount ) ;
	this.buffers = new Array( this.sectorCount ) ;

	for ( let sector = 0 ; sector < this.sectorCount ; sector ++ ) {
		this.maps[ sector ] = new Map() ;
		this.buffers[ sector ] = Buffer.alloc( this.sectorBufferSize ) ;
	}

	this.types = [] ;
	this.varType = null ;
	this.minItemSize = 0 ;

	if ( ! Array.isArray( this.types ) ) { throw new TypeError( 'LRUBufferMap constructor needs a non-empty array of types' ) ; }

	for ( let type of types ) {
		if ( ! TYPES[ type ] ) { throw new TypeError( 'Unknown type: ' + type ) ; }
		this.types.push( TYPES[ type ] ) ;
		this.minItemSize += TYPES[ type ].size ;
	}

	if ( varType ) {
		if ( ! TYPES[ varType ] ) { throw new TypeError( 'Unknown type (varType): ' + varType ) ; }
		this.minItemSize += 2 ;
		this.varType = TYPES[ varType ] ;
	}

	this.opCount = 0 ;
	this.bufferWriteOffset = 0 ;
}

module.exports = LRUBufferMap ;



const TYPES = {
	float: { read: 'readFloatLE' , write: 'writeFloatLE' , size: 4 } ,
	int32: { read: 'readInt32LE' , write: 'writeInt32LE' , size: 4 }
} ;



LRUBufferMap.prototype.set = function( key ) {
	var i , iMax , type , size ,
		varItemCount = arguments.length - 1 - this.types.length ;

	if ( varItemCount < 0 ) { throw new RangeError( 'Missing arguments:' , -varItemCount ) ; }

	size = this.minItemSize ;
	if ( this.varType ) { size += varItemCount * this.varType.size ; }

	if ( size > this.sectorBufferSize ) { throw new RangeError( 'Item is too big:' , size ) ; }

	if ( this.opCount >= this.sectorMaxItem || this.bufferWriteOffset + size > this.sectorBufferSize ) {
		this.cycle() ;
	}

	this.maps[ 0 ].set( key , this.bufferWriteOffset ) ;
	this.opCount ++ ;

	for ( i = 0 , iMax = this.types.length ; i < iMax ; i ++ ) {
		type = this.types[ i ] ;
		this.buffers[ 0 ][ type.write ]( arguments[ i + 1 ] , this.bufferWriteOffset ) ;
		this.bufferWriteOffset += type.size ;
	}

	if ( this.varType ) {
		this.buffers[ 0 ].writeUInt16LE( varItemCount , this.bufferWriteOffset ) ;
		this.bufferWriteOffset += 2 ;

		for ( i = 0 ; i < varItemCount ; i ++ ) {
			this.buffers[ 0 ][ this.varType.write ]( arguments[ i + 1 + this.types.length ] , this.bufferWriteOffset ) ;
			this.bufferWriteOffset += this.varType.size ;
		}
	}

	return this ;
} ;



const RETURN = [] ;

LRUBufferMap.prototype.get = function( key ) {
	var i , iMax , sector , buffer , bufferOffset , bufferItemOffset , type , varItemCount ;

	for ( sector = 0 ; sector < this.sectorCount ; sector ++ ) {
		bufferOffset = this.maps[ sector ].get( key ) ;
		if ( bufferOffset !== undefined ) {
			buffer = this.buffers[ sector ] ;
			break ;
		}
	}

	if ( ! buffer ) { return null ; }

	RETURN.length = 0 ;
	bufferItemOffset = bufferOffset ;

	for ( i = 0 , iMax = this.types.length ; i < iMax ; i ++ ) {
		type = this.types[ i ] ;
		RETURN[ i ] = buffer[ type.read ]( bufferItemOffset ) ;
		bufferItemOffset += type.size ;
	}

	if ( this.varType ) {
		varItemCount = buffer.readUInt16LE( bufferItemOffset ) ;
		bufferItemOffset += 2 ;

		for ( i = 0 ; i < varItemCount ; i ++ ) {
			RETURN[ i + this.types.length ] = buffer[ this.varType.read ]( bufferItemOffset ) ;
			bufferItemOffset += this.varType.size ;
		}
	}

	if ( sector > 0 ) {
		// This is a bit sub-optimal since we could just perform a buffer-copy,
		// but the performance cost is minimal, also it does not happens often.
		// Doing it with better perf would need a way to save the buffer chunk in case a cycle would kick in.
		this.set( key , ... RETURN ) ;
		this.maps[ sector ].delete( key ) ;
	}

	return RETURN ;
} ;



LRUBufferMap.prototype.delete = function( key ) {
	// Because .set() does not check/delete key in map >= 1, we need to delete that key from all maps, so this is a slow operation.
	for ( let sector = 0 ; sector < this.sectorCount ; sector ++ ) {
		this.maps[ sector ].delete( key ) ;
	}
} ;



LRUBufferMap.prototype.cycle = function() {
	var lastBuffer = this.buffers[ this.sectorCount - 1 ] ;

	for ( let sector = this.sectorCount - 1 ; sector >= 1 ; sector -- ) {
		this.maps[ sector ] = this.maps[ sector - 1 ] ;
		this.buffers[ sector ] = this.buffers[ sector - 1 ] ;
	}

	// Or use last map .clear()???
	// This way we let the GC handles how and when to do it
	this.maps[ 0 ] = new Map() ;
	this.opCount = 0 ;

	this.buffers[ 0 ] = lastBuffer ;
	this.bufferWriteOffset = 0 ;
} ;



LRUBufferMap.prototype.getSize = function() {
	var sector , size = 0 ;

	for ( sector = 0 ; sector < this.sectorCount ; sector ++ ) {
		size += this.maps[ sector ].size ;
	}

	return size ;
} ;

