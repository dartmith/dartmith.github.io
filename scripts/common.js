var RTCWidget = false;
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

function showOptions(){
    document.getElementById('loadingDiv').style.display = "";
    document.getElementById('reportContentDiv').style.display = "none";
    document.getElementById('settingsDiv').style.display = "none";
    doInit();
    var url = applicationURL() + "rpt/repository/foundation?fields=projectArea/projectArea[archived=false]/(name|itemId)";
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
        var url = applicationURL() + "rpt/repository/foundation?fields=projectArea/projectArea[itemId=" + PAitemId + "]/(allTeamAreas/(name|itemId|archived))";
        getREST(url, setupTeamDD);
    }
    if (document.getElementById("ddWITypes")!=null){
        runningThreads++;
        var url = applicationURL() + "oslc/types" + PAitemId + ".json";
        getREST(url, setupWorkItemsDD, true);
    }
    if (document.getElementById('ddCats')!=null){
        runningThreads++;
        var url = applicationURL() + "oslc/categories.json?oslc_cm.query=rtc_cm:projectArea=\"" + PAitemId + "\" and rtc_cm:archived=false";
        getREST(url, setupFiledAgainstDD, true);
    }
    if (document.getElementById("ddPlan")!=null){
        runningThreads++;
        var url = applicationURL() + "rpt/repository/apt?fields=apt/iterationPlanRecord[archived=false and iteration/archived=false and owner/archived=false and contextId=" + PAitemId + "]/(name|itemId|iteration/(name|id)|owner/(name|itemId))";
        getREST(url, setupPlanDD);
    }
    if (document.getElementById('querySelectionDiv')!=null){
        runningThreads++;
        var url = applicationURL() + "service/com.ibm.team.workitem.common.internal.rest.IQueryRestService/scopedQueries?scope=3&includeCount=false&includeParentScopes=true&projectAreaItemId=" + PAitemId + "&suppressCrossRepoQueries=false";
        getREST(url, setupQueryDD);
    }
    if (document.getElementById('ItemsPerPageDiv')!=null){
        var prefs = new gadgets.Prefs();
        var ItemsPerPage = prefs.getString("ItemsPerPage");
        if (ItemsPerPage!='All'){
            document.getElementById('ItemsPerPageDiv').value = ItemsPerPage;
        }
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

function showForm() {
    runningThreads--;
    if (runningThreads==0){
        document.getElementById('loadingDiv').style.display = "none";
        document.getElementById('settingsDiv').style.display = "";
    }
}

function openQueryEditor(){
    var queryId = document.getElementById('selectedQueryId').textContent;
    var url = applicationURL() + "resource/itemOid/com.ibm.team.workitem.query.QueryDescriptor/" + queryId;
    window.open(url, "_blank");
 
}

//######################################## End of Widget Preferences ########################################

function applicationURL(){
    if (RTCWidget){
        return RTCURL();
    } else {
        return getPlainAppURL();
    }
}

function getPlainAppURL(){
    var href = window.location.href;
    var len = href.indexOf("/", 9);
    var len = href.indexOf("/", len + 1) + 1;
    return href.substr(0, len);
}

function getNetwork(){
    var appURL = getPlainAppURL().toUpperCase();
    if (appURL.indexOf("JTS.HILL")>-1){
        return "NIPR";
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
        default:
        return getPlainAppURL();
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

function getREST(RESTurl, returnFunction, isJSON){
if (RESTurl.indexOf("/rpt/repository")!==-1){
    if (!(RESTurl.indexOf("&size=")!==-1)){
        RESTurl+="&size=10000"
    }
}
isJSON = isJSON||false;
$.ajax({
    async:true,
    xhrFields: {withCredentials: true},
    url: RESTurl,
    headers:{
    'Accept' : 'application/xml',
    },
    success:function(data){
        if (isJSON){
            var rows = data;
        } else {
            if (data.childNodes[0].nodeName=='#comment'){
                retItems = data.childNodes[1].childNodes;
            } else {
                retItems = data.childNodes[0].childNodes;
            }
            var rows = [];
            for (var retItem of retItems){
                var objI;
                if (retItem.nodeName!='#text'){
                    objI = objParseChildNodes(retItem);
                    rows.push(objI);
                }
            }
        }
        returnFunction(rows);
    },
    error:function(error){
        console.error(error);
        alert('Your session has expired.\nPlease refresh this page to login.');
    }
});
}

function getRESTJSON(RESTurl, returnFunction){
    $.ajax({
        async:true,
        xhrFields: {withCredentials: true},
        url: RESTurl,
        type: 'GET',
        headers:{
        'Accept' : 'text/json'
        },
        success:function(data){
            var rows = data;
            returnFunction(rows);
        },
        error: function(error){
            console.error(error);
            alert('Your session has expired.\nPlease refresh this page to login.');
        }
    });
}

function returnAllOSLCResults(url){
    var allData
    $.ajax({
        async:false,
        xhrFields: {withCredentials: true},
        url: url,
        headers:{
        'Accept' : 'application/json'
        },
        success:function(data){
            if (data['oslc_cm:next']!=null){
                var data2 = returnAllOSLCResults(data['oslc_cm:next']);
                var test = '';
                for (var item of data2['oslc_cm:results']){
                    data['oslc_cm:results'].push(item);
                }
            }
            allData = data;
        },
        error: function(error){
            console.error(error);
            alert('Your session has expired.\nPlease refresh this page to login.');
        }
    });
    return allData;
}

function runStoredQuery(queryId, returnFunction, propString, removeOSLCMarkup){//THIS IS A SYNCHRONOUS FUNCTION CALL, unlike getREST, which is async.
    url = applicationURL() + 'oslc/queries/' + queryId + '/rtc_cm:results.json';
    if (propString!=''){
        url+= "?oslc_cm.properties=" + propString;
    }
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
}

function parseOSLCNodes(element){
    if (typeof element !== 'object'){
        return element;
    } else {
        var returnObj = Object();
        for (var prop in element){
            name = prop.replace("rtc_cm:", "");
            name = name.replace("oslc_cm:", "");
            name = name.replace("dc:", "");
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

function objParseChildNodes(element){
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
                curName = childNode.nodeName;
                var processMe = false;
                if (curName=='#text'){
                    if (/\S/.test(childNode.textContent)){
                        processMe = true;
                    }
                } else {
                    processMe = true;
                }
                if (processMe){
                    curValue = objParseChildNodes(childNode);
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