var gModules = new Object();
var gModuleListItems = [];
var gArtifacts = new Object();
var pendingRequests = 0;

var curChangeSet = "";
const proxyUri = url => {
    if (url.indexOf(applicationURL()) != 0) {
        return applicationURL() + "proxy?uri=" + encodeURIComponent(url);
    }
    return url;
}

const setErrorMessageForWorkItemInput = msg => {
    let errorContent = document.createElement('p');
    errorContent.innerHTML = msg;

    const errorDiv = document.getElementById('workItemInputError');
    errorDiv.appendChild(errorContent);
}

function getChangeSetUrlsFromWorkItem(workItemId) {
    const url = 'https://maximus:9443/ccm/rpt/repository/workitem?fields=workitem/workItem[id=' + workItemId + ']/(id|summary|auditableLinks/*/*)';
    var WI = getREST(url)[0];
    
    var changeSets = [];

    for (cs of WI.auditableLinks){
        if (cs.name.indexOf("tracksChanges")!=-1){
           if (cs.targetRef.uri.indexOf("/rm/cm/changeset") !=-1){
               changeSets.push(cs.targetRef.uri);
           } 
        }
    }
    return changeSets;
}

function setChangedModules(modules) {

    for (var mod of modules) {
        var cr = document.createElement('div');
        cr.classList.add("moduleLineContent");
        cr.innerHTML = mod.identifier + ': ' + mod.title;
        cr.id = mod.identifier;
        cr.addEventListener("click", clickModule);
        $('#moduleListContainer').append(cr);
        gModuleListItems.push(cr);
    }
    resize();
}
function clickArtifact(e){
    var a = gArtifacts[e.currentTarget.id];

}

function clickModule(e){
    for (var m of gModuleListItems){
    	if (m.classList.length>0){
    		m.classList.remove("selected");
    	}
    }
    e.target.classList.add("selected");

    var m = gModules[e.target.id];
    var container = document.getElementById("reviewContainer");
    container.innerHTML = "";
    var firstRow = true;
    for (var a of m.artifacts){
        //Adds artifact divs to the module view to be loaded async.
        var aTag = "div";
        if (a.isHeading) {
            aTag = "h" + a.depth;
        }
        var d = document.createElement(aTag);
        d.id = "a" + a.id;
        d.innerHTML = " ";
        d.classList.add("textContent");
        if (firstRow){
        	firstRow = false;
        	d.style = "border-top: 1px solid #d0d0d0;"
        }
        
        if (a.foundIn=="TARGET"){
            d.classList.add("deleted");
        } else if (a.foundIn == "SOURCE"){
            d.classList.add("added");
        } else if (a.foundIn=="BOTH"){
        	if (a.isChanged){
                d.classList.add("changed");
        	}
        } else{
        	console.log("Support for requirement.foundIn not present for: " + a.foundIn);
        }

        container.appendChild(d);
        pendingRequests++;
        getREST(a.address, populateArtifactRow, false, true);
        if (a.isChanged){
        	pendingRequests++;
            getREST(a.address + "?vvc.configuration=" + curChangeSet, populateArtifactRow, false, true);
        }
    }
    resize();
}

function populateArtifactRow(response){
	var a = response[0];
    var fromChangeset;
    if (response.RESTurl.indexOf("vvc.configuration")!=-1){
        fromChangeset = true;
        gArtifacts["cs" + a.identifier] = a;
    } else {
    	fromChangeset = false;
        gArtifacts["a" + a.identifier] = a;
    }
    
    var artDiv = document.getElementById("a" + a.identifier);
    artDiv.innerHTML = trimOuterDiv(a.primaryText);
    artDiv.addEventListener("click", clickArtifact);
}

function trimOuterDiv(text){
	html = $(text).html();
    return html.substr(1, text.length-2);
}

const navigateToReview = (event, changeSetInfo) => {
    //do a loading indicator
    event.preventDefault();

    curChangeSet = changeSetInfo["rdf:about"];
    const url = 'https://maximus:9443/rm/publish/diff?sourceConfigUri='
        + encodeURIComponent(curChangeSet) + '&targetConfigUri=' +
        encodeURIComponent(changeSetInfo["oslc_config:overrides"]["rdf:resource"]);
    const comparisonData = getREST(url, null, false, true);
    //const schemaData = getREST('https://maximus:9443/rm/publish/comparisons?metadata=schema');

    $('#workItemContainer').hide();
    $('#reviewPane').show();

    var cArtifacts = [];
    var cIDs = [];
    var cModules = [];
    
    for (item of comparisonData){
    	if (item.itemId){
    		var prefix = item.itemId.substr(0,2);
			if (prefix=="TX"){
				cArtifacts.push(item);
				cIDs.push(item.identifier);
			} else if (prefix=="MD"){
				cModules.push(item);
			}
    	} else {
    		console.log ("Unprocessed Items Present in comparisonData");
    	}
    }
    
    setChangedModules(cModules);

    for (var m of cModules){
        var gMod = new Object();
        gMod.url = m.about;
        gMod.id = m.identifier;
        gMod.title = m.title;
        gMod.artifacts = [];
        for (var art of m.moduleContext.contextBinding){
            var gArt = new Object();
            gArt.id = art.identifier;
            gArt.foundIn = art.foundIn;
            gArt.isHeading = (art.isHeading == "true");
            gArt.section = art.section;
            gArt.depth = art.depth;
            gArt.address = art.about;
            if (cIDs.indexOf(gArt.id)> 0 ){
                gArt.isChanged = true;
            } else {
                gArt.isChanged = false;
            }
            gMod.artifacts.push(gArt);
        }
        gModules[m.identifier] = gMod;
    }
    
    
    // console.log(artifacts);
    // console.log(modules);
    // console.log(getData(url));
    // console.log(comparisonData);
    // console.log(schemaData);
}
// Creates and Adds ChangeSet Items to the DOM
const addChangeSetReviewItems = changeSetInfo => {
    const changeSetTitle = changeSetInfo['dcterms:title'];

    const changeSetLinkText = document.createTextNode(changeSetTitle);
    //when creating elements, you can pass an options parameter with the id and other attributes 
    //that will be helpful when doing styling
    const changeSetLink = document.createElement('a');
    const changeSetReviewItem = document.createElement('div');

    changeSetLink.appendChild(changeSetLinkText);
    changeSetLink.href = '';
    changeSetLink.addEventListener('click', event => navigateToReview(event, changeSetInfo));
    changeSetReviewItem.appendChild(changeSetLink);

    document.getElementById('changeSetReviewItems').appendChild(changeSetReviewItem);
};

const onSearchPressed = () => {
    // do a loading indicator 
    document.getElementById('workItemInputError').innerHTML = '';
    document.getElementById('changeSetReviewItems').innerHTML = '';

    //const workItemId = document.getElementById('workItemInput').value;
    //const changeSets = getChangeSetUrlsFromWorkItem(workItemId);
    var changeSets = getChangeSetUrlsFromWorkItem(8);

    changeSets.forEach(changeSet => {
        const changeSetInfo = getREST(changeSet)[0];
        addChangeSetReviewItems(changeSetInfo);
    });
}

function resize(){
	var headerRowHeight = document.getElementById('reviewTableDiv').offsetTop;
	var headerRow = 0;
	var maxHeight = parent.innerHeight-230-headerRowHeight;
	document.getElementById('reviewContainer').style.maxHeight = maxHeight;
	document.getElementById('headerTable').style.width = document.getElementById('tableBody').offsetWidth + "px";
	gadgets.window.adjustHeight();
}