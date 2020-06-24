var WI;

function createWICopy(){
	var prefs = new gadgets.Prefs();
    var WIId = prefs.getString("WIId");
	var workingWI = getWorkingWI(WIId, 'noPrettyParse').json;
	WI = workingWI;
	var url = RTCURL() + "rpt/repository/foundation?fields=foundation/projectArea[itemId=" + WI['rtc_cm:contextId'] + "]/(name)";
	getREST(url, CopyWI);
}
function CopyWI(projectData){
	var projectName = projectData[0].name;
    var WITypeId = getStateIdFromURL(WI['dc:type']['rdf:resource']);
	
	var newWI = new Object();
	newWI["dc:description"] = WI["dc:description"];
	newWI["dc:subject"] = WI["dc:subject"];
	newWI["dc:title"] = WI["dc:title"];
	newWI["dc:type"] = WI["dc:type"];
	newWI["oslc_cm:priority"] = WI["oslc_cm:priority"];
	newWI["oslc_cm:severity"] = WI["oslc_cm:severity"];
	newWI["rtc_cm:correctedEstimate"] = WI["rtc_cm:correctedEstimate"];
	newWI["rtc_cm:due"] = WI["rtc_cm:due"];
	newWI["rtc_cm:estimate"] = WI["rtc_cm:estimate"];
	newWI["rtc_cm:filedAgainst"] = WI["rtc_cm:filedAgainst"];
	newWI["rtc_cm:foundIn"] = WI["rtc_cm:foundIn"];
	newWI["rtc_cm:ownedBy"] = WI["rtc_cm:ownedBy"];
	newWI["rtc_cm:plannedFor"] = WI["rtc_cm:plannedFor"];
	newWI["rtc_cm:subscribers"] = WI["rtc_cm:subscribers"];

	var str = JSON.stringify(newWI);
	var URL = RTCURL() + "oslc/contexts/" + WI['rtc_cm:contextId'] + "/drafts/workitems";
    
    $.ajax({
		async:true, xhrFields: {withCredentials: true},	url: URL,
		type: 'POST',
		data: str,
		timeout:5000,
		headers:{
		'Content-Type' : 'application/json',
		'Accept':'application/json'
		},
		success: function(response, status, xhr){
			let location = xhr.getResponseHeader("location");
			let draftId = location.substr(location.indexOf('draftId='));
			let url = RTCURL() + "web/projects/" + projectName + "?" + draftId + "#action=com.ibm.team.workitem.newWorkItem&" + draftId + "&type=" + WITypeId;
			window.open(url, "_blank");
		},
		error: function(error){
			if (error.statusText=="timeout"){
				var message = "Woops! Creating new work item timed out.\nYour session has expired.\nPlease refresh the page to login again.";
			} else {
				var message = "Woops! Creating new work item failed.\n";
			}
			if (error.responseJSON!=null){
				if (error.responseJSON['oslc_cm:message']!=null){
					var errorString = error.responseJSON['oslc_cm:message'] + "\n";
					if (errorString.indexOf('CRJAZ')>-1){
						errorString = errorString.substr(errorString.indexOf(" ") + 1);
					}
					if (errorString.indexOf('(work item')>-1){
						errorString = errorString.substr(0, errorString.indexOf(' (work item')) + ".\n";
					}
					errorString = errorString.replace("'Save Work Item' failed. Preconditions have not been met: ", "");
					errorString = errorString.replace("needs to be set", "is required in this state");
					message += errorString;
				}
			}
			alert(message);
		}
    });
}

function getStateIdFromURL(stateURL){
	return stateURL.substr(stateURL.lastIndexOf("/") + 1);
}