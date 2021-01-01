//https://apsmxgd-omrrrc.devnet1.hill.af.mil:9443/rm/proxy?uri=https%3A%2F%2Fapsmxgd-omrrqm.devnet1.hill.af.mil%2Fqm%2Foslc_qm%2Fcontexts%2F_A8a2kOZTEeq8a7OHHPCOOw%2Fservices.xml&dojo.preventCache=1602176575875
//https://apsmxgc-omrrqm.b1515cl.hill.af.mil:9443/oslc_qm/contexts/<<<ProjectID>>>/resources/com.ibm.rqm.planning.ExecutionElement2?oslc.properties=dcterms:identifier,<<<UID Attribute Id>>>>
//https://apsmxgd-omrrqm.devnet1.hill.af.mil/qm/oslc_qm/contexts/_A8a2kOZTEeq8a7OHHPCOOw/resources/com.ibm.rqm.planning.ExecutionElement2

const attIdRQM = "project__A8a2kOZTEeq8a7OHHPCOOw_testScriptStep:UID";
const attIdRM = "_rWxdQQNxEeuUcbqGLJXcGw";

var RQMUIDs;
var RMUIDs;
var RQMUIDsCount;
var RMUIDsCount;
var RQMReady = false;
var RMReady = false;
var DeletedSteps = [];
var UIDsNotFound = [];
var hasValidatesLink = [];
var linksMade = [];
var linksFailed = [];

$(function() {
    // this function is run when the document is ready.
    document.getElementById('infoDiv').style.display = "";
    document.getElementById('loadingDiv').style.display = "none";
	gadgets.window.adjustHeight();
	$("#btnExecute").on("click", function() {
		buildInfo();
	});
});

function buildInfo() {
    document.getElementById('progressText').innerHTML = "Querying RM and RQM...";
    document.getElementById('loadingDiv').style.display = "";
    document.getElementById('infoDiv').style.display = "none";
    gadgets.window.adjustHeight();

    getRMInfo(); //When both are finished, we continue at function "makeLinks"
	getRQMInfo();
}

function getRMInfo(){
    var queryBase = "https://apsmxgd-omrrrc.devnet1.hill.af.mil:9443/rm/views?oslc.query=true&projectURL=https%3A%2F%2Fapsmxgd-omrrrc.devnet1.hill.af.mil%3A9443%2Frm%2Fprocess%2Fproject-areas%2F_a__5kb6wEemDoezzhsRI6w";
    //https://apsmxgd-omrrrc.devnet1.hill.af.mil:9443/rm/oslc_rm/_a__5kb6wEemDoezzhsRI6w/services.xml
	//https://apsmxgd-omrrrc.devnet1.hill.af.mil:9443/rm/views?oslc.where=rm_property:_rWxdQQNxEeuUcbqGLJXcGw
	
    url = queryBase + "&oslc.prefix=rt=<https://apsmxgd-omrrrc.devnet1.hill.af.mil:9443/rm/types/>&oslc.select=rt:" + attIdRM + "&oslc.where=rt:" + attIdRM + "!=%22%22";
	
	getOSLC(url, reqsReturn);
}

function reqsReturn(data){
    RMUIDs = new Object();
    RMUIDsCount = 0;
    for (var req of data[0].Description.member) {
        if (req.Requirement){
            if (req.Requirement[attIdRM]){
                if (req.Requirement["rdf:about"].indexOf("resources/MB") == -1) {//Filter out references within modules. Only get base artifacts.
                    var UID = req.Requirement[attIdRM];
                    if (RMUIDs[UID]){
                        console.log("More than 1 requirement found with UID " + UID);
                        console.log(RMUIDs[UID]);
                        console.log(UID);
                        alert("More than 1 requirement found with UID " + UID + "\n\nSee the Console for clickable links to the artifacts.");
                    }
                    RMUIDsCount++;
                    RMUIDs[UID] = req.Requirement["rdf:about"];
                }
            }
        }
    }
    document.getElementById('progressText').innerHTML = "Querying RQM...";
    RMReady = true;
    if (RQMReady){
        makeLinks(RMUIDs, RQMUIDs);
    }
}

function getRQMInfo() {
    RQMUIDs = new Object();
    RQMUIDsCount = 0;
    var url = "https://apsmxgd-omrrqm.devnet1.hill.af.mil/qm/oslc_qm/contexts/_A8a2kOZTEeq8a7OHHPCOOw/resources/com.ibm.rqm.planning.ExecutionElement2"
    getRQMREST(url, xmlReturn);
}

function xmlReturn(rows){
	for (var row of rows){
	    if (row[attIdRQM]) {
	        var UIDString = row[attIdRQM];
	        if (UIDString.length > 0) {
	            UIDString = UIDString.split(", ").join("\n");
	            UIDString = UIDString.split(",").join("\n");
	            var UIDs = UIDString.split("\n");
	            for (var UID of UIDs) {
	                if ((UID.indexOf(":") == -1) && (UID.length > 4)) {
	                    if (RQMUIDs[UID] == null) {
	                        RQMUIDs[UID] = [];
	                    }
	                    RQMUIDs[UID].push(row["dcterms:identifier"]);
	                }
	            }
	        }
		}
	}
	document.getElementById('progressText').innerHTML = "Querying RM...";
	RQMReady = true;
	if (RMReady){
		makeLinks(RMUIDs, RQMUIDs);
	}
}

function makeLinks(RMItems, RQMItems) {
    document.getElementById('progressText').innerHTML = "Creating Links...";
	var links = [];
	for (var UID in RQMItems) {
	    var tsArray = RQMItems[UID];
	    if (UID.indexOf("-") > -1) {
	        UID = UID.substr(0, UID.indexOf("-"));
	    }
	    if (RMItems[UID]) {
	        var artifact = RMItems[UID];
	        for (var testStep of tsArray) {
	            links.push([artifact, testStep, UID]);
	        }
	    } else {
	        UIDsNotFound.push(UID);
	    }
	}

	var curLink = 0;
	var totLinks = links.length;
	for (var l of links) {
	    document.getElementById('progressText').innerHTML = "Creating link " + curLink + " of " + totLinks + "...";
	    addLink(l[1], l[0]);
	}

	document.getElementById("infoDiv").innerHTML = 'Success';
	var oS = "";
	if (UIDsNotFound.length > 0) {
	    oS += "UIDs in Test Steps that weren't found in RM:<br>Count: " + UIDsNotFound.length + "<br>";
	    var i = 0;
	    for (UID of UIDsNotFound) {
	        for (var l of RQMItems[UID]) {
	            i++;
	            oS += '<a href="' + l + '">Step with UID ' + UID + '</a><br>';
	        }
	    }
	}
	if (hasValidatesLink.length > 0) {
	    oS += 'Skipped linking these steps already linked to requirements without matching UID:<br>';
	    var i = 0;
	    for (var l of hasValidatesLink) {
	        i++;
	        oS += '<a href="' + l + '">Item ' + i + '</a><br>';
	    }
	}
	if (linksFailed.length > 0) {
	    oS += 'Errors occurred when attempting to link these steps:<br>';
	    var i = 0;
	    for (var l of linksFailed) {
	        i++;
	        oS += '<a href="' + l + '">Item ' + i + '</a><br>';
	    }
	}
	if (DeletedSteps.length > 0) {
	    oS += 'These steps were skipped because they are no longer in any test script:<br>Count: ' + DeletedSteps.length + "<br>";
	    var i = 0;
	    for (var l of DeletedSteps) {
	        i++;
	        oS += '<a href="' + l + '">Item ' + i + '</a><br>';
	    }
	}
	if (oS != "") {
	    document.getElementById("infoDiv").innerHTML = oS;
	}

	document.getElementById('infoDiv').style.display = "";
	document.getElementById('progressText').innerHTML = "";
	document.getElementById('loadingDiv').style.display = "none";
	gadgets.window.adjustHeight();
}

function addLink(RQMItem, ValidatesReqURL) {
    var tsXML = getTSXML(RQMItem);
    var newEl = tsXML.createElement("oslc_qm:validatesRequirement");
    newEl.setAttribute("rdf:resource", ValidatesReqURL);
    var x = tsXML.getElementsByTagName("rdf:Description");
    for (var y of x){
        var ref = y.getAttribute("rdf:about");
        if (ref) {
            var stepIndex = parseInt(y.getElementsByTagName("rqm_qm:index")[0].innerHTML);
            if (stepIndex > 0) {
                var valReqs = y.getElementsByTagName("oslc_qm:validatesRequirement");
                var doCreateLink = true;
                for (var req of valReqs) {
                    if (req.getAttribute("rdf:resource") == ValidatesReqURL) {
                        doCreateLink = false;//Link already present
                    }
                }
                if (doCreateLink) {
                    y.appendChild(newEl);
                    var xmlstring = (new XMLSerializer()).serializeToString(tsXML);
                    updateTestScript(RQMItem, xmlstring);
                }
            } else {
                DeletedSteps.push(RQMItem);
            }
        }
    }
}

function getTSXML(url) {
    var returnVal = "";
    url = proxyUri(url);
    $.ajax({
        async: false, xhrFields: { withCredentials: true }, url: url,
        type: 'GET',
        timeout: 20000,
        headers: {
            'Accept': 'application/rdf+xml',
            'OSLC-Core-Version': '2.0'
        },
        success: function (response, status, xhr) {
            var loc = xhr.getResponseHeader("Location");
            if (loc) {
                returnVal = getTSXML(loc);
            }
            returnVal = response;
        },
        error: function (error) {
            returnVal = "Error getting TS XML..." + error;
        }
    });

    return returnVal;
}

function updateTestScript(url, xml){
    var Purl = proxyUri(url);
	$.ajax({
	    async: false, xhrFields: { withCredentials: true }, url: Purl,
		type: 'PUT',
		data: xml,
		timeout:20000,
		headers:{
		'Content-Type' : 'application/rdf+xml',
		'OSLC-Core-Version' : '2.0'
		},
		success:function(response, status, xhr){
		    linksMade.push(url);
		},
		error: function(error){
		    linksFailed.push(url);
		}
	});
}


function getOSLC(url, returnFunction){
    url = proxyUri(url);

    $.ajax({
        url: url,
        headers:{
        'Accept' : 'application/rdf+xml',
	    'OSLC-Core-Version' : '2.0'
        },
        success:function(data){
		    retItems = data.childNodes;
		    var rows = [];
		    for (var retItem of retItems){
			    var objI;
			    objI = getOSLCNodes(retItem);
			    rows.push(objI);
		    }
            returnFunction(rows);
        },
        error:function(error){
            console.error(error);
            alert('Error getting OSLC Response for ' + url + '\n' + error);
        }
    });
}

function getOSLCNodes(element){
    var returnObj = Object();
    if (element.attributes != null){
        if (element.attributes.length>0){
            for (var attr of element.attributes){
                returnObj[attr.name] = attr.value;
            }
        }
    }
    if (element.hasChildNodes()){
        if ((element.firstChild.nodeName=="#text") && (element.childNodes.length==1)){
            returnObj = element.firstChild.textContent;
        } else {
            var curName;
            for (var childNode of element.childNodes){
                curName = childNode.localName;
                var processMe = false;
                if (curName==undefined){
                    if (/\S/.test(childNode.textContent)){
                        processMe = true;
                        curName = "x";
                    }
                } else {
                    processMe = true;
                }
                if (processMe){

                    curValue = getOSLCNodes(childNode);
    
                    if (returnObj[curName]==null){
                        returnObj[curName] = curValue;
                    } else {
                        if (!(returnObj[curName].constructor===Array)){
                            var temp = returnObj[curName];
                            returnObj[curName] = [];
                            returnObj[curName].push(temp);
                        }
                        returnObj[curName].push(curValue);
                    }
                }
            }
        }
    } else {
        if (returnObj === Object()){
            returnObj = element.textContent;
        } 
    }
    return returnObj;
}

function proxyUri(url) {
    if (url.indexOf(applicationURL()) != 0) {
        return applicationURL() + "proxy?uri=" + encodeURIComponent(url);
    } else {
        return url;
    }
}



function getRQMREST(RESTurl, returnFunction) {
    var url = proxyUri(RESTurl);
    var rows = [];
    $.ajax({
        async: false,
        xhrFields: { withCredentials: true },
        url: url,
        headers: {
            'Accept': 'application/rdf+xml',
            'OSLC-Core-Version': '2.0'
        },
        success: function (data) {
            retItems = data.childNodes[0].childNodes;
            
            for (var retItem of retItems) {
                var objI = objParseChildNodes(retItem);
                if (objI["oslc:nextPage"]) {
                    var rows2 = getRQMREST(objI["oslc:nextPage"]["rdf:about"]);
                    for (var item of rows2) {
                        rows.push(item);
                    }
                }
                rows.push(objI);
            }
            if (returnFunction != null) {
                returnFunction(rows);
            }
            
        },
        error: function (error) {
            console.error(error);
            alert('Your session has expired.\nPlease refresh this page to login.');
        }
    });
    if (returnFunction == null) {
        return rows;
    }
}

function objParseChildNodes(element) {
    var returnObj = Object();
    if (element.attributes != null) {
        if (element.attributes.length > 0) {
            for (var attr of element.attributes) {
                returnObj[attr.name] = attr.value;
            }
        }
    }
    if (element.hasChildNodes()) {
        if ((element.firstChild.nodeName == "#text") && (element.childNodes.length == 1)) {
            returnObj = element.firstChild.textContent;
        } else {
            var curName;
            for (var childNode of element.childNodes) {
                curName = childNode.nodeName;
                var processMe = false;
                if (curName == '#text') {
                    if (/\S/.test(childNode.textContent)) {
                        processMe = true;
                    }
                } else {
                    processMe = true;
                }
                if (processMe) {
                    curValue = objParseChildNodes(childNode);
                    if (returnObj[curName] == null) {
                        returnObj[curName] = curValue;
                    } else {
                        if (!(returnObj[curName].constructor === Array)) {
                            var temp = returnObj[curName];
                            returnObj[curName] = [];
                            returnObj[curName].push(temp);
                        }
                        returnObj[curName].push(curValue);
                    }
                }
            }
        }
    } else {
        if (returnObj === Object()) {
            returnObj = element.textContent;
        }
    }
    return returnObj;
}