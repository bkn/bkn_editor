#!/usr/bin/env python
# coding: utf-8

import re, os, logging
from os import getenv,path
from datetime import *
import time
import codecs
import urllib
import urllib2
import urlparse
import simplejson
import sys
import cgi, cgitb 

cgitb.enable()

def microtime_id(): 
    d = datetime.utcnow()
    return d.strftime('%Y%m%d%H%M%S')+str(d).split('.')[1]

def slash_end (s):
    #Appends a trailing '/' if a string doesn't have one already
    if (s[-1] != '/'): s += '/'
    return s

def unslash_end (s):    
    #Removes the trailing '/' if a string has one
    return s.rstrip('/')
cgitb.enable()
cgi_fields = cgi.FieldStorage()    
#print 'Content-type: text/plain \n\n'
#print content
#

def get_referer_parts():
    part = {
        'url':'',
        'url_path':'',
        'file_path':'',
        'server':'',
        'app_file':'',
        'path':''
            }
    s = ''
    part['url'] = os.getenv("HTTP_REFERER")
    if part['url']:
        s = part['url'].replace('http://','')
        end = s.find('/')
        if (end > 0):
            part['server'] = s[0:end]
            s = s[end+1:] # skip slash
        # strip params
        end = s.rfind('?')
        if (end > 0):
            s = s[0:end]
        # find path/file separator
        end = s.rfind('/') + 1 # end includes the slash
        if (end > 0):
            part['path'] = s[0:end]
            part['app_file'] = s[end:]        

    # assume the the referer is on the local server
    docroot = os.getenv("DOCUMENT_ROOT")
    if not docroot:
        docroot = ''
    part['file_path'] = docroot + '/'+ part['path']
    part['url_path']  = 'http://' + part['server'] + '/' + part['path']

    return part

#    response['cwd'] = os.getcwd()
#    response['abs'] = os.path.abspath(os.getcwd())
#    response['base'] = os.path.basename(os.getcwd())

def get_script_path():    
# example SCRIPT_NAME /cgi-bin/test/save_file.py    
    s = os.getenv("SCRIPT_NAME")
    if s[0] == '/': 
        s = s[1:]          # remove leading slash
    end = s.rfind('/') + 1 # include the trailing slash
    if end > 0: 
        s = s[0:end]
    return s
    
def get_script_parts():
    part = {
        'file_path': os.getcwd() + '/',
        'url_path': 'http://' + os.getenv("HTTP_HOST")+'/'+ get_script_path()
    }
    return part

if (cgi_fields):
    callback =  cgi_fields.getfirst('callback')
    root =  cgi_fields.getfirst('root')
    folder =  cgi_fields.getfirst('folder')
    file =  cgi_fields.getfirst('file')
    autogen =  cgi_fields.getfirst('autogen')
    data =  cgi_fields.getfirst('data')
    service =  cgi_fields.getfirst('service') # content, folder_list, file_list
    format = cgi_fields.getfirst('format')

    error = False
    file_path = ''
    file_location = ''
    location_url = ''
    file_content = ''
    content = ''
    response = {}    
    referer = get_referer_parts()
    local = get_script_parts()
    bibjson = None
    server = os.getenv("SERVER_NAME")
    docroot = str(os.getenv("DOCUMENT_ROOT"))
    
    if (not server) or ('server' not in referer) or (not referer['server']):
        error = True
        response['error'] = 'unable to get server or referer name'
    elif (referer['server'] != server):
        error = True # disallow if referer is not on server
        response['error'] = 'referer is not on same server as python file_op services'
    else:
        if not root: 
            # use referer path from docroot
            file_path = referer['file_path']
            url_path =  referer['url_path']
        elif root == '.':
            file_path = local['file_path']
            url_path =  local['url_path']
            

    if autogen == 'folder':
        folder = microtime_id()

    if not folder:
        folder = ''
    else:
        folder = slash_end(folder)
    
    if (not error) and file:
        file_location = file_path+folder+file
        location_url = url_path+folder+file    


    if (service == 'file_read') or (service == 'record_read'):
        if (not file_location) or (file_location == ''):
            error = True
            response['error'] = 'no file specified'           
        if (not error):
            try:
                f = codecs.open(file_location,'r', "utf-8")
                file_content = f.read()
                f.close()
            except:
                error = True
                response['error'] = 'can not read file: '+file_location
        if (not error):
            try:
                response = simplejson.loads(file_content)
                if (format == 'lookup') or (service == 'file_read'):
                    if ('recordList' in response):                        
                        i = 0
                        found = False
                        record_id = cgi_fields.getfirst('record_id')
                        while (not found) and (i < len(response['recordList'])):
                            record = response['recordList'][i]
                            if ('id' in record) and record['id']:
                                if (format == 'lookup'):
                                    id = record['id']
                                    lookup[id] = record                                    
                                if (service == 'file_read') and (record['id'] == record_id):
                                    found = True                                
                            i += 1
                            if found:
                                response = {'recordList':[record]}
                            else:
                                response = lookup         
            except:
                error = True
                response['error'] = 'data is not in JSON format'
    elif (service == 'folder_list'):
        response = {'resultList':[]}
        parent_folder = file_path+folder
        for f in os.walk(parent_folder): 
            dirpath, dirnames, filenames = f
            for name in dirnames:
                response['resultList'].append({'id':name})
            # by default the iterator returns the top first so we can break after first result
            break;
    elif (service == 'folder_tree'):
        bibjson = {'recordList':[]}
        lookup = {}
        parent_folder = file_path+folder
        folder_tree = os.walk(parent_folder)
        
        for f in folder_tree: 
            dirpath, dirnames, filenames = f
            id = dirpath.replace(parent_folder,'')
            if (id != ''):
                lookup[id] = {'recordList':[]} # repository
                repository = {
                    'id':id, 
                    'type': 'repository',
                    'recordList':[]
                     }
                for ds in filenames:
                    dataset = {
                        'id':ds,
                        'title': ds.replace('.json',''),
                        'type':'dataset'}
                    repository['recordList'].append(dataset)
                    lookup[id][ds] = []
                    lookup[id]['recordList'].append(dataset)                                         
                
                bibjson['recordList'].append(repository)

        if (format and (format == 'recordList')):
            response = bibjson
        else: 
            response = lookup
                
    if error:
        response['location_url'] = location_url
        response['file_location'] = file_location    
        response['referer'] = referer
        response['local'] = get_script_parts()
         
    if callback:
        print 'Content-type: text/plain \n\n'
#        print 'Content-Disposition: attachment; filename='+response['location_url']        
        print callback+'('+simplejson.dumps(response)+')'    
    else:
        print 'Content-type: text/plain \n\n'
        print simplejson.dumps(response)
    

# SYS OPERATIONS
#os.listdir("c:\\music\\_singles\\") 

#    fileList = [os.path.normcase(f)
#                for f in os.listdir(directory)]           
#    fileList = [os.path.join(directory, f) 

#os.path.abspath(path)
#os.path.basename(path)
#os.getcwd()
#os.makedir(path[, mode])
#os.access(path, mode)
#os.F_OK
#    Value to pass as the mode parameter of access() to test the existence of path.
#os.R_OK
#    Value to include in the mode parameter of access() to test the readability of path.
#os.W_OK
#    Value to include in the mode parameter of access() to test the writability of path.
#os.X_OK
#    Value to include in the mode parameter of access() to determine if path can be executed.



    