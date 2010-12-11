<?php

$filename = $_GET['file'];
//$fName = basename(filename);

//  charset=UTF-8
// http://localhost/bkn/bkn_editor/download_file.php?file=/Library/WebServer/Documents/bkn/bkn_editor/user_files/selected_records20101048580.json
//header("Content-Type:application/json;");

header("Content-Transfer-Encoding: binary");
header("Content-Length: ".filesize($filename));
header("Content-Type:application/force-download");
header("Content-Disposition: attachment; filename=\"".basename($filename)."\";" );

readfile("$filename");
exit();

//header("Content-Type:text/plain;");
//header("Content-Disposition:attachment;");
//$fName = basename($_GET['file']);
//fpassthru($fName);




?> 