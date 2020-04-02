var WIsRet;
var TMsRet;
var WIs;
var TMs;
var Users;

function displayReport() {
	WIsRet = false;
	TMsRet = false;
	if (prefsSet()) {
		document.getElementById('settingsDiv').style.display = 'none';
		document.getElementById('loadingDiv').style.display = "";
		var prefs = new gadgets.Prefs();
		var teamId = prefs.getString("TeamId");
		var  QueryId  =  prefs.getString("QueryId");
		if (QueryId != '') {
			var propString = 'dc:identifier,dc:title,dc:type{dc:title},rtc_cm:ownedBy{dc:title,rtc_cm:userId}'; //Get only these properties in the response...this is a big time saver...
			runStoredQuery(QueryId, WIReturn, propString, true); //This is synchronous
		}
		if (teamId == 'All') {
			TMsRet = true;
			var contributorsURL = applicationURL() + "rpt/repository/foundation?fields=foundation/contributor/(userId|itemId)&size=10000";
			getREST(contributorsURL, ContributorsReturn);
			showReport();
		} else {
			var teamAreaURL = applicationURL() +
				"rpt/repository/foundation?fields=teamArea/teamArea[itemId='" + teamId + "']/(teamMembers/(userId|name|itemId))";
			getREST(teamAreaURL, TMReturn);
		}
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
	WIsRet = true;
	if (TMsRet) {
		showReport();
	}
}

function TMReturn(teamMembers) {
	TMs = teamMembers;
	TMsRet = true;
	if (WIsRet) {
	    showReport();
	}
	Users = new Object();
	TMs[0].teamMembers.forEach(function(member){
	    Users[member.userId] = member.itemId;
	});
}

function ContributorsReturn(contributors) {
	Users = new Object();
	contributors.forEach(function(member) {
		Users[member.userId] = member.itemId;
	});
}

function showReport() {
	var counts = new Object();
	var prefs = new gadgets.Prefs();
	var QueryId = prefs.getString("QueryId");
	var teamId = prefs.getString("TeamId");
	var allNames = new Map();
	var WITypes = [];
	var showUnassigned = false;

	for (var wi of WIs){
		var wiNumAndSum = wi.id + " - " + trimSummary(wi.title);
		var ownerName = wi.ownedBy.title;
		var wiType = wi.type.title;
		if (!WITypes.includes(wiType)) {
			WITypes.push(wiType);
		}
		if (ownerName == 'Unassigned') {
			var ownerId = 'Unassigned';
		} else {
			var ownerId = wi.ownedBy.userId;
		}
		if (!allNames.has(ownerId)) {
			allNames.set(ownerId, ownerName);
		}
		if (counts[ownerName] != null) {
			counts[ownerName].total++;
			if (counts[ownerName][wiType] == null) {
				counts[ownerName][wiType] = new Object();
				counts[ownerName][wiType].count = 1;
				counts[ownerName][wiType].WIs = [];
				counts[ownerName][wiType].WIs.push(wiNumAndSum);
			} else {
				counts[ownerName][wiType].count++;
				counts[ownerName][wiType].WIs.push(wiNumAndSum);
			}
		} else {
			counts[ownerName] = new Object();
			counts[ownerName].total = 1;
			counts[ownerName][wiType] = new Object();
			counts[ownerName][wiType].count = 1;
			counts[ownerName][wiType].WIs = [];
			counts[ownerName][wiType].WIs.push(wiNumAndSum);
		}
	}
	WITypes.sort();
	if (teamId != 'All') {
		var allNames = new Map();
		TMs[0].teamMembers.forEach(function (member) {
		    allNames.set(member.userId, member.name);
		});
	}
	var maxCount = 0;
	var row = new Object();
	var curValue = 0;
	var names = [];
	var ownerIds = new Object();
	allNames.forEach(function (ownerName, ownerId) {
	    if (ownerName == 'Unassigned') {
	        showUnassigned = true;
	    } else {
	        names.push(ownerName);
	    }
		ownerIds[ownerName] = ownerId;
		row[ownerName] = new Object();
		if (counts[ownerName] == null) {
		    curValue = 0;
		} else {
		    curValue = counts[ownerName].total;
		}
		if (ownerName != 'Unassigned') {
			maxCount = Math.max(curValue, maxCount);
		}
		row[ownerName] = counts[ownerName];
	});
    //Make Color Assignments
	var colors = new Object();
	var colorOption = ["#566fae", "#8f88ba", "#9aeaf2", "#d1f1f1", "#88ba8f", "#e76e6b", "#ffc539", "#7bdd61"];
	var iterator = -1;
	var legendRows = '';
	WITypes.forEach(function (wiType) {
		iterator++;
		colors[wiType] = colorOption[iterator % colorOption.length];
		legendRows += "<tr><td style='margin:2px;width:15px; height:15px; background-color:" + colors[wiType] + "'></td><td>" + wiType + "</td></tr>";
	});

	names.sort();
	if (showUnassigned) {
		names.unshift("Unassigned");
	}
	var t = '';
	var curVal = 0;
	var addS = "";
	for (var key in names) {
	    var ownerName = names[key];
		var ownerId = ownerIds[names[key]]; + trimName(ownerName) + "</td><td>";
		t += "<tr><td style='width:75px;text-align:center'>" + trimName(ownerName) + "</td><td>";
		if (row[ownerName] != null) {
			if (ownerName == 'Unassigned') {
				t += "<table style='font-size:9pt;'>";
				WITypes.forEach(function (wiType) {
					if (row[ownerName][wiType] != null) {
						count = row[ownerName][wiType].count;
						t += "<tr><td style='margin:2px;width:15px; height:15px; background-color:" + colors[wiType] + "'></td><td>" + wiType + ": " + count + "</td></tr>";
					}
				});
				t += "</table>";
			} else {
				WITypes.forEach(function (wiType) {
					if (row[ownerName][wiType] != null) {
						curCount = row[ownerName][wiType].count;
						if (curCount > 1) {
							addS = 's';
						} else {
						    addS = '';
						}
						strWI = ownerName + "\n" + curCount + " " + wiType + addS + ":\n" + row[ownerName][wiType].WIs.join("\n");
                        strWI = escapeSingleQuotes(strWI);
                        var strTT = "onclick=\"openQuery('" + ownerId + "');\" title='" + strWI + "'";
						t += "<div " + strTT + " style='cursor:pointer;float:left;background-color:" + colors[wiType] + ";width:" + (100 * curCount / maxCount) + "%;'>&nbsp</div>";
					}
				});
			}
		} else {
		    strWI = ownerName + "\nNo  Work  Assigned";
		    var strTT= "title='" + strWI + "'";
		    t += "<div " + strTT + " style='float:left;background-color:rgb(230,230,230);width:100%;'>&nbsp</div>";
	    }
	    t += "</td></tr>";
    }
	$("#reportTableBody").html(t);
	document.getElementById('loadingDiv').style.display = "none";
	document.getElementById('reportContentDiv').style.display = '';
	gadgets.window.adjustHeight();
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

function percentCell(value, maxValue, ownerId) {
	return "<td style='width:40%;border-style:none;padding:0px;'><div class='w3-border' style='position:relative;width:100%;line-height:22px;background-color:rgb(245,245,245);'><br><div class='w3-text-black' style='text-align:center;position:absolute;top:0px;line-height:22px;z-index:100;cursor:pointer;width:100%;' onclick=\"openQuery('" + ownerId + "');\">" + value + "</div><div   style='position:absolute;top:0px;line-height:22px;width:" + 100 * value / maxValue + "%;background-color:#566fae;'><br></div></div></td>";
}

function openQuery(ownerId) {
	var prefs = new gadgets.Prefs();
	var QueryId = prefs.getString("QueryId");
	var projectName = prefs.getString("ProjectName");
	var userItemId = "";
	if (ownerId == 'Unassigned') {
		userItemId = '_YNh4MOlsEdq4xpiOKg5hvA';
	} else {
		userItemId = Users[ownerId];
	}
	if (userItemId == null) { //This happens if the Users list does not contain the selected owner (yet...).
		var contributorURL = applicationURL() + "rpt/repository/foundation?fields=foundation/contributor[userId=" + ownerId + "]/(itemId)";
		getREST(contributorURL, hurryUpCallback);
	} else {
		window.open(applicationURL() + "web/projects/" + encodeURIComponent(projectName) +
			"#action=com.ibm.team.workitem.runSavedQuery&id=" + QueryId + "&filterAttribute=owner&filterValue=" + userItemId + "&jsonParameterValues=%7B%22target71%22%3A%7B%22attributeId%22%3A%22target%22%2C%22operator%22%3A%22is%20part%20of%22%2C%22values%22%3A%5B%5D%2C%22variables%22%3A%5B%5D%7D%7D&filterByExactMatch=true", '_blank');
	}
}

function hurryUpCallback(user) {
	var prefs = new gadgets.Prefs();
	var QueryId = prefs.getString("QueryId");
	var projectName = prefs.getString("ProjectName");

	var userItemId = user[0].itemId;
	window.open(applicationURL() + "web/projects/" + encodeURIComponent(projectName) + "#action=com.ibm.team.workitem.runSavedQuery&id=" + QueryId + "&filterAttribute=owner&filterValue=" + userItemId + "&jsonParameterValues=%7B%22target71%22%3A%7B%22attributeId%22%3A%22target%22%2C%22operator%22%3A%22is%20part%20of%22%2C%22values%22%3A%5B%5D%2C%22variables%22%3A%5B%5D%7D%7D&filterByExactMatch=true", '_blank');
}