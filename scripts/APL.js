var WIs;
var dT;
var AppAttr = "sweg.workitem.attribute.approvedDate.timestamp";
var VerAttr = "sweg.workitem.attribute.version.string";
//AppAttr = "resolved"; //FIXME This is for debugging on DEVNet

function displayReport() {
	document.getElementById('loadingDiv').style.display = "";
	var QueryId  =  "_fR674BgaEeSvgeC2JkGiAQ";
	var propString = 'dc:title,rtc_cm:state{dc:title,rtc_cm:iconUrl},rtc_cm:' + AppAttr + ',rtc_cm:' + VerAttr + ',dc:creator{dc:title}'; //Get only these properties in the response...this is a big time saver...
	runStoredQuery(QueryId, showTable, propString, true); //This is synchronous
}

function showTable(WIs) {
    var t = document.getElementById('myDataTable');
    t.innerHTML = "<thead><tr><th>Application</th><th>Version</th><th>Status</th><th>Approval</th><th>Requestor</th><tbody id='myTableBody'></tbody>";

    tBod = document.getElementById("myTableBody");
    bodTxt = '';
    var ThreeYearsAgoMS = Date.now() - 94672800000;
    var TwoYearsNineMonthsAgoMS = Date.now() - 68374713600;


    for (var WI of WIs) {
    	var approvalDateMS = Date.parse(WI[AppAttr]);
        var approvalDateString = trimTime(WI[AppAttr]);
		var state = WI.state.title;
		var stateIcon = WI.state.iconUrl;

        if (approvalDateMS<ThreeYearsAgoMS){//Expired
            state = "Expired";
            stateIcon = "images/warning.gif";
        } else if (approvalDateMS<TwoYearsNineMonthsAgoMS){//Expiring < 3 Months
            state = "Expiring";
            stateIcon = "images/time.gif";
        }

        bodTxt+="<tr style='cursor:pointer;' onclick=\"window.open('" + WI.url + "', '_blank');\">";
        bodTxt += "<td>" + WI.title + "</td><td>" + WI[VerAttr] + "</td><td><img src='" + stateIcon + "'>" + state + "</td><td>" + approvalDateString + "</td><td>" + trimName(WI.creator.title) + "</td></tr>";
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
        'lengthMenu': [[10,20,30,50,100,-1],[10,20,30,50,100,"All"]],
        dom: 'lBfrtip',
        buttons: [
			{
				extend:'csvHtml5',
				title:'309 SWEG Approved Apps'
			}
        ]
    });
    document.getElementById("myDataTable_length").style = "float:left;margin-right:20px;"
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

function trimTime(s) {
	if (typeof s == 'string'){
		if (s.indexOf("T") > 0) {
			s = s.substring(0, s.indexOf("T"));
		}
	} else {
		s = "No";
	}
	return s;
}
