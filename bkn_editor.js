

function make_app_url() {
	var app_url = "" + window.location.protocol + "//"; 
	app_url +=  window.location.hostname + window.location.pathname;
	return app_url	;
}

function open_content(callback, file_name, folder, record_id) {
	
	var script = "http://" + window.location.hostname + "/";
	script += "cgi-bin/file_op/file_info.py";	
	var params ='&file=' + file_name;
	// TODO: use config file for root like 'user_files' 
	params += '&folder=' + folder;	
	params += '&service=file_read';
	if (record_id) {
		params += '&record_id='+record_id;
	}
//deb('script: '+script+'?'+params);
    $.ajax({
        url: script,
        data: params,
        type: "post",
        cache: false,
        dataType: "jsonp", 
        error: function(xobj, status, error){
			deb('error');
			        },
        success: callback
    }); 
}




function save_content(data, callback, file_name, folder) {
	
	var script = "http://" + window.location.hostname + "/";
	script += "cgi-bin/file_op/save_file.py";
	
	var params ='&file=' + file_name;
	params += '&folder=' + folder;	
	params += '&data='+ encodeURIComponent(data);//(formattedJSON(r,'file'));
//deb('script: '+script+'?'+params);
    $.ajax({
        url: script,
        data: params,
        type: "post",
        cache: false,
        dataType: "jsonp", 
        error: function(xobj, status, error){
			deb('error');
			        },
        success: callback
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

var BKN = function () {
	var request_stack = [];
	var env =  {
		'repository_id':'',
		'repository_type': '',
		'repository_tree': {}	
	};
	
	
	BKN.set = function (v, k) {
		if (v && k) {
			if (k == 'repository_tree') {
				// TODO check the format of v in case it needs to be converted to a lookup
				env[k] = v; 				
			}
			else {
				env[k] = v; 
			}
		}
	};

	BKN.get = function (k, v) {
		var response = '';
		if (k) {
			if (v && (k == 'repository_tree')) {
				if ((v in env['repository_tree']) &&
						('recordList' in env['repository_tree'][v])) {
					response = {
						'recordList' : env['repository_tree'][v]['recordList']
					};
				}
				else {
					response = null;
				}
			} // k not in env
			else if (k in env) {
				 response = env[k]; 				
			}
		} // k
		return response;
	};
	
	BKN.save_repository_tree = function (response) {
		BKN.set(response, 'repository_tree');
		show_repository_list();
	}
	
	BKN.start = function () {
		var params = '';
	    var ds = $(document).getUrlParam("dataset");
	    var rec = $(document).getUrlParam("record");
		var repository = $(document).getUrlParam("repository");
		var repo_type = $(document).getUrlParam("repo_type");
		// TODO: implement search/query and fix section below to removre 'all'
		if (repository) {
			BKN.set(repository, 'repository_id');
			get_dataset_list();		
			if (ds) {
				// We want to dislay a specific record.
				if (ds == 'all') {	// this means search, but we aren't saving the search term yet
	//				Dataset.set(Record.extract_dataset_uri(rec));
				}
				else {
					Dataset.set(decodeURIComponent(ds));			
				}
				// WAIT FOR get_dataset_list to return?
				get_record_list(Dataset.get());
	
				// WAIT FOR get_record_list to return?
				if (rec) {
					Record.set(decodeURIComponent(rec));
					get_record(Record.get('id'));
				}   
			} // ds
		}
	};
	
	BKN.service_stack = function (v) {
		request_stack.push(v);
	};
	
	BKN.service_pluck = function (k) {
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
};
BKN(); 

var FILE_OP = function (v) {
	var part = {
		'root': '',
		'repository_id': '',
		'repository_tree': null
		};

	FILE_OP.set = function(v, k) {
		if (v && !k) {
			FILE_OP.set(v, 'root')
		}
		else {
			if (k == 'root') {
				part.root = slash_end(v);				
			}
			else if (k == 'repository_id') {
				part.repository_id = v;				
				BKN.set(part.repository_id, 'repository_id');			
				Dataset.set(FILE_OP.get('root')+part.repository_id,'root');	
			}
			else if (k == 'repository_tree') {
				part.repository_tree = v;				
			}
			else {
				return '';
			}
		}
		return part.root;
	};

	FILE_OP.get = function (k) {
		var response = part.repository_id;
		if (k) {
			if (k == 'root') {
				response = part.root;
			}
			else if (k == 'repository_id') {
				response = part.repository_id;
			}
		}
		else {
			response = part.root;			
		}		
		return response;
	};
	
	FILE_OP.save_repository_tree = function (response) {
		FILE_OP.set(response, 'repository_tree');		
		BKN.save_repository_tree(response);		
	};
	
	FILE_OP.start = function (response) {
		FILE_OP.save_repository_tree(response);
		BKN.start();		
	};

	// callback for refresh of dataset_list from new tree 
	FILE_OP.repository_update = function(response){
		FILE_OP.save_repository_tree(response);
		bkn_data_request(show_dataset_list, 'dataset_list', '');
		select_dataset(Dataset.get());
	};
	
	// callback for 'dataset_create'
	FILE_OP.dataset_created = function() {
		bkn_file_call(FILE_OP.repository_update, 'repository_tree');
	};
	
	FILE_OP.request = function(callback, service, params){	
		// TODO switch statement to set script name
		var script = "http://" + window.location.hostname + "/";
		script += "cgi-bin/file_op/file_info.py";	
	//deb('script: '+script+'?'+params);

	    $.ajax({
	        url: script,
	        data: params+'&service='+service,
	        type: "post",
	        cache: false,
	        dataType: "jsonp", 
	        error: function(xobj, status, error){
				deb('error');
				},
	        success: callback
	    }); 
		
	};
	
	FILE_OP.saved = function(response) {
		// this could happen if a python services fails.
		if ((typeof response) == 'string') {
			status('Save Failed');
			deb(response);
		}
		else {
			status('Saved changes.');
		}		
	};	

	
	FILE_OP.record_add = function (record) {		
		if ('id' in record) {
			var list_item = Record_list.set('item',record);
			var bibjson = Record_list.get('record_list');
	//		clear_record_list();
			show_record_list(bibjson);
			get_record(record.id);	// safe to call because it does not require http request
			save_content(
					formattedJSON(bibjson, 'file'), 
					FILE_OP.saved,
					Dataset.get('id'), 
					FILE_OP.get('root') + FILE_OP.get('repository_id')
				);			
		} // TODO handle error if no id

	};

	FILE_OP.record_update = function (record) {
		if ('id' in record) {	
			var list_item = Record_list.get('item',record.id);
			list_item.set('data', record);
			var bibjson = Record_list.get('record_list');
			show_record_list(bibjson);
			get_record(record.id);	// safe to call because it does not require http request
			save_content(
					formattedJSON(bibjson, 'file'), 
					FILE_OP.saved,
					Dataset.get('id'), 
					FILE_OP.get('root') + FILE_OP.get('repository_id')
					);			
		} // TODO handle error if no id
	};

	FILE_OP.record_delete = function (record_uri) {		
		var record_id = Record.extract_id(record_uri);
		if (record_id) {
			Record_list.remove('record_delete', record_id);
			var bibjson = Record_list.get('record_list');
			show_record_list(bibjson);
			clear_record_form();
			save_content(
					formattedJSON(bibjson, 'file'), 
					FILE_OP.saved,
					Dataset.get('id'), 
					FILE_OP.get('root') + FILE_OP.get('repository_id')
					);			
		} // TODO handle error if no id
	};

};
FILE_OP();

var STRUCT_WSF = function (v) {
	var part = {
		'root': '', 
		'service_root': '',
		'repository_tree': {
//			'http://www.bibkn.org/wsf/': 		{'title': 'bibkn.org'},
			'http://datasets.bibsoup.org/wsf/': {'title': 'datasets.bibsoup.org'},
			'http://people.bibkn.org/wsf/': 	{'title': 'people.bibsoup.org'}
		}
	};
	
	if (v) {
		part.root = slash_end(v);
	}
	else {
		part.root = '';		
	}
	
	
	STRUCT_WSF.set = function (v,k) {
		if (v && !k) {
			STRUCT_WSF.set(v, 'root')
		}
		else {
			if (k == 'service_root') {
				part.service_root = slash_end(v);
			}
			else if (k == 'root') {
				part.root = slash_end(v);				
				STRUCT_WSF.set(part.root+'ws/', 'service_root');
				Dataset.set(part.root+'datasets/','root');
				BKN.set(part.root,'repository_id');
			}
			else {
				return '';
			}
		}
		return part.root;
	};
	
	STRUCT_WSF.get = function (k) {
		var response = '';
		if (k) {
			if (k in part) { //== 'service_root'
				response = part[k]; //part.service_root;			
			}
			else if (k == 'website') {
				response = part.root.replace('/wsf/','');
			}
		}
		else {
			response = part.root;			
		}		
		return response;
	};
	STRUCT_WSF.error = function (response) {
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
	    	var content = "You need to <a href='"+STRUCT_WSF.get('website')+"'>LOGIN</a> the repository ";// 
	    	content += " and have permission for the <a href='http://people.bibkn.org/conStruct/dataset/'>dataset</a>.";
	    	status(content);
	    }
	    else {
	    	status("Error: Request failed with, status code:"+code+",  error: "+error);
	    }
		
		return ;
	};


	STRUCT_WSF.request = function (callback, service, params, method, accept) {
		var wsf_script = "cgi-bin/structwsf/bkn_wsf.py";
		var wsf_location = "http://" + window.location.hostname + "/";
		var wsf_php_proxy = "" + wsf_location + wsf_script;
	    var wsf_params = ""; 
//	    wsf_params += "&ws=" + STRUCT_WSF.get('service_root');
		wsf_params += "&bkn_root=" + STRUCT_WSF.get('root');
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
		BKN.service_stack({
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
				    	STRUCT_WSF.error({'xobj':xobj, 'status':status,'error':error});
			},
	        success: function (response) {
						// this could happen if a python services fails.
						if ((typeof response) == 'string') {
							deb(response);
						}				

			        	if (response && ('error' in response)) {
			        		STRUCT_WSF.error(response);
			        	}
			        	else {
// utf8							
//deb('response: <br>'+Utf8.decode(formattedJSON(response)));	

		        			callback(response);		        		
			        	}
			}
	    }); 
	};


// TODO: consolidate add and update functions

	STRUCT_WSF.record_add = function(record, record_uri, dataset_uri){	
		var params = set_add_update_params(record, null, dataset_uri)
	//NEED TO REVIEW EDITS BEFORE UPDATE
	//link to ref subobjects and display one level
		
		bkn_data_request(
				function (response) {
					show_record(response);
					status("Create succeeded");
					//NEED TO UPDATE RECORD LIST IF NAME CHANGES	
					}, 
				'record_add', params
				);
	
	};

	STRUCT_WSF.record_update = function (record, record_uri, dataset_uri) {
		var params = set_add_update_params(record, record_uri, dataset_uri)
		//NEED TO REVIEW EDITS BEFORE UPDATE
		//link to ref subobjects and display one level
	
		bkn_data_request(
				function (response) {
					show_record(response);
					status("Update succeeded");
					}, 
				'record_update', params
				);
		
	};

	STRUCT_WSF.record_delete = function (record_uri, dataset_uri) {
		var params = '';
		params += '&dataset=' + Dataset.set(dataset_uri); // set
		params += '&uri=' +     Record.set(record_uri);   // set
		bkn_data_request(
				function(response) {
					status("Delete succeeded");
					// TODO: call clear_record_form
					var request = BKN.service_pluck('record_delete'); // SHOULD VERIFY THE REQUEST
					Record.set(null);
					$('#record_id').html("");
					get_record_list(Dataset.get()); // refresh the list
					}, 
				"record_delete", params
				);
	};
}; // STRUCT_WSF
STRUCT_WSF();


var Dataset = function (v) {
	var root = '';  
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
			if (v.indexOf('/') != -1) { // v.substring(0,7) == 'http://'
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
Dataset(); 


var Display = function () {
	Display.refresh = function (called_from) {
		var request = '';
		switch (called_from) {
			case 'show_record':
				request = BKN.service_pluck('show_record');
				if (request && ('service' in request)) {
					var service = request['service'];
					// 10/26/10 removed (service == 'record_update') || 
					if ((service == 'record_add')) {
						get_record_list(Dataset.get());
					}
				}
				break;
			case 'show_record_list':
				request = BKN.service_pluck();
				if (request && ('service' in request) && (request['service'] == 'record_delete')) {
					$('#more_attribute_button').html("");
					$('#record_buttons').html('');
					$('#record_form').html('');
					status('Fresh list of records.');
				}			
				break;
			case 'show_dataset_list':
				request = BKN.service_pluck();
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
	var record_list = [];

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

	Selection.get_records = function (k)	{
		var response = {};
		if (k && (k == 'lookup')) {
			response = record_lookup;
		}
		else {
			response = {'recordList':[]};
			for (r in record_lookup) {
				response.recordList.push(record_lookup[r]);
			}
		}
		return response;
	};

	Selection.options = function (response) {
		// this could happen if a python services fails.
		if ((typeof response) == 'string') {
			deb(response);
		}	
		var content = '';			
		content += "&nbsp;&nbsp;&nbsp;&nbsp;";

		var downloader_service = "";
//		downloader_service += "http://" + window.location.hostname + "/";
//		downloader_service += "cgi-bin/file_op/";
		downloader_service += "download_file.php?";
		downloader_service += 'file=' + response['file_location']
		content += "<a href=\""+downloader_service+"\" ";
		content += ">Download Collection ";
		content += "</a>";

		content += "&nbsp;&nbsp;&nbsp;&nbsp;";
		content += "<a href=\""+response['location_url']+"\" ";
		content += " target='_blank'";
		content += ">Display JSON";
		content += "</a>";
		$('#selected_records_download').html(content);			
	};
	
	Selection.save = function () {
		var folder = 'user_files/selected_records'; // TODO: get from FILE_OP or config
		var data = '';
		var file_name = '';
		var t = new Date();
		data = formattedJSON(Selection.get_records(), 'file');
//		file_name = 'selected_records';
		file_name += ''+t.getFullYear()+t.getMonth()+t.getDay()+t.getHours()+t.getMinutes()+t.getSeconds();     
		file_name += '.json';
		save_content(data, Selection.options, file_name, folder);		
	};
};
Selection(); // instantiate


function status (message) {
	$('#status').html(message);
}

function show_json(response){
	deb(formattedJSON(response));
}


function bkn_file_call(callback, service, params) {	
	
	var response = null;
	var file_op_params = '';
	var file_name = '';
	var folder = '';
	var root = '';
	var bibjson = null;
	

//deb('service: '+service);
	switch (service) {
		case 'repository_tree':
			// list should be list of folders at root (user_files)  
			file_op_params = '&folder=' + FILE_OP.get('root');		
			FILE_OP.request(callback, 'folder_tree', file_op_params);	
			break;
		case 'repository_list':
			// list should be list of folders at root (user_files)  
			folder = 'user_files';
			file_op_params = '&folder=' + folder;	
			FILE_OP.request(callback, 'folder_list', file_op_params);	
			break;
		case 'dataset_list_ids':
		case 'dataset_list':
			// get selected repository
			bibjson = BKN.get('repository_tree', BKN.get('repository_id'));			
			show_dataset_list(bibjson);			
			break;
			
		case 'browse':
			// TODO handle paging - 
			// need a special handler for file 
			// different than structwsf behavior
//			Dataset.get('page_size');
//			Dataset.get('page');
			root = FILE_OP.get('root');
			folder = root+BKN.get('repository_id');
			file_name = Dataset.extract_id(extract_url_parameter(params, 'datasets'));
			// TODO replace the following with call to FILE_OP
			open_content(show_record_list, file_name, folder)			
			break;		
		case 'record_read':
			// record could already be in memory - see Record_list
			// params: uri, dataset, record_id
			root = FILE_OP.get('root');
			folder = root+FILE_OP.get('repository_id');
			file_name = Dataset.extract_id(extract_url_parameter(params, 'dataset'));
			// TODO replace the following with call to FILE_OP
			var record_id = Record.extract_id(extract_url_parameter(params, 'uri'));
			open_content(show_record, file_name, folder, record_id);
			break;
		case 'dataset_create':
			root = FILE_OP.get('root');
			folder = root+FILE_OP.get('repository_id');
			file_name = unslash_end(extract_url_parameter(params, 'uri'));
			Dataset.set(file_name+'.json');	// pass in a uri
			file_name = Dataset.get('id');  // get back an id
			bibjson = 	{
							'recordList':[], 
							'dataset':{
								'title':extract_url_parameter(params, 'title'),
								'description':extract_url_parameter(params, 'description')						
							}
						};		
			save_content(
				formattedJSON(bibjson, 'file'),
				FILE_OP.dataset_created, 
				file_name, 
				folder
				);
			break;
		case 'record_add':
		case 'record_update':
		case 'record_delete':
			break;
		case 'search':
		default:
			deb("I can't handle files yet.");
			break;
	};	
}

function bkn_wsf_call(callback, call, params) {
	if ((STRUCT_WSF.get('root') != 'http://datasets.bibsoup.org/wsf/') &&
		(Dataset.get('uri') != 'http://people.bibkn.org/wsf/datasets/jack_update_test/'))
		{
		if (call in ['record_update','record_add', 'record_delete','dataset_create', 'dataset_delete']) {
			status('Edits to this respository are blocked.');
			return;
		}
	}
	params = Utf8.encode(params);	
	STRUCT_WSF.request(callback, call, 
					encodeURIComponent(params), 
					"post", 
					encodeURIComponent("application/iron+json")
					);
}

function bkn_data_request (callback, call, params) {
	var repository_type = BKN.get('repository_type');
	if (repository_type == 'structwsf') {
		bkn_wsf_call(callback, call, params);	
	}
	else if (repository_type == 'host') {
		bkn_file_call(callback, call, params)
	}
	/*
	 * If repository is bkn_wsf then use structwsf
	 * else if repository is file server then use save_file.py, allow upload
	 * else if rep is local file then use upload
	 */
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
	bkn_data_request(get_dataset_list, "dataset_create", params);
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
	// TODO create style class for _type
	$('#left_sidebar').append("<div id='repository_type' class='repository_list'></div>");	
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

	show_repository_types();
	show_template_record();
	show_template_selected_records();
}

function show_ids() {
	$('#repository_root').html(BKN.get('repository_id'));
	$('#dataset_id').html(Dataset.get('id'));
	$('#record_id').html(Record.get('id'));
//http://localhost/bkn/bkn_editor/bkn_editor.html?
//&repository=
//&dataset=http://datasets.bibsoup.org/wsf/datasets/quickie/
//&record=http://datasets.bibsoup.org/wsf/datasets/quickie/5BD0739B-E31D-4375-BAB8-9684A3635906	
	var permalink = '';
	permalink += "" + window.location.protocol + "//" 
	permalink +=  window.location.hostname + window.location.pathname + "?";	
	permalink += '&repo_type=' + BKN.get('repository_type');
	permalink += '&repository='+ BKN.get('repository_id');//STRUCT_WSF.get('root');
	permalink += '&dataset='+Dataset.get();
	permalink += '&record='+Record.get('uri');
	permalink = '<a title="Link to current display" href="'+permalink+'" >permalink</a>';
	$('#permalink').html(permalink);
}

function show_repository_types() {
	$('#repository_type').html('<div class="block_header">Repository Types</div>');
	var content = '';	
	content = '<div><a title= "Display list of repositories of this type."';
	content +=' class="repo_item" href="';
	content += make_app_url() + '?';
	content += '&repo_type=host';
	content += '">Hosted Files</a></div>';
	$('#repository_type').append(content);		

	content = '<div><a title= "Display list of repositories of this type."';
	content +=' class="repo_item" href="';
	content += make_app_url() + '?';
	content += '&repo_type=structwsf';
	content += '">StructWSF</a></div>';
	$('#repository_type').append(content);		
	
}

function show_repository_list() {
	$('#repository_list').html('<div class="block_header">Dataset Repositories</div>');
	
	var repository_type = BKN.get('repository_type');
	var repos = BKN.get('repository_tree');
	var content = '';

	$('#repository_list').append('<div id="repository_table" class="repository_table"></div>');
		
	for (r in repos) {	
		content = '<div><a title= "Display list of datasets for this repository"';
		content +=' class="repo_item" href="';
		content += make_app_url() + '?'+'repository='+r;
		content += '&repo_type=' + repository_type;
		content += '">';
		if ('title' in repos[r]) {
			content += repos[r].title;	
		}
		else {
			content += r;		
		}
		content += '</a></div>';
		$('#repository_table').append(content);		
	}

//	content = '<div><a title="Display list of files on the host server"';
//	content += ' class="repo_item" href="';
//	content += app_url+'repository=host">HOST</a></div>';
//	$('#repository_table').append(content);		
	
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
		Dataset.set(dataset_uri); // ,'uri' removed to work with files
	}
	//show_ids();
	if (page) {
		Dataset.set(page, 'page');
	}
	params += '&query=' + query;
	params += '&datasets=' + dataset_uri;
	params += '&items='+ Dataset.get('page_size');
	params += '&page='+ Dataset.get('page');
	bkn_data_request(show_search_result, "search", params);	
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
	if (bibjson && ('recordList' in bibjson)) {
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
	if (STRUCT_WSF.get('root') == 'http://people.bibkn.org/wsf/') {
		bkn_data_request(show_dataset_list, "dataset_list_ids", params);			
	}
	else {
		bkn_data_request(show_dataset_list, 'dataset_list', params);		
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
			case 'data':
				this.data = v;
				break;
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
//					content += "<img src='gray_dot.gif' class='select_link'></img>";
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
			case 'record_list':
				response = {'recordList':[]};
				for (r in collection) {
					response.recordList.push(collection[r].data);
				}
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
				break;			
			default:
				break;			
			}
		return response;
		
	};

	Record_list.display = function (request, v) {
		var response = '';
		switch (request) {
			case 'visible':
			default:
				break;			
			}
		return response;				
	};
	
	Record_list.remove = function (request, v) {
		var response = '';
		switch (request) {
			case 'record_delete':
				delete collection[v];
			default:
				break;			
			}
		return response;				
	};
	
};
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
	var repository_type = BKN.get('repository_type');
	var record_uri = r_uri;
	if (record_uri) {
		Record.set(record_uri);
	}
	else { // use the current record uri if none specified
		record_uri = Record.get('uri');
	}
	clear_record_form();	
	
	
	// TODO: move code into classes for file_op and structwsf	
	if (repository_type == 'structwsf') {
		Dataset.set(Record.extract_dataset_uri(record_uri));
	}	

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
		bkn_data_request(show_record, 'record_read', params);			
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
		Dataset.set(dataset_uri); // ,'uri' - removed to work with files
	}
	//show_ids();
	if (page) {
		Dataset.set(page, 'page');
	}
	params += '&datasets=' + dataset_uri;
	params += '&items='+ Dataset.get('page_size');
	params += '&page='+ Dataset.get('page');
	bkn_data_request(show_record_list, 'browse', params);	
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
			else { // an id can not include a slash
				if (v.indexOf('/') != -1) {  //v.substring(0,7) == 'http://'
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

}; // Record class
Record();


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
		record_add();
		});	
}



function set_add_update_params(record, record_uri, dataset_uri) {
	
	var repository_type = BKN.get('repository_type');
	var params = '';
	params += '&dataset=' + Dataset.set(dataset_uri); // set
	
	var bibjson = {'recordList': [record]};
	if (repository_type == 'structwsf') {
		bibjson['dataset'] = Dataset.get('template');
	}	
	params += "&document=" + JSON.stringify(bibjson);
	params += '&uri=' + Record.get();
	
	return params
}

function record_add() {
	var repo_type = $(document).getUrlParam("repo_type");	
	var record = {};	
	var add_attributes = add_to_json();
	if (add_attributes) {
		$.extend(true, record, add_attributes);		
	}

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
	
	if (repo_type == 'structwsf') {
		STRUCT_WSF.record_add(record, record.id, Dataset.get());		
	}
	else {
		FILE_OP.record_add(record);
	}
}

function record_update (record_uri, dataset_uri) {
		
	status("Updating record ...");
	var repo_type = $(document).getUrlParam("repo_type");	
	var record = record_to_json();	
	var add_attributes = add_to_json();
	if (add_attributes) {
		$.extend(true, record, add_attributes);		
	}

	// STRIP THE DATASET URI PREFIX
	if (('id' in record) && record['id']) {
		record['id'] = record['id'].replace(dataset_uri,'')
		Record.set(record['id']);
	}
	
	if (repo_type == 'structwsf') {
		STRUCT_WSF.record_update(record, record_uri, dataset_uri);		
	}
	else {
		FILE_OP.record_update(record);
	}
}	

function record_delete (record_uri, dataset_uri) {
	status("Deleting record ...");
	var repo_type = $(document).getUrlParam("repo_type");	

	if (repo_type == 'structwsf') {
		STRUCT_WSF.record_delete(record_uri, dataset_uri);		
	}
	else {
		FILE_OP.record_delete(record_uri);
	}

}

// MAIN
$(document).ready(function() {
	$('body').append("<div id='page_header_wrapper' class='page_header_wrapper'></div>");
	$('#page_header_wrapper').html("<div class='logo'>bknEditor</div>");
	$('#page_header_wrapper').append(
			"<div class='page_subheader'>Brought to you by Bibliographic Knowledge Network<br>DEVELOPMENT TEST VERSION</div>");
	show_template_page();	
	$('#center_block').append("<div id='debug_area' class='debug_area'></div>");
    deb('The section below is for test and debug information.')	

	var repository = $(document).getUrlParam("repository");
	var repo_type = $(document).getUrlParam("repo_type");
	
	if (repo_type && (repo_type == 'host')) {
		BKN.set('host', 'repository_type');
		FILE_OP.set('user_files/', 'root'); // TODO: make this configurable or url param
	    if (repository) {
			FILE_OP.set(repository, 'repository_id');
		}		

		var file_op_params = '&folder=' + FILE_OP.get('root');	
//		FILE_OP.request(FILE_OP.start, 'folder_tree', file_op_params);	
		bkn_data_request(FILE_OP.start,'repository_tree',file_op_params)
		
//		FILE_OP.set('', 'repository_tree'); // this calls BKN.ready()


	}
	else if (repo_type && repo_type == 'structwsf') {
		BKN.set(repo_type, 'repository_type');
		BKN.save_repository_tree(STRUCT_WSF.get('repository_tree'));			
	    if (repository) {
//	    	STRUCT_WSF(decodeURIComponent(repository));
			STRUCT_WSF.set(repository, 'root');
			
		var params = '';
	    var ds = $(document).getUrlParam("dataset");
	    var rec = $(document).getUrlParam("record");
		// TODO: implement search/query and fix section below to removre 'all'
		if (repository) {			
			get_dataset_list();		
			if (ds) {
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
					get_record();
				}   
			} // ds
		}
			
	    }
	}
	else {
		status('Select a repository type.');
	}

//deb('bknroot:'+STRUCT_WSF.get('root')+':');

//	repo_type = BKN.get('repository_type');
//	if (repo_type == 'host') {
//		bkn_data_request(BKN.save_repository_tree, 'repository_tree','');		
//	}
//	else {
//		BKN.save_repository_tree(STRUCTWSF.get('repository_tree'));
////		BKN.set(STRUCTWSF.get('repository_tree'), 'repository_tree');
////		show_repository_list();	
//	}

	if ((repo_type =='host') || (repo_type == 'structwsf')) {
	} // host or structwsf

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
