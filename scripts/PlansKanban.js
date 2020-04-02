var WIs;
var Icons = [];
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
            url = applicationURL() + "rpt/repository/workitem?fields=workitem/category[projectArea/itemId=" + ProjectId + "]/(itemId|teamAreas/itemId)";
            getREST(url, CategoriesReturn);
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
    Categories = val;
    CategoriesReturned=true;
    if (PlanReturned && AllTeamAreasReturned){
        RunQuery();
    }
}

function AllTeamAreasReturn(val){
    AllTeamAreas = val[0].allTeamAreas;
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
        if (cat.teamAreas != null){
            if (typeof cat.teamAreas[Symbol.iterator]==='function'){
                for (var teamArea of cat.teamAreas) {
                    if (teamIds.includes(teamArea.itemId)){
                        cats.push(cat.itemId);
                    }
                }
            } else {
                if (teamIds.includes(cat.teamAreas.itemId)){
                    cats.push(cat.itemId);
                }
            }
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
            cats.push(cat.itemId);
        }
        Categories = cats;
    }
    var url = applicationURL() + "rpt/repository/workitem?fields=workitem/workItem[" + Filter + "]/(id|type/id|summary|state/(name|id)|owner/name)";
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
        getTypes();
    } else {
        document.getElementById('loadingDiv').style.display = "none";
        document.getElementById('reportContentDiv').style.display = "";
        document.getElementById('nullMessage').style.display = "";
        resized();
    }
}

function getTypes(){
    var Types = [];
    for (var WI of WIs){
        if (!Types.includes(WI.type.id)){
            Types.push(WI.type.id);
        }
    }
    

    document.getElementById('loadingDiv').style.display = "none";
    document.getElementById('reportContentDiv').style.display = "";
    resized();
}
