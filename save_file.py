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

#def make_file_path(folder, root):
#    file_path = ''
#    app_path = folder
#    doc_root = ''
#    referer_server = get_referer_server_name()
#    referer_path =     referer = str(os.getenv("HTTP_REFERER"))
#
#    server_name = str(os.getenv("SERVER_NAME")) 
#    if not root:
#        file_path = referer_server
#    elif root == '.':
#        file_path = str(os.getenv("DOCUMENT_ROOT"))
#    file_path = server_name
#    #folder.startswith('./')
#    if folder and (folder[0] != '/') : # folder is under app path 
#        referer = str(os.getenv("HTTP_REFERER"))
#        app_path = referer.replace('http://'+server_name+'/','')
#        app_path = app_path.split('?',1)[0] # strip param string
#        # now we have the path and app file
#        end = app_path.rfind('/')
#        if (end != -1): # the server name and app must be separated by /
#            app_path = '/'+app_path[0:end]
##        file_path = app_path + folder.lstrip('./')
#    file_path = root + slash_end(app+path) 
#    return file_path

#    response['docroot'] = str(os.getenv("DOCUMENT_ROOT"))
#    response['script'] = str(os.getenv("SCRIPT_NAME"))
#    response['server'] = str(os.getenv("SERVER_NAME"))
#    response['referer'] = str(os.getenv("HTTP_REFERER"))
#    docroot = str(os.getenv("DOCUMENT_ROOT"))
#    script = str(os.getenv("SCRIPT_NAME"))
#    server = str(os.getenv("SERVER_NAME"))
#    referer = str(os.getenv("HTTP_REFERER"))
#    response['parts'] = get_referer_parts()

if (cgi_fields):
    callback =  cgi_fields.getfirst('callback')
    root =  cgi_fields.getfirst('root')
    folder =  cgi_fields.getfirst('folder')
    file =  cgi_fields.getfirst('file')
    autogen =  cgi_fields.getfirst('autogen')
    data =  cgi_fields.getfirst('data')

    error = False
    file_path = ''
    file_location = ''
    location_url = ''
    content = ''
    response = {}
    referer = get_referer_parts()
    local = get_script_parts()
    
    server = os.getenv("SERVER_NAME")
    docroot = str(os.getenv("DOCUMENT_ROOT"))
    if (not server) or ('server' not in referer) or (not referer['server']):
        error = True
    elif (referer['server'] != server):
        error = True # disallow write if referer is not on server
    else:
        if not root: 
            # use referer path from docroot
            file_path = referer['file_path']
            url_path =  referer['url_path']
        elif root == '.':
            file_path = local['file_path']
            url_path =  local['url_path']
            
    response['referer'] = referer
    response['local'] = get_script_parts()
#    
#    response['script_path'] = get_script_path()
#    response['file_path'] = file_path
#    response['root'] = root
#    response['error'] = error
#    response['cwd'] = os.getcwd()
#    response['abs'] = os.path.abspath(os.getcwd())
#    response['base'] = os.path.basename(os.getcwd())



    if autogen == 'folder':
        folder = microtime_id()

    if not folder:
        folder = ''
    else:
        folder = slash_end(folder)

    if not data: 
        data=''
    
    if (not error) and file:
        file_location = file_path+folder+file
        location_url = url_path+folder+file
        response['location_url'] = location_url
        response['file_location'] = file_location

        f = codecs.open(file_location,'w', "utf-8")
        f.write(data)
        f.close()
    
    if callback:
        print 'Content-type: text/plain \n\n'
        print callback+'('+simplejson.dumps(response)+')'    
    else:
        print 'Content-type: text/plain \n\n'
        print simplejson.dumps(response)
    

# SYS OPERATIONS
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

#test:http://services.bibsoup.org/cgi-bin/test/save_file.py?file=jane.txt&folder=user_files&data=testing
#{
#  "file_location":"/mnt/services/test/user_files/jane.txt",
#  "cwd":"/mnt/services/cgi-bin/test",
#  "abs":"/mnt/services/cgi-bin/test",
#  "base":"test",
#  "referer":{
#    "url":"http://services.bibsoup.org/test/jsonedit.html?query=nothing",
#    "path":"test/",
#    "file":"jsonedit.html",
#    "server":"services.bibsoup.org"
#  },
#}


    
#        content += str(os.getenv("DOCUMENT_ROOT"))
#        content += '\n'
#        content += str(os.getenv("SCRIPT_NAME"))
#        content += '\n'
#        content += str(os.getenv("SERVER_NAME"))
#        content += '\n'
#    response = {'content':content}
#test:http://localhost/cgi-bin/bkn_wsf/save_file.py?file=jane.txt&folder=user_files&data=testing    

#DOCUMENT_ROOT /mnt/services
#SCRIPT_NAME /cgi-bin/test/save_file.py
#SERVER_NAME services.bibsoup.org 
#REFERER http://services.bibsoup.org/test/jsonedit.html

#/mnt/services - str(os.getenv("DOCUMENT_ROOT"))
#/cgi-bin/structwsf/save_file.py - str(os.getenv("SCRIPT_NAME"))
#services.bibsoup.org - str(os.getenv("SERVER_NAME"))
    