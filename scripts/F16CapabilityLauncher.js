function launchTemplate(){
	var lButton = document.getElementById("lButtonText");
	var qDiv = document.getElementById("questionsDiv");
	if (lButton.innerHTML == "Launch New Capability") {
		qDiv.style.display = "block";
		lButton.innerHTML = "Create Work Items";
		resized();
	} else {

		//https://maximus:9443/ccm/rpt/repository/foundation?fields=foundation/iteration[contextId=%22_GbDyUEfMEeyvVI7qR4G3mw%22]/(reportableUrl|name)

		//https://maximus:9443/ccm/oslc/categories.json?oslc_cm.query=rtc_cm:projectArea=%22_GbDyUEfMEeyvVI7qR4G3mw%22
		//https://maximus:9443/ccm/process/project-areas/_GbDyUEfMEeyvVI7qR4G3mw/timelines
		//From there, get the iterations URL for the timeline.
		
		
		var myPlannedFor = RDF(document.getElementById("selectedPlannedForUrl").innerHTML);
		var capabilityName = document.getElementById("cTitle").value;

		if ((myPlannedFor=="")||(capabilityName=="")){
			if (myPlannedFor==""){
				if (capabilityName==""){
					alert("You must select Planned For and enter a Capability Name, which will be used in setting the Summary field of the created work items.");
				} else {
					alert("You must select Planned For.");
				}
			} else {
				alert("You must enter a Capability Name, which will be used in setting the Summary field of the created work items.");
			}
		} else {

			
			
			//Parent WI
			var WI = new Object();
			WI["dc:description"] = "This is the parent work item for capability";
			WI["dc:title"] = capabilityName + " - Father Work Item";
			WI["dc:type"] = RDF("oslc/types/_GbDyUEfMEeyvVI7qR4G3mw/com.ibm.team.apt.workItemType.epic");
			WI["rtc_cm:filedAgainst"] = RDF("resource/itemOid/com.ibm.team.workitem.Category/_I_FOQEfMEeyvVI7qR4G3mw");
			WI["rtc_cm:plannedFor"] = myPlannedFor;

			var ParentUrl = createWI(WI);

			WI = new Object();
			WI["dc:description"] = "This is the first child work item for capability";
			WI["dc:title"] = capabilityName + " - Firstborn Child";
			WI["dc:type"] = RDF("oslc/types/_GbDyUEfMEeyvVI7qR4G3mw/com.ibm.team.apt.workItemType.story");
			WI["rtc_cm:filedAgainst"] = RDF("resource/itemOid/com.ibm.team.workitem.Category/_I_FOQEfMEeyvVI7qR4G3mw");
			WI["rtc_cm:plannedFor"] = myPlannedFor;
			WI["rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.parent"] = RDF(ParentUrl);
			
			var Story1Url = createWI(WI);

			WI = new Object();
			WI["dc:description"] = "This is the second child work item for capability";
			WI["dc:title"] = capabilityName + " - Second Child";
			WI["dc:type"] = RDF("oslc/types/_GbDyUEfMEeyvVI7qR4G3mw/com.ibm.team.apt.workItemType.story");
			WI["rtc_cm:filedAgainst"] = RDF("resource/itemOid/com.ibm.team.workitem.Category/_I_FOQEfMEeyvVI7qR4G3mw");
			WI["rtc_cm:plannedFor"] = myPlannedFor;
			WI["rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.parent"] = RDF(ParentUrl);
			
			var Story2Url = createWI(WI);

			WI = new Object();
			WI["dc:description"] = "This is the first task of the first story.";
			WI["dc:title"] = capabilityName + " - Firstborn Child's First Task";
			WI["dc:type"] = RDF("oslc/types/_GbDyUEfMEeyvVI7qR4G3mw/task");
			WI["rtc_cm:filedAgainst"] = RDF("resource/itemOid/com.ibm.team.workitem.Category/_I_FOQEfMEeyvVI7qR4G3mw");
			WI["rtc_cm:plannedFor"] = myPlannedFor;
			WI["rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.parent"] = RDF(Story1Url);
			
			var Task1Url = createWI(WI);

			WI = new Object();
			WI["dc:description"] = "This is the first task of the second story.";
			WI["dc:title"] = capabilityName + " - Second Child's First Task";
			WI["dc:type"] = RDF("oslc/types/_GbDyUEfMEeyvVI7qR4G3mw/task");
			WI["rtc_cm:filedAgainst"] = RDF("resource/itemOid/com.ibm.team.workitem.Category/_I_FOQEfMEeyvVI7qR4G3mw");
			WI["rtc_cm:plannedFor"] = myPlannedFor;
			WI["rtc_cm:com.ibm.team.workitem.linktype.parentworkitem.parent"] = RDF(Story2Url);
			
			var Task1Url = createWI(WI);
			
			qDiv.style.display = "none";
			lButton.innerHTML = "Launch New Capability";

			window.open(ParentUrl, "_blank");

		}
	}
}
function createWI(WIObject){
	var projectId = "_GbDyUEfMEeyvVI7qR4G3mw";
	var str = JSON.stringify(WIObject);
	var URL = RTCURL() + "oslc/contexts/" + projectId + "/workitems/" + rightSide(WIObject["dc:type"]["rdf:resource"]);
	URL = proxyURL(URL);
    var NewWIUrl = "";
    $.ajax({
		async:false, xhrFields: {withCredentials: true},	url: URL,
		type: 'POST',
		data: str,
		timeout:5000,
		headers:{
		'Content-Type' : 'application/json',
		'Accept':'application/json'
		},
		success: function(response, status, xhr){
			let location = xhr.getResponseHeader("location");
			if (response["rdf:resource"]){
				NewWIUrl = response["rdf:resource"];
			}
		},
		error: function(error){
			if (error.statusText=="timeout"){
				var message = "Woops! Creating new work item timed out.";
			} else {
				var message = "Woops! Creating new work item failed.";
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
	return NewWIUrl;
}

function rightSide(uPath){
	return uPath.substr(uPath.lastIndexOf("/") + 1);
}

function RDF(rdfPath){
	var o = new Object;
	if (rdfPath.indexOf(RTCURL())!=-1){
		o["rdf:resource"] = rdfPath;
	} else {
		o["rdf:resource"] = RTCURL() + rdfPath;
	}
	return o;
}