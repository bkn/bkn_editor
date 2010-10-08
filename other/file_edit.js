var dataset = {};
var jtable = null;

$('body').append('<div id="file_request"></div>')
var file_getter = document.createElement('form');
file_getter.id = 'file_getter';
file_getter.method = 'GET';
file_getter.action = '';
$(file_getter).addClass('file_getter');
$('#file_request').append(file_getter);

var file_input = document.createElement('input');
file_input.id = 'file_input';
file_input.cols = 30;
file_input.value = 'in.json';
$(file_getter).append('File Name:  ');
$(file_getter).append(file_input);
get_file();

$('body').append('<div id="data_wrapper"></div>');
$('#data_wrapper').addClass('data_wrapper');

$.get(file_input.value,make_json_form);

/*
  
couch_call('');
couch_call('_uuids');
 
 * 
 */

//couch_call('newjackcity');



function couch_result(response){

deb('json:<br>'+formattedJSON(response));
}

function couch_call(cmd) {
    var location = "http://";
    if (window.location.protocol == "file:") {
        location += "localhost:5984";      
    }
    else {
        location += window.location.hostname+':5984';
    }
/*
 * 
	req.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
	req.setRequestHeader("Content-length", reqParams.length);
	req.setRequestHeader("Connection", "close");
	Access-Control-Allow-Origin: http://
	req.setRequestHeader('X-PINGARUNER', 'pingpong');
	
	// could this be useful for BKN auth in general
	Access-Control-Allow-Credentials: true 
 * 
 */	
    dataset_service = location+'/'+cmd;
    dataset_params = {};
    deb('request: '+dataset_service);
    $.ajax({
        url: dataset_service,
        data: dataset_params,
        type: "POST",
//        type: "GET",
//        cache: false,
		contentType: 'application/x-www-form-urlencoded',
        dataType: "json",
//        dataType: "jsonp",
        error: function(xobj, status, error){
            deb("<br>status: " + status);
            deb("<br>error: " + error);
        },
        success: couch_result
    });
    	
}


function make_json_form(response) {
	
	dataset = $.secureEvalJSON(response);
//	deb('<br><br>new file'+formattedJSON(dataset));
	var el = document.getElementById('data_wrapper');
	var table_form = document.createElement('form');
	table_form.id = 'json_form';
	table_form.method = 'GET';
	table_form.action = '';
	$(el).html(table_form);
//	el.appendChild(table_form);
//				c.appendChild(f);
	var save_link = '<a href="javascript:show_json(\''+table_form.id+'\');">Show JSON</a>'						
	json_to_table(dataset,table_form);

	$('#data_wrapper').prepend(save_link);
	$('#data_wrapper').append(save_link);
	
}

 function get_file() {

		var button = document.createElement('button');
		button.id = 'file_button';
		$(button).text('Upload');
		$(button).height('25px');
		$(button).width('100px');
		$('#file_getter').append(button);

		var interval;
		
		new AjaxUpload(button, {
			action: '', 
			name: 'myfile',
			onSubmit : function(file, ext){
				// change button text, when user selects file			
				$('#file_button').text('Uploading');
								
				// If you want to allow uploading only 1 file at time,
				// you can disable upload button
				this.disable();
				
				// Uploding -> Uploading. -> Uploading...
				interval = window.setInterval(function(){
					var text = $('#file_button').text();
					if (text.length < 13){
						$('#file_button').text(text + '.');					
					} else {
						$('#file_button').text('Uploading');				
					}
				}, 200);
			},
			onComplete: function(file, response){
				$('#file_button').text('Upload');
							
				window.clearInterval(interval);
							
				// enable upload button
				this.enable();
				
				// add file to the list
				var file_box = document.getElementById('file_input');
				file_box.value = file;
				$.get(file,make_json_form);
				//$('file_request').append().text(file);
			}
		});		
}


function show_json(form_id){

	var r = {};
	var el = document.getElementById(form_id);
	if(el.tagName == 'FORM') {
		if(el.firstElementChild.tagName == 'TABLE'){
			el = el.firstElementChild
			table_to_json(r,el,null);
			$('body').html(formattedJSON(r));
		}
	}	
}


function json_to_table(j, el ,indent) {
	
	if(typeof j != 'object') {
		deb('json_to_table called without an object');
		return;
	}
	if(!indent) {
		indent=0;
	}

	var input;
	var e = 'tester';
	var i = 0;
	var f; // used for form object
	if(el.tagName != 'table') {
		var t = document.createElement('table');		
		t.id = el.id+(i++);
		el.appendChild(t)
	}


	i++;
	//document.getElementById();
	var s = '';
	var c = null;
	for (k in j){
		var r = t.insertRow(-1);
		r.id = el.id+(i++);
        //c = r.insertCell(-1);
		//c.id = el.id+(i++);
		switch (typeof j[k]) {
			case 'object':
				c = r.insertCell(-1);
				c.id = el.id+(i++);
				$(c).append(k);
				if ($.isArray(j[k])) {
//$(c).append(':arr:');					
					$(c).data('type','array');					
					$(c).addClass('json_array');
				}
				else {
//$(c).append(':obj:');					
					$(c).data('type','object');
					$(c).addClass('json_object');
				}
				c = r.insertCell(-1);
				c.id = el.id+(i++);
				json_to_table(j[k], c,indent+2)
				break;

			default:
				c = r.insertCell(-1);				
				c.id = el.id+(i++);

			
				$(c).append(k);
				$(c).addClass('json_string');
//$(c).append(':str:');					
				$(c).data('type','string');
				c = r.insertCell(-1);				
				c.id = el.id+(i++);
				input = document.createElement('textarea');
				input.cols = 30;
				input.id = c.id +(i++);
				$(input).addClass('json_input');
				c.appendChild(input);
				// escape only if there is an anchor link </a>
				if(j[k].search('<') != -1) {
					j[k] = escape(j[k]);//escape
					//j[k] = '"'+j[k]+'"';
				}
				input.value = j[k];
				//$(input).append(escape(j[k]));
				break;			
		} //switch	
	} //for

}


function table_to_json(j, el, container) {
//deb('<br>table_to_json');
	var k = '';
	var x = 0;
	var obj = null;
	var current_el = el;
	if(current_el == null) {
		return;	
	}
	

	var parent_data_type = $(current_el.previousSibling).data('type') 
	var children = null;
	var child = 0;
	var row_el = null;
	
	
	
	if (current_el.tagName == 'TABLE'){
		current_el = current_el.firstElementChild; //tbody
		current_el = current_el.firstElementChild; //tr
		row_el = current_el;
	}
	else {
		// every object starts with a table
		deb('NOT A TABLE');
		//table_to_json(obj,current_el.firstElementChild, container);
		return;
	}
		
//deb('current_el: '+current_el.tagName+	'     type: '+$(current_el).data('type')+'     parent: '+parent_data_type);	
		
	var c = 0;
	while(row_el) {
		current_el = row_el.firstElementChild; //first td		
		switch($(current_el).data('type')){
			case 'object':
				if(container == 'array'){
					j[c] = {};
					obj = j[c];
				}
				else {
					k = $(current_el).html();
//deb('     '+k);
					j[k] = {}	
					obj = j[k];					
				}
				current_el = current_el.nextElementSibling.firstChild;// table should be in td
				table_to_json(obj,current_el, 'object');
				break;
			case 'array':
				if(!j){
					j = {};
				}
				k = $(current_el).html();
				j[k] = [];
//deb('     '+k)	;
				current_el = current_el.nextElementSibling.firstChild; // table should be in td
				table_to_json(j[k], current_el, 'array');
				break;
			case 'string':
					k = $(current_el).html();
//deb('     '+k)	;
					// test
					j[k] = current_el.nextSibling.firstElementChild.value;
					//j[k] = $(current_el.nextSibling.firstElementChild).html();
					current_el.style.borderColor = 'green';
					break;	

			default:
				deb('default:    THIS SHOULD NOT HAPPEN. ')

				break;	
		} // switch
		c++;
		row_el = row_el.nextElementSibling; // next row

	} //while row
	
} // table to json


/********************************************************************************
 * 
 * CODE BELOW IS INCLUDED IN THIS FILE SO ONLY A SINGLE FILE IS REQURED FOR DISTRIBUTION.
 * 
 * 
 ******************************************************************************** 
 */



/*
 * The following functions are from jackpack.js
 * 
 */

function formattedJSON(jobj,output_to) {
	var result_str = "";
	if(output_to == "file"){					
		result_str = JSON.stringify(jobj, null, '\t');
		result_str = result_str.replace(/\t/g, "  ");
		result_str = result_str.replace(/\n/g, "\n");
	}
	else {
		result_str = JSON.stringify(jobj, null, '\t');
		result_str = result_str.replace(/\t/g, "&nbsp;&nbsp;");
		result_str = result_str.replace(/\n/g, "<br>");				
	}
	return result_str;					
}


function deb(str, linebreak){
    if (linebreak == undefined){
        $('body').append("<br>");        
    }
    $('body').append(str);     

}

