var RTCWidget = false;
var RQMWidget = false;
var RMWidget = false;
var myUserName = '';
var currentContributor;
var runningThreads = 0;

function resized(){
    gadgets.window.adjustHeight();
}

//###################### Widget Preferences #########################

function prefsSet(){
    var prefs = new gadgets.Prefs();
    var resetPrefs = (prefs.getString("ProjectId")=="");
    if (resetPrefs){
        showOptions();
        return false;
    } else {
        return true;
    }
}
function baseUrl(){
    if (RTCWidget){
        return RTCURL();
    } else if (RQMWidget) {
        return RQMURL();
    } else if (RMWidget){
        return DOORSURL();
    } else {
        return applicationURL();
    }
}

function showOptions(){
    document.getElementById('loadingDiv').style.display = "";
    document.getElementById('reportContentDiv').style.display = "none";
    document.getElementById('settingsDiv').style.display = "none";
    doInit();
    
    var url = baseUrl() + "rpt/repository/foundation?fields=projectArea/projectArea[archived=false]/(name|itemId)";
    getREST(url, setupProjectDD);
    
    if (document.getElementById('tbTitle')!=null){
        var prefs = new gadgets.Prefs();
        var title = prefs.getString("Title");
        document.getElementById('tbTitle').value = title;
    }
}

function enableSave() {
    document.getElementById('btnSaveSettings').disabled=false;
}

function doInit(){
    url = applicationURL() + "service/com.ibm.team.repository.service.internal.webuiInitializer.IWebUIInitializerRestService/initializationData";
    getREST(url, initialization, true);
}
function initialization(initData){
    var dbI = initData['soapenv:Body'].response.returnValue.value['com.ibm.team.dashboard.service.dashboardInitializationData']
    myUserName = dbI.currentContributor.name;
    currentContributor = new Object();
    currentContributor.url = dbI.currentContributorUri;
    currentContributor.userId = dbI.currentContributor.userId;
    currentContributor.itemId = dbI.currentContributor.itemId;
}

function setupProjectDD(projectAreas){
    var prefs = new gadgets.Prefs();
    var selProj = prefs.getString("ProjectId");
    var ddPA = document.getElementById('ddprojectArea');
    ddPA.innerHTML = '';
    var op = new Option();
    op.value = "";
    op.text = "";
    if (selProj=='') op.selected=true;
    ddPA.options.add(op);
    var nameKeyPA = new Object();
    for (var project of projectAreas){
        nameKeyPA[project.name] = project.itemId;
    }
    var sortedKeys = Object.keys(nameKeyPA).sort();
    for (var key of sortedKeys){
        op = new Option();
        op.value = nameKeyPA[key];
        op.text = key;
        if (op.value==selProj){
            op.selected=true;
        }
        ddPA.options.add(op);
    }
    if (selProj!=''){
        selectProject();
    } else {
        document.getElementById('loadingDiv').style.display = "none";
        document.getElementById('settingsDiv').style.display = '';
        resized();
    }
}

function getTimeLabel(timestamp){
    var date = Date.parse(timestamp);
    var ts = new Object();
    var timeNow = Date.now();
    var t = timeNow - date;
    t = t/1000; //convert to seconds
    ts.prettyDate = formattedDate(date);
    ts.title = " title='" + ts.prettyDate + "'";

    var val;
    var unit;
    switch (true) {
        case (t < 60):
            unit = "second";
            val = Math.round(t);
            break;
        case (t < 3600):
            unit = "minute";
            val = Math.round(t/60);
            break;
        case (t < 86400):
           unit = "hour";
           val = Math.round(t/3600);
           break;
        case (t < 604800):
           unit = "day";
           val = Math.round(t/86400);
           break;
        case (t < 2678400):
           unit = "week";
           val = Math.round(t/604800);
           break;
        case (t < 31557600):
           unit = "month";
           val = Math.round(t/2678400);
           break;
        default:
            unit = "year";
            val = Math.round(t/31557600);
    }
    if (val < 2){
        ts.timeAgo = val + " " + unit + " ago";
    } else {
        ts.timeAgo = val + " " + unit + "s ago";
    }
    return ts;
}

function formattedDate(unix_timestamp){
    var a = new Date(unix_timestamp);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var year = a.getFullYear();
    var month = months[a.getMonth()];
    var date = a.getDate();
    var hour = a.getHours();
    var min = a.getMinutes();
    var sec = a.getSeconds();
    var AMPM = ' AM';
    if (hour < 1){
        hour=12;
    } else if (hour>11){
        AMPM = ' PM';
        if (hour>12){
            hour = hour-12;
        }
    }
    return date + ' ' + month + ' ' + year + ' at ' + hour + ':' + min + ':' + sec + AMPM ;
}
function selectProject(){
    var ProjDD = document.getElementById('ddprojectArea');
    var PAitemId = ProjDD.value;
    //When the project is selected, then fill in the additional menus which are available in this report.
    //As an example, the work item filter menu must have an id of ddWlTypes, as below, for this common function to populate it.
    if (document.getElementById('ddteamArea')!=null){
        runningThreads++;
        var url = baseUrl() + "rpt/repository/foundation?fields=projectArea/projectArea[itemId=" + PAitemId + "]/(allTeamAreas/(name|itemId|archived))";
        getREST(url, setupTeamDD);
    }


    //RTC-Only Menu Items
    if (document.getElementById("ddWITypes")!=null){
        runningThreads++;
        var url = RTCURL() + "oslc/types" + PAitemId + ".json";
        getREST(url, setupWorkItemsDD, true);
    }
    if (document.getElementById('ddCats')!=null){
        runningThreads++;
        var url = RTCURL() + "oslc/categories.json?oslc_cm.query=rtc_cm:projectArea=\"" + PAitemId + "\" and rtc_cm:archived=false";
        getREST(url, setupFiledAgainstDD, true);
    }
    if (document.getElementById("ddPlan")!=null){
        runningThreads++;
        var url = RTCURL() + "rpt/repository/apt?fields=apt/iterationPlanRecord[archived=false and iteration/archived=false and owner/archived=false and contextId=" + PAitemId + "]/(name|itemId|iteration/(name|id)|owner/(name|itemId))";
        getREST(url, setupPlanDD);
    }
    if (document.getElementById('querySelectionDiv')!=null){
        runningThreads++;
        var url = RTCURL() + "service/com.ibm.team.workitem.common.internal.rest.IQueryRestService/scopedQueries?scope=3&includeCount=false&includeParentScopes=true&projectAreaItemId=" + PAitemId + "&suppressCrossRepoQueries=false";
        getREST(url, setupQueryDD);
    }
    if (document.getElementById('plannedForSelectionDiv')!=null){
        runningThreads++;
        var url = RTCURL() + "oslc/iterations.json?oslc_cm.query=rtc_cm:projectArea=\"" + PAitemId + "\" and rtc_cm:archived=false";
        getREST(url, setupPlannedForDD, true);
    }
    if (document.getElementById('ItemsPerPageDiv')!=null){
        var prefs = new gadgets.Prefs();
        var ItemsPerPage = prefs.getString("ItemsPerPage");
        if (ItemsPerPage!='All'){
            document.getElementById('ItemsPerPageDiv').value = ItemsPerPage;
        }
    }
    

    //RQM-Only Menu Items...FIXME This function does not work yet.
    if (document.getElementById('ddTestPlan')!=null){
        runningThreads++;
        var url = RQMURL() + "rpt/repository/foundation?fields=projectArea/projectArea[itemId=" + PAitemId + "]/(allTeamAreas/(name|itemId|archived))";
        getREST(url, setupTeamDD);
    }

    enableSave();
}

function setupTeamDD(teamAreas){
    var prefs = new gadgets.Prefs();
    var selTeam = prefs.getString("TeamId");
    var ddTA = document.getElementById('ddteamArea');
    var nameKeyPA = new Object();
    if (teamAreas[0].allTeamAreas.constructor===Array){
        for (var team of teamAreas[0].allTeamAreas){
            if (team.archived=='false'){
                nameKeyPA[team.name] = team.itemId;
            }
        }
    } else {
        if (teamAreas[0].allTeamAreas.archived=='false'){
            nameKeyPA[teamAreas[0].allTeamAreas.name] = teamAreas[0].allTeamAreas.itemId;
        }
    }
    var sortedKeys = Object.keys(nameKeyPA).sort();
    ddTA.innerHTML = '';
    var op = new Option();
    if (selTeam=='All'){
        op.selected = true;
    }
    op.value = "All";
    op.text = "All Team Areas";
    ddTA.options.add(op);
    for (var key of sortedKeys){
        var op = new Option();
        op.value = nameKeyPA[key];
        op.text = key;
        if (selTeam==op.value){
            op.selected = true;
        }
        ddTA.options.add(op);
    }
    document.getElementById('teamAreaRow').style.display = '';
    showForm();
    resized();
}

function setupFiledAgainstDD(Categories){
    var prefs = new gadgets.Prefs();
    var WIFilter = prefs.getString("WIFilter");
    var ddCats = document.getElementById('ddCategories');
    var nameKeyPA = new Object();
    for (var key in Categories["oslc_cm:results"]){
        nameKeyPA[Categories["oslc_cm:results"][key]["rtc_cm:hierarchicalName"]] = Categories["oslc_cm:results"][key]["dc:title"];
    }
    var sortedKeys = Object.keys(nameKeyPA).sort();
    ddCats.innerHTML = '';
    var spacer = '';
    var prefix = '';
    for (var key of sortedKeys){
        var op = new Option();
        op.value = key;
        var text = nameKeyPA[key];
        var indent = (op.value.match(/\//g) || []).length;
        if (indent > 0 ){
            prefix = spacer.repeat(indent);
        } else {
            prefix = '';
        }
        op.text = prefix + text;
        if ((WIFilter=='') || (WIFilter.indexOf("'/Unassigned/" + op.value + "/'"))){
            op.selected=true;
        } else {
            op.selected = false;
        }
        ddCats.options.add(op);
    }
    document.getElementById('CategoryRow').style.display = '';
    showForm();
    resized();
}

function setupWorkItemsDD(WITypes){
    var prefs = new gadgets.Prefs();
    var WIFilter = prefs.getString("WIFilter");
    var ddWls = document.getElementById('ddWITypes');
    var nameKeyPA = new Object();
    for (var WIType of WITypes){
        nameKeyPA[WIType["dc:title"]] = WIType["dc:identifier"];
    }
    var sortedKeys = Object.keys(nameKeyPA).sort();
    ddWIs.innerHTML = '';
    for (var key of sortedKeys){
        var op = new Option();
        op.value = nameKeyPA[key];
        op.text = key;
        if ((WIFilter=='')||(WIFilter.indexOf(op.value))){
            op.selected=true;
        } else {
            op.selected = false;
        }
        ddWIs.options.add(op);
    }
    document.getElementById('WITypeRow').style.display='';
    showForm();
    resized();
}

function setupPlanDD(Plans){
    var prefs = new gadgets.Prefs();
    var PlanId = prefs.getString("Planid");
    var ddPlan = document.getElementById('ddPlan');
    if (document.getElementById('planRow')!=null){
        document.getElementById('planRow').style.display='';
    }
    var nameKeyPA = new Object();
    for (var Plan of Plans){
        nameKeyPA[Plan.name] = Plan.itemId;
    }
    var sortedKeys = Object.keys(nameKeyPA).sort();
    ddPlan.innerHTML = '';
    for (var key of sortedKeys){
        var op = new Option();
        op.value = nameKeyPA[key];
        op.text = key;
        if (PlanId.indexOf(op.value)>-1){
            op.selected=true;
        } else {
            op.selected = false;
        }
        ddPlan.options.add(op);
    }
    showForm();
    resized();
}

function setupQueryDD(QueryJSON){
    var prefs = new gadgets.Prefs();
    var queryId = prefs.getString("QueryId");
    var querySelectionDiv = document.getElementById('querySelectionDiv');
    var queryFolders = QueryJSON[0].response.returnValue.values;
    var orderedFolders = [];
    for (var folder of queryFolders){
        if (folder.queries!=null){
            if (folder.queries.length>0){
                if (myUserName==folder.scopeName){
                    folder.scopeName = "My Queries";
                    orderedFolders.unshift(folder);
                } else {
                orderedFolders.push(folder);
                }
            }
        }  

    }
    var qs ='';
    var queryName = '';
    var queryFound = false;
    for (var folder of orderedFolders){
        if (folder.queries!=null){
            if (folder.queries.length>0){
                qs += "<twistie><twistButton class='svgButton'>";
                qs += folder.scopeName;
                qs += "<div class='svgLeft'><svg id='arrowSVG' width='14' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><polygon points='50,20 50,80 80,50 50,20'/></svg></div></twistButton><div id='twistContent' class='hide svgIndented'>";
                for (var query of folder.queries){
                    var sQu = '';
                    if (queryId==query.itemId){
                        sQu = " class='svgSelected'";
                        queryName = query.name;
                        queryFound = true;
                    }
                    if (query.hasParameters=='true'){
                        qs += "<div class='svgButton' style='color:grey'>";
                        qs += query.name + " (query unsupported)";
                    } else {
                        qs += "<queryButton" + sQu + "><div class='svgButton' value='" + query.itemId + "'>";
                        qs += query.name;
                    }
                    qs += "</div></queryButton>";
                }
            }
        }
        qs +="</div></twistie>";
    }
    if (queryFound){
        document.getElementById('selectedQueryId').innerHTML = queryId;
        document.getElementById('selectedQueryName').innerHTML = queryName;
        document.getElementById('editQueryButton').style.display='';
    } else if (queryId!='') {
        document.getElementById('selectedQueryId').innerHTML = queryId;
        document.getElementById('selectedQueryName').innerHTML = "Click the pencil to open the selected query...";
        document.getElementById('editQueryButton').style.display='';
    }
    querySelectionDiv.innerHTML = qs;
    for (var item of document.querySelectorAll('twistButton')){
        item.addEventListener('click', function(){
            this.parentNode.querySelector('#arrowSVG').classList.toggle('svgRoatated');
            this.parentNode.querySelector('#twistContent').classList.toggle('hide');
            resized();
        });
    }
    for (var item of document.querySelectorAll('queryButton')){
        item.addEventListener('click', function(){
            for (var button of document.querySelectorAll('queryButton')){
                button.classList.remove('svgSelected');
            }
            this.classList.add('svgSelected');
            document.getElementById('selectedQueryId').innerHTML = this.firstChild.attributes.value.textContent;
            document.getElementById('selectedQueryName').innerHTML = this.firstChild.textContent;
            document.getElementById('editQueryButton').style.display='';
        });
    }

    document.getElementById('SelQueryRow').style.display='';
    document.getElementById('QuerySelector').style.display='';
    showForm();
    resized();
}

function setupPlannedForDD(iterations){
    var prefs = new gadgets.Prefs();
    var queryId = prefs.getString("QueryId");
    var PFDiv = document.getElementById('plannedForSelectionDiv');
    var Timelines = new Object();
    for(var i of iterations["oslc_cm:results"]){
    	if (i["rtc_cm:parent"]==null){
    		var timelineURL = i["rtc_cm:timeline"]["rdf:resource"];
    		if (Timelines[timelineURL]==null){
    			var t = getREST(timelineURL);
    			Timelines[timelineURL] = new Object();
    			Timelines[timelineURL].Name = t[1];
    		}
    	}
    }
    for (var tURL in Timelines){
    	Timelines[tURL].ChildIterations = getChildIterations(tURL, iterations);
    }
    var o = "";
    for (var tURL of Object.keys(Timelines)){
    	var T = Timelines[tURL];
		o += genPlannedForChildren(tURL, T);
    }

    PFDiv.innerHTML = o;
    for (var item of document.querySelectorAll('twistButton')){
        item.addEventListener('click', function(){
            var iUrl = this.attributes.value.textContent;
            this.parentNode.querySelector('#arrowSVG').classList.toggle('svgRoatated');
            this.parentNode.querySelector('#twistContent').classList.toggle('hide');
            if (iUrl!=""){
                for (var button of document.querySelectorAll('queryButton')){
                    button.classList.remove('svgSelected');
                }
                for (var button of document.querySelectorAll('twistButton')){
                    button.classList.remove('svgSelected');
                }
                this.classList.add('svgSelected');
                document.getElementById('selectedPlannedForUrl').innerHTML = iUrl;
            }
            resized();
        });
    }
    for (var item of document.querySelectorAll('queryButton')){
        item.addEventListener('click', function(){
            for (var button of document.querySelectorAll('queryButton')){
                button.classList.remove('svgSelected');
            }
            for (var button of document.querySelectorAll('twistButton')){
                button.classList.remove('svgSelected');
            }
            this.classList.add('svgSelected');
            document.getElementById('selectedPlannedForUrl').innerHTML = this.firstChild.attributes.value.textContent;
        });
    }


    resized();
}

function genPlannedForChildren(nodeUrl, node){
	var o = "";
    if (Object.keys(node.ChildIterations).length > 0 ){
        if (nodeUrl.indexOf("/timelines/")!=-1){
            nodeUrl = "";
        }
        o += "<twistie><twistButton class='svgButton' value='" + nodeUrl + "'>";
		o += node.Name;
		o += "<div class='svgLeft'><svg id='arrowSVG' width='14' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'><polygon points='50,20 50,80 80,50 50,20'/></svg></div></twistButton><div id='twistContent' class='hide svgIndented'>";
		for (var childUrl in node.ChildIterations){
			o += genPlannedForChildren(childUrl, node.ChildIterations[childUrl]);
		}
        o +="</div></twistie>";
    } else{
        o += "<queryButton><div class='svgButton' value='" + nodeUrl + "'>";
			o += node.Name;
			o += "</div></queryButton>";
    }
    return o; 
}

function getChildIterations(parentUrl, iterations){
	var pAttr = "rtc_cm:parent";
	if (parentUrl.indexOf("/timelines/") !==-1) {
		pAttr = "rtc_cm:timeline";
	}

	var cIters = new Object();
	for (var i of iterations["oslc_cm:results"]){
		if (i[pAttr] != null){
			if (i[pAttr]["rdf:resource"] == parentUrl){
				var iUrl = i["rdf:resource"];
				cIters[iUrl] = new Object();
				cIters[iUrl].Name = i["dc:title"];
				cIters[iUrl].ChildIterations = getChildIterations(iUrl, iterations);
			}
		}
	}
   return cIters;
}

function showForm() {
    runningThreads--;
    if (runningThreads==0){
        document.getElementById('loadingDiv').style.display = "none";
        document.getElementById('settingsDiv').style.display = "";
    }
}

function openQueryEditor(){
    var queryId = document.getElementById('selectedQueryId').textContent;
    var url = RTCURL() + "resource/itemOid/com.ibm.team.workitem.query.QueryDescriptor/" + queryId;
    window.open(url, "_blank");
 
}

//######################################## End of Widget Preferences ########################################

function applicationURL(){
    var href = window.location.href;
    var len = href.indexOf("/", 9);
    var len = href.indexOf("/", len + 1) + 1;
    return href.substr(0, len);
}

function getNetwork(){
    var appURL = applicationURL().toUpperCase();
    if (appURL.indexOf("JTS.HILL")>-1){
        return "NIPR";
    } else if (appURL.indexOf("DEVNET1.HILL")>-1){
        return "DEV";
    } else if (appURL.indexOf("B1515CL.HILL")>-1){
        return "SA";
	} else if (appURL.indexOf("MMC.MIL")>-1){
        return "ODE";
	} else {
        //alert("Widget unable to determine network!");
        return "UNKNOWN Network in function getNetwork().";
    }
}
function RTCURL(){
    var Net = getNetwork();
    switch (Net){
        case 'NIPR':
            return "https://jts.hill.af.mil/ccm/";
            break;
		case 'DEV':
            return "https://apsmxgd-omrrtc.devnet1.hill.af.mil:9443/ccm/";
            break;
		case 'SA':
            return "https://apsmxgc-omrrtc.b1515cl.hill.af.mil:9443/ccm/";
            break;
		case 'ODE':
            return "https://rtc.mmc.mil/ccm";
            break;
        default:
        return applicationURL();
    }
}

function RQMURL(){
    var Net = getNetwork();
    switch (Net){
        case 'NIPR':
            return "https://jts.hill.af.mil/qm/";
            break;
		case 'DEV':
            return "https://apsmxgd-omrrqm.devnet1.hill.af.mil/qm/";
            break;
		case 'SA':
            return "https://apsmxgc-omrrqm.b1515cl.hill.af.mil:9443/qm/";
            break;
		case 'ODE':
            return "https://rqm.mmc.mil/qm";
            break;
        default:
        return applicationURL();
    }
}

function DOORSURL(){
    var Net = getNetwork();
    switch (Net){
        case 'NIPR':
            return "https://jts.hill.af.mil/rm/";
            break;
		case 'DEV':
            return "https://apsmxgd-omrrrc.devnet1.hill.af.mil:9443/rm/";
            break;
		case 'SA':
            return "https://apsmxgc-omrrrc.b1515cl.hill.af.mil:9443/rm/";
            break;
		case 'ODE':
            return "https://doors.mmc.mil/rm5";
            break;
        default:
        return applicationURL();
    }
}

function getCurrentUser(returnFunction){
    var usernameURL = applicationURL() + "whoami";
    $.ajax({
        async:true,
        xhrFields: {withCredentials: true},
        url: usernameURL,
        headers:{
        'Accept' : 'application/xml'
        },
        success:function(data){
            var start = data.indexOf('/jts/users/');
            var userId = data.substr(start + 11);
            returnFunction(userId);
        },
        error:function(error){
            console.error(error);
            alert('Error getting current user.');
        }
    });
}

function getREST(RESTurl, returnFunction, isJSON, removePrefixes=false){
    var isAsync = true;
	var rows;
	if (returnFunction == null) {
		isAsync=false;
	}

    if (RESTurl.indexOf("/rpt/repository")!==-1){
        if (!(RESTurl.indexOf("&size=")!==-1)){
            RESTurl+="&size=10000"
        }
    }
    if (RESTurl.indexOf(".json")!==-1) {
    	isJSON = true;
    }
    
    RESTurl = proxyURL(RESTurl);
    isJSON = isJSON||false;
    $.ajax({
        url: RESTurl,
        async:isAsync,
        headers:{
        'Accept' : 'application/xml',
        },
        success:function(data){
            if (isJSON){
                rows = data;
            } else {
                if (data.childNodes[0].nodeName=='#comment'){
                    retItems = data.childNodes[1].childNodes;
                } else {
                    retItems = data.childNodes[0].childNodes;
                }
                rows = [];
                for (var retItem of retItems){
                    var objI;
                    if (retItem.nodeName!='#text'){
                    	objI = objParseChildNodes(retItem, removePrefixes);
                        rows.push(objI);
                    }
                }
            }
            rows["RESTurl"] = RESTurl;
            if (returnFunction!=null){
				returnFunction(rows);
			}
        },
        error:function(error){
            console.error(error);
            alert('Your session has expired.\nPlease refresh this page to login.');
        }
    });
    if (returnFunction==null){
		return rows;
	}
}


function getOSLC(OSLCurl, returnFunction){
    //OSLCurl = proxyURL(OSLCurl);
    var rows;
    $.ajax({
        url: OSLCurl,
        async:false,
        headers:{
        'Accept' : 'application/rdf+xml',
        'OSLC-Core-Version' : '2.0'
        },
        success:function(data){
            rows = data;
            rows['OSLCurl'] = OSLCurl;
            if (returnFunction!=null){
				returnFunction(rows);
			}
        },
        error:function(error){
        	rows = error;
        	rows['OSLCurl'] = OSLCurl;
            console.error(error);
            if (returnFunction!=null){
				returnFunction(rows);
			}
        }
    });
	 if (returnFunction==null){
		return rows;
	}
}

function getRESTJSON(RESTurl, returnFunction){
	var isAsync = true;
	var rows;
	if (returnFunction == null) {
		isAsync=false;
	}
	
    RESTurl = proxyURL(RESTurl);
    $.ajax({
        async:isAsync,
        xhrFields: {withCredentials: true},
        url: RESTurl,
        type: 'GET',
        headers:{
        'Accept' : 'text/json'
        },
        success:function(data){
            rows = data;
			if (data['oslc_cm:next']){
                var data2 = getRESTJSON(data['oslc_cm:next']);
                if (data2['oslc_cm:results']){
                    results2 = data2;
                } else {
                    results2['oslc_cm:results'] = data2;
                }
                for (var item of results2['oslc_cm:results']){
                    rows['oslc_cm:results'].push(item);
                }
            }
			
			if (returnFunction!=null){
				returnFunction(rows);
			}
        },
        error: function(error){
            console.error(error);
            alert('Your session has expired.\nPlease refresh this page to login.');
        }
    });
	if (returnFunction==null){
		return rows;
	}
}

function returnAllOSLCResults(url, returnFunction, removeOSLCMarkup){
	var isAsync = true;
	if (returnFunction==null) {
		isAsync = false;
	}
    url = proxyURL(url);

    var results = new Object();
    
    $.ajax({
        async:isAsync,
        xhrFields: {withCredentials: true},
        url: url,
        headers:{
        'Accept' : 'application/json'
        },
        success:function(data){
            if (typeof data['oslc_cm:results'] != 'undefined'){
                results = data;
            } else {
                results['oslc_cm:results'] = data;
            }
            if (data['oslc_cm:next']!=null){
                var data2 = returnAllOSLCResults(data['oslc_cm:next']);
                if (typeof data2['oslc_cm:results'] != 'undefined'){
                    results2 = data2;
                } else {
                    results2['oslc_cm:results'] = data2;
                }
                for (var item of results2['oslc_cm:results']){
                    results['oslc_cm:results'].push(item);
                }
            }
            if (returnFunction!=null){
            	if (removeOSLCMarkup){
					var items = [];
					for (var wi of results["oslc_cm:results"]){
						items.push(parseOSLCNodes(wi));
					}
					returnFunction(items);
				} else {
					returnFunction(results);
				}
            }
        },
        error: function(error){
            console.error(error);
            alert('Your session has expired.\nPlease refresh this page to login.');
        }
    });
    if (returnFunction==null) {
		return results;
	}
}

function runStoredQuery(queryId, returnFunction, propString, removeOSLCMarkup){//THIS IS A SYNCHRONOUS FUNCTION CALL, unlike getREST, which is async.
    url = RTCURL() + 'oslc/queries/' + queryId + '/rtc_cm:results.json';
    if (propString!=''){
        url+= "?oslc_cm.properties=" + propString;
    }
    
    if (returnFunction == null){
        var rows = returnAllOSLCResults(url);
		 if (removeOSLCMarkup){
			var items = [];
			for (var wi of rows["oslc_cm:results"]){
				items.push(parseOSLCNodes(wi));
			}
			returnFunction(items);
		} else {
			returnFunction(rows);
		}
    } else {
    	returnAllOSLCResults(url, returnFunction, removeOSLCMarkup);
    }
}

function parseOSLCNodes(element){
    if (typeof element !== 'object'){
        return element;
    } else {
        var returnObj = Object();
        for (var prop in element){
            name = prop.replace("rtc_cm:", "");
            name = name.replace("oslc_cm:", "");
            name = name.replace("rrm:", "");
            name = name.replace("dc:", "");
            name = name.replace("ds:", "");
            name = name.replace("identifier", "id");
            name = name.replace("rdf:resource", "url");
            returnObj[name] = parseOSLCNodes(element[prop]);
        }
        return returnObj;
    }
}

function getWorkingWI(WIId, OSLCproperties, returnFunction){
	//This function runs synchronously and returns the ETag if no return function is provided.
	var isAsync = true;
	var prettyParse = true;
	if (returnFunction==null){
		isAsync = false;
    }
	if (OSLCproperties=='noPrettyParse') {
	   prettyParse = false;
	   var oProps = "";
	} else if (OSLCproperties!=''){
        var oProps = "?oslc_cm.properties=" + OSLCproperties;
	} else {
		var oProps = "";
	}
	var URL = RTCURL() + "resource/itemName/com.ibm.team.workitem.WorkItem/" + WIId + oProps;
	URL = proxyURL(URL);
    var response = $.ajax({
        xhrFields: {withCredentials: true},
        url: URL, type: 'GET', async:isAsync, timeout:5000,
        headers:{'Accept' : 'application/json'},
        success: function(response){
        	if (isAsync){
        	    if (prettyParse){
                    returnFunction(parseOSLCNodes(response));
                } else {
                    returnFunction(response);
                }
        	}
        },
        error: function(error){
            alert('Your session has expired.\nPlease refresh this page to login.');
        }
	});
	if (!isAsync){
        var returnObj = new Object();
        if (prettyParse){
            returnObj = parseOSLCNodes(response.responseJSON);
        } else {
            returnObj.json = response.responseJSON;
        }
        returnObj.ETag = response.getResponseHeader('ETag');
        return returnObj;
	}
}

function objParseChildNodes(element, removePrefixes=false){
    var returnObj = Object();
    if (element.attributes != null){
        if (element.attributes.length>0){
            for (var attr of element.attributes){
            	if (removePrefixes){
            		returnObj[rPrefix(attr.name)] = attr.value;
            	} else {
            		returnObj[attr.name] = attr.value;
            	}
            }
        }
    }
    if (element.hasChildNodes()){
        if ((element.firstChild.nodeName=="#text") && (element.childNodes.length==1)){
            returnObj = element.firstChild.textContent;
        } else {
            var curName;
            for (var childNode of element.childNodes){
            	if (removePrefixes){
                    curName = rPrefix(childNode.nodeName);
            	} else {
            		curName = childNode.nodeName;
            	}
                
                var processMe = false;
                if (curName=='#text'){
                    if (/\S/.test(childNode.textContent)){
                        processMe = true;
                    }
                } else {
                    processMe = true;
                }
                if (curName=="primaryText"){
                	returnObj["primaryText"] = childNode.innerHTML;
                } else  if (processMe){
                    curValue = objParseChildNodes(childNode, removePrefixes);
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

function rPrefix(i){
	var sRng = i.indexOf(":");
	if (sRng > 0){
		return i.substr(sRng+1);
	} else {
		return i;
	}
}

function proxyURL(url) {
	if (url.indexOf(applicationURL()) != 0) {
        url = applicationURL() + "proxy?uri=" + encodeURIComponent(url);
    }
    return url;
}

function closedStatesFilter(){
return " and state/id!='" +
"com.ibm.team.workitem.programEpic.workflow.state.approved" + "' and state/id!=" +
"com.ibm.team.workitem.programEpic.workflow.state.done" + "' and state/id1='" +
"com.ibm.team.workitem.programEpic.workflow.state.rejected" + "' and state/id!='" +
"com.ibm.team.workitem.feature.workflow.state.s1" + "' and state/id1='" +
"com.ibm.team.workitem.feature.state.rejected" + "' and state/id!=" +
"com.ibm.team.apt.storyWorkflow.state.done" + "' and state/id1='" +
"com.ibm.team.apt.storyWorkflow.state.invalid" + "' and state/id1=" +
"com.ibm.team.workitem.defectWorkflow.state.done" + "' and state/id!='" +
"com.ibm.team.workitem.taskWorkflow.state.done" + "' and state/id1='" +
"com.ibm.team.workitem.taskWorkflow.state.invalid" + "' and state/id1='" +
"com.ibm.team.workitem.piObjectiveWorkflow.state.done" + "' and state/id1='" +
"com.ibm.team.workitem.piObjectiveWorkflow.state.invalid" + "' and state/id!='" +
"com.ibm.team.workitem.retrospectiveWorkflow.state.finished" + "' and state/id!='" +
"com.ibm.team.workitem.retrospectiveWorkflow.state.reject" + "' and state/id!='" +
"com.ibm.team.workitem.riskWorkflow.state.closed" + "'";
}