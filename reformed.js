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
	var k;
	var key_element = $(el).find('input'); 
	k = key_element.eq(0).val();
//	k = $(el).find('input').eq(0).val();
	var v = key_element.next();
	
//	var v = $(el).find('input').eq(1);
	var x = 0
	
	
	// && v[0] &&	('tagName' in v[0])	
	if (v && (v[0].tagName == 'INPUT') && k && v.val()) {
		//treat all values as strings
	    //_kvp[k] = (isNaN(v.val()) ? v.val() : parseInt(v.val()));				
	    _kvp[k] = v.val();				
	} else if (v.hasClass('array')) {
		var _ary = [];
		var nested_objects = v.find('fieldset.object')
		if (nested_objects && (nested_objects.length > 0)) {
			nested_objects.each(function() {
				_ary.push(obj($(this)));
			});
		}
		else {
//			v.children('input').each(function() {
				v.find('input').each(function() {
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

function remove_from_form(el_id) {
	$('#'+el_id).remove();
}

function array_value_box(value) {
	var el_id = 'array_value_wrap' + Reformed.count['array']++;
	var output = '';
	if (!value) {value = '';}
	// link to remove array element
	output += '<div id="'+el_id+'">';
	// javascript:{$('#array_value_wrap14').remove();}
	output += '<a  class="remove_link" href="javascript:\{remove_from_form(\''+el_id+'\');\}"> - </a>';
//	output += '<a class="remove_link" href="javascript:\{\$(\'\#'+el_id+'\').remove();\}"> - </a>';
	el_id = 'array_value' + Reformed.count['array'];
	if (typeof value == 'string' || typeof value == 'number') {
		output += '<input id="'+el_id+'" class="jsonvalue" type="text" value="'+value+'" />';
	} else if (jQuery.isPlainObject(value)) {
		output += object_t(value, 'array');
	} else if (jQuery.isArray(value)) {
		output += array_t(value, 'array');
	}
	output += '</div>';
	return output;
}


function add_value_to_array_form(add_el_id) {

	$('#'+add_el_id).before(array_value_box());
	
}

function make_array_form(el_id, add_el_id) {
	
	var value = $('#'+el_id).val();
	$('#'+el_id).remove();
	var arr = [value,''];
	var output = array_t(arr);
	$('#'+add_el_id).before(output);
	$('#'+add_el_id).remove();
}

/** templates **/
function kvp_t(key, value, parent_type) {
	if (!parent_type) {parent_type = '';}
	var el_id = 'kvp'+parent_type + Reformed.count['key']++;
	var output = '';
	output += '<div id="'+el_id+'" class="kvp">';
	// link to remove div with key and value input 
	output += '<a  class="remove_link" href="javascript:\{remove_from_form(\''+el_id+'\');\}">remove</a>';
	el_id = 'key'+parent_type + Reformed.count['key']++;
	output += '<input id="'+el_id+'" ';
	output += ' class="jsonkey" type="text" value="'+key+'" />';
	 
	el_id = 'value'+parent_type + Reformed.count['value']++;
	if (typeof value == 'string' || typeof value == 'number') {
		if ($.inArray(key,read_only) == -1) {
			output += '<input  id="'+el_id+'"';
			output += 'class="jsonvalue" type="text" value="'+value+'" />';
			// need to wrap current value in an array and change the 'add' link
			var add_el_id = 'add'+ el_id			
			output += '<a class="add_value_button" id="'+add_el_id+'" href="javascript:';
			output += '\{make_array_form(\''+el_id+'\',\''+add_el_id+'\');\}">add</a>';		
		}
		else {
			output += '<input  id="'+el_id+'" ';
			output += ' class="readonly_input" type="text" readonly="readonly" value="'+value+'" />';
		}
	} else if (jQuery.isPlainObject(value)) {
		output += object_t(value, parent_type);
	} else if (jQuery.isArray(value)) {
		output += array_t(value, parent_type);
	}
	output += '</div>'
		
//	// TEST
//	deb('-----------------------------');
//	$('#debug_area').append(output);
		
	return output;
}

function object_t(object, parent_type) {
	if (!parent_type) {parent_type = '';}
	var el_id = 'object_field'+parent_type + Reformed.count['object']++;
	var output = '<fieldset id="'+el_id+'" class="object">';
	for (attrname in object) {
		output += kvp_t(attrname, object[attrname], parent_type);
	}
	output += '</fieldset>';
	if (parent_type != 'array') {
		var add_el_id = 'add'+ el_id
//		output += '<a  class="add_value_button" id="'+add_el_id+'" href="javascript:';
//		output += '\{make_array_form(\''+el_id+'\',\''+add_el_id+'\');\}">add</a>';		
	}
	return output;
}

function array_t(array, parent_type) {
	if (!parent_type) {parent_type = '';}
	var array_el_id = 'array_field'+parent_type + Reformed.count['array']++;
	var output = '<fieldset id="'+array_el_id+'"  class="array">';
	$.each(array, function (index, value) {
		output += array_value_box(value);
	});
	add_el_id = 'add' + array_el_id
	output += '<a class="add_value_button" id="'+add_el_id+'" href="javascript:\{add_value_to_array_form(\''+add_el_id+'\');\}">add</a>';
	output += '</fieldset>';
	return output;
}




//Class
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
	Reformed.show = function (record) {
		var content = "";
		if (record) {
			for (attrname in record) {
				content += kvp_t(attrname, record[attrname]);
			}			
		}
		return content;		
	}
};
Reformed();
