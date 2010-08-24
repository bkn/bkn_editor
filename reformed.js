/**
 * @copyright: BigBlueHat, 2010
 * @license: Apache Foundation License 2.0
 *
 * reformed is a JSON to HTML Form to JSON conversion utility. The objective is to
 * build a simple HTML editor for JSON documents. It's intended use is as a frontend
 * to JSON-based API's such as CouchDB, Facebook, or OpenLibrary.
 *
 **/

/******* JSON Creation from HTML Form serialization functions *******/
/**
 * Key Value Pair - one input + another input || a fieldset (an object or array)
 **/
function kvp(el) {
	var _kvp = {};
//	var k = el.children().val();
//	var v = $(el.children()[1]);
	// skip the anchor tag
	
	var k = $(el).find('input').eq(0).val();
	var v = $(el).find('input').eq(1);

	// && v[0] &&	('tagName' in v[0])	
	if (v && (v[0].tagName == 'INPUT') && k && v.val()) {
		//treat all values as strings
	    //_kvp[k] = (isNaN(v.val()) ? v.val() : parseInt(v.val()));				
	    _kvp[k] = v.val();				
	} else if (v.hasClass('array')) {
		var _ary = [];
		if (v.children('fieldset.object').length > 0) {
			v.children('fieldset.object').each(function() {
				_ary.push(obj($(this)));
			});
		} else {
			v.children('input').each(function() {
				_ary.push($(this).val());
			});
		}
	    _kvp[k] = _ary;
	} else if (v.hasClass('object')) {
		_kvp[k] = obj(v);
	}
	return _kvp;
}

/**
 * Objects always have one or more .kvp's
 **/
function obj(el) {
	var _obj = {};
	el.children('.kvp').each(function() {
	    var _temp_kvp = kvp($(this));
	    for (attrname in _temp_kvp) {
	    	_obj[attrname] = _temp_kvp[attrname];
	    }
	});
	return _obj;
}


/******** Form Creation System ********/

//ADDED BY JACK ALVES TO ALLOW READ-ONLY ATTRIBUTE
// SHOULD CONVERT TO CLASS SO IT CAN BE SET EXTERNALLY
var read_only = ['id', 'ref'];
function set_read_only(attrlist){
	read_only = attrlist;
}

// Class
Reformed = function () {
	var count = {};
	init = function () {
		Reformed.count = {
				'array': 0,
				'object': 0,
				'key': 0,
				'value': 0
		};		
	};
	init();
	Reformed.show = function (record, json_block_id) {
		var content = "";
		if (record) {
			for (attrname in record) {
				content += kvp_t(attrname, record[attrname], json_block_id);
			}			
		}
		return content;		
	}
};
Reformed();


function remove_from_form(el_id) {
	$('#'+el_id).remove();
}

/** templates **/
function kvp_t(key, value, json_block_id) {
	if (!json_block_id) {json_block_id = ''}
	var el_id = 'kvp'+json_block_id + Reformed.count['key']++;
	var output = '';
	output += '<div id="'+el_id+'" class="kvp">';
	// link to remove div with key and value input 
	output += '<a  class="remove_link" href="javascript:\{remove_from_form(\''+el_id+'\');\}">remove</a>';
	el_id = 'key'+json_block_id + Reformed.count['key']++;
	output += '<input id="'+el_id+'" ';
	output += ' class="jsonkey" type="text" value="'+key+'" />';
	 
	el_id = 'value'+json_block_id + Reformed.count['value']++;
	if (typeof value == 'string' || typeof value == 'number') {
		if ($.inArray(key,read_only) == -1) {
			output += '<input  id="'+el_id+'" type="text" value="'+value+'" />';
		}
		else {
			output += '<input  id="'+el_id+'" ';
			output += ' class="readonly_input" type="text" readonly="readonly" value="'+value+'" />';
		}
	} else if (jQuery.isPlainObject(value)) {
		output += object_t(value, json_block_id);
	} else if (jQuery.isArray(value)) {
		output += array_t(value, json_block_id);
	}
	output += '</div>'
	return output;
}

function object_t(object, json_block_id) {
	if (!json_block_id) {json_block_id = ''}
	var el_id = 'object+field'+json_block_id + Reformed.count['object']++;
	var output = '<fieldset id="'+el_id+'" class="object">';
	for (attrname in object) {
		output += kvp_t(attrname, object[attrname], json_block_id);
	}
	output += '</fieldset>';
	return output;
}

function array_t(array, json_block_id) {
	if (!json_block_id) {json_block_id = ''}
	var el_id = 'array_field'+json_block_id + Reformed.count['array']++;
	var output = '<fieldset id="'+el_id+'"  class="array">';
	$.each(array, function (index, value) {
		el_id = 'array_value_wrap'+json_block_id + Reformed.count['array']++;
		// link to remove array element
		output += '<span id="'+el_id+'">';
		output += '<a class="remove_link" href="javascript:\{\$(\'\#'+el_id+'\').remove();\}">-</a>';
		el_id = 'array_value'+json_block_id + Reformed.count['array'];
		if (typeof value == 'string' || typeof value == 'number') {
			output += '<input id="'+el_id+'" type="text" value="'+value+'" />';
		} else if (jQuery.isPlainObject(value)) {
			output += object_t(value, json_block_id);
		} else if (jQuery.isArray(value)) {
			output += array_t(value, json_block_id);
		}
		output += '</span>';		
	});
	output += '</fieldset>';
	return output;
}