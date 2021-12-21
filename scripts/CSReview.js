var gModules = new Object();
var gModuleListItems = [];
var gChangedArtIDs;
var gChangedModules;
var gTypesReturned = false;
var gArtifacts = new Object();
var gAttributeNames = new Object();
var gRMEnumNames = new Object();
var gCurrentArtifact;
var gChangedArtifacts;
var gCurrentArtIndex;
var gArtifactsRequested = false;
var pendingRequests = 0;
var loadingInfo;

var curChangeSet = "";
const proxyUri = url=>{
    if (url.indexOf(applicationURL()) != 0) {
        return applicationURL() + "proxy?uri=" + encodeURIComponent(url);
    }
    return url;
}

const setErrorMessageForWorkItemInput = msg=>{
    let errorContent = document.createElement('p');
    errorContent.innerHTML = msg;

    const errorDiv = document.getElementById('workItemInputError');
    errorDiv.appendChild(errorContent);
}

function getChangeSetUrlsFromWorkItem(workItemId) {
    loadingInfo = document.getElementById('loadingInfo')
    const url = 'https://maximus:9443/ccm/rpt/repository/workitem?fields=workitem/workItem[id=' + workItemId + ']/(id|summary|auditableLinks/*/*)';
    var WI = getREST(url)[0];

    var changeSets = [];

    for (cs of WI.auditableLinks) {
        if (cs.name.indexOf("tracksChanges") != -1) {
            if (cs.targetRef.uri.indexOf("/rm/cm/changeset") != -1) {
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
        $('#leftPane').append(cr);
        gModuleListItems.push(cr);
    }
    resize();
}

function clickArtifact(e) {
    var artText = e.currentTarget;
    var artRow = e.currentTarget;
    if (artText.id == "") {
        //When we created the heading rows, we created a div with a child span for the section # and another span for the content.
        for (var child of artText.children) {
            if (child.id) {
                artText = child;
            }
        }
    }
    var lastArtifact = gCurrentArtifact;
    gCurrentArtifact = artRow;
    if (lastArtifact) {
        lastArtifact.classList.remove("selectedArtifact");
    }
    gCurrentArtifact.classList.add("selectedArtifact");
    var a = gArtifacts[artText.id][0];
    var eClassList = artRow.classList;
    var id = a.identifier;
    var v = document.getElementById("artifactPane");
    v.innerHTML = "";

    document.getElementById("artifactPaneTitle").innerHTML = "Artifact " + a.identifier;

    //The row's class list might have: added, deleted, changed, or none of these meaning is it unchanged.
    var textChangeInfo = "";
    var attrChangeInfo = "";
    var changeSummary = "";
    var newArtifact = false;
    if (eClassList.contains("changed")) {
        var streamText = a.primaryText;
        var changedArt = gArtifacts["cs" + id][0];
        var csText = changedArt.primaryText;
        if (csText != streamText) {
            changeSummary += "Primary text";
            textChangeInfo = "Text in stream:" + newTextArea(streamText) + "Text in change set:" + newTextArea(csText);
        }
        if (changedArt.artifactAttributes) {
            if (changeSummary == "") {
                changeSummary = "Attribute values";
            } else {
                changeSummary += " and attribute values";
            }
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
            }
        }
        changeSummary += " changed."

    } else if (eClassList.contains("added")) {
        newArtifact = true;
        if (gArtifacts["cs" + id]) {
            changeSummary = "Artifact created and added.";
            textChangeInfo = newTextArea(gArtifacts["cs" + id][0].primaryText);
        } else {
            changeSummary = "Existing artifact added.";
            textChangeInfo = newTextArea(gArtifacts["a" + id][0].primaryText);
        }
    } else if (eClassList.contains("deleted")) {
        changeSummary = "Artifact removed.";
    } else {
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
}

function newTextArea(html) {
    return "<div class=\"textBox\">" + html + "</div>"
}
function newPanel(title, html) {
    var d = document.createElement("div");
    d.innerHTML = "<div class=\"panel\"><div class=\"panelTitle\">" + title + "</div><div class=\"panelContent\">" + html + "</div></div>";
    return d;
}

function startLoading(text) {
    document.getElementById("loadingInfoText").innerHTML = text;
    if (loadingInfo.classList.contains("hidden")) {
        loadingInfo.classList.remove("hidden");
    }
    if (!(loadingInfo.classList.contains("visible"))) {
        loadingInfo.classList.add("visible");
    }
}

function loadingText(text) {
    document.getElementById("loadingInfoText").innerHTML = text;
}

function endLoading() {
    if (!(loadingInfo.classList.contains("hidden"))) {
        loadingInfo.classList.add("hidden");
    }
    if (loadingInfo.classList.contains("visible")) {
        loadingInfo.classList.remove("visible");
    }
}

function loadArtifactsInBackground() {
    var moduleIds = Object.keys(gModules);
    for (var mId of moduleIds) {
        var m = gModules[mId];
        for (var a of m.artifacts) {
            if (a.isChanged) {
                if (!(gArtifacts["cs" + a.id])) {
                    getREST(a.address + "?vvc.configuration=" + encodeURIComponent(curChangeSet), backgroundArtifactResponse, false, true);
                }
            }
            if (!(gArtifacts["a" + a.id])) {
                getREST(a.address, backgroundArtifactResponse, false, true);
            }
        }
    }
}
function backgroundArtifactResponse(response) {
    var a = response[0];
    var gId = "a" + a.identifier;
    ;if (response.RESTurl.indexOf("vvc.configuration") != -1) {
        gId = "cs" + a.identifier;
    }
    if (!(gArtifacts[gId])) {
        response = setupAttributes(response);
        gArtifacts["a" + a.identifier] = response;
    }
}

function clickModule(e) {
    gCurrentArtIndex = -1;
    gChangedArtifacts = [];
    for (var m of gModuleListItems) {
        if (m.classList.length > 0) {
            m.classList.remove("selectedModule");
        }
    }
    e.target.classList.add("selectedModule");

    var m = gModules[e.target.id];
    var container = document.getElementById("reviewContainer");
    container.innerHTML = "";
    var firstRow = true;
    pendingRequests = m.artifacts.length;
    for (var a of m.artifacts) {
        //Adds artifact divs to the module view to be loaded async.
        var d;
        if (a.isHeading) {
            d = document.createElement("h" + a.depth);
            var SecNum = document.createElement("span");
            SecNum.innerHTML = a.section + " ";
            d.appendChild(SecNum);

            var textSpan = document.createElement("span");
            textSpan.id = "a" + a.id;
            textSpan.innerHTML = " ";
            d.appendChild(textSpan);
        } else {
            d = document.createElement("div");
            d.id = "a" + a.id;
            d.innerHTML = " ";
        }
        d.classList.add("textContent");
        if (firstRow) {
            firstRow = false;
            d.style = "border-top: 1px solid #d0d0d0;"
        }
        if (a.foundIn == "TARGET") {
            d.classList.add("deleted");
            gChangedArtifacts.push(d);
        } else if (a.foundIn == "SOURCE") {
            d.classList.add("added");
            gChangedArtifacts.push(d);
        } else if (a.foundIn == "BOTH") {
            if (a.isChanged) {
                d.classList.add("changed");
                gChangedArtifacts.push(d);
            }
        } else {
            console.log("Support for requirement.foundIn not present for: " + a.foundIn);
        }
        container.appendChild(d);

        if (a.isChanged) {
            pendingRequests++;
            if (gArtifacts["cs" + a.id]) {
                populateArtifactRow(gArtifacts["cs" + a.id]);
            } else {
                getREST(a.address + "?vvc.configuration=" + encodeURIComponent(curChangeSet), populateArtifactRow, false, true);
            }
        }

        if (gArtifacts["a" + a.id]) {
            populateArtifactRow(gArtifacts["a" + a.id]);
        } else {
            getREST(a.address, populateArtifactRow, false, true);
        }
    }
    if (pendingRequests > 0) {
        startLoading("Retrieving " + pendingRequests + " items");
    }
    resize();
}

function setupAttributes(response) {
    if (!(response.attributesSetup)) {
        response.attributesSetup = true;
        if (response[0].artifactAttributes) {
            for (var index = 0; index < response[0].artifactAttributes.length; index++) {
                var att = response[0].artifactAttributes[index];
                response[0].artifactAttributes[index].name = gAttributeNames[att.attributeId];
                if (response[0].artifactAttributes[index].name == undefined) {
                    response[0].artifactAttributes[index].name = "<<Unsupported!!>>";
                }

                var testVal = "";
                if (att.text) {
                    testVal = att.text;
                } else {
                    testVal = gRMEnumNames[att.resource];
                    if (!testVal) {
                        testVal = "Attribute not supported, contact Dave!";
                    }
                }
                response[0].artifactAttributes[index].value = testVal;
            }
        }
    }
    return response;
}

function populateArtifactRow(response) {
    response = setupAttributes(response);

    var a = response[0];
    var artRow = document.getElementById("a" + a.identifier);
    if (artRow != null) {
        //Prevent issues is someone gets clicky (async responses returned after clicking next module)
        var artText = document.getElementById("a" + a.identifier);
        var fromChangeset;

        if (response.RESTurl.indexOf("vvc.configuration") != -1) {
            fromChangeset = true;
            if (!(gArtifacts["cs" + a.identifier])) {
                gArtifacts["cs" + a.identifier] = response;
            }
        } else {
            fromChangeset = false;
            if (!(gArtifacts["a" + a.identifier])) {
                gArtifacts["a" + a.identifier] = response;
            }
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
        pendingRequests--;
        loadingText("Retrieving " + pendingRequests + " items");
        if (pendingRequests == 0) {
            if (!gArtifactsRequested) {
                gArtifactsRequested = true;
                loadArtifactsInBackground();
            }
            endLoading();
            nextChange();
            resized();
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

const navigateToReview = (event,changeSetInfo)=>{
    //do a loading indicator
    event.preventDefault();

    curChangeSet = changeSetInfo["rdf:about"];
    var projectUrl = changeSetInfo["process:projectArea"]["rdf:resource"];
    var componentUrl = changeSetInfo["oslc_config:component"]["rdf:resource"];

    initArtifactAttributes(projectUrl, componentUrl, curChangeSet);
    const url = 'https://maximus:9443/rm/publish/diff?sourceConfigUri=' + encodeURIComponent(curChangeSet) + '&targetConfigUri=' + encodeURIComponent(changeSetInfo["oslc_config:overrides"]["rdf:resource"]);
    gChangedArtIDs = null;
    getREST(url, processComparisonData, false, true);
    //const schemaData = getREST('https://maximus:9443/rm/publish/comparisons?metadata=schema');
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
    if (gTypesReturned) {
        showReview();
    }
}

function initArtifactAttributes(projectUrl, componentUrl, changeSetUrl) {
    gTypesReturned = false;
    var projId = getLastPartofUrl(projectUrl);
    var compId = getLastPartofUrl(componentUrl);
    var contextUrl = "https://maximus:9443/rm/rm-projects/" + projId + "/components/" + compId;
    var url = "https://maximus:9443/rm/types?resourceContext=" + encodeURIComponent(contextUrl) + "&configurationUri=" + encodeURIComponent(changeSetUrl);
    getOSLC(url, processTypesResponse);
}

function processTypesResponse(response) {

    var aDefsXML = response.getElementsByTagName("rm:AttributeDefinition");
    var aTypesXML = response.getElementsByTagName("rm:AttributeType");
    var aTypes = new Object();
    for (var aType of aTypesXML) {
        objI = objParseChildNodes(aType, true);
        aTypes[objI.about] = objI;
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
    gTypesReturned = true
    if (gChangedArtIDs) {
        showReview();
    }
}

function showReview() {
    //Depends on processTypesResponse and processComparisonData to be returned
    $('#workItemContainer').hide();
    $('#reviewPane').show();

    setChangedModules(gChangedModules);

    for (var m of gChangedModules) {
        var gMod = new Object();
        gMod.url = m.about;
        gMod.id = m.identifier;
        gMod.title = m.title;
        gMod.artifacts = [];
        for (var art of m.moduleContext.contextBinding) {
            var gArt = new Object();
            gArt.id = art.identifier;
            gArt.foundIn = art.foundIn;
            gArt.isHeading = (art.isHeading == "true");
            gArt.section = art.section;
            gArt.depth = art.depth;
            gArt.address = art.about;

            if (gChangedArtIDs.indexOf(gArt.id) != -1) {
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
const addChangeSetReviewItems = changeSetInfo=>{
    const changeSetTitle = changeSetInfo['dcterms:title'];
    const changeSetReviewItem = document.createElement('div');
    if (changeSetTitle.indexOf("(delivered)") != -1) {
        changeSetReviewItem.innerHTML = changeSetTitle + " - Review Closed!"
    } else {
        const changeSetLinkText = document.createTextNode(changeSetTitle);
        //when creating elements, you can pass an options parameter with the id and other attributes 
        //that will be helpful when doing styling
        const changeSetLink = document.createElement('a');

        changeSetLink.appendChild(changeSetLinkText);
        changeSetLink.href = '';
        changeSetLink.addEventListener('click', event=>navigateToReview(event, changeSetInfo));
        changeSetReviewItem.appendChild(changeSetLink);
    }

    document.getElementById('changeSetReviewItems').appendChild(changeSetReviewItem);
}
;

const onSearchPressed = ()=>{
    // do a loading indicator 
    document.getElementById('workItemInputError').innerHTML = '';
    document.getElementById('changeSetReviewItems').innerHTML = '';

    //const workItemId = document.getElementById('workItemInput').value;
    //const changeSets = getChangeSetUrlsFromWorkItem(workItemId);
    var changeSets = getChangeSetUrlsFromWorkItem(8);

    changeSets.forEach(changeSet=>{
        const changeSetInfo = getREST(changeSet)[0];
        addChangeSetReviewItems(changeSetInfo);
    }
    );
}

function resize() {
    var headerRowHeight = document.getElementById('reviewTableDiv').offsetTop;
    var headerRow = 0;
    var maxHeight = parent.innerHeight - 230 - headerRowHeight;
    document.getElementById('reviewContainer').style.maxHeight = maxHeight;
    document.getElementById('headerTable').style.width = document.getElementById('tableBody').offsetWidth + "px";
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
    setSelArtifact();
}

function prevChange() {
    gCurrentArtIndex--;
    setSelArtifact();
}

function setSelArtifact() {
    if (gCurrentArtIndex < gChangedArtifacts.length) {
        if (gCurrentArtIndex < 0) {
            //FIXME Need to select previous module, then proceed
            alert("Reached beginning, selecting last changed artifact in this module.");
            gCurrentArtIndex = gChangedArtifacts.length - 1;
        }
    } else {
        //FIXME Need to load next module, then proceed
        alert("Reached end, selecting first changed artifact in this module.");
        gCurrentArtIndex = 0;
    }

    var newSel = gChangedArtifacts[gCurrentArtIndex];
    var e = new Object();
    e.currentTarget = newSel;
    clickArtifact(e);

    var myPos = newSel.offsetTop;
    var myHeight = newSel.offsetHeight;
    var viewTop = document.getElementById("centerPane").scrollTop;
    var viewHeight = document.getElementById("centerPane").offsetHeight;
    var viewBottom = viewTop + viewHeight;
    if (myPos < viewTop) {
        document.getElementById("centerPane").scrollTop = myPos;
    }
    if ((myPos + myHeight) > viewBottom) {
        document.getElementById("centerPane").scrollTop = myPos - (viewHeight - myHeight);
    }

}
