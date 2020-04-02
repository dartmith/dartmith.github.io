var WIs;
var WFs;
var ParentWFsFinal;
var UsedWFs;
var rSent;
var rReceived;
var StateIdtoNextValidStateName;

function displayReport() {
	WIsRet = false;
	TMsRet = false;
	if (prefsSet()) {
		document.getElementById('settingsDiv').style.display = 'none';
		document.getElementById('loadingDiv').style.display = "";
		var prefs = new gadgets.Prefs();
		var QueryId  =  prefs.getString("QueryId");
		var ProjectId = prefs.getString("ProjectId");
		var propString = 'dc:identifier,dc:title,dc:type{rtc_cm:iconUrl},rtc_cm:ownedBy{dc:title,rtc_cm:photo},rtc_cm:state{dc:title,dc:identifier}'; //Get only these properties in the response...this is a big time saver...
		runStoredQuery(QueryId, WIReturn, propString, true); //This is synchronous
        ParentWFsFinal = false;
        WFs = '';
        rSent = 1;
        rReceived = 0;
        //The path of execution is to get the Process XML for the current project to get workflow information. This also checks if there is any Parent Process XML that should 'trump'. Global: WFs is populated correctly, and then ShowReport() is called.
		getREST(RTCURL() + "rpt/repository/generic?fields=generic/com.ibm.team.process.ProjectArea[itemId=" + ProjectId + "]/(internalProcessProvider/itemId|processData[key='com.ibm.team.internal.process.compiled.xml']/value/contentId)", ProcessIdReturn);
	}
}

function ProcessIdReturn(r){
    if (r[0].internalProcessProvider.itemId!=null){
    	rSent++;
    	var ParentProjectId = r[0].internalProcessProvider.itemId;
    	getREST(RTCURL() + "rpt/repository/generic?fields=generic/com.ibm.team.process.ProjectArea[itemId=" + ParentProjectId + "]/processData[key='com.ibm.team.internal.process.compiled.xml']/value/contentId", ParentProcessIdReturn);
    }

	var cId = r[0].processData.value.contentId;
	getREST(RTCURL() + "resource/content/" + cId, ProcessXMLReturn);
}

function ParentProcessIdReturn(r){
	var cId = r[0].processData.value.contentId;
	getREST(RTCURL() + "resource/content/" + cId, ParentProcessXMLReturn);
}

function ProcessXMLReturn(p){
	rReceived++;
	var cDatas = p[1].data['configuration-data'];
	for (var cData of cDatas){
		if (cData.id == 'com.ibm.team.workitem.configuration.workflow'){
			if ((!ParentWFsFinal) || (WFs=='')){
                WFs = new Object();
			    var Workflows = cData.workflowDefinition;
				for (var WF of Workflows){
					WFs[WF.id] = WF.workflow;
				}
			}
		}
	}
	if (rReceived==rSent){
        showReport();
	}
}

function ParentProcessXMLReturn(p){
	rReceived++;
	var cDatas = p[1].data['configuration-data'];
	for (var cData of cDatas){
		if (cData.id == 'com.ibm.team.workitem.configuration.workflow'){
			if (cData.final=='true'){
                ParentWFsFinal = true;
			}
			if ((ParentWFsFinal)||(WFs=='')){
				WFs = new Object();
			    var Workflows = cData.workflowDefinition;
				for (var WF of Workflows){
					WFs[WF.id] = WF.workflow;
				}
			}
		}
	}
	if (rReceived==rSent){
		showReport();
	}
}

function applySettings() {
    var ProjDD = document.getElementById('ddprojectArea');
    var selProj = ProjDD.value;
	var PAName = ProjDD.options[ProjDD.selectedIndex].text;
	var selTeam = document.getElementById('ddteamArea').value;
	var QueryId = document.getElementById('selectedQueryId').textContent;
	if (QueryId != '') {
	    var prefs = new gadgets.Prefs();
	    prefs.set("ProjectId", selProj);
	    prefs.set("ProjectName", PAName);
	    prefs.set("TeamId", selTeam);
	    prefs.set("QueryId", QueryId);
	    displayReport();
	} else {
	    alert('Please select a query');
	}
}

function closeSettings() {
	displayReport();
}

function showFailure(message) {
	$("#reportTableBody").html(message);
	document.getElementById('loadingDiv').style.display	= "none";
	document.getElementById('reportContentDiv').style.display = '';
}

function WIReturn(workItems) {
    WIs = workItems;
}

function showReport() {
	//UsedWFs = Search the Work Items returned in the query and determine which Workflows are present
	var UsedWFs = [];
	for (var WI of WIs){
		var WF = getWFidFromStateURL(WI.state.url);
		if (!UsedWFs.includes(WF)){
			UsedWFs.push(WF);
		}
	}

	//Search the workflows to determine the order of the states in each UsedWF (workflow that's present).
	var StateOrdinals = new Object();
	StateIdtoNextValidStateName = new Object();
	for (var curWF of UsedWFs){
		var startAId = WFs[curWF].startActionId;
		var startSId = '';
		var EndAId = WFs[curWF].resolveActionId;
		var endSId = '';
		var reopenAId = WFs[curWF].reopenActionId;
        var ActionState = new Object();
        for (var curA of WFs[curWF].action){
        	ActionState[curA.id] = curA.state;
        	if (curA.id == startAId){
                startSId = curA.state;
        	}
        	if (curA.id == EndAId){
                endSId = curA.state;
        	}
        }
        var StateName = new Object();
        for (var curS of WFs[curWF].state){
            StateName[WFs[curWF].state.id] = WFs[curWF].state.title;
        }
        StateOrdinals[curWF]= new Object();
        var curOrdinal = 0;
        var nextState = [startSId];
        var nextStateName;
        while (nextState.length!=0){
            curOrdinal++;
            var newNextState = [];
			for (var curS of WFs[curWF].state){
				if (nextState.includes(curS.id)){
					if (StateOrdinals[curWF][curS.name]==null){

						if (curS.id==endSId){
                            StateOrdinals[curWF][curS.name] = 100;//Ensure the last state is at the end.
						} else {
							StateOrdinals[curWF][curS.name] = curOrdinal;
						}
						StateIdtoNextValidStateName[curS.id] = [];
						if (Array.isArray(curS.action)){
							for (var a of curS.action){
                        	    newNextState.push(ActionState[a.id]);
                                StateIdtoNextValidStateName[curS.id].push(StateName[ActionState[a.id]]);
							}
                        } else if (curS.action!=null){
							if ((curS.action.id==reopenAId)||(curS.action.id==startAId)) {//If this state has only one action, and it is the new or reopen adtion, then push it to the end.
								StateOrdinals[curWF][curS.name] = 101;
							}
                        	newNextState.push(ActionState[a.id]);
                        	StateIdtoNextValidStateName[curS.id].push(StateName[ActionState[a.id]]);
                        }
					}
				}
			}
			nextState = newNextState;
        }
	}

	//With the order of the states by workflow (in StateOrdinals), now determine the state column order for the Kanban.
	var StateNameCount = new Object();
    var StateNameScore = new Object();
	for (var WFKey in StateOrdinals){
		for (var stateName in StateOrdinals[WFKey]){
			if (StateNameScore[stateName]==null){
				StateNameScore[stateName] = 0;
				StateNameCount[stateName] = 0;
			}
			StateNameScore[stateName] += StateOrdinals[WFKey][stateName];
            StateNameCount[stateName]++;
		}
	}
	for (var stateName in StateNameScore){
		StateNameScore[stateName] /=  StateNameCount[stateName];
	}
    
    var lastMin = 0;
    var States = [];
    var curMinStateName = '';
    for (i=0;i<Object.keys(StateNameScore).length;i++){
    	var curMin=1000;
    	curMinStateName = '';
    	for (var stateName in StateNameScore){
            if (!States.includes(stateName)){
            	if (StateNameScore[stateName]>=lastMin){
                    if (StateNameScore[stateName]<curMin){
                    	curMin = StateNameScore[stateName];
                    	curMinStateName = stateName;
                    }
				}
            }
		}
		lastMin = curMin;
		States.push(curMinStateName);
    }
    
    var colWidth = "width:" + 100/(States.length) + "%";
    var tHead = "<tr>";
    var tBody = "<tr>";
    for (var state of States){
        tHead +="<th style='" + colWidth + "'>" + state + "</th>";
        tBody +="<td class='Col' ondrop='drop_handler(event);' ondragover='dragover_handler(event);' ondragleave='dragleave_handler(event);' style='vertical-align:top;" + colWidth + "'>" ;
        for (var WI of WIs){
            if (WI.state.title == state){
            	tBody += WICard(WI);
            }
        }
         tBody += "</td>";
    }
    tHead += "</tr>";
    tBody += "</tr>";
    
    $("#kbTableHead").html(tHead);
    $("#kbTableBody").html(tBody);
	document.getElementById('loadingDiv').style.display = "none";
	document.getElementById('reportContentDiv').style.display = '';
	resize();
}

function resize(){
	var maxHeight = 650;
	document.getElementById('kbContainer').style.maxHeight = maxHeight;
	document.getElementById('kbHeaderTable').style.width = document.getElementById('kbTableBody').offsetWidth + "px";
	gadgets.window.adjustHeight();
}

function WICard(WI){
    var uName = WI.ownedBy.title;
    var uIcon = '';
    if (uName != 'Unassigned'){
    	uIcon = "<div class='photoDiv'><img class='userPhoto' src='"+ WI.ownedBy.photo.url + "'></div>";
    } else {
    	uName = '';
    	uIcon = "<div class='photoDiv'><img class='userPhoto unassignedPhoto'></div>";
    }
    if (uName == ''){
    	uName = '&nbsp';
    }

    var c = "";
    c += "<div id='wi" + WI.id + "' class='kbCard' draggable='true' ondragstart='dragstart_handler(event);'' ondragend='dragend_handler(event);'>";
	c += "<img class='kbCardIcon' src='" + WI.type.iconUrl + "'>";
	c += "<div class='namePlate'>" + uIcon + "<div class='namePad'>" + uName + "</div></div>";
	c += "<div class='padding'>" + WI.id + ": " + trimSummary(WI.title) + "</div>";
	c += "</div>";
	return c;
}

function trimSummary(s) {
	var len = 43;
	var trimmed = s.length > len ? s.substring(0, len - 3) + "..." : s;
	return trimmed;
}

function trimName(s) {
	var output;
	var len = s.indexOf(",");
	if (len > 0) {
		output = s.substring(0, len);
	} else {
		output = s;
	}
	var len = output.indexOf(" ");
	if (len > 0) {
		output = output.substring(0, len);
	}
	return output;
}

function escapeSingleQuotes(s) {
    return s.replace(/["']/g, '\\$&');
}

function getWFidFromStateURL(stateURL){
	var temp = stateURL.substr(0, stateURL.lastIndexOf("/"));
	var startIndex = temp.lastIndexOf("/") + 1;
	return temp.substr(startIndex);
}

function dragstart_handler(ev) {
	// Add the id of the drag source element to the drag data payload so
	// it is available when the drop event is fired
	ev.dataTransfer.setData("text", ev.target.id);
	ev.effectAllowed = "move";

}
function dragover_handler(ev) {
	ev.preventDefault();
	ev.dropEffect = "move";
	ev.currentTarget.classList.add("availableCol");
	
}
function dragleave_handler(ev) {
	ev.preventDefault();
	ev.currentTarget.classList.remove("availableCol");

}
function drop_handler(ev) {
	ev.preventDefault();
	// Get the id of drag source element (that was added to the drag data
	// payload by the dragstart event handler)
	var id = ev.dataTransfer.getData("text");
	ev.currentTarget.classList.remove("availableCol");
	//Move the Card
	var newLocation = ev.target;
	while (newLocation.tagName !='TD'){
		if (newLocation.parentNode!=null){
			newLocation = newLocation.parentNode;
		}
	}
	newLocation.appendChild(document.getElementById(id));
	
}
function dragend_handler(ev) {
	// Restore source's border
	var card = ev.currentTarget;
	card.classList.add("dropped");
	setTimeout(function () {
		card.classList.remove('dropped');
	  }, 5100);

	// Remove all of the drag data
	ev.dataTransfer.clearData();
}