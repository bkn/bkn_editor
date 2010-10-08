
BKN_WSF = function (v) {
	part = {
		'root': '', // http://people.bibkn.org/wsf/
		'service_root': ''	// http://people.bibkn.org/wsf/ws/			
	};
	request_stack = [];
	
	if (v) {
		part.root = slash_end(v);
	}
	else {
		part.root = '';		
	}
	
	BKN_WSF.set = function (v,k) {
		if (v && !k) {
			part.root = slash_end(v);
		}
		else {
			if (k == 'service_root') {
				part.service_root = slash_end(v);
			}
			else if (k == 'root') {
				part.root = slash_end(v);
			}
			else {
				return '';
			}
		}
		return part.root;
	}
	BKN_WSF.get = function (k) {
		if (k) {
			if (k == 'service_root') {
				return part.service_root;			
			}
			else if (k == 'request_stack') {
				return request_stack;
			}
			else if (k == 'root') {
				return part.root;
			}
			else if (k == 'url') {
				return part.root.replace('/wsf/','');
			}
		}
		else {
			return part.root;			
		}		
	}
	BKN_WSF.pluck = function (k) {
		var response = {};
		if (request_stack.length == 0) {
			//deb("error: can not find a request matching response.");
			response = null;
			request_stack = [];			
		}
		else if (request_stack.length == 1) {
			response = $.extend(true, {},request_stack[0]); // deep copy the object to return
			request_stack = [];
		}
		else {	
			// IT WOULD BE BETTER TO TRACK IDS BUT THIS IS GOOD ENOUGH FOR NOW
			// THERE SHOULD ONLY BE ONE CALL AT A TIME FOR NOW.
			//deb('multiple requests are processing.');
			var i=0; 
			var found = false;

			while (!found && (i < request_stack.length)) {
				if ('service' in request_stack[i]) {
					//deb('service in request:'+request_stack[i]['service']);
					
					switch (request_stack[i]['service']) {				
						case 'record_add':
						case 'record_update':
							if (k && (k == 'show_record')) {
								// deep copy the object to return
								response = $.extend(true, {},request_stack[i]); 
								request_stack.splice(i,1);						
								found = true;
							}
							break;
						default:
							break;
					}				
				}
				i++;
			}
			if (!found && (request_stack.length > 0)) {
				// something needs to be removed.
				response = $.extend(true, {},request_stack[0]); // deep copy the object to return
				request_stack.shift();
			}
		
		}
		return response;
	}

	BKN_WSF.error = function (response) {
		//var xobj = '';
		var error = ('error' in response) ? response['error'] : "UNKNOWN ERROR";
		var code = '';
		if ('status' in response) {
			// the response is an http response, the http request failed, request not sent ot bkn_wsf.py
			code = response['status'];
		}
		else if ('reason' in response) {
			// the response is from bkn_wsf.py
			code = response['reason'];
		}
		else {
			code = "UNKNOWN RESPONSE TYPE"
		}
		
	    if (code == '403') {
	    	var content = "You need to <a href='"+BKN_WSF.get('url')+"'>LOGIN</a> the repository ";// 
	    	content += " and have permission for the <a href='http://people.bibkn.org/conStruct/dataset/'>dataset</a>.";
	    	status(content);
	    }
	    else {
	    	status("Error: Request failed with, status code:"+code+",  error: "+error);
	    }
		
		return ;
	}


	BKN_WSF.request = function (callback, service, params, method, accept) {
		var wsf_script = "cgi-bin/structwsf/bkn_wsf.py";
		var wsf_location = "http://" + window.location.hostname + "/";
		var wsf_php_proxy = "" + wsf_location + wsf_script;
	    var wsf_params = ""; 
//	    wsf_params += "&ws=" + BKN_WSF.get('service_root');
		wsf_params += "&bkn_root=" + BKN_WSF.get('root');
		wsf_params += "&service="+service;
	    wsf_params += "&method=";
	    if (method) {wsf_params += method;} else {wsf_params += "post";};
	    wsf_params += "&accept=";
	    if (accept) {wsf_params += accept;} else {wsf_params += "application/json";};
	    wsf_params += "&params=";
	    if (params) {wsf_params += params;};

		response_format = 'jsonp';
		if (accept) {response_format = accept;};
	//deb(wsf_php_proxy +"?"+wsf_params);
		var d = new Date();
		request_stack.push({
			"time": d.getTime(),
			"callback":callback, 
			"service":service, 
			"params":params, 
			"method":method, 
			"accept":accept
			});
	    $.ajax({
	        url: wsf_php_proxy,// + "\?jsonp=?",
	        data: wsf_params,
	        type: "post",
	        cache: false,
	        dataType: "jsonp", //response_format,
	        error: function(xobj, status, error){
				    	BKN_WSF.error({'xobj':xobj, 'status':status,'error':error});
				        },
	        success: function (response) {
			        	if (response && ('error' in response)) {
			        		BKN_WSF.error(response);
			        	}
			        	else {
		        			callback(response);		        		
			        	}
			      	}
	    }); 
	}


} // BKN_WSF

// I JUST LEARNED THAT ID AND URI MUST BE THE SAME VALUE

Dataset = function (v) {
	var root = ''; http://people.bibkn.org/wsf/datasets/ 
	var id = '';
	var uri = '';
	var page = 0;
	var page_size = 25;
	var arg = $(document).getUrlParam("dataset");
	var template = {
			"type":"dataset",
			"id": uri,
			"schema": [
				"identifiers.json",
				"type_hints.json",
				"http://downloads.bibsoup.org/datasets/bibjson/bibjson_schema.json",
				"http://www.bibkn.org/drupal/bibjson/bibjson_schema.json"
				],				
			"linkage": ["http://www.bibkn.org/drupal/bibjson/iron_linkage.json"]
			}		
	// turn vars into object
	
	Dataset.get = function (k) {
		var response = uri;
		if (k) {
			if (k == 'id') {
				response = id;
			}
			else if (k == 'uri') {
				response = uri;				
			}
			else if (k == 'root') {
				response = root;								
			}
			else if (k == 'page') {
				response = page;
			}
			else if (k == 'page_size') {
				response = page_size;				
			}
			else if (k == 'template') {
				return template;
			}
			else {
				response = '';
			}
		}
		return response;
	}

	Dataset.set = function (v,k) {
		var response = null;
		if (v && !k) {
			if (v.substring(0,7) == 'http://') {
				response = Dataset.set(v, 'uri')
			}
			else {
				response = Dataset.set(v, 'id')
			}	
		}
		else if (v && k) {
			response = ""+v; 
			if (k == 'id') {
				id = unslash_end(v);   
				uri = slash_end(Dataset.get('root') + id);
				template['id'] = Dataset.get('uri'); // IS THIS WHAT WE WANT?
				response = id;
			}
			else if (k == 'uri') {
				uri = slash_end(v);
				template['id'] = uri;
				id = Dataset.extract_id(uri);
				root = Dataset.extract_root(uri);
				response = uri;	
			}
			else if (k == 'root') {
				root = slash_end(v);
				uri = '';
				id = '';
				response = root;								
			}
			else if (k == 'page') { 
				page = ""+v; // v can be number or string
				response = page;
			}
			else if (k == 'page_size') {
				page_size = ""+v; // v can be number or string
				response = page_size;
			}
			else if (k == 'template') {
				response = template;
			}
			else {
				response = null;
			}
		}
		else {
			id = '';
			uri = '';
			response = null;
		}
		return response;
	}
	Dataset.extract_root = function (v) {
		// trailing slash differentiates a dataset uri from a record uri
		if (v) {
			// find '/' preceding id
			var end = unslash_end(v).lastIndexOf('/');
			// root ends with '/'
			root = slash_end(v.slice(0,end)); 	
		}
		else {
			root = '';
		}
		return root;
	}

	Dataset.extract_id = function (v) {
		if (v) {
			id = unslash_end(v.replace(Dataset.get('root'),'')); //unslash_end(uri).slice(start);	
		}
		else {
			id = '';
		}
		return id;

	}
	
	// init
	if (v) {
		arg = v
	}
	else if (arg && (arg != null) && (arg != 'null') && (arg != '')) {
		arg = decodeURIComponent(arg);
	}
	else {
		arg = '';
	}
	Dataset.set(arg);
			
} // Dataset class

Record = function (v) {
	var id = '';
	var uri = '';
	var arg = $(document).getUrlParam("uri");
	
	Record.get = function (k) {
		var response = uri;
		if (k) {
			if (k == 'id') {
				response = id;
			}
		}
		return response;
	}
	Record.set = function (v, k) {				
		if (v) {
			if (k) {
				if (k == 'uri') {
					uri = unslash_end(v);
					id = Record.extract_id(v);							
				}
				else if (k == 'id') {
					id = unslash_end(v);
					uri = Dataset.get() + id;
					
				} // unknown key
				else {
					id = '';
					uri = '';					
				}
			} // no key
			else { // consider http prefix a  uri
				if (v.substring(0,7) == 'http://') {
					Record.set(v, 'uri');
				}
				else { // v is an id
					Record.set(v, 'id');
				}				
			}
		}			
		else { // no value
			id = '';
			uri = '';
		}
		return uri;
	}
	
	Record.extract_id = function (v) {
		if (v) {
			id = unslash_end(v).replace(Dataset.get('uri'),'');			
		}
		else {
			id = '';
		}
		return id;
	}

	// init
	if (v) {
		arg = v
	}
	else if (arg) { //  && (arg != null) && (arg != 'null') && (arg != '')
		arg = decodeURIComponent(arg);
	}
	else {
		id = '';
		uri = '';
		arg = '';
	}
	Record.set(arg);

} // Record class

Display = function () {
	Display.refresh = function (called_from) {
		var request = '';
		switch (called_from) {
		case 'show_record':
			request = BKN_WSF.pluck('show_record');
			if (request && ('service' in request)) {
				var service = request['service'];
				if ((service == 'record_update') || (service == 'record_add')) {
					get_record_list(Dataset.get());
				}
			}
			break;
		case 'show_record_list':
			request = BKN_WSF.pluck();
			if (request && ('service' in request) && (request['service'] == 'record_delete')) {
				$('#record_form').html('');
				$('#record_buttons').html('');
				status('Fresh list of records.');
			}			
			break;
		case 'show_dataset_list':
			request = BKN_WSF.pluck();
			$('#record_form').html('');
			$('#record_buttons').html('');
			$('#record_list').html('');
			$('#record_nav').html('');
			break;
		default:
			break;
		}
	}
}
Display(); // instantiate


function status (message) {
	$('#status').html(message);
}

function show_json(response){

	deb(formattedJSON(response));
// add test to display if result is text
	//	deb("RESPONSE as text: " + response);

}


function bkn_wsf_call(callback, call, params) {
	if ((BKN_WSF.get('root') != 'http://datasets.bibsoup.org/wsf/') &&
		(Dataset.get('uri') != 'http://people.bibkn.org/wsf/datasets/jack_update_test/'))
		{
		if (call in ['record_update','record_add', 'record_delete','dataset_create', 'dataset_delete']) {
			status('Edits to this respository are blocked.');
			return;
		}
	}
	BKN_WSF.request(callback, call, 
					encodeURIComponent(params), 
					"post", 
					encodeURIComponent("application/iron+json")
					);

}


function record_to_json() {
	var json = {};
	var _kvp = null;
	$('#record_form > .kvp').each(function (idx) {
	    _kvp = kvp($(this));
	    for (attrname in _kvp) {
	    	json[attrname] = _kvp[attrname];
	    }	
	});
   return json;
}	

function add_to_json() {
	var json = {};
	var _kvp = null;
	$('#add_record_form > .kvp').each(function (idx) {
	    _kvp = kvp($(this));
	    for (attrname in _kvp) {
	    	json[attrname] = _kvp[attrname];
	    }	
	});
   return json;
}	

// this will be replaced by ReformedObject method
function reform_json_to_record(record, form) {
	
	var content = "";
//	for (attrname in record) {
		content += (kvp_t(attrname, record[attrname], form));
//	}
	return content;
	
}


function dataset_create(dataset_id, title, description) {
	status("Creating dataset ...");
	var params = ''; 
	Dataset.set(dataset_id);
	params += '&uri=' + Dataset.get('uri');
	if (title) {params += '&title='+title;}
	if (description) {params += '&description='+description;}
	bkn_wsf_call(get_dataset_list, "dataset_create", params);
}

function show_dataset_create_form() {
	var content = '<div>';
	content += 'Id: <input id="dataset_create_form_id" class="dataset_create_input" type="text" value="" />';
	content += 'Title: <input id="dataset_create_form_title" class="dataset_create_input" type="text" value="" />';
	content += 'Description: <input id="dataset_create_form_description" class="dataset_create_input" type="textarea" value="" />';
	content += "<input type='button' value='Create' id='save_dataset_button' class='_button'/>";	
	content += "</div>";
	$('#dataset_create_form').html(content);
	$('#save_dataset_button').click(function () {
		show_template_record();
		var id = $('#dataset_create_form_id').val();
		var title= $('#dataset_create_form_title').val();
		var description = $('#dataset_create_form_description').val();
		dataset_create(id, title, description);
		show_template_dataset_list();
		});	

	
}



function show_attribute_add_box() {
	var content = '';
	// 	output += '<a  class="remove_link" href="javascript:\{remove_from_form(\''+el_id+'\');\}">remove</a>';

	content += '<div class="kvp">';
	content += '<a></a>'; // fill space where 'remove' would be
	content += '<input class="jsonkey_add" type="text" value="" />';
	content += '<input type="text" value="" />';
	content += "</div>";
	$('#add_record_form').append(content);
	
}

// YOU ARE HERE
// preparing to implement add_attribute
// use new form under existing record?
// use /crud/create for new attributes  
//
// create new record
// how do we tell when the record is new
// may not matter if /crud/update/ is used


function display_record_form (record) {
	var content = '';
	//content = reform_json_to_record(record);
//	var existing_record = new ReformedObject('record_form');
//	var new_attributes = new ReformedObject('add_record_form');
	content = "";
	content += Reformed.show(record, 'record_form');	
	$('#record_form').html(content);
	
	$('#add_record_form').html("");
	show_attribute_add_box();
	content = "<div><a href='javascript:\{show_attribute_add_box();\}'>add</a></div>";
	$('#add_attribute_button').html(content);

	content = "";
	content += "<input type='button' value='Save' id='save_button' class='_button'/>";
	content += "<input type='button' value='Delete' id='delete_button' class='_button'/>";
	$('#record_buttons').html(content);
	
	$('#save_button').click(function () {
		record_update(Record.get('uri'), Dataset.get());
		});	
	$('#delete_button').click(function () {
		record_delete(Record.get('uri'), Dataset.get());
		});	
}

function slash_end (v) {
	// make sure uri ends in slash
	if (v && (v.charAt(v.length-1) != '/')) {
		v = v + '/';
	}
	return v;
}
function unslash_end (v) {	
	if (v &&(v.charAt(v.length-1) == '/')) {
		if (v.length == 1) {
			return '';
		}
		else {
			return v.slice(0,v.length-1);			
		}
	}
	return v;
}

function has_key_value(obj, key) {
	return ((key in obj) && obj[key]);
}

function extract_url_parameter(url, param) {
	var value = null;
	if (param) {
		param = param.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");		
		var regex_filter = "[\\?&]"+param+"=([^&#]*)";
		var regex = new RegExp( regex_filter );
		var value = regex.exec( url );
	}
	if( value == null )
		return "";
	else
		return decodeURIComponent(value[1].replace(/\+/g, " "));
}

//MAIN
function show_template_page () {
	var content = '';
	
	$('body').append("<div id='left_sidebar' class='left_sidebar'></div>");
	$('body').append("<div id='center_block' class='center_block'></div>");
	$('#left_sidebar').append("<div id='repository_list' class='repository_list'></div>");	
	$('#left_sidebar').append("<div id='dataset_list' class='dataset_list'></div>");
	$('#center_block').append("<div id='active_info' class='active_info'></div>");
	$('#center_block').append("<div id='record_wrapper' class='record_wrapper'></div>");
	$('#center_block').append("<div id='record_list' class='record_list'></div>");
	$('#center_block').append("<div id='record_nav' class='record_nav'></div>");

	$('#active_info').append("<div class=info_title>Repository URI <span id='repository_root' class='repository_root'></span></div>");
	$('#active_info').append("<div class=info_title>Dataset Id <span id='dataset_id' class='dataset_id'></span></div>");
	$('#active_info').append("<div class=info_title>Record Id <span id='record_id' class='record_id'></span></div>");
	$('#active_info').append("<div id='status' class='status'></div>");

	show_template_record();
}

function show_ids() {
	$('#repository_root').html(BKN_WSF.get('url'));
	$('#dataset_id').html(Dataset.get('id'));
	$('#record_id').html(Record.get('id'));
}

function show_repository_list () {
	$('#repository_list').html('<div class="block_header">Dataset Repositories</div>');
	var app_url = "" + window.location.protocol + "//" 
	app_url +=  window.location.hostname + window.location.pathname + "?";
	var content = '';
	var repos = [ 'http://datasets.bibsoup.org',
	              'http://www.bibkn.org',
	              'http://people.bibkn.org',
	             ];
	for (var i=0; i < repos.length; i++) {
		content = '<div><a class="repo_item" href="';
		content += app_url+'repository='+repos[i]+'/wsf/">';
		content += repos[i].replace('http://','')+'</a></div>';
		$('#repository_list').append(content);		
	}
}



//-----------------------------
// DATASETS

function show_template_dataset_list() {
	var content = "";
	$('#dataset_list').html("");
	$('#dataset_list').append("<div class='block_header'>Datasets</div>");
	content = "<form><div id='dataset_create_form' class='dataset_create_form'></div></form>"; 
	$('#dataset_list').append(content)
	content = "<form><input type='button' value='New Dataset' id='new_dataset_button' class='_button'/></form>";
	$('#dataset_create_form').append(content)
	$('#new_dataset_button').click(function () {
		show_dataset_create_form();
		});		
	
	$('#dataset_list').append("<table id='dataset_table' class='dataset_table'></table>");	
}

function show_dataset_row (d) {
	var content = "<tr>";
	var link_name = ""

	if (d && ('id' in d) && (d['id'])) {
		// SORT BY TITLE, DATE, OR CONTRIBUTOR
		if (('title' in d) && d['title']) {
			link_name = d['title'];
		}
		else {
			link_name = Dataset.extract_id(d['id']);			
		}
		content += "<td><a class='dataset_link' ";
		content += " href=\'javascript:{select_dataset(\""+d['id']+"\",\"0\");}\'>";
		content += link_name+"</a></td>";	
	}
	else {
		content += "<td>error: dataset does not have an id</td>";
	}

	//	content += "<td class='json_attribute'>"+k+"</td>";
//	content += "<td class='json_string'>"+r[k]+"</td>";		
	content += "</tr>";
	$('#dataset_table').append(content);
	return;
}
function show_dataset_list(bibjson) {
	var content = "";
	status('');	
	//Dataset.set(null);
	show_ids();
	show_template_dataset_list();
	
	content = "";
	var d = null;
	if ('recordList' in bibjson) {
		for (var i=0; i < bibjson['recordList'].length; i++) {
			d = bibjson['recordList'][i];
			show_dataset_row(d);
		}
	}
	else {
		status("Error: No datasets. See details below.");
		show_json(bibjson);
	}	
}

function get_dataset_list () {
	var params = '';
	status('Fetching list of datasets ...');
	bkn_wsf_call(show_dataset_list, "dataset_list", params);	
}

function select_dataset (dataset_id, page) {
	
	Dataset.set(dataset_id);
	show_template_record();
	show_ids();
	get_record_list(dataset_id, page);
}


//-----------------------------
//RECORDS

function show_record (bibjson) {
	$('#record_form').html("");
	$('#record_buttons').html("");
	
	show_ids();	// THIS DISPLAYS 'CURRENT' IDS, MAY WANT TO CHECK RESULT THEN SET
	if (bibjson && ('recordList' in bibjson) && (bibjson.recordList.length == 1)) {
		// dislay the record id, strip the uri if necessary, 
		var record = bibjson.recordList[0];
		if ('id' in record) { //  && (record['id'].substring(0,7) == 'http://')		
			Record.set(record['id']);
			// find the last slash then extract string following slash
			//record['id'] = record['id'].substring(record['id'].lastIndexOf('/')+1)
			$('#record_id').html(Record.get('id'));
		}
		else {
			Record.set(null);			
		}
		display_record_form(bibjson.recordList[0]);		
	}
//	else if (jQuery.isEmptyObject(bibjson)) {
//		display_record_form({});				
//	}
	else if (bibjson) {
		Record.set(null);
		status("Error: Expecting one BibJSON record in recordList array");
		show_json(bibjson);
	}
	// refresh record list if there was an edit
	Display.refresh('show_record');
}


function get_record (record_uri) {
	var params = '';
	params += '&uri=' + Record.set(record_uri); // set
	params += '&dataset=' + Dataset.get();      // use current dataset
	bkn_wsf_call(show_record, "record_read", params);	
}

function show_record_row (r) {
	var content = "<tr>";
	var link_name = ""

	if (r && ('id' in r) && (r['id'])) {
		if (('name' in r) && r['name']) {
			link_name = r['name'];
		}
		else {
			link_name = Record.extract_id(r['id']);			
		}
		content += "<td><a class='record_link' ";
		content += " href=\'javascript:{get_record(\""+r['id']+"\");}\'>";
		content += link_name+"</a></td>";	
	}
	else {
		if (r && ('error' in r)) {
			// IF THE ERROR IS DUE TO BROWSE CACHE ISSUE DON'T DISPLAY THE ROW
			// PASS THE 'PLUCKED' ROW AND CHECK IT
			if (('reason' in r) && (r['reason'] == '403') || (r['reason'] == '400') ) {
				content += "<td>Record not accessible.</td>"; 
			}			
			else {
				content += "<td>error: "+r['error'];
				if ('reason' in r) {content += " reason: "+r['reason']; }
				if ('urllib2' in r) {content += " detail: "+r['urllib2']; }
				content += " </td>";										
			}
		}
		else {
			content += "<td>error: record does not have an id</td>";			
		}
	}

	//	content += "<td class='json_attribute'>"+k+"</td>";
//	content += "<td class='json_string'>"+r[k]+"</td>";		
	content += "</tr>";
	$('#record_table').append(content);
	return;
}

function show_record_nav (record_count) {
	var page = Number(Dataset.get('page'));
	var next = page + 1;
	var prev = page - 1;
	var content = "";
	
	content += "<table><tr>"
	if (prev >= 0) {
		content += "<td><a class='nav_link' ";
		content += " href=\'javascript:{page_record_list(\""+Dataset.get()+"\", \""+prev+"\");}\'>";
		content += "previous</a></td>";	
		
	}
	
	// This is weird but simple. Good enough until a function is created to get_total_record_count
	// When the response has less records then the page size we know we are at the end
	if (record_count >= (Number(Dataset.get('page_size')))) {
		content += "<td><a class='nav_link' ";
		content += " href=\'javascript:{page_record_list(\""+Dataset.get()+"\", \""+next+"\");}\'>";
		content += "next</a></td>";	
		content += "</tr></table>"		
	}
	$('#record_nav').html(content);
	
}

function show_record_list(bibjson) {
	var content = '';
	status('');
	content += "<input type='button' value='New Record' id='new_record_button' class='_button'/>";
	$('#record_list').html(content);
	
	$('#new_record_button').click(function () {
		show_template_record_create(Record.get('uri'));
		});	
	
	$('#record_list').append("<div></div>");
	$('#record_list').append("<table id='record_table' class='record_table'></table>");

	Display.refresh('show_record_list'); // this also pops the request stack
	show_ids();
	var record_count = 0;
	if (bibjson && ('recordList' in bibjson)) {
		record_count = bibjson['recordList'].length;
	}
	content = "";
	var r = null;
	if ('recordList' in bibjson) {
		//
		// NEED TO EXTRACT COUNT OF TOTAL RECORDS
		
		for (var i=0; i < record_count; i++) {
			r = bibjson['recordList'][i];
			show_record_row(r);
		}
		show_record_nav(record_count);
	}
	else {
		status("Error: No recordList in dataset. See details below.");
		show_json(bibjson);
	}	
}

function page_record_list (dataset_uri, page) {
	$('#record_wrapper').html("");
	
	get_record_list(dataset_uri, page);
}

function get_record_list (dataset_uri, page) {
	var params = '';
	status('Fetching list of records ...');
	if (!dataset_uri) {
		dataset_uri = Dataset.get();
		//Record.set(null); // sometimes we want to keep the record just refresh list
	}
	else {
		Dataset.set(dataset_uri,'uri')
	}
	//show_ids();
	if (page) {
		Dataset.set(page, 'page');
	}
	params += '&datasets=' + dataset_uri;
	params += '&items='+ Dataset.get('page_size');
	params += '&page='+ Dataset.get('page');
	bkn_wsf_call(show_record_list, "browse", params);	
}
function show_template_record() {

	$('#record_wrapper').html("");
	$('#record_wrapper').append("<form><div id='record_form' class='record_form'></div></form>");
	$('#record_wrapper').append("<form><div id='add_record_form' class='record_form'></div></form>");
	$('#record_wrapper').append("<div id='add_attribute_button'></div>");
	$('#record_wrapper').append("<form><div id='record_buttons'></div></form>");
	Record.set(null);
	show_ids();
}

function show_template_record_create (record_uri, dataset_uri) {
	Record.set(null);
	$('#record_id').html("");
	show_record(null);
	var content = "";

	$('#add_record_form').html("");
	show_attribute_add_box();
	content = "<div><a href='javascript:\{show_attribute_add_box();\}'>add</a></div>";
	$('#add_attribute_button').html(content);
	
	content = "<input type='button' value='Create' id='create_record_button' class='_button'/>";
	$('#record_buttons').html(content);	
	$('#create_record_button').click(function () {
		record_add(Record.get('uri'), Dataset.get());
		});	
}

function record_add (record_uri, dataset_uri) {
	var record = {};	
	var add_attributes = add_to_json();
	if (add_attributes) {
		$.extend(true, record, add_attributes);		
	}
	
	var params = set_add_update_params(record, null, dataset_uri)
//NEED TO REVIEW EDITS BEFORE UPDATE
//link to ref subobjects and display one level
	
	bkn_wsf_call(
			function (response) {
				show_record(response);
				status("Create succeeded");
//NEED TO UPDATE RECORD LIST IF NAME CHANGES

				}, 
			"record_add", params
			);
}

function set_add_update_params(record, record_uri, dataset_uri) {
	
	var params = '';
	params += '&dataset=' + Dataset.set(dataset_uri); // set
	
	// STRIP THE DATASET URI PREFIX
	if ('id' in record) {
		record['id'] = record['id'].replace(dataset_uri,'')
		Record.set(record['id']);
	}
	else {
		status('Record requires an "id" attribute.');
	}
	
	// TODO: this should not be necessary. It record_uri is sent by record_update
	// we can get the id from the record which must have an id
	// a future implementation may auto-generate the id
	if (record_uri) { 
		Record.set(record_uri);
	}
	
	params += '&uri=' + Record.get();
	
	var bibjson = {
				'dataset': Dataset.get('template'),
				'recordList': [record]
				};
	params += "&document=" + JSON.stringify(bibjson);
	
	return params
}

function record_update (record_uri, dataset_uri) {
	status("Updating record ...");
	var record = record_to_json();	
	var add_attributes = add_to_json();
	if (add_attributes) {
		$.extend(true, record, add_attributes);		
	}
	
	var params = set_add_update_params(record, record_uri, dataset_uri)
//NEED TO REVIEW EDITS BEFORE UPDATE
//link to ref subobjects and display one level
	
	bkn_wsf_call(
			function (response) {
				show_record(response);
				status("Update succeeded");
				}, 
			"record_update", params
			);
}	

function record_delete (record_uri, dataset_uri) {
	status("Deleting record ...");
	var params = '';
	params += '&dataset=' + Dataset.set(dataset_uri); // set
	params += '&uri=' +     Record.set(record_uri);   // set
	bkn_wsf_call(
			function(response) {
				status("Delete succeeded");
				var request = BKN_WSF.pluck('record_delete'); // SHOULD VERIFY THE REQUEST
				Record.set(null);
				$('#record_id').html("");
				get_record_list(Dataset.get()); // refresh the list
				}, 
			"record_delete", params
			);
}

// MAIN
$(document).ready(function() {
	$('body').append("<div id='page_header_wrapper' class='page_header_wrapper'></div>");

	$('#page_header_wrapper').html("<div class='logo'>bknEditor</div>");
	$('#page_header_wrapper').append(
			"<div class='page_subheader'>Brought to you by Bibliographic Knowledge Network<br>DEVELOPMENT TEST VERSION</div>");

/*
 * STUFF FOR TESTING
	bibjson = {
			'id':'1',
			'name': 'fiend'
	}
	
	//deb("To test the stable prototype use, <a hre='http://services.bibsoup.org/structwsf/test.html'>http://services.bibsoup.org/structwsf/test.html</a>")
	//deb("<br>");

//	BKN_WSF.set('http://people.bibkn.org/wsf/','root');
//	Dataset.set('jack_update_test');	
//	show_template_page();
//	get_record_list(Dataset.get());
	
*/	
	// instantiate classes
	BKN_WSF();
	Dataset(); 
	Record();
	
    if ($(document).getUrlParam("repository")) {
    	BKN_WSF(decodeURIComponent($(document).getUrlParam("repository")));
    }
    else if (location.search.substring(0,5) == '?url=') {
		//http://people.bibkn.org/conStruct/view/?uri=http%3A%2F%2Fpeople.bibkn.org%2Fwsf%2Fdatasets%2Fjack_update_test%2Ff2&dataset=http%3A%2F%2Fpeople.bibkn.org%2Fwsf%2Fdatasets%2Fjack_update_test%2F
		
		// This supports javascript bookmarklet from the drupal page for a record
		var bkn_params = '';
		status("Record referred by bookmarklet.");
		//NEED TO EXTRACT DOMAIN AND DATASET ROOT
		BKN_WSF.set('http://people.bibkn.org/wsf/','root');
		bkn_params = location.search.slice(5);	
		Dataset(extract_url_parameter(bkn_params, 'dataset'));
		Record(extract_url_parameter(bkn_params, 'uri'));
	}

//deb('bknroot:'+BKN_WSF.get('root')+':');
	show_template_page();
	BKN_WSF.set(BKN_WSF.get('root')+'ws/', 'service_root');
	Dataset.set(BKN_WSF.get()+'datasets/','root')
	$('#center_block').append("<div id='debug_area' class='debug_area></div>");
	debug_id = document.getElementById('debug_area');
    deb('BELOW IS THE DEBUG AREA')	


	//deb('service'+BKN_WSF.get('service_root'));
//deb('datasetroot'+Dataset.get('root'));
//deb('recorduri:'+Record.get('uri')+':')
//deb('dataseturi:'+Dataset.get('uri')+':')
//deb( ""+window.location.hostname + window.location.pathname + "?");
	show_repository_list();
	if (BKN_WSF.get('root')) {
		var params = '';
		if (Record.get('uri')) {
			params += '&dataset=' + Dataset.get();
			params += '&uri=' + Record.get('uri');//ds_uri+ 'f2';
			bkn_wsf_call(show_record, "record_read", params);	
		}   // show_record calls show_dataset
		else { 			
			get_dataset_list();
		}		
	}
	

	// I JUST LEARNED THAT ID AND URI MUST BE THE SAME VALUE
	
	// YOU ARE HERE - ABOUT TO TEST 
	// TODO
	//	ADD RECORD
	//	ADD/UPDATE ATTRIBUTE
	//	SEARCH W/ PAGING
	//  DISPLAY FACETS
	// 
	// NEED TO TRACK STATE OF BKN_WSF CALLS
	//  may want to refresh dataset list
	//  may want to prevent actions (edit/delete) while one is in progress
	
}); // document ready
