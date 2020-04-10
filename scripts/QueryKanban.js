var WIs;
var WIsObj;
var tData;
var WFs;
var ParentWFsFinal;
var UsedWFs;
var rSent;
var rReceived;
var StateIdtoNextValidStateName;
var StateNames;
var StateIdToName = new Object();
var ResolutionIdToName;
var pendingCardInfo = [];

function displayReport() {
	WIsRet = false;
	TMsRet = false;
	if (prefsSet()) {
		document.getElementById('settingsDiv').style.display = 'none';
		document.getElementById('loadingDiv').style.display = "";
		var prefs = new gadgets.Prefs();
		var QueryId  =  prefs.getString("QueryId");
		var ProjectId = prefs.getString("ProjectId");
        var Title = prefs.getString("Title");
        if (Title==''){
        	Title = 'Kanban Board';
        }
		document.getElementById('titleString').innerHTML = Title;
		var propString = 'dc:identifier,dc:title,dc:type{rtc_cm:iconUrl},rtc_cm:ownedBy{dc:title,rtc_cm:photo},rtc_cm:state{dc:title,dc:identifier}'; //Get only these properties in the response...this is a big time saver...
		runStoredQuery(QueryId, WIReturn, propString, true); //This is synchronous
        ParentWFsFinal = false;
        WFs = '';
        rSent = 1;
        rReceived = 0;
        //The path of execution is to get the Process XML for the current project to get workflow information. This also checks if there is any Parent Process XML that should 'trump'. Global: WFs is populated correctly, and then ShowReport() is called.
		getREST(RTCURL() + "rpt/repository/generic?fields=generic/com.ibm.team.process.ProjectArea[itemId=" + ProjectId + "]/(internalProcessProvider/itemId|processData[key='com.ibm.team.internal.process.compiled.xml']/value/contentId)", ProcessIdReturn);
	}
	oTooltip.init();
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
    var Title = document.getElementById('tbTitle').value;
    var ProjDD = document.getElementById('ddprojectArea');
    var selProj = ProjDD.value;
	var PAName = ProjDD.options[ProjDD.selectedIndex].text;
	var selTeam = document.getElementById('ddteamArea').value;
	var QueryId = document.getElementById('selectedQueryId').textContent;
	if (QueryId != '') {
	    var prefs = new gadgets.Prefs();
	    prefs.set("Title", Title);
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
    WIsObj = new Object();
    for (var WI of WIs){
    	WIsObj[WI.id] = WI;
    }
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
	ActionIdForWorkflowAndStateName = new Object();
	ResolutionIdToName = new Object();
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
        if (WFs[curWF].resolution!=null){
        	if (typeof WFs[curWF].resolution[Symbol.iterator] === 'function'){
        		for (var resolution of WFs[curWF].resolution){
        			ResolutionIdToName[resolution.id] = resolution.name;
        		}
        	} else {
                ResolutionIdToName[WFs[curWF].resolution.id] = WFs[curWF].resolution.name;
        	}
        }
        for (var curS of WFs[curWF].state){
            StateIdToName[curS.id] = curS.name;
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
                                StateIdtoNextValidStateName[curS.id].push(StateIdToName[ActionState[a.id]]);
							}
                        } else if (curS.action!=null){
                        	a = curS.action;
							if ((a.id==reopenAId)||(a.id==startAId)) {//If this state has only one action, and it is the new or reopen adtion, then push it to the end.
								StateOrdinals[curWF][curS.name] = 101;
							}
                        	newNextState.push(ActionState[a.id]);
                        	StateIdtoNextValidStateName[curS.id].push(StateIdToName[ActionState[a.id]]);
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
    StateNames = [];
    var curMinStateName = '';
    for (i=0;i<Object.keys(StateNameScore).length;i++){
    	var curMin=1000;
    	curMinStateName = '';
    	for (var stateName in StateNameScore){
            if (!StateNames.includes(stateName)){
            	if (StateNameScore[stateName]>=lastMin){
                    if (StateNameScore[stateName]<curMin){
                    	curMin = StateNameScore[stateName];
                    	curMinStateName = stateName;
                    }
				}
            }
		}
		lastMin = curMin;
		StateNames.push(curMinStateName);
    }
    
    var colWidth = "width:" + 100/(StateNames.length) + "%";
    var tHead = "<tr>";
    var tBody = "<tr>";
    for (var state of StateNames){
        tHead +="<th style='" + colWidth + "'>" + state + "</th>";
        tBody +="<td id='" + state + "' class='Col' ondrop='drop_handler(event);' ondragover='dragover_handler(event);' ondragleave='dragleave_handler(event);' style='vertical-align:top;" + colWidth + "'>" ;
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
	setupkbCards();
	resize();
}

function resize(){
	var cardTableTop = document.getElementById('kbContainer').offsetTop;
	var maxHeight = parent.innerHeight-230-cardTableTop;
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
    c += "<div id='" + WI.id + "' class='kbCard' draggable='true' ondragstart='dragstart_handler(event);' ondragend='dragend_handler(event);'>";
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

function getWFResourceFromStateURL(stateURL){
	return stateURL.substr(0, stateURL.lastIndexOf("/"));
}
function getStateIdFromURL(stateURL){
	return stateURL.substr(stateURL.lastIndexOf("/") + 1);
}

function getParentTD(element){
	var newLocation = element;
	while (newLocation.tagName !='TD'){
		if (newLocation.parentNode!=null){
			newLocation = newLocation.parentNode;
		}
	}
	return newLocation;
}

function getParentCard(element){
	var newLocation = element;
	while (!newLocation.classList.contains('kbCard')){
		if (newLocation.parentNode!=null){
			newLocation = newLocation.parentNode;
		}
	}
	return newLocation;
}

function dragstart_handler(e) {
	var WIId = e.target.id;
	// Add the id of the drag source element to the drag data payload so
	// it is available when the drop event is fired
	var dt = e.dataTransfer;
	dt.setData("Text", WIId);
	dt.effectAllowed = "move";

	tData = new Object();
	tData.id = WIId;
	tData.allowedStates = StateIdtoNextValidStateName[WIsObj[WIId].state.id];
	
	var rect = e.target.getBoundingClientRect();
	var x = e.clientX - rect.left; //x position within the element.
	var y = e.clientY - rect.top;
	
	var oLeft = e.clientX - x;
	var oTop = e.clientY -y - 30;

	oTooltip.append(e,'', "popupState", oLeft, oTop);
	oTooltip.hide();
	for (var State of StateNames){
		if (tData.allowedStates.includes(State)){
			document.getElementById(State).classList.add('availableCol');
		} else {
			document.getElementById(State).classList.add('unavailableCol');
		}
	}
}

function dragover_handler(e) {
	e.preventDefault();
    var newLocation = getParentTD(e.target);
    if (tData.allowedStates.includes(newLocation.id)){
    	oTooltip.follow(e);
    	oTooltip.show();
    	oTooltip.setContent(newLocation.id);
	    e.currentTarget.classList.add("proposedCol");
    } else {
    	oTooltip.follow(e);
    	oTooltip.hide();
    }
}

function dragleave_handler(e) {
	e.currentTarget.classList.remove("proposedCol");
}

function drop_handler(e) {
	e.preventDefault();
	e.currentTarget.classList.remove("proposedCol");
	//Move the Card
	var newLocation = getParentTD(e.target);
	if (tData.allowedStates.includes(newLocation.id)){
		var card = document.getElementById(tData.id);
		var cardObj = new Object;
		cardObj.card = card;
		cardObj.originalLocation = card.parentNode;
		pendingCardInfo.push(cardObj);
		newLocation.appendChild(card);
		resize();
		card.classList.add("dropped");
		actionWorkItem(tData.id, newLocation.id);
    }
    dragend_handler(e);
}

function dragend_handler(e) {
	oTooltip.remove();
	for (var State of StateNames){
		document.getElementById(State).classList.remove('availableCol');
        document.getElementById(State).classList.remove('unavailableCol');
	}
}

function actionWorkItem(WIId, newStateName){
    var workingWI = getWorkingWI(WIId, 'rtc_cm:state');
	var curWI = WIsObj[WIId];
    var kbCurStateId = curWI.state.id;
    if (curWI.state.url == workingWI.json['rtc_cm:state']['rdf:resource']){
    	var WF = WFs[getWFidFromStateURL(curWI.state.url)];
		for (var state of WF.state){
			if (state.name==newStateName) var newStateId = state.id;
			if (state.id==kbCurStateId){
				var availableActions = state.action;
			}
		}
        if (typeof availableActions[Symbol.iterator] === 'function'){
        	for (var action of availableActions){
				for (var a of WF.action){
					 if (a.id==action.id){
						if (a.state==newStateId) {
							var actionName = a.name;
							var actionId= a.id;
                            var resolutions = a.resolution;
						}
					}
				}
			}
        } else {
        	for (var a of WF.action){
				 if (a.id==availableActions.id){
					if (a.state==newStateId) {
						var actionId= a.id;
						var resolutions = a.resolution;
					}
				}
			}
        }
        if (!needResolution(WIId, newStateId, newStateName, actionId, actionName, resolutions, workingWI.ETag)){
        	changeState(WIId, newStateId, newStateName, actionId, null, workingWI.ETag);
        }
    } else {
    	var actualStateId = getStateIdFromURL(workingWI.json['rtc_cm:state']['rdf:resource']);
    	var stateName = StateIdToName[actualStateId];
    	if (newStateName==stateName){
            alert("Yay! We all are in agreement.\nWork Item " + WIId + " was already moved to the '" + stateName + "' state.\nNo changes were needed.");
            displaySaveSuccessful(WIId, workingWI.json['rtc_cm:state']['rdf:resource']);
        } else {
            alert("Woops! Work Item " + WIId + " was moved by a different process to the '" + stateName + "' state.\nI'll display it there now. Only move it again if you should.");
            moveCardToCol(WIId, workingWI.json['rtc_cm:state']['rdf:resource']);
        }
    	
    }
}

function displaySaveSuccessful(WIId, newStateURL){
    var stateId = getStateIdFromURL(newStateURL);
	WIsObj[WIId].state.id = stateId;
	WIsObj[WIId].state.url = newStateURL;
	WIsObj[WIId].state.name = StateIdToName[stateId];

    var card = document.getElementById(WIId);
	setTimeout(function () {
		card.classList.remove('dropped');
	}, 5100);
	removePendingCardInfoById(WIId);
}

function moveCardToCol(WIId, newStateURL){
    var stateId = getStateIdFromURL(newStateURL);
    var stateName = StateIdToName[stateId];
	WIsObj[WIId].state.id = stateId;
	WIsObj[WIId].state.url = newStateURL;
	WIsObj[WIId].state.name = stateName;
	var card = document.getElementById(WIId);
	var stateCol = document.getElementById(stateName);
    stateCol.appendChild(card);
	resize();
	setTimeout(function () {
		card.classList.remove('dropped');
	}, 5100);
	removePendingCardInfoById(WIId);
}

function changeState(WIId, stateId, stateName, actionId, resolutionId, ETag){
    var curWI = WIsObj[WIId];
    newJSON = new Object();
	newJSON['rtc_cm:state'] = new Object();
	newJSON['rtc_cm:state']['rdf:resource'] = getWFResourceFromStateURL(curWI.state.url) + "/" + stateId;
    var props = 'rtc_cm:state';
    if (resolutionId!=null){
	    newJSON['rtc_cm:resolution'] = new Object();
	    newJSON['rtc_cm:resolution']['rdf:resource'] = getWFResourceFromStateURL(curWI.state.url) + "/" + resolutionId;
	    props += ",rtc_cm:resolution";
    }
	
	var str = JSON.stringify(newJSON);
	var URL = RTCURL() + "resource/itemName/com.ibm.team.workitem.WorkItem/" + WIId + "?oslc_cm.properties=" + props + "&_action=" + actionId;
	var card;
	var prevCol;
    for (var cardInfo of pendingCardInfo){
		if (cardInfo.card.id==WIId){
		    card = cardInfo.card;
            prevCol = cardInfo.originalLocation;
		}
	}

	$.ajax({
		async:true,	xhrFields: {withCredentials: true},	url: URL,
		type: 'PUT',
		data: str,
		headers:{
		'Content-Type' : 'application/json',
		'Accept':'application/json',
		'If-Match' : ETag
		},
		success:function(response, status, xhr){
            displaySaveSuccessful(WIId, response['rtc_cm:state']['rdf:resource']);
		},
		error: function(error){
			var message = "Woops! Saving work item " + WIId + " failed.\n";
			if (error.responseJSON['oslc_cm:message']!=null){
				var errorString = error.responseJSON['oslc_cm:message'] + "\n";
				if (errorString.indexOf('CRJAZ')>-1){
					errorString = errorString.substr(errorString.indexOf(" ") + 1);
				}
				if (errorString.indexOf('(work item')>-1){
					errorString = errorString.substr(0, errorString.indexOf(' (work item')) + ".\n";
				}
				errorString = errorString.replace("'Save Work Item' failed. Preconditions have not been met: ", "");
				errorString = errorString.replace("needs to be set", "is required in the '" + stateName + "' state");
				//errorString = errorString.replace("'Save Work Item' failed. ", "");
				message += errorString;
			}
			alert(message + "\nMoving back to the '" + prevCol.id + "' state.");
			prevCol.appendChild(card);
			resize();
			setTimeout(function () {
				card.classList.remove('dropped');
			}, 5100);
			removePendingCardInfoById(WIId);
		}
	});
}

function needResolution(WIId, stateId, stateName, actionId, actionName, resolutions, workingETag){
    //returns false if not needed, 'cancelled' if the user cancelled the work item transition, or the resolution ID.
    if (resolutions==null){
    	return false;
    } else {
    	var rs = '';
    	sel = " class='svgSelected'"; //select the first item by default.
    	for (var resolution of resolutions){
    		rs += "<queryButton" + sel + " id='" + resolution.id + "'><div class='svgButton' >" + ResolutionIdToName[resolution.id] + "</div></queryButton>";
    		sel = '';
    	}
    	document.getElementById('resolutionFormTitle').innerHTML = actionName + " with a resolution of:";
    	var selDiv = document.getElementById('resolutionSelectionDiv');
    	selDiv.innerHTML = rs;
	    for (var item of selDiv.querySelectorAll('queryButton')){
			item.addEventListener('click', function(){
				for (var button of document.querySelectorAll('queryButton')){
					button.classList.remove('svgSelected');
				}
				this.classList.add('svgSelected');
			});
			item.addEventListener('dblclick', function () {
				saveResolution();
			});
		}
		document.getElementById('resWIId').innerHTML = WIId;
		document.getElementById('resStateId').innerHTML = stateId;
		document.getElementById('resStateName').innerHTML = stateName;
		document.getElementById('resActionId').innerHTML = actionId;
		document.getElementById('resETag').innerHTML = workingETag;
    	document.getElementById('resolutionForm').style.display = 'block';
    	return true;
    }
}

function saveResolution(){
	var WIId = document.getElementById('resWIId').innerHTML;
	var stateId = document.getElementById('resStateId').innerHTML;
	var stateName = document.getElementById('resStateName').innerHTML;
	var actionId = document.getElementById('resActionId').innerHTML;
	var ETag = document.getElementById('resETag').innerHTML;
    var selDiv = document.getElementById('resolutionSelectionDiv');
    var resolutionId;
	for (var item of selDiv.querySelectorAll('queryButton')){
		if (item.classList.contains('svgSelected')){
			resolutionId = item.id;
		}
	}
	changeState(WIId, stateId, stateName, actionId, resolutionId, ETag);
	document.getElementById('resolutionForm').style.display = 'block';
	document.getElementById('resolutionForm').style.display = 'none';
}

function cancelSaveResolution(){
    document.getElementById('resolutionForm').style.display = 'none';
    var WIId = document.getElementById('resWIId').innerHTML;

}

function getWorkingWI(WIId, OSLCproperties){
	if (OSLCproperties!=''){
        var oProps = "?oslc_cm.properties=" + OSLCproperties;
	} else {
		var oProps = "";
	}
	var URL = RTCURL() + "resource/itemName/com.ibm.team.workitem.WorkItem/" + WIId + oProps;
    var response = $.ajax({
        xhrFields: {withCredentials: true},
        url: URL, type: 'GET', async:false,
        headers:{'Accept' : 'application/json'},
        error: function(error){
            alert('Your session has expired.\nPlease refresh this page to login.');
        }
	});
	var returnObj = new Object();
	returnObj.json = response.responseJSON;
	returnObj.ETag = response.getResponseHeader('ETag');
	return returnObj;
}

function setupkbCards(){
	cards = document.getElementsByClassName('kbCard');
    for (var card of cards){
    	card.addEventListener('contextmenu', e => {
		  e.preventDefault();
		});
		card.addEventListener('dblclick', function (e) {
			var myCard = getParentCard(e.target);
		    window.open(WIsObj[myCard.id].url,'_blank');
		});
    }
	
}

function removePendingCardInfoById(WIId){
	var index = -1;
	var removeIndex = false;
	for (var cardInfo of pendingCardInfo){
		index++;
		if (cardInfo.card.id==WIId){
            removeIndex = index;
		}
	}
	if (index) pendingCardInfo.splice(index, 1);
}