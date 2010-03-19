function size(bytes){   // simple function to show a friendly size
    var i = 0;
    while(1023 < bytes){
        bytes /= 1024;
        ++i;
    };
    return  i ? bytes.toFixed(2) + ["", " Kb", " Mb", " Gb", " Tb"][i] : bytes + " bytes";
};

function RequestBuilder() {
    this.header = function( name, value, params ) {
            var crlf     = '\r\n';

            this.body += name + ": " + value;

            if( params ) {
                    for( var count=params.length, i=0; i<count; i++ ) {
                            pair = params[i];
                            this.body += '; ' + pair[0] + '="' + pair[1] + '"';
                    }
            }
            this.body += crlf;
            return this;
    }
    this.segment = function(headers, body) {
            var dashdash = '--';
            var crlf     = '\r\n';

            this.body += dashdash + this.boundary + crlf;
            this.body += headers;
            this.body += crlf;
            this.body += body;
            return this;
    }

    this.param = function(name, value) {
            var dashdash = '--';
            var crlf     = '\r\n';

            headers =  'Content-Disposition: form-data; name="' + name + '"' + crlf;
            body = value + crlf;

            this.segment(headers, body, this.boundary);
            return this;
    }

    this.footer = function(){
            var dashdash = '--';
            var crlf     = '\r\n';
            this.body += dashdash + this.boundary + dashdash + crlf;
    }

    this.file = function(fieldname, filename, type, file_content) {
            var dashdash = '--';
            var crlf     = '\r\n';

            this.body += dashdash + this.boundary + crlf;
            this.header( "Content-Disposition", "form-data", [ ['name', fieldname], ['filename', filename] ]);
            this.header( "Content-Type", type);

            this.body += crlf;
            this.body += file_content;
            this.body += crlf;
    }

    this.body = '';

    this.output = function() {
            return this.body;
    }

    this.dd     = '--';
    this.nl     = '\r\n';

    var id = (new Date).getTime();
}

function sendFile(handler){
    var parameters = handler.parameters;
    var xhr = new XMLHttpRequest;

    //check size
    if(handler.maxSize && handler.maxSize < handler.file.fileSize){
            var msg = "The file " + handler.file.fileName + " is too big [" + size(handler.file.fileSize) + "]";
            handler.onerror(msg);
            return;
    };

    //setup callbacks
    var eventnames = "onabort.onerror.onloadstart.onprogress".split(".");
    for( i in eventnames ) {
        var ev = eventnames[i];
        xhr.upload[ev] = function(rpe){
                    handler[ ev ].call(handler, rpe, xhr);
            };
    }

    //loop until finished
    xhr.upload.onload = function(rpe){
            var checkstatus = function(){
                if(xhr.readyState === 4){
                        handler.onload(rpe, xhr);
                } else
                    setTimeout(arguments.callee, 15);
            };
            setTimeout(checkstatus,15);
    };

    var file = handler.file;
    var id = (new Date).getTime();

    var builder = new RequestBuilder;
    builder.boundary = '------multipartformboundary' + id;

    builder.param( 'key', id + '-' + escape(file.fileName) );
    builder.param( 'acl', parameters.acl );
    builder.param( 'content-type', file.type );
    builder.param( 'AWSAccessKeyId', parameters.aws_access_key );
    builder.param( 'policy', parameters.policy );
    builder.param( 'signature', parameters.signature );

    builder.file( 'file', file.fileName, 'application/ocet-stream', file.getAsBinary() );

    builder.footer();

    var url = parameters.url;
    xhr.open("POST", url, true);
    xhr.setRequestHeader('content-type', 'multipart/form-data; boundary=' + builder.boundary);
    xhr.sendAsBinary( builder.output() );

    return  handler;
};