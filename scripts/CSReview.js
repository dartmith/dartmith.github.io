var gModules = new Object();
var gModuleListItems = [];
var curSelection = new Object();
curSelection.ModuleId = "";
curSelection.ArtifactId = "";
var gChangedArtIDs;
var gChangedModules;
var gArtifacts = new Object();
var gAttributeNames = new Object();
var gRMEnumNames = new Object();
var gArtifactTypeNames = new Object();
var gOrderedArtifacts = [];
var gCurrentArtIndex = -1;
var gArtifactsRequested = false;
var pendingRequests = 0;
var gCancelInitialNext = false;
var curChangeSet = "";
var curChangeSetName = "";
var gLatestChange = "";
var gMyUserId = "";
var gShowNewChangesOnly = false;
var gWIId = ""; //This is used to track approvals. When approving, a comment is added to a work item stating that you approve changes up until this date.

var gReviewerInfo = new Object();

function startNewReview(){
    toggleMenu();
    gModules = new Object();
    gModuleListItems = [];
    curSelection = new Object();
    curSelection.ModuleId = "";
    curSelection.ArtifactId = "";
    gChangedArtIDs = null;
    gChangedModules = null;
    gArtifacts = new Object();
    gAttributeNames = new Object();
    gRMEnumNames = new Object();
    gOrderedArtifacts = [];
    gCurrentArtIndex = -1;
    gArtifactsRequested = false;
    pendingRequests = 0;
    gCancelInitialNext = false;
    curChangeSet = "";
    curChangeSetName = "";
    gLatestChange = "";
    gShowNewChangesOnly = false;
    gReviewerInfo = new Object();

    
    $('#reviewPane').hide();
    $('#workItemContainer').show();
    resize();
}

function toggleMenu(){
    document.getElementById("reviewMenu").classList.toggle("hidden");
    document.getElementById("reviewMenu").classList.toggle("visible");
}
const proxyUri = url=>{
    if (url.indexOf(applicationURL()) != 0) {
        return applicationURL() + "proxy?uri=" + encodeURIComponent(url);
    }
    return url;
}

function showWIError() {
    document.getElementById('workItemInputError').classList.add("visible");
    document.getElementById('workItemInputError').classList.remove("hidden");
}
function hideWIError(){
    document.getElementById('workItemInputError').classList.add("hidden");
    document.getElementById('workItemInputError').classList.remove("visible");
}

function setChangedModules(modules) {
    document.getElementById("moduleList").innerHTML = "";
    for (var mod of modules) {
        var cr = document.createElement('div');
        cr.classList.add("moduleLineContent");
        cr.innerHTML = mod.identifier + ': ' + mod.title;
        cr.id = mod.identifier;
        cr.addEventListener("click", clickModule);
        $('#moduleList').append(cr);
        gModuleListItems.push(cr);
    }
    resize();
}

function clickArtifact(e) {
    var modId = "";
    var artText;
    var artRow;
    if (e.ArtifactId){
        artText = document.getElementById("m" + e.ModuleId + "a" + e.ArtifactId);
        if (artText.localName=="span"){
            artRow = artText.parentElement;
        } else {
            artRow = artText;
        }
        if (e.ModuleId!=""){
            modId = e.ModuleId;
        }
    } else {
        artText = e.currentTarget;
        artRow = e.currentTarget;
    }
    if (modId == ""){
        modId = curSelection.ModuleId;
    }
    if (artText.id == "") {
        //When we created the heading rows, we created a div with a child span for the section # and another span for the content.
        for (var child of artText.children) {
            if (child.id) {
                artText = child;
            }
        }
    }
    if (curSelection.ArtifactId!=""){
        var lastArtifact = document.getElementById(curSelection.ArtifactId);
        if (lastArtifact.localName=="span"){
            lastArtifact = lastArtifact.parentElement;
        }
        if (lastArtifact) {
            lastArtifact.classList.remove("selectedArtifact");
        }
    }
    
    curSelection.ArtifactId = artText.id;
    
    artRow.classList.add("selectedArtifact");
    var a = gArtifacts[artText.id][0];
    var eClassList = artRow.classList;
    var id = a.identifier;
    var numChangedDone = 0;
    var totChanged = 0;
    for (i=0;i<gOrderedArtifacts.length;i++){
        if (gOrderedArtifacts[i].isChangedOrMoved){
           totChanged++ 
        }
        if (gOrderedArtifacts[i].ModuleId==modId){
            if (gOrderedArtifacts[i].ArtifactId==id){
                gCurrentArtIndex = i;
                numChangedDone = totChanged;
            }
        }
    }

    
    var v = document.getElementById("artifactPane");
    v.innerHTML = "<div class='tinyHeader'>" + numChangedDone + " of " + totChanged + "</div>";

    document.getElementById("artifactPaneTitle").innerHTML = "Artifact " + a.identifier;

    //The row's class list might have: added, deleted, changed, or none of these meaning is it unchanged.
    var textChangeInfo = "";
    var attrChangeInfo = "";
    var changeSummary = "";
    var newArtifact = false;
    var artId = curSelection.ArtifactId;
    var showComments = true;
    artId = artId.substr(artId.indexOf("a") + 1);
    if (eClassList.contains("changed")) {
    	var modArt;
		for (var cArt of gModules[modId].artifacts){
			if (cArt.id == artId){
				modArt = cArt;
			}
		}
        
    	if (modArt.isChanged){
			var streamText = a.primaryText;
			var changedArt = gArtifacts["m" + curSelection.ModuleId + "cs" + id][0];
			var csText = changedArt.primaryText;
			if (csText != streamText) {
				changeSummary += "Primary text";
				textChangeInfo = "Text in stream:" + newTextArea(streamText) + "Text in change set:" + newTextArea(csText);
			}
			if (changedArt.artifactAttributes) {
				for (var cAtt of changedArt.artifactAttributes) {
					var newVal = cAtt.value;
					var oldVal = "";
					if (a.artifactAttributes) {
						for (var aAtt of a.artifactAttributes) {
							if (aAtt.name == cAtt.name) {
								oldVal = aAtt.value;
							}
						}
					}
					if (newVal != oldVal) {
						attrChangeInfo += "<div>" + cAtt.name + ": <ins>" + cAtt.value + "</ins><del>" + oldVal + "</del></div>";
					}
				}
				if (attrChangeInfo == "") {
					attrChangeInfo = "None";
				} else {
					if (changeSummary == "") {
						changeSummary = "Attributes ";
					} else {
						changeSummary += " and attributes ";
					}
				}
			}
			if (changeSummary==""){
                changeSummary += "No differences found. This can happen if the author undoes a change, or another change set with the same changes are delivered to the stream. Only the 'Modified Date' will be changed.";
			} else {
				changeSummary += " changed.";
			}
			
			
    	}

    	if (modArt.isMoved){
    		if (modArt.movedClumpLength > 1){
    			if (modArt.movedClumpLength==2){
                    changeSummary += "This and the next artifact were ";
    			} else {
    				changeSummary += "This and the next " + (modArt.movedClumpLength - 1) + " artifacts were ";
    			}
    			
    		} else {
    			changeSummary += "This artifact was ";
    		}
    		if (changeSummary!=""){
                changeSummary += " ";
    		}
    		changeSummary += " moved ";
    		if (modArt.movedBy > 0){
                changeSummary += "up by " + modArt.movedBy;
    		} else {
    			changeSummary += "down by " + -1 * modArt.movedBy;
    		}
    		if (modArt.movedClumpHasNewOrDeleted){
				changeSummary += " (ignores added and removed artifacts)."
			} else {
				changeSummary += "."
			}
		}
    } else if (eClassList.contains("added")) {
        newArtifact = true;
        if (gArtifacts["m" + modId + "cs" + id]) {
            changeSummary = "Artifact created and added.";
            textChangeInfo = newTextArea(gArtifacts["m" + modId + "cs" + id][0].primaryText);
        } else {
            changeSummary = "Existing artifact added.";
            textChangeInfo = newTextArea(gArtifacts["m" + modId + "a" + id][0].primaryText);
        }
    } else if (eClassList.contains("deleted")) {
        changeSummary = "Artifact removed.";
    } else {
    	showComments = false;
        changeSummary = "No changes to this artifact.";
    }
    

    var nDiv = document.createElement("div");
    nDiv.innerHTML = changeSummary
    nDiv.classList.add("informationBar");
    v.appendChild(nDiv);

    if (textChangeInfo != "") {
        v.appendChild(newPanel("Primary Text", textChangeInfo));
    }
    if (attrChangeInfo != "") {
        v.appendChild(newPanel("Changed Attributes", attrChangeInfo));
    }
    var sAttrs = "";

    if (a.artifactAttributes) {
        for (var att of a.artifactAttributes) {
            sAttrs += att.name + ": " + att.value + "<br>";
        }
    } else {
        sAttrs += "None";
    }
    if (newArtifact) {
        v.appendChild(newPanel("Attributes", sAttrs));
    } else {
        v.appendChild(newPanel("Attributes in Stream", sAttrs));
    }
    if (showComments){
    	var d = document.createElement("div");
    	var loadingSpinner = "<svg width='38' viewBox='0 0 42 42'><defs><linearGradient x1='8.042%' y1='0%' y2='100%' id='a'><stop stop-color='#000' stop-opacity='0' offset='0%'/><stop stop-color='#000' stop-opacity='.231' offset='63.146%'/><stop stop-color='#000' offset='100%'/></linearGradient></defs><g fill='none' fill-rule='evenodd'><g><path d='M36 20c0-9.94-8.06-20-20-20' stroke='url(#a)' stroke-width='3'><animateTransform attributeName='transform' type='rotate' from='0 20 20' to='360 20 20' dur='0.4s' repeatCount='indefinite'/></path></g></g></svg>";
    	d.innerHTML = "<div style='font-size:11pt;font-weight:bold;user-select:none;'>Discussion</div><div id='comments-m" + modId + "a" + artId + "'>" + loadingSpinner + "</div>"
    	v.appendChild(d);
    	loadCommentsForArtifact(modId, artId);
    }
}

function newTextArea(html) {
    return "<div class=\"textBox\">" + html + "</div>"
}
function newPanel(title, html) {
    var d = document.createElement("div");
    d.innerHTML = "<div class=\"panel\"><div class=\"panelTitle\">" + title + "</div><div class=\"panelContent\">" + html + "</div></div>";
    return d;
}
function showLoader(){
    var lDiv = document.getElementById("loadingInfo");
    if (lDiv.classList.contains("hidden")) {
        lDiv.classList.remove("hidden");
    }
    if (!(lDiv.classList.contains("visible"))) {
        lDiv.classList.add("visible");
    }
}

loadCommentsForArtifact(modId, artId){
	
}
function hideLoader(){
    var lDiv = document.getElementById("loadingInfo");
    if (!(lDiv.classList.contains("hidden"))) {
        lDiv.classList.add("hidden");
    }
    if (lDiv.classList.contains("visible")) {
        lDiv.classList.remove("visible");
    }
}


function startLoading(moduleId, text) {
    var lDiv = document.getElementById("loadingInfo" + moduleId);
    document.getElementById("loadingInfo" + moduleId + "Text").innerHTML = text;
    if (lDiv.classList.contains("hidden")) {
        lDiv.classList.remove("hidden");
    }
    if (!(lDiv.classList.contains("visible"))) {
        lDiv.classList.add("visible");
    }
}

function loadingText(moduleId, text) {
    document.getElementById("loadingInfo" + moduleId + "Text").innerHTML = text;
}

function endLoading(moduleId) {
    var lDiv = document.getElementById("loadingInfo" + moduleId);
    if (!(lDiv.classList.contains("hidden"))) {
        lDiv.classList.add("hidden");
    }
    if (lDiv.classList.contains("visible")) {
        lDiv.classList.remove("visible");
    }
}

function loadArtifactsInBackground() {
    var moduleIds = Object.keys(gModules);
    for (var mId of moduleIds) {
        loadModuleInfo(mId);
    }
}

function setupAttributes(response) {
    if (!(response.attributesSetup)) {
        var aType = gArtifactTypeNames[response[0].instanceShape.resource];
        var aLastModified = response[0].modified;
        response.attributesSetup = true;
        var newAttrs = [];
        var newAtt = new Object();
        newAtt.name = "Type";
        newAtt.value = aType;
        newAttrs.push(newAtt);

        if (response[0].artifactAttributes) {
            for (var index = 0; index < response[0].artifactAttributes.length; index++) {
                var att = response[0].artifactAttributes[index];
                newAtt = new Object();
                newAtt.name = gAttributeNames[att.attributeId];
                if (newAtt.name == undefined) {
                    newAtt.name = "<<Unsupported, contact Dave!>>";
                }

                //response[0].artifactAttributes[index].name = gAttributeNames[att.attributeId];
                //if (response[0].artifactAttributes[index].name == undefined) {
                //    response[0].artifactAttributes[index].name = "<<Unsupported!!>>";
                //}

                var testVal = "";
                if (att.text) {
                    testVal = att.text;
                } else {
                    testVal = gRMEnumNames[att.resource];
                    if (!testVal) {
                        testVal = "Attribute not supported, contact Dave!";
                    }
                }
                var attMultiPickEnum = false;
                for (i = 0; i <newAttrs.length;i++){
                    if (newAttrs[i].name == newAtt.name){
                        newAttrs[i].value = newAttrs[i].value + ", " + testVal;
                        attMultiPickEnum = true;
                        break;
                    }
                }
                if (!attMultiPickEnum){
                    newAtt.value = testVal;
                    newAttrs.push(newAtt);
                }

            }
            
        }

        response[0].artifactAttributes = newAttrs;
    }
    return response;
}

function populateArtifactRow(response) {
    response = setupAttributes(response);
    var modId = response.passedData;
    var a = response[0];
    var artRow = document.getElementById("m" + modId + "a" + a.identifier);
    var artText = document.getElementById("m" + modId + "a" + a.identifier);
    var fromChangeset;
    if (gChangedArtIDs.indexOf(a.identifier)!=0){//Track Latest Modified date for clearing review approvals
        var aLastModified = a.modified;
        if (aLastModified> gLatestChange){
            gLatestChange = aLastModified;
        }
        var userIds = Object.keys(gReviewerInfo);
        for (var userId of userIds){
        	if (aLastModified > gReviewerInfo[userId].lastModified){
        		if (gReviewerInfo[userId].artifactsNotReviewed.indexOf("m" + modId + "a" + a.identifier)==-1){
        			gReviewerInfo[userId].artifactsNotReviewed.push("m" + modId + "a" + a.identifier);
        		}
        	}
        }
    }
    if (response.RESTurl.indexOf("vvc.configuration") != -1) {
        fromChangeset = true;
        gArtifacts["m" + modId + "cs" + a.identifier] = response;
    } else {
        fromChangeset = false;
        gArtifacts["m" + modId + "a" + a.identifier] = response;
    }
    var output = trimOuterDiv(a.primaryText);
    if (artRow.localName == "span") {
        //We previously created span elements when the artifact is a heading
        var output = removeOuterPTag(output);
        artRow = artRow.parentElement;
    }
    if (artText.innerHTML != " ") {
        //If the text was populated already, then we will perform the compare and display that instead.
        if (fromChangeset) {
            var originalHTML = artText.innerHTML;
            var newHTML = output;
            output = htmldiff(originalHTML, newHTML);
        } else {
            var originalHTML = output;
            var newHTML = artText.innerHTML;
            output = htmldiff(originalHTML, newHTML);
        }
    }

    artText.innerHTML = output;
    artRow.addEventListener("click", clickArtifact);
    gModules[modId].pendingRequests--;
    loadingText(modId, "Retrieving " + gModules[modId].pendingRequests + " items");
    if (gModules[modId].pendingRequests == 0) {
        if (!gArtifactsRequested) {
            if (!gCancelInitialNext){
                nextChange();
            }
            gArtifactsRequested = true;
            loadArtifactsInBackground();
        }
        endLoading(modId);
        var allModulesLoaded = true;
        for (var key of Object.keys(gModules)){
        	if (gModules[key].pendingRequests > 0 ){
        		allModulesLoaded = false;
        	}
        }
        if (allModulesLoaded){
        	populateReviewerInfo();
        }
        resized();
    }
}

function populateReviewerInfo(){
	var iDiv = document.getElementById("prReviewersInfo");
	for (var userId of Object.keys(gReviewerInfo)){
		var pc = 1;
		if (gReviewerInfo[userId].artifactsNotReviewed.length>0){
            pc = 1 - (gReviewerInfo[userId].artifactsNotReviewed.length/gChangedArtIDs.length);
            if (pc > 0.99){
            	pc = 0.99; //Ensure that someone with artifacts not reviewed gets a 99%.
            }
		}
        pc = Math.round(pc*100);
		iDiv.innerHTML += gReviewerInfo[userId].userName + " - " + pc + "% Complete";
	}
	if (gReviewerInfo[gMyUserId]){
		var artsToReview = gReviewerInfo[gMyUserId].artifactsNotReviewed;
		if (artsToReview.length == 0){
			alert("There are no artifact changes since you last marked this review as complete. If you are expecting additional fixes, you'll have wait a little longer.");
            showReviewAsFinished();
		} else {
			if (confirm(artsToReview.length + " artifacts were modified since you reviewed this.\n\nPress 'OK' to update the next/previous buttons to navigate *only* between the new changes.\n\nMark your review as complete when you are finished again.")){
			    gShowNewChangesOnly = true;
			    gCurrentArtIndex = 0;
			    nextChange();
			}
		}
	}

}

function trimOuterDiv(text) {
    html = $(text).html();
    return html.substr(1, text.length - 2);
}

function removeOuterPTag(text) {
    return $(text).html();
}

const navigateToReview = (event, changeSetInfo)=>{
    showLoader();
    event.preventDefault();
    curChangeSet = changeSetInfo["rdf:about"];
    curChangeSetName = changeSetInfo["dcterms:title"];
    document.getElementById("csInfo").innerHTML = curChangeSetName;
    
    var projectUrl = changeSetInfo["process:projectArea"]["rdf:resource"];
    var componentUrl = changeSetInfo["oslc_config:component"]["rdf:resource"];
    pendingRequests = 3;
    initArtifactAttributes(projectUrl, componentUrl, curChangeSet);
    var url = 'https://maximus:9443/rm/publish/diff?sourceConfigUri=' + encodeURIComponent(curChangeSet) + '&targetConfigUri=' + encodeURIComponent(changeSetInfo["oslc_config:overrides"]["rdf:resource"]);
    getREST(url, processComparisonData, false, true);
    //const schemaData = getREST('https://maximus:9443/rm/publish/comparisons?metadata=schema');
    url = RTCURL() + 'rpt/repository/workitem?fields=workitem/workItem[id=' + gWIId + ']/(id|comments/(formattedContent|creator/(name|userId)))';
    getREST(url, loadReviewerInfo);
}

function loadReviewerInfo(response){
    if (response[0].comments){
    	var comments = response[0].comments
		for (var c of comments){
			var cT = c.formattedContent;
			//Switch to JSON Parsing if this gets more complicated.
			var lModMarker = "https://review.info?lastModified=&quot;";
			if (cT.indexOf(lModMarker)!=-1){
				var userInfo = new Object();
				userInfo.userName = c.creator.name;
				userInfo.userId = c.creator.userId;
				userInfo.artifactsNotReviewed = [];
				var lModText = cT.substr(cT.indexOf(lModMarker) + lModMarker.length);
				userInfo.lastModified = lModText.substr(0, lModText.indexOf("&quot;"));
				if (gReviewerInfo[userInfo.userId]){
					if (userInfo.lastModified > gReviewerInfo[userInfo.userId].lastModified){
						gReviewerInfo[userInfo.userId].lastModified = userInfo.lastModified;
					}
				} else {
					gReviewerInfo[userInfo.userId] = userInfo;
				}
			}
		}
    }
    pendingRequests--;
    if (pendingRequests==0) {
        showReview();
    }
    if (gMyUserId==""){
    	getCurrentUser(setMyUserId);
    }
}

function setMyUserId(r){
	gMyUserId = r;
}

function processComparisonData(comparisonData) {
    gChangedArtIDs = [];
    gChangedModules = [];
    for (item of comparisonData) {
        if (item.itemId) {
            var prefix = item.itemId.substr(0, 2);
            if (prefix == "TX") {
                gChangedArtIDs.push(item.identifier);
            } else if (prefix == "MD") {
                gChangedModules.push(item);
            } else if (prefix == "OT") {
                if (item.attributes.attribute) {
                    for (var att of item.attributes.attribute) {
                        gAttributeNames[getLastPartofUrl(att.about)] = att.title;
                    }
                }
            } else if (prefix == "AT") {
                if (item.enumEntries) {
                    for (var entry of item.enumEntries.enumEntry) {
                        gRMEnumNames[entry.about] = entry.title;
                    }
                }
            }
        } else {
            console.log("Unprocessed Items Present in comparisonData");
        }
    }
    pendingRequests--;
    if (pendingRequests==0) {
        showReview();
    }
}

function initArtifactAttributes(projectUrl, componentUrl, changeSetUrl) {
    var projId = getLastPartofUrl(projectUrl);
    var compId = getLastPartofUrl(componentUrl);
    var contextUrl = "https://maximus:9443/rm/rm-projects/" + projId + "/components/" + compId;
    var url = "https://maximus:9443/rm/types?resourceContext=" + encodeURIComponent(contextUrl) + "&configurationUri=" + encodeURIComponent(changeSetUrl);
    getOSLC(url, processTypesResponse);
}

function processTypesResponse(response) {

    var aDefsXML = response.getElementsByTagName("rm:AttributeDefinition");
    var aTypesXML = response.getElementsByTagName("rm:AttributeType");
    var aArtTypesXML = response.getElementsByTagName("rm:ObjectType");
    
    var aTypes = new Object();
    for (var aType of aTypesXML) {
        objI = objParseChildNodes(aType, true);
        aTypes[objI.about] = objI;
    }

    gArtifactTypeNames = new Object();
    for (var aArtType of aArtTypesXML) {
        objI = objParseChildNodes(aArtType, true);
        gArtifactTypeNames[objI.about] = objI.title;
    }

    var aDefs = new Object();
    for (var aDef of aDefsXML) {
        objI = objParseChildNodes(aDef, true);
        aDefs[objI.about] = objI;
        gAttributeNames[getLastPartofUrl(objI.about)] = objI.title;
    }

    var keys = Object.keys(aDefs);
    for (var aKey of keys) {
        var rangeObj = aTypes[aDefs[aKey].range.resource];
        if (rangeObj.enumEntries) {
            for (var item of rangeObj.enumEntries.Seq.li) {
                gRMEnumNames[item.enumEntry.about] = item.enumEntry.title;
            }
        }
    }
    pendingRequests--;
    if (pendingRequests==0) {
        showReview();
    }
}

function showReview() {
    hideLoader();
    var container = document.getElementById("reviewContainer");
    container.innerHTML = "";
    //Depends on processTypesResponse and processComparisonData to be returned
    $('#workItemContainer').hide();
    $('#reviewPane').show();
    
    setChangedModules(gChangedModules);
    var container = document.getElementById("reviewContainer");
    var firstModule = null;
    const newLoaderText = document.getElementById("loadingInfo").outerHTML;
    for (var m of gChangedModules) {
        var gMod = new Object();
        gMod.url = m.about;
        gMod.id = m.identifier;
        gMod.title = m.title;
        gMod.artifacts = [];
        gMod.artifactDetailsLoaded = false;
        gMod.pendingRequests = 0;
        var baseBookOrderLastMovedBy = 0;
        var baseBookNewClump = false;
        var baseBookOrderClumpStartIndex = -1;;
        var baseBookOrderClumpArtifactsCount = 0;
        var baseBookClumpHasNewOrDeletedArtInside = false;//Show more intuitive info when a moved clump contains added or removed artifacts.
        var baseBookNewOrDeletedOffset = 0;//Tracking book order changes that occurred due to added or removed artifacts.
        for (var art of m.moduleContext.contextBinding) {
            var gArt = new Object();
            gArt.id = art.identifier;
            gArt.foundIn = art.foundIn;
            gArt.isHeading = (art.isHeading == "true");
            gArt.section = art.section;
            gArt.depth = art.depth;
            gArt.bookOrder = art.bookOrder;
            gArt.isMoved = false;
            if (art.foundIn=="BOTH"){
            	if (art.bookOrderInBase){
					gArt.movedBy = art.bookOrderInBase - art.bookOrder - baseBookNewOrDeletedOffset;
					if (gArt.movedBy !=0) {
						if (baseBookOrderLastMovedBy!=gArt.movedBy){
							if (baseBookOrderClumpStartIndex > 0 ){
								gMod.artifacts[baseBookOrderClumpStartIndex].movedClumpLength = baseBookOrderClumpArtifactsCount;
								gMod.artifacts[baseBookOrderClumpStartIndex].movedClumpHasNewOrDeleted = baseBookClumpHasNewOrDeletedArtInside;
							}
							baseBookClumpHasNewOrDeletedArtInside = false;
							baseBookNewClump = true;
							baseBookOrderClumpArtifactsCount = 0;
							baseBookOrderLastMovedBy = gArt.movedBy;
							gArt.isMoved = true;
						}
						baseBookOrderClumpArtifactsCount++;
					}
				} else {
					if (baseBookOrderClumpStartIndex > 0 ){
						gMod.artifacts[baseBookOrderClumpStartIndex].movedClumpLength = baseBookOrderClumpArtifactsCount;
						gMod.artifacts[baseBookOrderClumpStartIndex].movedClumpHasNewOrDeleted = baseBookClumpHasNewOrDeletedArtInside;
						baseBookOrderClumpStartIndex = -1;
						baseBookClumpHasNewOrDeletedArtInside = false;
					}
					baseBookOrderLastMovedBy = 0;
				}
            } else {
            	if (art.foundId == "SOURCE"){
            		baseBookNewOrDeletedOffset++;
            	} else {
            		baseBookNewOrDeletedOffset--;
            	}
            	baseBookClumpHasNewOrDeletedArtInside = true
            }

            gArt.address = art.about;
            var aObj = new Object();
            aObj.ModuleId = gMod.id;
            aObj.ArtifactId = gArt.id;
            if (gChangedArtIDs.indexOf(gArt.id) != -1) {
                gArt.isChanged = true;
            } else {
            	gArt.isChanged = false;
            }
            gArt.isChangedOrMoved = (gArt.isChanged||gArt.isMoved);
            aObj.isChangedOrMoved = gArt.isChangedOrMoved;
            gOrderedArtifacts.push(aObj);
            gMod.artifacts.push(gArt);
            if (baseBookNewClump){
            	baseBookNewClump = false;
            	baseBookOrderClumpStartIndex = gMod.artifacts.length-1;
            }
        }
        if (baseBookOrderClumpStartIndex > 0 ){
			gMod.artifacts[baseBookOrderClumpStartIndex].movedClumpLength = baseBookOrderClumpArtifactsCount;
		}
        
        //Setup Module Div
        var moduleDiv = document.createElement("div");
        moduleDiv.style = "display:none";
        var newLoader = document.createElement("div");

        newLoader.innerHTML = newLoaderText.replaceAll("\"loadingInfo","\"loadingInfo" + gMod.id);
        moduleDiv.appendChild(newLoader);
        container.appendChild(moduleDiv);
        gMod.div = moduleDiv;

        gModules[m.identifier] = gMod;
        if (!firstModule){ //Setup first Module Div to load fast
            firstModule = gMod.id;
            gMod.div.style = "display:block";
            resized();
        }
    }
    loadModuleInfo(firstModule);
}

function loadModuleInfo(modId){
    var m = gModules[modId];
    if (!m.artifactDetailsLoaded){//Allow only one load of artifact details (in case user is clicky)
        gModules[modId].artifactDetailsLoaded = true;
        var firstRow = true;
        gModules[modId].pendingRequests = m.artifacts.length;
        for (var a of m.artifacts) {
            //Adds artifact divs to the module view to be loaded async.
            var d;
            if (a.isHeading) {
                d = document.createElement("h" + a.depth);
                var SecNum = document.createElement("span");
                SecNum.innerHTML = a.section + " ";
                d.appendChild(SecNum);

                var textSpan = document.createElement("span");
                textSpan.id = "m" + modId + "a" + a.id;
                textSpan.innerHTML = " ";
                d.appendChild(textSpan);
            } else {
                d = document.createElement("div");
                d.id = "m" + modId + "a" + a.id;
                d.innerHTML = " ";
            }
            d.classList.add("textContent");
            if (firstRow) {
                firstRow = false;
                d.style = "border-top: 1px solid #d0d0d0;"
            }
            if (a.foundIn == "TARGET") {
                d.classList.add("deleted");
            } else if (a.foundIn == "SOURCE") {
                d.classList.add("added");
            } else if (a.foundIn == "BOTH") {
                if (a.isChangedOrMoved) {
                    d.classList.add("changed");
                }
            } else {
                console.log("Support for requirement.foundIn not present for: " + a.foundIn);
            }
            m.div.appendChild(d);
            
            if (a.isChanged) {
                gModules[modId].pendingRequests++;
                if (gArtifacts["m" + modId + "cs" + a.id]) {
                    populateArtifactRow(gArtifacts["m" + modId + "cs" + a.id]);
                } else {
                    getREST(a.address + "?vvc.configuration=" + encodeURIComponent(curChangeSet), populateArtifactRow, false, true, modId);
                }
            }

            if (gArtifacts["m" + modId + "a" + a.id]) {
                populateArtifactRow("m" + modId + gArtifacts["a" + a.id]);
            } else {
                getREST(a.address, populateArtifactRow, false, true, modId);
            }
        }
        if (gModules[modId].pendingRequests > 0) {
            startLoading(modId, "Retrieving " + gModules[modId].pendingRequests + " items");
        }
    }
}

function clickModule(e, isManualClick=true) {
    gCancelInitialNext = true;
    var id = "";
    if (e.target){
        id = e.target.id;
    } else {
        id = e;
    }
    if (curSelection.ModuleId!=id){
        if (curSelection.ModuleId!=""){
            gModules[curSelection.ModuleId].div.style = "display:none";
        }
        curSelection.ModuleId =id;
        var mItem;
        for (var m of gModuleListItems) {
            if (m.classList.length > 0) {
                m.classList.remove("selectedModule");
            }
            if (m.id==id){
                mItem = m;
            }
        }
        mItem.classList.add("selectedModule");
        gModules[curSelection.ModuleId].div.style = "display:block";
        resize();
        if (isManualClick){ //If we manually clicked this module, auto-select the first changed artifact.
            for (i=0; i<gOrderedArtifacts.length; i++){
                if (gOrderedArtifacts[i].ModuleId==id){
                    if (gOrderedArtifacts[i].isChangedOrMoved){
                        gCurrentArtIndex = i-1;
                        nextChange();
                        break;
                    }
                }
            }
        }
    }
}

function idEntered() {
    hideWIError();
    hideWIInfo();
    var workItemId = document.getElementById("workItemInput").value;
    if (workItemId!=""){
        const url = 'https://maximus:9443/ccm/rpt/repository/workitem?fields=workitem/workItem[id=' + workItemId + ']/(id|summary|auditableLinks/*/*)';
        getREST(url, processChangeSets);
    }
}

function hideWIInfo(){
    document.getElementById("wiInfoSection").classList.remove("visible");
    document.getElementById("wiInfoSection").classList.add("hidden");
}
function showWIInfo(){
    document.getElementById("wiInfoSection").classList.remove("hidden");
    document.getElementById("wiInfoSection").classList.add("visible");
}

function processChangeSets(response){
    document.getElementById('changeSetReviewItems').innerHTML = '';
    document.getElementById('changeSetDeliveredItems').innerHTML = '';
    var WI = response[0];
    if (WI){
        gWIId = WI.id;
        if (gWIId==document.getElementById("workItemInput").value){
            document.getElementById("searchWiInfo").innerHTML = WI.id + ": " + WI.summary;
            document.getElementById("wiInfo").innerHTML = WI.id + ": " + WI.summary;
            document.getElementById("changeSetReviewItems").innerHTML = "None";
            document.getElementById("changeSetDeliveredItems").innerHTML = "None";

            showWIInfo();
            var changeSets = [];
            for (cs of WI.auditableLinks) {
                if (cs.name.indexOf("tracksChanges") != -1) {
                    if (cs.targetRef.uri.indexOf("/rm/cm/changeset") != -1) {
                        changeSets.push(cs.targetRef.uri);
                    }
                }
            }
            pendingRequests = 0;
            changeSets.forEach(changeSet=>{
                pendingRequests++;
                getREST(changeSet, addChangeSetInfo);
            });
        }
    } else {
        showWIError();
    }
}

function addChangeSetInfo(response){
    pendingRequests--;
    var changeSetInfo = response[0];
    var changeSetTitle = changeSetInfo['dcterms:title'];
    
    if (changeSetTitle.indexOf("(delivered)") != -1) {
        if (document.getElementById("changeSetDeliveredItems").innerHTML == "None"){
            document.getElementById("changeSetDeliveredItems").innerHTML = "";
        }
        const changeSetReviewItem = document.createElement('div');
        changeSetTitle = changeSetTitle.substr(0, changeSetTitle.indexOf("(delivered)"));
        changeSetReviewItem.innerHTML = changeSetTitle;
        document.getElementById('changeSetDeliveredItems').appendChild(changeSetReviewItem);
    } else {
        if (document.getElementById("changeSetReviewItems").innerHTML == "None"){
            document.getElementById("changeSetReviewItems").innerHTML = "";
        }
        const changeSetReviewItem = document.createElement('div');
        const changeSetLinkText = document.createTextNode(changeSetTitle);
        //when creating elements, you can pass an options parameter with the id and other attributes 
        //that will be helpful when doing styling
        const changeSetLink = document.createElement('a');

        changeSetLink.appendChild(changeSetLinkText);
        changeSetLink.href = '';
        changeSetLink.addEventListener('click', event=>navigateToReview(event, changeSetInfo));
        changeSetReviewItem.appendChild(changeSetLink);
        document.getElementById('changeSetReviewItems').appendChild(changeSetReviewItem);
    }

    
}

function resize() {
    var headerRowHeight = document.getElementById('headerTable').offsetHeight;
    var maxHeight;
    //Left Pane
    document.getElementById('leftPane').style.maxHeight = maxHeight;

    //Center Pane
    
    maxHeight = parent.innerHeight - 230 - headerRowHeight;
    document.getElementById('reviewContainer').style.maxHeight = maxHeight;
    //document.getElementById('headerTable').style.width = document.getElementById('tableBody').offsetWidth + "px";

    //Right Pane
    var artTitleHeight = document.getElementById('artifactPaneTitle').offsetHeight;
    maxHeight = parent.innerHeight - 230 - headerRowHeight - artTitleHeight;
    document.getElementById('artifactPane').style.maxHeight = maxHeight-20;

    gadgets.window.adjustHeight();
}

function getLastPartofUrl(url) {
    var sRng = url.lastIndexOf("/");
    if (sRng != -1) {
        return url.substr(sRng + 1);
    } else {
        return url;
    }
}

function nextChange() {
    gCurrentArtIndex++;
    var nextFound = false;
    for (i = gCurrentArtIndex; i<gOrderedArtifacts.length; i++){
        if (gOrderedArtifacts[i].isChangedOrMoved){
        	if (gShowNewChangesOnly){
        		var divId = "m" + gOrderedArtifacts[i].ModuleId + "a" + gOrderedArtifacts[i].ArtifactId;
                if (gReviewerInfo[gMyUserId].artifactsNotReviewed.indexOf(divId) != -1){
                	nextFound = true;
					gCurrentArtIndex = i;
					break;
                }
        	} else {
                nextFound = true;
				gCurrentArtIndex = i;
				break;
        	}
            
        }
    }
    if (!nextFound){
        alert("Reached the last change! Continuing from start.");
        gCurrentArtIndex = 0;//Start from beginning if none found after.
        for (i = gCurrentArtIndex; i<gOrderedArtifacts.length; i++){
            if (gOrderedArtifacts[i].isChangedOrMoved){
            	if (gShowNewChangesOnly){
					var divId = "m" + gOrderedArtifacts[i].ModuleId + "a" + gOrderedArtifacts[i].ArtifactId;
					if (gReviewerInfo[gMyUserId].artifactsNotReviewed.indexOf(divId) != -1){
						gCurrentArtIndex = i;
						break;
					}
				} else {
                    gCurrentArtIndex = i;
                    break;
				}
                
            }
        }
    }
    setSelArtifact();
}

function prevChange() {
    gCurrentArtIndex--;
    var prevFound = false;
    for (i = gCurrentArtIndex; i >= 0; i--){
        if (gOrderedArtifacts[i].isChangedOrMoved){
        	if (gShowNewChangesOnly){
        		var divId = "m" + gOrderedArtifacts[i].ModuleId + "a" + gOrderedArtifacts[i].ArtifactId;
                if (gReviewerInfo[gMyUserId].artifactsNotReviewed.indexOf(divId) !=-1) {
                	prevFound = true;
					gCurrentArtIndex = i;
					break;
                }
        	} else {
        		prevFound = true;
				gCurrentArtIndex = i;
				break;
        	}
        }
    }
    if (!prevFound){
        alert("Reached the first change! Continuing from end.");
        gCurrentArtIndex = gOrderedArtifacts.length-1;//Start from end if none found before.
        for (i = gCurrentArtIndex; i >= 0; i--){
            if (gOrderedArtifacts[i].isChangedOrMoved){
            	if (gShowNewChangesOnly){
					var divId = "m" + gOrderedArtifacts[i].ModuleId + "a" + gOrderedArtifacts[i].ArtifactId;
					if (gReviewerInfo[gMyUserId].artifactsNotReviewed.indexOf(divId) != -1){
						gCurrentArtIndex = i;
						break;
					}
				} else {
					gCurrentArtIndex = i;
					break;
				}
            }
        }
    }
    setSelArtifact();
}

function setSelArtifact() {

    var newSel = gOrderedArtifacts[gCurrentArtIndex];
    var newId = "m" + newSel.ModuleId + "a" + newSel.ArtifactId;
    newSelDiv = document.getElementById(newId);
    if (newSelDiv){ //New sel might not be loaded if the user gets clicky during loading.
        if (curSelection.ModuleId!=newSel.ModuleId){
            clickModule(newSel.ModuleId, false);
        }
        clickArtifact(newSel);

        var myPos = newSelDiv.offsetTop;
        var myHeight = newSelDiv.offsetHeight;
        var viewPane = document.getElementById("centerPane");
        var curScrollTop = viewPane.scrollTop;
        var viewHeight = viewPane.offsetHeight;
        var viewBottom = curScrollTop + viewHeight;
        if (myPos < curScrollTop) {
            viewPane.scrollTop = myPos;
        }
        if ((myPos + myHeight) > viewBottom) {
            if (myHeight > viewHeight){
                viewPane.scrollTop = myPos;
            } else {
                viewPane.scrollTop = myPos - (viewHeight - myHeight);
            }
        }
    }
}

function finishReview(){
    var bText = document.getElementById("btnFinishedReviewingText");
    if (bText.innerHTML == "Finished Reviewing") {
        if (confirm("This can't be undone!\nPress 'OK' to mark your review as complete.\nPress 'Cancel' to continue reviewing.\n\nNote: You'll still be able to add new review comments. Also, your review status will be reset if new changes are made in this change set.")){
            var CSLink = "<a href='" + curChangeSet + "'>" + curChangeSetName + "</a>";
            bText.innerHTML = "Updating Review..."
            //Normal methods of hiding html elements were stripped by EWM. Resorted to making an a with no text and it works!
            var hiddenInfo = "<a href='https://review.info?lastModified=\"" + gLatestChange + "\"'></a>";
            if (gReviewerInfo[gMyUserId]){
                addWIComment("Reviewed " + gReviewerInfo[gMyUserId].artifactsNotReviewed.length + " additional changes to " + CSLink + "." + hiddenInfo);
            } else {
            	addWIComment("Done reviewing " + CSLink + "." + hiddenInfo);
            }
            
        }
    } 
}

function showReviewAsFinished(){
    var btnFinished = document.getElementById("btnFinishedReviewing");
    btnFinished.style = "fill:green;background-color:#d7ffd7";
    btnFinished.classList.remove("svgButton");
    document.getElementById("btnFinishedReviewingText").innerHTML = "Review Finished";
}

function addWIComment(cText){
	var WIId = gWIId;
	var commentText = cText;
	if (commentText!=''){
		newJSON = new Object();
		newJSON['dcterms:description'] = commentText;
		
		var str = JSON.stringify(newJSON);
		var URL = RTCURL() + "oslc/workitems/" + WIId + "/rtc_cm:comments/oslc:comment";

		$.ajax({
			async:true,	xhrFields: {withCredentials: true},	url: URL,
			type: 'POST',
			data: str,
			timeout:5000,
			headers:{
			'Content-Type' : 'application/json',
			'Accept':'application/json',
			'OSLC-Core-Version' : '2.0'
			},
			success: function(responst){
			    showReviewAsFinished();
			},
			error: function(error){
				if (error.statusText=="timeout"){
					var message = "Woops! Saving work item " + WIId + " timed out.\nYour session has expired.\nPlease refresh the page to login again.";
				} else {
					var message = "Woops! Saving work item " + WIId + " failed.\n";
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
				document.getElementById("btnFinishedReviewingText").innerHTML = "Finished Reviewing";
				alert(message);
			}
		});
	}
}