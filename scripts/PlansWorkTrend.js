var WIs;
var timeNow;
var Icons = [];
var curPageNum;
var pageCount;
var Plan;
var ProjectId;
var Categories;
var AllTeamAreas;
var PlanReturned;
var CategoriesReturned;
var AllTeamAreasReturned;

function displayReport(){
    if (prefsSet()){
        WIs = null;
        document.getElementById('settingsDiv').style.display='none';
        document.getElementById('loadingDiv').style.display = "";
        var prefs = new gadgets.Prefs();
        var PlanId = prefs.getString("PlanId");
        ProjectId = prefs.getString("ProjectId");
        if (PlanId!=''){
            PlanReturned = false;
            CategoriesReturned = false;
            AllTeamAreasReturned = false;
            //Get the Plan information (This tells us which parent team, and which iteration to use)
            var url = applicationURL() + "rpt/repository/apt?fields=apt/iterationPlanRecord[itemId=" + PlanId + "]/(name|iteration/(startDate|endDate|itemId)|owner/itemId)";
            getREST(url, PlanReturn);
            //Get Categories for Project Area (The Team Area is selected by the plan, but all associated categories must be found)
            //url = applicationURL() + "rpt/repository/workitem?fields=workitem/category[projectArea/itemId=" + ProjectId + "]/(itemId|teamAreas/itemId)";
			
            //getREST(url, CategoriesReturn);
			url = applicationURL() + 'oslc/categories.json?oslc_cm.query=rtc_cm:projectArea="' + ProjectId + '"';
			getRESTJSON(url, CategoriesReturn, true);
            //Get All Team Areas for Project Area (This is needed so that all children teams to the plan's team may be used in the WI query)
            url = applicationURL() + "rpt/repository/foundation?fields=foundation/projectArea[itemId=" + ProjectId + "]/(allTeamAreas/(itemId|parentTeamArea/itemId))";
            getREST(url, AllTeamAreasReturn);
        }
    }
}

function PlanReturn(val){
    Plan = val[0];
    PlanReturned=true;
    if (CategoriesReturned && AllTeamAreasReturned){
        RunQuery();
    }
}

function CategoriesReturn(val){
    Categories = val["oslc_cm:results"];
    CategoriesReturned=true;
    if (PlanReturned && AllTeamAreasReturned){
        RunQuery();
    }
}

function AllTeamAreasReturn(val){
	if (val[0].allTeamAreas){
		if (val[0].allTeamAreas[0]){
			AllTeamAreas = val[0].allTeamAreas;
		} else {
			AllTeamAreas = [];
			AllTeamAreas.push(val[0].allTeamAreas);
		}
	} else {
		var newTA = new Object();
		newTA.itemId = ProjectId;
		AllTeamAreas = [];
		AllTeamAreas.push(newTA);
	}
    AllTeamAreasReturned=true;
    if (CategoriesReturned && PlanReturned){
        RunQuery();
    }
}

function RunQuery(){
    var cats = [];
    var teamIds = [];
    var targetId;
    document.getElementById('curPlanName').innerHTML = Plan.name;
    targetId = Plan.iteration.itemId;
    teamIds.push(Plan.owner.itemId);
    for (let step = 0; step < 5; step++){//Look for child team areas, and include up to three levels deep.
        for (var curTeam of AllTeamAreas){
            if (!(teamIds.includes(curTeam.itemId))){
                if (curTeam.parentTeamArea!=null){
                    if (teamIds.includes(curTeam.parentTeamArea.itemId)){
                        teamIds.push(curTeam.itemId);
                    }
                }
            }
        }
    }
    for (var cat of Categories){
		var catId = cat["rdf:resource"];
		catId = catId.substr(catId.lastIndexOf("/") + 1);
		var catTeam = ProjectId;
        if (cat["rtc_cm:defaultTeamArea"] != null){
			catTeam = cat["rtc_cm:defaultTeamArea"]["rdf:resource"];
			catTeam = catTeam.substr(catTeam.lastIndexOf("/") + 1);
		}
		
		if (teamIds.includes(catTeam)){
			cats.push(catId);
		}
    }
    var Filter = "target/itemId=" + targetId;
    if (cats.length>0){ //If no categorires were found, assume the project owns the plan.
        Categories = cats;
        Filter+= " and (";
        var addOr = "";
        for (var cat of cats){
            Filter += addOr + "category/itemId=" + cat;
            addOr = " or ";
        }
        Filter +=")";
    } else {
        for (var cat of Categories){
			var catId = cat["rdf:resource"];
			catId = catId.substr(catId.lastIndexOf("/") + 1);
			cats.push(catId);
		}
        Categories = cats;
    }
    var url = applicationURL() + "rpt/repository/workitem?fields=workitem/workItem[" + Filter + "]/(id|itemHistory/(modified|target/itemId|category/itemId|state/group))";
    getREST(url, WorkItemsReturn);
}

function applySettings(){
    var ProjDD = document.getElementById('ddprojectArea');
    var selProj = ProjDD.value;
    var PAName = ProjDD.options[ProjDD.selectedIndex].text;
    var PlanId = document.getElementById('ddPlan').value;
    if (PlanId!=''){
        var prefs = new gadgets.Prefs();
        prefs.set("ProjectId", selProj);
        prefs.set("ProjectName", PAName);
        prefs.set("PlanId", PlanId);
        displayReport();
    } else {
        alert('Please select a query');
    }
}

function closeSettings(){
    displayReport();
}

function WorkItemsReturn(workItems){
    WIs = workItems;
    if (WIs.length > 0){
        timeNow = Date.now();
        document.getElementById('nullMessage').style.display = "none";
        showReport();
    } else {
        document.getElementById('loadingDiv').style.display = "none";
        document.getElementById('reportContentDiv').style.display = "";
        document.getElementById('nullMessage').style.display = "";
        resized();
    }
}

function ParseHistory(curWI){
    var dateOpened;
    var dateWorking;
    var dateClosed;
    if (curWI.itemHistory.modified!=undefined){
        var curTarget = curWI.itemHistory.target.itemId;
        var inPlanSince = curWI.itemHistory.modified;
    } else {
        var timestamps = [];
        for (var entry of curWI.itemHistory){
            timestamps.push(Date.parse(entry.modified));
        }
        timestamps.sort(NumberLargToSmall);
        var tsNum = 0;
        var curEntry;
        var lastState = '';
        var unfinalizedClosedDate = true;//Used to determine the LAST time a work item was closed. Consider as working until then.
        for (var ts of timestamps){
            tsNum++;
            for (var entry of curWI.itemHistory){
                if (Date.parse(entry.modified)==ts) {
                    curEntry = entry;
                }
            }
            if (tsNum==1){
                var curTarget = curEntry.target.itemId;
            }
            if (curEntry.state.group=='open'){
                dateOpened = ts;
            } else if (curEntry.state.group=='inprogress'){
                dateWorking = ts;
            } else if (curEntry.state.group=='closed'){
                if (unfinalizedClosedDate){
                    if ((lastState=='')||(lastState=='closed')){
                        dateClosed = ts;
                        lastState = curEntry.state.group;
                        closedTSNum = tsNum;
                    }
                }
            }
            if ((lastState=='closed')&&(closedTSNum!=tsNum)){
                unfinalizedClosedDate = false;
            }
            if ((curEntry.target.itemId==curTarget) && (Categories.includes(curEntry.category.itemId))){
                var inPlanSince = curEntry.modified;
            }
        }
    }
    var WIModDate = Date.parse(inPlanSince);
    if (dateOpened==null){
        dateOpened = WIModDate;
    }
    dateOpened = Math. max(dateOpened, WIModDate);
    if (dateWorking==null){
        dateWorking = 9999999999999;
    } else {
        dateWorking = Math.max(dateWorking, WIModDate);
    }
    if (dateClosed==null){
        dateClosed = 9999999999999;
    } else {
        if (dateWorking==9999999999999){
            dateWorking = dateOpened;
        }
        dateClosed = Math.max(dateClosed, WIModDate);
    }
    //No date is allowed to be before the time the work item entered the plan.
    curWI.dateOpened = dateOpened;
    curWI.dateWorking = dateWorking;
    curWI.dateClosed = dateClosed;
}

function showReport(){
    var chartStart = Date.parse(Plan.iteration.startDate);
    var chartEnd = Date.parse(Plan.iteration.endDate);
    var getMinDate = false;
    if (isNaN(chartStart)){
        chartStart = timeNow;
        getMinDate = true;
    }
    if (isNaN(chartEnd)){
        chartEnd = timeNow;
    }
    for (var WI of WIs){
        ParseHistory(WI);
        if (getMinDate){
            if (WI.dateOpened < chartStart){
                chartStart = WI.dateOpened;
            }
        }
    }
    var granularity = 13;
    var maxHeight = 0;
    step = (chartEnd-chartStart)/granularity;
    //These arrays are being used to build a polygon.
    //The top of the polygon will be drawn left to right, using the LTR arrays.
    //The bottom (return path) of the pologon will be drawn right to left, using the RTL arrays.
    var openLTR=[];
    var workingLTR=[];
    var closedLTR=[];
    var openRTL=[];
    var workingRTL=[];
    var closedRTL=[];
    //These will track the counts at each of timestamps being plotted.
    var openCount;
    var workingCount;
    var closedCount;
    var endReached = false;
    for (let ts = chartStart; ts <= chartEnd; ts+=step){
        openCount = 0;
        workingCount = 0;
        closedCount = 0;
        for (var WI of WIs){
            if (WI.dateClosed <= ts){
                closedCount++;
            } else if (WI.dateWorking <= ts){
                workingCount++;
            } else if (WI.dateOpened <= ts){
                openCount++;
            }
        }
        openLTR.push(closedCount+workingCount+openCount);
        workingLTR.push(closedCount+workingCount);
        closedLTR.push(closedCount);
        //The bottom of the polygon:
        openRTL.push(closedCount+workingCount);
        workingRTL.push(closedCount);
        closedRTL.push(0);
        if ((openCount+workingCount+closedCount)>maxHeight){
            maxHeight = openCount+workingCount+closedCount;
        }
    }
    if (chartEnd==timeNow){
        maxXPos = 1000;
    } else {
        maxXPos = 1000*((timeNow-chartStart)/(chartEnd-chartStart));
    }
    if (timeNow < chartEnd){
        document.getElementById('todayLine').setAttribute("x1", maxXPos);
        document.getElementById('todayLine').setAttribute("x2", maxXPos);
    } else {
        document.getElementById('todayLine').setAttribute("xl", "-100");
        document.getElementById('todayLine').setAttribute("x2", "-100");
    }
    //Now, generate the actual points that will be put into the SVG points attribute.
    SetupAxisLabels(chartStart, chartEnd);
    document.getElementById("openItems").setAttribute("points", genPoints(openLTR, openRTL, maxHeight, maxXPos));
    document.getElementById("workingItems").setAttribute("points", genPoints(workingLTR, workingRTL, maxHeight, maxXPos));
    document.getElementById("closedItems").setAttribute("points", genPoints(closedLTR, closedRTL, maxHeight, maxXPos));
    document.getElementById('loadingDiv').style.display = "none";
    document.getElementById('reportContentDiv').style.display = "";
    resized();
}

function genPoints(LTRpoints, RTLpoints, maxHeight, maxXPos){
    var val = "";
    var maxX = LTRpoints.length-1;
    var curX = 0;
    var afterToday = false;
    for (var point of LTRpoints){
        if (!afterToday){
            if (curX>maxXPos) {
                afterToday = true;
                val+= maxXPos + "," + Math.round(500*(maxHeight-point)/maxHeight) + " ";
            } else {
                val+= curX + "," + Math.round(500*(maxHeight-point)/maxHeight) + " ";
            }
        }
        curX += 1000/maxX;
    }
    for (let step=maxX; step > -1; step--){
        curX -= 1000/maxX;
        var point = RTLpoints[step];
        if (curX>maxXPos){
            if (afterToday){
            afterToday = false;
            val+= " " + maxXPos + "," + Math.round(500*(maxHeight-point)/maxHeight) + " ";
            }
        } else {
            val+= " " + curX + "," + Math.round(500*(maxHeight-point)/maxHeight) + " ";
        }
    }
    return val;
}

function SetupAxisLabels(chartStart, chartEnd){
    var diff = chartEnd - chartStart;
    var step = diff/4;
    document.getElementById('x1').innerHTML = dispTimeLabel(timeNow - chartStart);
    document.getElementById('x2').innerHTML = dispTimeLabel(timeNow - (chartStart + step));
    document.getElementById('x3').innerHTML = dispTimeLabel(timeNow - (chartStart + 2*step));
    document.getElementById('x4').innerHTML = dispTimeLabel(timeNow - (chartStart + 3*step));
    document.getElementById('x5').innerHTML = dispTimeLabel(timeNow - chartEnd);
    document.getElementById('xStartDate').innerHTML = prettyDate(chartStart);
    document.getElementById('xEndDate').innerHTML = prettyDate(chartEnd);
}

function prettyDate(unixDate){
    var t = new Date(unixDate).toDateString();
    t = t.substring(4);
    t = t.substring(4, 6) + " " + t.substring(0, 3) + t.substring(6);
    if (t.substring(0,1)=="0"){
        t = t.substring(1);
    }
    return t;
}

function dispTimeLabel(time){
    if (time==0){
        return "Now";
    } else {
        if (time>0){
            var neg = "-";
        } else {
            var neg = "+";
        }
        time /=3600000;
        time = Math.abs(time);
        if (time > 5000){
            return neg + Math.round(time/720) + "&nbspMos";
        } else if (time > 168){
            return neg + Math.round(time/168) + "&nbspWks";
        } else if (time > 48){
            return neg + Math.round(time/24) + "&nbspDys";
        } else if ((time<=72) && (time>1)){
            return neg + Math.round(time) + "&nbspHrs";
        } else{
            return neg + "<1&nbspHour";
        }
    }
}

function NumberLargToSmall(a, b){
   return b-a;
}

function NumberSmallToLarge(a, b){
   return a-b;
}