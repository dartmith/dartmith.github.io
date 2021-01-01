var WIs;
var dT;

function displayReport() {
	if (prefsSet()) {
		document.getElementById('settingsDiv').style.display = 'none';
		document.getElementById('loadingDiv').style.display = "";
		var prefs = new gadgets.Prefs();
		var QueryId  =  prefs.getString("QueryId");
		var ProjectId = prefs.getString("ProjectId");
        var Title = prefs.getString("Title");
        if (Title==''){
        	Title = 'Query Results';
        }
		document.getElementById('titleString').innerHTML = Title;
		var propString = 'dc:identifier,dc:title,dc:type{dc:title,rtc_cm:iconUrl},rtc_cm:ownedBy{dc:title,rtc_cm:photo},rtc_cm:state{dc:title,dc:identifier,rtc_cm:iconUrl}'; //Get only these properties in the response...this is a big time saver...
		runStoredQuery(QueryId, showTable, propString, true); //This is synchronous
	}
}


function applySettings() {
    var Title = document.getElementById('tbTitle').value;
    var ProjDD = document.getElementById('ddprojectArea');
    var selProj = ProjDD.value;
	var PAName = ProjDD.options[ProjDD.selectedIndex].text;
	var QueryId = document.getElementById('selectedQueryId').textContent;
	if (QueryId != '') {
	    var prefs = new gadgets.Prefs();
	    prefs.set("Title", Title);
	    prefs.set("ProjectId", selProj);
	    prefs.set("ProjectName", PAName);
	    prefs.set("QueryId", QueryId);
	    displayReport();
	} else {
	    alert('Please select a query');
	}
}

function closeSettings() {
	displayReport();
}

function showTable(WIs) {
	
    var t = document.getElementById('myDataTable');

    t.innerHTML = "<thead><tr><th>Id</th><th>Summary</th><th>State</th><th>Owner</th><th>Resolved</th><tbody id='myTableBody'></tbody>";

    tBod = document.getElementById("myTableBody");
    bodTxt = '';
    for (var WI of WIs) {
        bodTxt+="<tr style='cursor:pointer;' onclick=\"window.open('" + WI.url + "', '_blank');\">";
        bodTxt += "<td>" + WI.id + "</td><td>" + WI.title + "</td><td>" + WI.state.title + "</td><td>" + trimName(WI.ownedBy.title) + "</td><td>" + "RESOLVED" + "</td></tr>";
    }

    tBod.innerHTML = bodTxt;


    initTable();

    //$("#kbTableHead").html(tHead);
    //$("#kbTableBody").html(tBody);
	document.getElementById('loadingDiv').style.display = "none";
	document.getElementById('reportContentDiv').style.display = '';
	resize();
}

function resize(){
	gadgets.window.adjustHeight();
}

function initTable() {
    dT = $("#myDataTable").DataTable({
        'lengthChange': false
    });

    dT.on('draw', function(){
		resize();
	});
}



function trimSummary(s) {
	s = s.replace(/\<br\>/g,"");
	s = s.replace(/\<br\/\>/g,"");
	s = s.replace(/\<div\>/g,"");
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
