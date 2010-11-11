
function save_selected_content(section) {
	
	var data = '';
	var file_name = 'bkn_editor.json'
	if (section == 'selected_records') {
		var t = new Date();
		data = formattedJSON(Selection.get_records(), 'file');
		file_name = 'selected_records';
		file_name += ''+t.getFullYear()+t.getMonth()+t.getDay()+t.getHours()+t.getMinutes()+t.getSeconds();     
		file_name += '.json';
	}
	
	var service = "http://" + window.location.hostname + "/";
	service += "cgi-bin/file_op/save_file.py";
//	service += "cgi-bin/file_op/file_test.py";
	
	var params ='&file=' + file_name;
	params += '&folder=user_files';
// need to decode data before sending.
//deb('utf8encode:<br>'+Utf8.encode(data))
//deb('utf8decode:<br>'+Utf8.decode(data))
//deb('htmldecode:<br>'+Encoder.htmlDecode(data));
//deb('HTML2Numerical:<br>'+Encoder.HTML2Numerical(data))
//deb('NumericalToHTML:<br>'+Encoder.NumericalToHTML(data))
//data = Utf8.decode(data);	
	
	params += '&data='+ encodeURIComponent(data);//(formattedJSON(r,'file'));
//deb('service: '+service+'?'+params);
    $.ajax({
        url: service,
        data: params,
        type: "post",
        cache: false,
        dataType: "jsonp", 
        error: function(xobj, status, error){
			deb('error');
			        },
        success: function (response) {
			// this could happen if a python services fails.
			if ((typeof response) == 'string') {
				deb(response);
			}	
			var content = '';			
			content += "&nbsp;&nbsp;&nbsp;&nbsp;";
			
			var downloader_service = "";
			downloader_service += "download_file.php?file=";
			downloader_service += response['file_location']
			content += "<a href=\""+downloader_service+"\" ";
			content += ">Download Collection ";
			content += "</a>";

			content += "&nbsp;&nbsp;&nbsp;&nbsp;";
			content += "<a href=\""+response['location_url']+"\" ";
			content += " target='_blank'";
			content += ">Display JSON";
			content += "</a>";
			$('#selected_records_download').html(content);
			
		}
    }); 
}

function show_template_selected_records() {

	var content = '';
	$('#selected_records_section').html('');
	content += "<div class='block_header'>Selected Records</div>"
	content += "<div id='selected_records' class='selected_records'></div>";
	$('#selected_records_section').append(content);
	content = "<div>";
	content += "<span id='selected_records_save' class='selected_records_save'></span>";
	content += "<span id='selected_records_download' class='selected_records_download'></span>";
	content += "</div>";
	$('#selected_records_section').append(content);
	content = '';	
	content += "<a href=\'javascript:{Selection.save();}\'>";
	content += "Save Collection</a>";
	$('#selected_records_save').html(content);

}

var BKN_WSF = function (v) {
	var part = {
		'root': '', // http://people.bibkn.org/wsf/
		'service_root': ''	// http://people.bibkn.org/wsf/ws/			
	};
	var request_stack = [];
	
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
	};
	
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
	};
	
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
	};

	BKN_WSF.error = function (response) {
		//var xobj = '';
		var error = ('error' in response) ? response['error'] : "UNKNOWN ERROR";
		var code = '';
		// this could happen if a python services fails.
		if ((typeof response) == 'string') {
			deb(response);
		}
		if ('status' in response) {
			// the response is an http response, the http request failed, request not sent ot bkn_wsf.py
			code = response['status'];
		}
		else if ('reason' in response) {
			// the response is from bkn_wsf.py
			code = response['reason'];
		}
		else {
			code = "UNKNOWN RESPONSE TYPE";
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
	};


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

		var response_format = 'jsonp';
		if (accept) {response_format = accept;};
//	deb(wsf_php_proxy +"?"+wsf_params);
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
						// this could happen if a python services fails.
						if ((typeof response) == 'string') {
							deb(response);
						}				

			        	if (response && ('error' in response)) {
			        		BKN_WSF.error(response);
			        	}
			        	else {
// utf8							
//deb('response: <br>'+Utf8.decode(formattedJSON(response)));	

		        			callback(response);		        		
			        	}
			}
	    }); 
	};


}; // BKN_WSF


var Dataset = function (v) {
	var root = ''; http://people.bibkn.org/wsf/datasets/ 
	var id = '';
	var uri = '';
	var page = 0;
	var page_size = 10;
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
			};
	
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
	};

	Dataset.set = function (v,k) {
		var response = null;
		if (v && !k) {
			if (v.substring(0,7) == 'http://') {
				response = Dataset.set(v, 'uri');
			}
			else {
				response = Dataset.set(v, 'id');
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
	};
	
	Dataset.extract_root = function (v) {
		// trailing slash differentiates a dataset uri from a record uri
		if (v) {
			// find '/' preceding id
			var end = unslash_end(v).lastIndexOf('/');
			// root ends with '/'
			return slash_end(v.slice(0,end)); 	
		}
		else {
			return '';
		}
	};

	Dataset.extract_id = function (v) {
		if (v) {
			return unslash_end(v.replace(Dataset.get('root'),'')); //unslash_end(uri).slice(start);	
		}
		else {
			return '';
		}

	};
	
	// init
	if (v) {
		arg = v;
	}
	else if (arg && (arg != null) && (arg != 'null') && (arg != '')) {
		arg = decodeURIComponent(arg);
	}
	else {
		arg = '';
	}
	Dataset.set(arg);
			
}; // Dataset class


var Display = function () {
	Display.refresh = function (called_from) {
		var request = '';
		switch (called_from) {
			case 'show_record':
				request = BKN_WSF.pluck('show_record');
				if (request && ('service' in request)) {
					var service = request['service'];
					// 10/26/10 removed (service == 'record_update') || 
					if ((service == 'record_add')) {
						get_record_list(Dataset.get());
					}
				}
				break;
			case 'show_record_list':
				request = BKN_WSF.pluck();
				if (request && ('service' in request) && (request['service'] == 'record_delete')) {
					$('#more_attribute_button').html("");
					$('#record_buttons').html('');
					$('#record_form').html('');
					status('Fresh list of records.');
				}			
				break;
			case 'show_dataset_list':
				request = BKN_WSF.pluck();
				$('#more_attribute_button').html("");
				$('#record_form').html('');
				$('#record_buttons').html('');
				$('#record_list').html('');
				$('#record_nav').html('');
				break;
			default:
				break;
			}
	};
};
Display(); // instantiate

//-----------------------------
// SELECTION

var Selection = function () {
	// TODO: USE COLLECTION CLASS INSTEAD OF RECORD_LOOKUP
	var record_lookup = {};

	Selection.add_record = function (record_uri, link_name) {
		var list_item = Record_list.get('item', record_uri);
		
		// TODO: CREATE ITEM CLASS FOR SELECTION
		var item_id = 'selected_'+record_uri.replace(/[\/\:\.\-]/g,'_');
		// clear download because it show previous saved collection
		$('#selected_records_download').html(''); 
		var content = ''
		content += "<div id='"+item_id+"'>";
		
		// link to remove from selection
		content += "<a title='Remove from Selected Records' ";
		content += " href=\'javascript:{Selection.remove_record(\""+record_uri+"\",\""+link_name+"\");}\'>";
		content += "<img src='gold_dot.gif' class='select_link'></img></a>";	
		
		// link to display record
		content += "&nbsp;&nbsp;<a title='Display Record Detail' class='record_link' ";
		content += " href=\'javascript:{get_record(\""+record_uri+"\");}\'>";
		content += link_name+"</a></div>";			
		$('#selected_records').append(content);

		// Selection.save depends on value == null until data fetch is complete.
		// TODO: SHOULD NOT NEED TO FETCH. DATA IS IN COLLECTION
		record_lookup[record_uri] = list_item.data;
//		Selection.fetch_record_detail(record_uri)
		// disable the selector link in the record list
		Record_list.set('selected',record_uri,true);
		list_item.display('visible', record_uri);
		return record_lookup.length;
	};

	Selection.remove_record = function(record_uri, link_name){
		var content = '';
		var list_item = Record_list.get('item', record_uri);
		// clear download because it show previous saved collection
		$('#selected_records_download').html(''); 
		// TODO: CREATE ITEM CLASS FOR SELECTION
		var item_id = 'selected_'+record_uri.replace(/[\/\:\.\-]/g,'_');
		$('#'+item_id).remove();
		delete record_lookup[record_uri];
		// enable the selector link in the record list
		Record_list.set('selected',record_uri,false);
		list_item.display('visible', record_uri);

		return record_lookup.length;
	};

	Selection.get_records = function ()	{
		return record_lookup;
	};
	
	Selection.save = function () {
		save_selected_content('selected_records');		
	};

};
Selection(); // instantiate


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
//deb('params: <br>'+Utf8.encode(params));	
params = Utf8.encode(params);	


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
	    for (var attrname in _kvp) {
	    	json[attrname] = _kvp[attrname];
	    }	
	});

   return json;
}	



function add_to_json() {
	var json = {};
	var _kvp = null;
	$('#more_attribute_form > .kvp').each(function (idx) {
	    _kvp = kvp($(this));
	    for (var attrname in _kvp) {
	    	json[attrname] = _kvp[attrname];
	    }	
	});
   return json;
}	

function dataset_create(dataset_id, title, description) {
	clear_record_form();
	clear_record_list();
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


function show_more_box() {
	var el_id = 'kvp_more_attr' + Reformed.count['key']++;
	var content = '';
	// class 'kvp' is used by reformed to parse form
	// the anchor for remove_link may also be necessary
	content += '<div class="kvp">';
	content += '<a class="remove_link"></a>'; // fill space where 'remove' would be
	content += '<input class="more_attr_key" id="'+el_id+'" ';
	content += ' type="text" value="" />';
	content += '<input type="text" value="" />';
	content += "</div>";
	$('#more_attribute_form').append(content);
	$('#'+el_id).focus();

	
}

function show_template_more_attributes() {
	$('#more_attribute_form').html("");
	show_more_box();
	var content ="";
	content +=  "<a title='Show another pair of input boxes'";
	content += " href='javascript:\{show_more_box();\}'>more</a>";
	$('#more_attribute_button').html(content);
	$('#more_attribute_button').keypress(function(e) {
	        if (e.which == 32) // spacebar
	        {
				show_more_box();
	        }
		});
}

function display_record_form (record) {
	var content = '';
	content = "";	
	// Decode utf8 for display 
//	and so that the proper string is sent back to server when form is parsed
	content += Utf8.decode(Reformed.show(record));	
	$('#record_form').html(content);

	show_template_more_attributes();
	content = "";
	content += "<input type='button' value='Save' id='record_save_button' class='_button'/>";
	content += "<input type='button' value='Delete' id='delete_button' class='_button'/>";
	$('#record_buttons').html(content);	
	$('#record_save_button').click(function () {
		record_update(Record.get('uri'), Dataset.get());
		});	
	$('#delete_button').click(function () {
		record_delete(Record.get('uri'), Dataset.get());
		});	
}

function slash_end (v) {
	// make sure uri ends in slash
	if (v && (v.charAt(v.length-1) != '/')) {
		return v + '/';
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
		value = regex.exec( url );
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
	$('#left_sidebar').append("<div id='active_info' class='active_info'></div>");
	$('#left_sidebar').append("<div id='repository_list' class='repository_list'></div>");	
//	$('#left_sidebar').append("<div id='search_form' class='search_form'></div>");
	$('#left_sidebar').append("<div id='dataset_list' class='dataset_list'></div>");
	$('#center_block').append("<div id='status' class='status'></div>");
	$('#center_block').append("<div id='record_wrapper' class='record_wrapper'></div>");
	$('#center_block').append("<div id='selected_records_section' class='selected_records_section'></div>");
	$('#center_block').append("<div id='record_list' class='record_list'></div>");
	$('#center_block').append("<div id='record_nav' class='record_nav'></div>");

	$('#active_info').append('<div class="block_header">Now Showing</div>');
	$('#active_info').append("<div class='info_title'>Repository<div id='repository_root' class='repository_root'></div></div>");
	$('#active_info').append("<div class='info_title'>Dataset<div id='dataset_id' class='dataset_id'></div></div>");
	$('#active_info').append("<div class='info_title'>Record<div id='record_id' class='record_id'></div></div>");
	$('#active_info').append("<div class='permalink' id='permalink'></div>");

	show_template_record();
	show_template_selected_records();
}

function show_ids() {
	$('#repository_root').html(BKN_WSF.get('url'));
	$('#dataset_id').html(Dataset.get('id'));
	$('#record_id').html(Record.get('id'));
	var permalink = '';
	permalink += "" + window.location.protocol + "//" 
	permalink +=  window.location.hostname + window.location.pathname + "?";	
	permalink += '&repository='+ BKN_WSF.get('root');
	permalink += '&dataset='+Dataset.get();
	permalink += '&record='+Record.get('uri');
	permalink = '<a title="Link to current display" href="'+permalink+'" >permalink</a>';
	$('#permalink').html(permalink);
}

function show_repository_list () {
	$('#repository_list').html('<div class="block_header">Dataset Repositories</div>');
	var app_url = "" + window.location.protocol + "//" 
	app_url +=  window.location.hostname + window.location.pathname + "?";
	var content = '';
	var repos = [ 'http://datasets.bibsoup.org',
//	              'http://www.bibkn.org',
	              'http://people.bibkn.org'
	             ];
	$('#repository_list').append('<div id="repository_table" class="repository_table"></div>');
	for (var i=0; i < repos.length; i++) {
		content = '<div><a title= "Display list of datasets for this repository" class="repo_item" href="';
		content += app_url+'repository='+repos[i]+'/wsf/">';
		content += repos[i].replace('http://','')+'</a></div>';
		$('#repository_table').append(content);		
	}
	status('Select a repository.')
}


//-----------------------------
// SEARCH


function show_search_result(response) {
	show_record_list(response)
}


function get_search_result (query, dataset_uri, page) {
	var params = '';
	clear_record_form();
	clear_record_list(); // This sets dataset to null
	status('Fetching list of records ...');
	if (!dataset_uri) {
		dataset_uri = 'all'; //Dataset.get();
		//Record.set(null); // sometimes we want to keep the record just refresh list
	}
	else if (dataset_uri != 'all') {
		Dataset.set(dataset_uri,'uri')
	}
	//show_ids();
	if (page) {
		Dataset.set(page, 'page');
	}
	params += '&query=' + query;
	params += '&datasets=' + dataset_uri;
	params += '&items='+ Dataset.get('page_size');
	params += '&page='+ Dataset.get('page');
	bkn_wsf_call(show_search_result, "search", params);	
}

function get_search_term() {
	return $('#search_form_input').val();
}

function submit_search() {
	var keyword = get_search_term();
	Dataset.set('0', 'page');
	get_search_result (keyword, 'all')	
}

function show_search_form() {
	var content = '<div>';
	content += '<input id="search_form_input" class="search_input" type="text" value="" />';
	content += "<input type='button' value='Search' id='search_button' class='_button'/>";	
	content += "</div>";
	$('#search_form').html(content);
	$('#search_button').click(function () {
		submit_search();
		});		
	$('#search_form_input').keypress(function(e) {
	        // if the key pressed is the enter key
	        if (e.which == 13)
	        {
				submit_search();
	        }
		});
}

//-----------------------------
// DATASETS

function show_template_dataset_list() {
	var content = "";
	$('#dataset_list').html("");
	$('#dataset_list').append("<div class='block_header'>Datasets</div>");
	$('#dataset_list').append("<div id='search_form' class='search_form'></div>");
	content = "<form><div id='dataset_create_form' class='dataset_create_form'></div></form>"; 
	$('#dataset_list').append(content)
	content = "<form><input type='button' value='New Dataset' id='new_dataset_button' class='_button'/></form>";
	$('#dataset_create_form').append(content)
	$('#new_dataset_button').click(function () {
		show_dataset_create_form();
		});		
	show_search_form();
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
		if (link_name.length > 20) {
			// truncate so label doesn't spill into center panel
			link_name = link_name.substring(0,17)+'...'
		}
		content += "<td><a title='Display list of records for this dataset' class='dataset_link' ";
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
// this should only display if a dataset is not selected
	if (!Dataset.get('id')) {
		status('Select a dataset.');		
	}
	
	}
	else {
		status("Error: No datasets. See details below.");
		show_json(bibjson);
	}	
}

function get_dataset_list () {
	var params = '';
	clear_record_list();
	status('Fetching list of datasets ...');
// workaround issue: slow response time retrieving dataset names on bknpeople
	if (BKN_WSF.get('root') == 'http://people.bibkn.org/wsf/') {
		bkn_wsf_call(show_dataset_list, "dataset_list_ids", params);			
	}
	else {
		bkn_wsf_call(show_dataset_list, "dataset_list", params);		
	}
}

function select_dataset (dataset_id, page) {
	Dataset.set(dataset_id);
	show_template_record();
	show_ids();
	// TODO: page should always be set to 0
	get_record_list(dataset_id, page);
}

// TODO: CREATE COLLECTION CLASS AND INSTANTIATE record_list = new Collection

//-----------------------------
// RECORD_LIST
var Record_list = function () {
	var collection = {};
	
	// For persistence. TODO: convert this class into a real class
	Record_list.collection = function () {
		return collection;
	};
	
	function Item(r) {
		this.data = {}
		this.info = {
			'uri': '',
			'selector_id': '',
			'label_id': '',
			'label': '',
			'visible': false,
			'selected': false
		};
		if (r && (typeof r == 'string')) {
			this.set('selector_id',r);
			this.set('label_id',r);
			this.set('uri',r);
		}
		else if (r && (typeof r == 'object') && ('id' in r) && r['id']) {
			this.data = r; // MAY WANT TO COPY THE OBJECT HERE // this must precede next calls
			this.set('selector_id',r['id']);
			this.set('label_id',r['id']);
			this.set('uri', r['id']);
			// can't call set label with id because set 
			// tries to get the record which doesn't exist because
			// Item has not finished instantiating 
			this.set('label', r); 
//deb('Item data: '+formattedJSON(this.data));
		}
	} // Item
	Item.prototype.set = function(request, v){
		var response = '';
		var content = '';
		switch (request) {
			case 'uri':
				this.info[request] = v;
				response = this.info[request];
				break;
			case 'selected':
				this.info[request] = v;
				response = this.info[request];
				break;
			case 'visible':
				this.info.visible = (v != undefined) ? v : true;
				// TODO: NEED TO CHECK FOR EXISTENCE OF ELEMENT ID IN DOM
				this.display('visible');
				response = this.info[request];
				break;
			case 'selector_id':
				this.info[request] = 'record_list_selector_';
				this.info[request] += v.replace(/[\/\:\.\-]/g,'_');
				response = this.info[request];
				break;			
			case 'label_id':
				this.info[request] = 'record_list_label_';
				this.info[request] += v.replace(/[\/\:\.\-]/g,'_');
				response = this.info[request];
				break;			
			case 'label':
				var link_name = '';
				// TODO: MAY WANT TO SET r AT THE TOP OF THE METHOD
				var r; 
				if (v && (typeof v == 'object') && ('id' in v) && v['id']) {
					r = v;
				}
				else if (v && (typeof v == 'string')) {
					r  = Record_list.get('record',v);				
				}
				else {
					response = v;
					break;					
				}
				if (r && ('name' in r) && r['name']) {
					link_name = r['name'];
				}
				else if (r && ('title' in r) && r['title']) {
					link_name = r['title'];
				}
				else if (r && ('id' in r) && r['id']) {
					link_name = Record.extract_id(r['id']);			
				}
				else {
					link_name = 'record has no name, title, or id';
				}
				this.info[request] = link_name;
				response = this.info[request];
				break;			
			default:
				break;			
			}
		return response;			
	};
	Item.prototype.get = function(request, v){
		var response = '';
		var content = '';
		switch (request) {
			case 'visible':
			case 'selected':
			case 'selector_id':
			case 'label_id':
			case 'label':
				response = this.info[request];
				break;
			case 'selector_link':
				content = '';
				if (this.info.selected) {
					content += "<img src='gray_dot.gif' class='select_link'></img>";
				}
				else {
					content += "<a ";
					content += " title='Add to Selected Records' ";
					content += " href=\'javascript:"
					content += "{Selection.add_record(";
					content += "\""+this.info.uri+"\",";
					content += "\""+this.info.label+"\");";
					content += "}\'>";		
					content += "<img src='gold_dot.gif' class='select_link'></img>";		
					content += "</a>";						
				}
				response = content;
				break;			
			case 'label_link':
				content += "<a title='Display Record Detail' class='record_link' ";
				content += " href=\'javascript:{get_record(\""+this.info.uri+"\");}\'>";
				content += this.info.label+"</a>";	
				response = content;
				break;			
			default:
				break;			
			}
		return response;			
	};
	Item.prototype.display = function(request, v){
		var response = '';
		var content = "";
		switch (request) {
			case 'visible':
				if (this.info.visible && this.info.uri) {
					if (this.info.selector_id) {
						content = this.get('selector_link',this.info.uri) 
						$('#'+this.info.selector_id).html(content);						
					}
					if (this.info.label_id) {
						content = this.get('label_link',this.info.uri) 
						$('#'+this.info.label_id).html(content);						
					}
				}		
				break;			
			default:
				break;			
			}
		return response;			

	};	
	
	
	Record_list.set = function (request,v, v2) {
		var response = '';
		content = '';
		switch (request) {
			case 'item':
				// generate id if non exists
				var k = 'no_id_'+ Math.uuid();
				// v could be a record object
				if (v && (typeof v == 'object') && ('id' in v) && v['id']) {
					k = v['id']
				}
				else if (v && (typeof v == 'string')) {
					k = v;
				}
				collection[k] = new Item(v);					
				response = collection[k];
				break;
			case 'visible':
// TODO clean this up
				collection[v].set('visible');
//				break;			
			case 'selected':
//				collection[v].set('selected');
				var b = (v2 != undefined) ? v2 : true;
				collection[v].set(request, b);
				response = collection[v].info[request];
				break;

			case 'selector_id':
			case 'label_id':
			case 'label':
				collection[v].set(request, v);
				response = collection[v].info[request];
				break;			
			default:
				break;			
			}
		return response;
	};

	Record_list.get = function (request,v) {
		var response = '';
		var content = '';
		switch (request) {
			case 'collection':
				response = collection;
				break;			
			case 'item':
				if (v && (v in collection)) {
					response = collection[v];
				}
				break;
			case 'record':
				// return the record data if it is available.
				if (v && (v in collection)) {
					response = collection[v].data ;
				}
			default:
				break;			
			}
		return response;
		
	};

	Record_list.display = function (request, v) {
		var response = '';
		var record = null;
		switch (request) {
			case 'visible':
			default:
				break;			
			}
		return response;				
	};
}
Record_list(); // instantiate

// ------------------------------------------------------

function clear_record_list() {
	Dataset.set(null);
	show_ids();
	$('#record_list').html("");
}


function get_record (r_uri) {
	var params = '';
	var record = null;
	var record_uri = r_uri;
	if (record_uri) {
		Record.set(record_uri);
	}
	else { // use the current record uri if none specified
		record_uri = Record.get('uri');
	}
	clear_record_form();	
	Dataset.set(Record.extract_dataset_uri(record_uri));
	// check if the record detail has been fetched
	record = Record_list.get('record', record_uri);
	if (record && (typeof record == 'object')) {
		var result = {
			"recordList": [record],
			"datalist": {}
		};
		show_record(result);
	}
	else {
		status('Fetching record detail ...');	
		params += '&uri='+record_uri;
		params += '&dataset=' + Dataset.get();      // use current dataset
		bkn_wsf_call(show_record, "record_read", params);			
	}

}

function show_record_row (r) {
	var content = "<tr>";
	var link_name = "";
	var record_uri = "";
	var record_element_id = "";
	var list_item = null;

	if (r && ('id' in r) && (r['id'])) {
		record_uri = r['id'];
		list_item = Record_list.set('item',r);
//		record_selector_element_id = "record_selector_link"+record_uri;
//		if (('name' in r) && r['name']) {
//			link_name = r['name'];
//		}
//		else {
//			link_name = Record.extract_id(record_uri);			
//		}
		content += "<td id='"+list_item.info.selector_id+"' ";
		content += " class='record_list_selector'>";
//		content += list_item.get('selector_link');
		content += "</td>";		
		content += "<td id='"+list_item.info.label_id+"' ";
		content += " class='record_list_label'>";		
//		content += list_item.get('label_link');
		
//		content += "<a title='Display Record Detail' class='record_link' ";
//		content += " href=\'javascript:{get_record(\""+record_uri+"\");}\'>";
//		content += list_item.info.label+"</a>";	
		content += "</td>";	
	}
	else {
		var bad_id = '';
		if (r && ('error' in r)) {
			// IF THE ERROR IS DUE TO BROWSE CACHE ISSUE DON'T DISPLAY THE ROW
			// PASS THE 'PLUCKED' ROW AND CHECK IT
			if (('reason' in r) && (r['reason'] == '403') || (r['reason'] == '400') ) {
				content += "<td class='record_list_selector'></td>";		
				content += "<td class='record_list_label'>Record not accessible.</td>";
			}			
			else {
				content += "<td class='record_list_selector'></td>";		
				content += "<td class='record_list_label'>error: "+r['error'];
				if ('reason' in r) {
					content += " reason: "+r['reason']; 
				}
				if ('urllib2' in r) {
					content += " detail: "+r['urllib2']; 
				}
				content += " </td>";										
			}
		}
		else {
			content += "<td class='record_list_selector'></td>";		
			content += "<td class='record_list_label'>error: record does not have an id</td>";			
		}
	}

	
	content += "</tr>";
	$('#record_table').append(content);
	if (list_item) {
		list_item.set('selected',false);
		list_item.set('visible',true);		
	}

//	if (record_uri) {		
//		set_record_selector_link('unselected', 
//									record_selector_element_id, 
//									record_uri, 
//									link_name);		
//	}
	
	return;
}

function show_record_nav (record_count) {
	var page = Number(Dataset.get('page'));
	var next = page + 1;
	var prev = page - 1;
	var content = "";
	var ds_uri = Dataset.get();
	var keyword = '';
	
	// the result could be based on a search with no database specified
	if (!ds_uri) {
		ds_uri = 'all';
		keyword	= get_search_term();
	}
	
	content += "<table><tr>"
	if (prev >= 0) {
		content += "<td><a class='nav_link'  href=\'javascript:{";
		if (ds_uri == 'all') {
			content += "get_search_result(\""+keyword+"\",\""+ds_uri+"\", \""+prev+"\");";				
		}
		else {
			content += "page_record_list(\""+ds_uri+"\", \""+prev+"\");";
		}
		content += "}\'>previous</a>&nbsp;&nbsp;&nbsp;</td>";	
	}
	
	// This is weird but simple. Good enough until a function is created to get_total_record_count
	// When the response has less records then the page size we know we are at the end
	if (record_count >= (Number(Dataset.get('page_size')))) {
		content += "<td><a class='nav_link'  href=\'javascript:{";
		if (ds_uri == 'all') {
			content += "get_search_result(\""+keyword+"\",\""+ds_uri+"\", \""+next+"\");";		
		}
		else {
			content += "page_record_list(\""+ds_uri+"\", \""+next+"\");";		
		}
		content += "}\'>next</a></td>";	
		content += "</tr></table>"		
	}
	$('#record_nav').html(content);
	
}

function show_record_list(bibjson) {
	var content = '';
	status('');
	var current_dataset = Dataset.get();
	$('#record_list').html(content);
	if (current_dataset) { //  && (current_dataset != 'all/')
		content += "<input type='button' value='New Record' id='new_record_button' class='_button'/>";
		$('#record_list').html(content);
		$('#new_record_button').click(function () {
			show_template_record_create(Record.get('uri'));
			});			
	}
	
	$('#record_list').append("<div class='block_header'>Records</div>");
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
		status('Select a record.')
	}
	else {
		status("Error: No recordList in dataset. See details below.");
		show_json(bibjson);
	}	
//deb('<br>collection,'+formattedJSON(Record_list.get('collection')));
	
}

function page_record_list (dataset_uri, page) {
	$('#record_wrapper').html("");
	
	get_record_list(dataset_uri, page);
}

function get_record_list (dataset_uri, page) {
	var params = '';
	clear_record_list();
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


//-----------------------------
// RECORD


var Record = function (v) {
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
		// TODO: IF DATASET URI IS NOT IN STRING 
		// THEN GET ID BASED ON STRING FOLLOWING LAST SLASH
		if (v) {
			return unslash_end(v).replace(Dataset.get('uri'),'');			
		}
		else {
			return '';
		}
	}

	Record.extract_dataset_uri = function (v) {
		var ds_uri = '';
		// trailing slash differentiates a dataset uri from a record uri
		if (v) {
			// find '/' preceding record id
			var end = v.lastIndexOf('/');
			// root ends with '/'
			ds_uri = slash_end(v.slice(0,end)); 	
		}
		return ds_uri;
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


function clear_record_form() {
//	$('#more_attribute_section').html("");
	Record.set(null);
	show_ids();
	$('#record_buttons').html("");	
	$('#more_attribute_button').html("");
	$('#more_attribute_form').html("");
	$('#record_form').html("");
	// show_template_record
}

function show_record (bibjson) {
	status('')
	$('#record_form').html("");
	$('#record_buttons').html("");
	
// CHANGED 10/8	
//	show_ids();	// THIS DISPLAYS 'CURRENT' IDS, MAY WANT TO CHECK RESULT THEN SET
	if (bibjson && ('recordList' in bibjson) && (bibjson.recordList.length == 1)) {
		// dislay the record id, strip the uri if necessary, 
		var record = bibjson.recordList[0];
		if (record && ('id' in record) && record['id']) { //  && (record['id'].substring(0,7) == 'http://')		
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
	else if (bibjson) {
		Record.set(null);
		status("Error: Expecting one BibJSON record in recordList array");
		show_json(bibjson);
	}
// CHANGED 10/8	
	show_ids();
	// refresh record list if there was an edit
	Display.refresh('show_record');
}


function show_template_record() {

	$('#record_wrapper').html("");
	$('#record_wrapper').append("<form><div id='record_form' class='record_form'></div></form>");
	$('#record_wrapper').append("<div id='more_attribute_section' class='more_attr_section'></div>");
	$('#more_attribute_section').append("<span class='more_attr_heading'></span>");
	$('#more_attribute_section').append("<form><div id='more_attribute_form' class='more_attr_form'></div></form>");
	$('#more_attribute_section').append("<div id='more_attribute_button' class='more_attr_button'></div>"); 
	$('#more_attribute_section').append("<form><div id='record_buttons' class='record_buttons'></div></form>");
	Record.set(null);
	show_ids();	
}
function show_template_record_create (record_uri, dataset_uri) {
	Record.set(null);
	$('#record_id').html("");
	show_template_record();
	show_record(null);
	var content = "";

	show_template_more_attributes();
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
	if (('id' in record) && record['id']) {
		record['id'] = record['id'].replace(dataset_uri,'')
		Record.set(record['id']);
	}
	else {
		record['id'] = Math.uuid();
		Record.set(record['id']);
		status('Unique id generated: '+record['id']);
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
	$('#center_block').append("<div id='debug_area' class='debug_area'></div>");
//	var debug_id = document.getElementById('debug_area');
    deb('The section below is for test and debug information.')	

	show_repository_list();
	if (BKN_WSF.get('root')) {
		var params = '';
	    var ds = $(document).getUrlParam("dataset");
	    var rec = $(document).getUrlParam("record");
//		show_search_form();
		get_dataset_list();
		// TODO: implement search/query and fix section below to removre 'all'
		if ((ds != null) && (rec != null)) {
			// We want to dislay a specific record.
			if (ds == 'all') {	// this means search, but we aren't saving the search term yet
//				Dataset.set(Record.extract_dataset_uri(rec));
			}
			else {
				Dataset.set(decodeURIComponent(ds));			
			}
			get_record_list(Dataset.get());
			if (rec) {
				Record.set(decodeURIComponent(rec));
			}
		}
		if (Record.get('uri')) {
//			params += '&dataset=' + Dataset.get();
//			params += '&uri=' + Record.get();//ds_uri+ 'f2';
//			bkn_wsf_call(show_record, "record_read", params);	
			get_record();
		}   
	}	

}); // document ready



	
// TODO	
// big bugs
//	- New Record button doesn't display

// big features
 
	// display expanded record detail in record list
	// save selected records
	//	- to dataset, 
	// link 'ref' to display new record (with or without Save?)	
	//  DISPLAY FACETS
	// upload json file
	//	- to edit
	//	- of selected records
	// export dataset (json, csv, html, repository)
	// change dataset permissions
	//	- make public
	//	- add user (query for list of users to get ip addresses)
	// check list of datasets to search
	// bulk query given list of names

// little features
    // update location bar   window.location.replace(url)
	//  may want to refresh dataset list after bkn_wsf responses
	//  may want to prevent actions (edit/delete) while one is in progress


// SNIPPETS

// key press for specific form field
//    function submitenter(myfield,e)
//    {...}
//<FORM ACTION="../cgi-bin/formaction.pl">
//    name:     <INPUT NAME=realname SIZE=15><BR>
//    password: <INPUT NAME=password TYPE=PASSWORD SIZE=10
//    onKeyPress="return submitenter(this,event)"><BR>
//<INPUT TYPE=SUBMIT VALUE="Submit">
//</FORM>


// key press anywhere
//document.onkeypress = processKey;
//function processKey(e){...}
