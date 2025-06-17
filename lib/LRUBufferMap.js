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
	Here we store typed data inside a Buffer, ensuring that nothing can use more memory than: sectorCount x sectorBufferSize.
*/
function LRUBufferMap( types , varType = null , sectorBufferSize = 1000000 , sectorMaxItem = 250000 , sectorCount = 4 ) {
	this.sectorMaxItem = sectorMaxItem ;
	this.sectorBufferSize = sectorBufferSize ;
	this.sectorCount = sectorCount ;

	this.maps = new Array( this.sectorCount ) ;
	this.buffers = new Array( this.sectorCount ) ;

	for ( let sector = 0 ; sector < this.sectorCount ; sector ++ ) {
		this.maps[ sector ] = new Map() ;
		this.buffers[ sector ] = Buffer.allocUnsafe( this.sectorBufferSize ) ;
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
	double: { read: 'readDoubleBE' , write: 'writeDoubleBE' , size: 8 } ,
	float: { read: 'readFloatBE' , write: 'writeFloatBE' , size: 4 } ,
	int32: { read: 'readInt32BE' , write: 'writeInt32BE' , size: 4 } ,
	uint32: { read: 'readUInt32BE' , write: 'writeUInt32BE' , size: 4 } ,
	int16: { read: 'readInt16BE' , write: 'writeInt16BE' , size: 2 } ,
	uint16: { read: 'readUInt16BE' , write: 'writeUInt16BE' , size: 2 } ,
	int8: { read: 'readInt8' , write: 'writeInt8' , size: 1 } ,
	uint8: { read: 'readUInt8' , write: 'writeUInt8' , size: 1 }
} ;

// Aliases
TYPES.float32 = TYPES.float ;
TYPES.float64 = TYPES.double ;



// Set a key/value pair in the “hot” sector
LRUBufferMap.prototype.set = function( key ) {
	var type , size , bufferWriteOffset , isNew = false ,
		varItemCount = arguments.length - 1 - this.types.length ;

	if ( varItemCount < 0 ) { throw new RangeError( 'Missing arguments:' , -varItemCount ) ; }

	// Compute size
	size = this.minItemSize ;
	if ( this.varType ) { size += varItemCount * this.varType.size ; }

	if ( size > this.sectorBufferSize ) { throw new RangeError( 'Item is too big:' , size ) ; }

	// Check if we need a new buffer entry for that, if the entry exists and has enough space,
	// we will re-use it avoiding to waste buffer space and perf.
	if (
		( bufferWriteOffset = this.maps[ 0 ].get( key ) ) === undefined
		|| size > this.bufferEntrySize( this.buffers[ 0 ] , bufferWriteOffset )
	) {
		// So the entry does not exist in the “hot” sector, or the entry is now bigger, so we need to create a new buffer entry
		if ( this.opCount >= this.sectorMaxItem || this.bufferWriteOffset + size > this.sectorBufferSize ) {
			this.cycle() ;
		}

		// Should comes after .cycle() since it may modify this.bufferWriteOffset
		bufferWriteOffset = this.bufferWriteOffset ;
		this.maps[ 0 ].set( key , bufferWriteOffset ) ;
		this.opCount ++ ;
		isNew = true ;
	}


	for ( let i = 0 , iMax = this.types.length ; i < iMax ; i ++ ) {
		type = this.types[ i ] ;
		this.buffers[ 0 ][ type.write ]( arguments[ i + 1 ] , bufferWriteOffset ) ;
		bufferWriteOffset += type.size ;
	}

	if ( this.varType ) {
		this.buffers[ 0 ].writeUInt16BE( varItemCount , bufferWriteOffset ) ;
		bufferWriteOffset += 2 ;

		for ( let i = 0 ; i < varItemCount ; i ++ ) {
			this.buffers[ 0 ][ this.varType.write ]( arguments[ i + 1 + this.types.length ] , bufferWriteOffset ) ;
			bufferWriteOffset += this.varType.size ;
		}
	}

	// To forget to sync this.bufferWriteOffset if it's not a rewrite
	if ( isNew ) { this.bufferWriteOffset = bufferWriteOffset ; }

	return this ;
} ;



const RETURN = [] ;

// Get a key/value, moving it in the “hot” sector
LRUBufferMap.prototype.get = function( key ) {
	var sector , buffer , bufferOffset , bufferItemOffset , type , varItemCount ;

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

	for ( let i = 0 , iMax = this.types.length ; i < iMax ; i ++ ) {
		type = this.types[ i ] ;
		RETURN[ i ] = buffer[ type.read ]( bufferItemOffset ) ;
		bufferItemOffset += type.size ;
	}

	if ( this.varType ) {
		varItemCount = buffer.readUInt16BE( bufferItemOffset ) ;
		bufferItemOffset += 2 ;

		for ( let i = 0 ; i < varItemCount ; i ++ ) {
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



// Check if we have the key without moving it
LRUBufferMap.prototype.has = function( key ) {
	for ( let i = 0 ; i < this.sectorCount ; i ++ ) {
		if ( this.maps[ i ].has( key ) ) { return true ; }
	}

	return false ;
} ;



LRUBufferMap.prototype.bufferEntrySize = function( buffer , bufferOffset ) {
	if ( ! this.varType ) { return this.minItemSize ; }
	var varItemCount = buffer.readUInt16BE( bufferOffset + this.minItemSize - 2 ) ;
	return this.minItemSize + varItemCount * this.varType.size ;
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



// Note that it doesn't give the number of keys, since they can be duplicated
LRUBufferMap.prototype.getSize = function() {
	var size = 0 ;

	for ( sector = 0 ; sector < this.sectorCount ; sector ++ ) {
		size += this.maps[ sector ].size ;
	}

	return size ;
} ;

