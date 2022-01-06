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
var gShowResolvedComments=false;
var gShowOthersComments = true;
var gShowUnansweredComments = true;
var gCommentPane;
var gMyCommentText = "";
var gModuleComments = new Object();
var gArtifactsWithShownComments = [];

var gCommentsOnTop = false;


var UserNames = null;
var UserPhotos = new Object();
var userNumber = 0;
var gReviewerInfo = new Object();

initCLMUserInfo();


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
    gModuleComments = new Object();
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

    
    var v = document.getElementById("artifactAttributeDetails");
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
    	loadCommentsForArtifact(modId, artId);
    } else {
    	document.getElementById("commentSummary").innerHTML = "";
        document.getElementById("commentsArea").innerHTML = "Comments are disabled on out-of-scope (unchanged) artifacts.";
    }
}

function setupShowHideResolvedCommentsButton(){
    var shIcon = document.getElementById("showHideResolvedCommentsIcon");
    var shText = document.getElementById("showHideResolvedCommentsTipText");
	if (gShowResolvedComments){
		shText.innerHTML = "Click to hide resolved comments.";
		shIcon.setAttribute("d", "M.2 10a11 11 0 0 1 19.6 0A11 11 0 0 1 .2 10zm9.8 4a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm0-2a2 2 0 1 1 0-4 2 2 0 0 1 0 4z");
	} else {
		shText.innerHTML = "Resolved comments are hidden.\nClick to show resolved comments.";
		shIcon.setAttribute("d", "M12.81 4.36l-1.77 1.78a4 4 0 0 0-4.9 4.9l-2.76 2.75C2.06 12.79.96 11.49.2 10a11 11 0 0 1 12.6-5.64zm3.8 1.85c1.33 1 2.43 2.3 3.2 3.79a11 11 0 0 1-12.62 5.64l1.77-1.78a4 4 0 0 0 4.9-4.9l2.76-2.75zm-.25-3.99l1.42 1.42L3.64 17.78l-1.42-1.42L16.36 2.22z");
	}
}

function setupShowHideOthersCommentsButton(){
    var shIcon = document.getElementById("showHideOthersCommentsIcon");
    var shText = document.getElementById("showHideOthersCommentsTipText");
	if (gShowOthersComments){
		shText.innerHTML = "Click to hide other's comments.";
		shIcon.setAttribute("d", "M7 8a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm0 1c2.15 0 4.2.4 6.1 1.09L12 16h-1.25L10 20H4l-.75-4H2L.9 10.09A17.93 17.93 0 0 1 7 9zm8.31.17c1.32.18 2.59.48 3.8.92L18 16h-1.25L16 20h-3.96l.37-2h1.25l1.65-8.83zM13 0a4 4 0 1 1-1.33 7.76 5.96 5.96 0 0 0 0-7.52C12.1.1 12.53 0 13 0z");
	} else {
		shText.innerHTML = "Comments by others are hidden.\nClick to show comments from everyone.";
		shIcon.setAttribute("d", "M5 5a5 5 0 0 1 10 0v2A5 5 0 0 1 5 7V5zM0 16.68A19.9 19.9 0 0 1 10 14c3.64 0 7.06.97 10 2.68V20H0v-3.32z");
	}
}

function setupShowHideUnansweredCommentsButton(){
    var shIcon = document.getElementById("showHideUnansweredCommentsIcon");
    var shText = document.getElementById("showHideUnansweredCommentsTipText");
	if (gShowUnansweredComments){
		shText.innerHTML = "Click to hide answered comments.\nThis hides comments where you have the latest reply (no replies or changes to the artifact were made since your latest reply.";
		shIcon.setAttribute("d", "M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zM7.88 7.88l-3.54 7.78 7.78-3.54 3.54-7.78-7.78 3.54zM10 11a1 1 0 1 1 0-2 1 1 0 0 1 0 2z");
	} else {
		shText.innerHTML = "Comment's you've already answered are hidden.\nClick to show comments that you've answered.";
		shIcon.setAttribute("d", "M10 20a10 10 0 1 1 0-20 10 10 0 0 1 0 20zm1-5h1a3 3 0 0 0 0-6H7.99a1 1 0 0 1 0-2H14V5h-3V3H9v2H8a3 3 0 1 0 0 6h4a1 1 0 1 1 0 2H6v2h3v2h2v-2z");
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
	lDiv.classList.remove("hidden");
	lDiv.classList.add("visible");
}

function reloadAllCommentsInBackground(){
	$.ajax({
		async:true,
		url: "https://maximus/files/CSReviewComments/getComments.php?changeSetId=\"" + curChangeSet + "\"",
		success:function(data){
			gModuleComments = new Object();
			var comments = $.parseJSON(data);
			if (comments.length>0){
				for (c of comments){
					if (!(gModuleComments[c.moduleId])){
						gModuleComments[c.moduleId] = [];
					}
					gModuleComments[c.moduleId].push(c);
				}
			}
			populateCommentCounts();
			filterComments();
		},
		error:function(error){
			gModuleComments[modId] = new Object();
			gModuleComments[modId].error = "Failed to load comments."
			console.log(error);
		}
	});
}

function loadModuleComments(modId, changesetId){
	if (!gModuleComments[modId]){
		gModuleComments[modId] = null;
		$.ajax({
			async:true,
			url: "https://maximus/files/CSReviewComments/getComments.php",
			success:function(data){
				gModuleComments[modId] = [];
				var comments = $.parseJSON(data);
				if (comments.length>0){
					for (c of comments){
						gModuleComments[modId].push(c);
					}
				}
				var gotAllComments = true;
				for (var key in gModuleComments){
					if (gModuleComments[key] == null) {
						gotAllComments = false;
					}
				}
				if (gotAllComments){
					populateCommentCounts();
				}

			},
			error:function(error){
				gModuleComments[modId] = new Object();
				gModuleComments[modId].error = "Failed to load comments."
				console.log(error);
			}
		});
	}
}

function loadCommentsForArtifact(modId, artId){
	gCommentPane = document.getElementById("commentsArea");
	gCommentPane.innerHTML = "";
	var modComments = gModuleComments[modId];
	if ((modComments==null)||(modComments.error)){
        if (modComments.error){
            gCommentPane.innerHTML = "There was an error fetching the comments from the database. Please try again later.";
        } else {
        	gCommentPane.innerHTML = "Comments are still loading! Please click the artifact again shortly.";
        }
	} else {
		var comments = [];
		for (c of modComments){
			if (c.artifactId==artId){
				comments.push(c);
			}
		}
        gCommentPane.innerHTML = "";
		if (comments.length>0){
			for (c of comments){
				addComment(gCommentPane, c);
			}
		}
		addComment(gCommentPane);//Creates the "New Comment" item at the bottom.

		setupShowHideResolvedCommentsButton();
		setupShowHideOthersCommentsButton();
		setupShowHideUnansweredCommentsButton();
		if (gMyCommentText!="") {
			document.getElementById("myCommentEntry").parentElement.classList.add("editing");
			setTimeout(autoGrowMyComment, 80);
		}
		filterComments();
		$('#newCommentContent').on('change keyup keydown paste cut', autoGrowMyComment);
		$('#newCommentContent').on('keyup', trackComment);
		$('#newCommentContent').on('keydown', saveReviewComment);
		trackComment();
		resize();
	}
}

function addComment(parentElement, c=null){
	var userPhoto = "";
	var userName = "";
	var comDate = "";
	var content = "";
	var state = null;
	var resolveButton = "";
	var comContainer = document.createElement("div");
	var d = document.createElement("div");
	comContainer.appendChild(d);
	comContainer.classList.add("commentContainer");
	comContainer.addEventListener("click", clickComment);
	d.classList.add("comment");
	if (c==null) { //Generate the new comment div.
	    userName = UserNames[gMyUserId];
        userPhoto = getUserPhoto(gMyUserId);
        d.id = "myCommentEntry";
        comDate = "<div id='btnSaveReviewComment' style='margin:-2px;float:right;'><svg width='15' class='svgButton saveButton' viewBox='0 0 20 20'><title>Save Comment (Ctrl+S)</title><path d='M0 2C0 .9.9 0 2 0h14l4 4v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5 0v6h10V2H5zm6 1h3v4h-3V3z'/></svg></div>";
        var cText = "";
        if (gMyCommentText!=""){
        	cText = gMyCommentText;
        }
        content = "<textarea class='commentTextArea' id='newCommentContent' placeholder='Write a comment...' rows='1' autocomplete='off'>" + cText + "</textarea>";
	} else {
		userName = UserNames[c.userId];
        userPhoto = getUserPhoto(c.userId);
        var dateObj = getTimeLabel(c.date);
        comDate = "<span " + dateObj.title + ">" + dateObj.timeAgo + "</span>";

        if (c.userId==gMyUserId){ //Allow only the comment author to mark their comment as resolved.
            resolveButton += "<div style='margin-top:-3px;float:right;''><svg width='12' class='svgButton resolveButton' style='fill:green;' viewBox='0 0 20 20'><title>Mark Thread Resolved</title><path d='M0 11l2-2 5 5L18 3l2 2L7 18z'/></svg></div>";
        } else {
        	comContainer.classList.add("anothersComment");
        }
        
        
        if (isUnanswered(c)){
        	comContainer.classList.add("unansweredComment");
        }
        content = c.commentText;
        state = c.state;
        comContainer.setAttribute("commentId", c.id);
	}
	
	if (state=="Resolved"){
		comContainer.classList.add(state);
	}

	var t = "<table style='width:100%;'><tr><td style='width:48px;'><img class='commentAvatar' src='";
	t += userPhoto + "'></td><td style='width:calc(100% - 48px);padding-left:6px;vertical-align:top'>";
	t+= "<div class='commentHeader'><span class='userName'>" + userName + "</span>" + resolveButton + "<span class='commentDate'>" + comDate + "</span></div>";
	t+= content + "</td></tr></table>";
	d.innerHTML = t;
	var buttons = d.getElementsByTagName("svg");
	if (buttons.length!=0){
		for (btn of buttons){
			if (btn.classList.contains("saveButton")){
				$(btn).on("click", saveReviewComment);
			}
			if (btn.classList.contains("resolveButton")){
				$(btn).on("click", resolveReviewComment);
			}
		}
		
	}
    addSubComments(comContainer, c);
	parentElement.appendChild(comContainer);
}

function isUnanswered(c){
	var csArtId = "m" + c.moduleId + "cs" + c.artifactId;
	var lastModBy = gArtifacts[csArtId][0].contributor.resource;
	var artModified = gArtifacts[csArtId][0].modified;
	lastModBy = lastModBy.substr(lastModBy.lastIndexOf("/")+1);

	var lmdOthersLastReply = "0";
	var lmdMyLastReply = "0";

	if (c.userId==gMyUserId){
		lmdMyLastReply = c.commentDate;
	} else {
		lmdOthersLastReply = c.commentDate;
	}

	if (c.replies){
		for (rep of c.replies){
			if (rep.userId == gMyUserId){
				lmdMyLastReply = rep.commentDate;
			} else {
				lmdOthersLastReply = rep.commentDate;
			}
		}
	}

	if (lastModBy==gMyUserId){
		if (artModified>lmdMyLastReply){
			lmdMyLastReply = artModified;
		}
	} else {
		if (artModified>lmdOthersLastReply){
			lmdOthersLastReply = artModified;
		}
	}
	if (lmdMyLastReply < lmdOthersLastReply){
		return true;
	} else {
		return false;
	}
}

function addSubComments(parentElement, c){
    if (c){
    	if (c.replies){
            for (var sc of c.replies){
            	var d = document.createElement("div");
	            d.classList.add("subComment");
            	var userName = UserNames[sc.userId];
				var userPhoto = getUserPhoto(sc.userId);
				var dateObj = getTimeLabel(sc.date);
				comDate = "<span " + dateObj.title + ">" + dateObj.timeAgo + "</span>";
				content = sc.commentText;
            	var t = "<table style='width:100%;'><tr><td style='width:30px;'><img class='subCommentAvatar' src='";
				t += userPhoto + "'></td><td style='width:calc(100% - 30px);padding-left:6px;vertical-align:top'>";
				t+= "<div class='commentHeader'><span class='userName'>" + userName + "</span><span class='commentDate'>" + comDate + "</span></div>";
				t+= content + "</td></tr></table>";
				d.innerHTML = t;
				parentElement.appendChild(d);
            }
    	}
    }
}

function autoGrowMyComment(e){
	var d;
	if (e){
        d = e.currentTarget;
	} else {
        d = document.getElementById("newCommentContent");
	}
	resize();
	var pane= document.getElementById("artifactPane");
	d.style.height = "0";
	d.style.height = d.scrollHeight;
}

function resolveReviewComment(e){
    var comContainer = e.currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
	var commentId = "";
	if (comContainer.attributes["commentId"]){
		commentId = comContainer.attributes["commentId"].value;
		//FIXME need to make a POST to close this comment.
		comContainer.classList.add("resolved");
		$(e.target).hide();
	} else {
		alert("Could not find the comment ID. Can't resolve this comment. Contact Dave to troubleshoot.");
	}
}

function saveReviewComment(e){
	var saveComment = false;
	var textArea;
	
    
    if (e.originalEvent.type=="click"){
        saveComment = true
        textArea = e.currentTarget.parentElement.parentElement.parentElement.parentElement.getElementsByTagName("textarea")[0];
    } else {
    	if (e.originalEvent.ctrlKey){
			if (e.originalEvent.keyCode==83){
				e.preventDefault();
                saveComment = true;
                textArea = e.currentTarget;
			}
		}
    }
    
	if (saveComment){
		if (textArea.value == ""){
            alert("Can't save an empty comment.");
		} else {
			var comContainer = textArea.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
			var replyTo = "";
			if (comContainer.attributes["commentId"]){
                replyTo = comContainer.attributes["commentId"].value;
			}
			alert("Saving..." + textArea.value);
			
			var c = new Object();
			var csArtId = curSelection.ArtifactId.replace("a", "cs");
			c.artifactId = Number(curSelection.ArtifactId.substr(curSelection.ArtifactId.indexOf("a") + 1));
			c.moduleId = Number(curSelection.ModuleId);
			c.changeSetId = curChangeSet;
			c.userId = gMyUserId;
			c.artifactLastModified = gArtifacts[csArtId][0].modified;
			c.commentDate = new Date().toISOString();
			c.commentText = textArea.value;
            c.replyTo = replyTo;
            
            //POST c to the comment save php file.
			textArea.value = "";

			var controlPass = new Object()
			controlPass.currentTarget = textArea;
			autoGrowMyComment(controlPass);
			setTimeout(trackComment(controlPass), 50);
		}
	}
}

function trackComment(e){
	var thisSaveButton;
	var thisCommentContainer;
	var thisText;
	if (e==null){
		thisSaveButton = document.getElementById("btnSaveReviewComment");
		thisCommentContainer = document.getElementById("myCommentEntry").parentElement;
		thisText = document.getElementById("newCommentContent").value;
	} else {
		thisCommentContainer = e.currentTarget.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement;
		thisSaveButton = thisCommentContainer.getElementsByClassName("saveButton")[0].parentElement;
		thisText = e.currentTarget.value;
		if (e.currentTarget.id == "newCommentContent"){
			gMyCommentText = thisText;
		}
	}
	if (thisText!=""){
		thisCommentContainer.classList.add("editing");
		thisSaveButton.classList.add("visible");
		thisSaveButton.classList.remove("hidden");
	} else {
		thisCommentContainer.classList.remove("editing");
		thisSaveButton.classList.remove("visible");
		thisSaveButton.classList.add("hidden");
	}
}

function clickComment(e){
	if (!((e.target.tagName=="svg")||(e.target.tagName=="path"))){
		if (!(e.currentTarget.classList.contains("resolved"))){
			var d = e.currentTarget;
			var replyDivCheck = d.getElementsByClassName("replyEditor");
			var isCommentCreateDiv = (d.firstChild.id=="myCommentEntry");
			if ((replyDivCheck.length==0)&&(!isCommentCreateDiv)){
				addReplyDiv(d);
			}
		}
	}
}

function addReplyDiv(toDiv){
	var d = document.createElement("div");
	d.classList.add("subComment");
	d.classList.add("replyEditor");
	var userName = UserNames[gMyUserId];
	var userPhoto = getUserPhoto(gMyUserId);
	d.id = "replyToDiv";
	var saveButtonHTML = "<div class='hidden' style='margin:-2px;float:right;'><svg width='15' class='svgButton saveButton' viewBox='0 0 20 20'><title>Save Comment (Ctrl+S)</title><path d='M0 2C0 .9.9 0 2 0h14l4 4v14a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V2zm5 0v6h10V2H5zm6 1h3v4h-3V3z'/></svg></div>";
	content = "<textarea class='commentTextArea' placeholder='Reply...' rows='1' autocomplete='off'></textarea>";
	var t = "<table style='width:100%;'><tr><td style='width:30px;'><img class='subCommentAvatar' src='";
	t += userPhoto + "'></td><td style='width:calc(100% - 30px);padding-left:6px;vertical-align:top'>";
	t += "<div class='commentHeader'><span class='userName'>" + userName + "</span><span class='commentDate'>" + saveButtonHTML + "</span></div>";
	t += content + "</td></tr></table>";
	d.innerHTML = t;
	var saveButton = d.getElementsByTagName("svg")[0];
	var ta = d.getElementsByTagName("textarea")[0];
	$(ta).on('change keyup keydown paste cut', autoGrowMyComment);
	$(ta).on('keyup', trackComment);
	$(ta).on('keydown', saveReviewComment);
	$(saveButton).on('click', saveReviewComment);
	toDiv.appendChild(d);
}

function hideLoader(){
    var lDiv = document.getElementById("loadingInfo");
	lDiv.classList.add("hidden");
	lDiv.classList.remove("visible");
}

function startLoading(moduleId, text) {
    var lDiv = document.getElementById("loadingInfo" + moduleId);
    document.getElementById("loadingInfo" + moduleId + "Text").innerHTML = text;
    
    lDiv.classList.remove("hidden");
    lDiv.classList.add("visible");
}

function loadingText(moduleId, text) {
    document.getElementById("loadingInfo" + moduleId + "Text").innerHTML = text;
}

function endLoading(moduleId) {
    var lDiv = document.getElementById("loadingInfo" + moduleId);
        lDiv.classList.add("hidden");
        lDiv.classList.remove("visible");
}

function loadArtifactsInBackground() {
    var moduleIds = Object.keys(gModules);
    for (var mId of moduleIds) {
        loadModuleInfo(mId);
        loadModuleComments(mId, curChangeSet);
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
    if (gChangedArtIDs.indexOf(a.identifier)!=-1){//Track Latest Modified date for clearing review approvals
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
    var pc = Math.round(100*(gModules[modId].totalRequests - gModules[modId].pendingRequests)/gModules[modId].totalRequests);
    loadingText(modId, "Loading " + pc + "%");
    if (gModules[modId].pendingRequests == 0) {
        if (!gArtifactsRequested) {
            if (!gCancelInitialNext){
                nextChange();
            }
            gArtifactsRequested = true;
            loadArtifactsInBackground();
        }
        endLoading(modId);
        populateReviewerInfo();
        resize();
    }
}

function populateCommentCounts(){
	var infoDiv = document.getElementById("prCommentsInfo");
	var unresolved = 0;
	var resolved = 0;
	var commentsPlusReplies = 0;
    
	for (var modId in gModuleComments){
		var moduleComments = gModuleComments[modId];
		for (var c of moduleComments){
			if (gChangedArtIDs.indexOf(c.artifactId.toString())!=-1){
				var cResolved = (c.state=="Resolved");
				if (cResolved){
					resolved++;
				} else {
					unresolved++;
				}
				commentsPlusReplies++;
				if (c.replies){
					commentsPlusReplies += c.replies.length;
				}

				if (gReviewerInfo[c.userId]){
					if (cResolved){
						gReviewerInfo[c.userId].resolvedThreads++;
					} else {
						gReviewerInfo[c.userId].unresolvedThreads++;
					}
				} else {
					var userInfo = new Object();
					userInfo.userName = UserNames[c.userId];
					userInfo.artifactsNotReviewed = [];
					if (cResolved){
						userInfo.resolvedThreads = 1;
						userInfo.unresolvedThreads = 0;
					} else {
						userInfo.resolvedThreads = 0;
						userInfo.unresolvedThreads = 1;
					}
					gReviewerInfo[c.userId] = userInfo;
				}
			}
		}
	}
    infoDiv.innerHTML = unresolved + " Unresolved Threads<br>" + resolved + " Resolved Threads<br>" + (unresolved + resolved) + " Total Threads<br>" + commentsPlusReplies + " Total Comments";
    populateReviewerInfo();
}

function populateReviewerInfo(){
	var allModulesLoaded = true;
	for (var key of Object.keys(gModules)){
		if (gModules[key].pendingRequests > 0 ){
			allModulesLoaded = false;
		}
	}
	var allCommentsLoaded = (!(document.getElementById("prCommentsInfo").innerHTML == "Loading..."));

	if (allModulesLoaded && allCommentsLoaded){

		var tBody = document.getElementById("reviewerInfoBody");
		var rInfo = "";
		for (var userId of Object.keys(gReviewerInfo)){
			var pc = 0;
			if (gReviewerInfo[userId].reviewed){
				pc = 1;
				if (gReviewerInfo[userId].artifactsNotReviewed.length>0){
					pc = 1 - (gReviewerInfo[userId].artifactsNotReviewed.length/gChangedArtIDs.length);
					if (pc > 0.99){
						pc = 0.99; //Ensure that someone with artifacts not reviewed gets a 99%.
					}
				}
			}
			pc = Math.round(pc*100);
			rInfo += "<tr><td style='text-align:left;padding-left:10px;'>" + gReviewerInfo[userId].userName + "</td><td>" + gReviewerInfo[userId].unresolvedThreads + "</td><td>" + gReviewerInfo[userId].resolvedThreads + "</td><td>" + pc + "%</td></tr>";
		}

		tBody.innerHTML = rInfo;
		if (gReviewerInfo[gMyUserId]){
			if (gReviewerInfo[gMyUserId].reviewed){
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
	gMyCommentText = "";
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
				if (cT.indexOf(curChangeSet)!=-1){ //Filter out comments about other change sets.
					var userInfo = new Object();
					userInfo.userName = c.creator.name;
					userInfo.userId = c.creator.userId;
					userInfo.reviewed = true;
					userInfo.artifactsNotReviewed = [];
					userInfo.resolvedThreads = 0;
					userInfo.unresolvedThreads = 0;
					var lModText = cT.substr(cT.indexOf(lModMarker) + lModMarker.length);
					userInfo.lastModified = lModText.substr(0, lModText.indexOf("&quot;"));
					if (gReviewerInfo[userInfo.userId]){
						if (userInfo.lastModified > gReviewerInfo[userInfo.userId].lastModified){
							gReviewerInfo[userInfo.userId].lastModified = userInfo.lastModified;
						}
						gReviewerInfo[userInfo.userId].reviewed = true;
					} else {
						gReviewerInfo[userInfo.userId] = userInfo;
					}
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
    document.getElementById("prCommentsInfo").innerHTML = "Loading...";
    document.getElementById("reviewerInfoBody").innerHTML = "<tr><td>Loading...</td></tr>";
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
        newLoader.classList.add("loader");
        newLoader.innerHTML = newLoaderText.replaceAll("\"loadingInfo","\"loadingInfo" + gMod.id);
        moduleDiv.appendChild(newLoader);
        container.appendChild(moduleDiv);
        gMod.div = moduleDiv;

        gModules[m.identifier] = gMod;
        if (!firstModule){ //Setup first Module Div to load fast
            firstModule = gMod.id;
            gMod.div.style = "display:block";
            resize();
        }
    }
    loadModuleInfo(firstModule);
    loadModuleComments(firstModule, curChangeSet);
}

function loadModuleInfo(modId){
    var m = gModules[modId];
    if (!m.artifactDetailsLoaded){//Allow only one load of artifact details (in case user is clicky)
        gModules[modId].artifactDetailsLoaded = true;
        var firstRow = true;
        gModules[modId].pendingRequests = m.artifacts.length;
        gModules[modId].totalRequests = m.artifacts.length;
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
                gModules[modId].totalRequests++;
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
            startLoading(modId, "Loading 5%");
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
        const url = RTCURL() + 'rpt/repository/workitem?fields=workitem/workItem[id=' + workItemId + ']/(id|summary|auditableLinks/*/*)';
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
    document.getElementById("changeSetReviewItems").innerHTML = "Loading...";
    document.getElementById("changeSetDeliveredItems").innerHTML = "Loading...";
    var WI = response[0];
    if (WI){
        gWIId = WI.id;
        if (gWIId==document.getElementById("workItemInput").value){
            document.getElementById("searchWiInfo").innerHTML = WI.id + ": " + WI.summary;
            document.getElementById("wiInfo").innerHTML = WI.id + ": " + WI.summary;
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
            if (changeSets.length==0){
            	document.getElementById("changeSetDeliveredItems").innerHTML = "None"
            	document.getElementById("changeSetReviewItems").innerHTML = "None";
            } else {
            	changeSets.forEach(changeSet=>{
					pendingRequests++;
					getREST(changeSet, addChangeSetInfo);
				});
            }
            
        }
    } else {
        showWIError();
    }
}

function addChangeSetInfo(response){
   pendingRequests--;
    var changeSetInfo = response[0];
    var changeSetTitle = changeSetInfo['dcterms:title'];
    var csCreator ="";
    if (changeSetInfo["dcterms:creator"]){
        csCreator = changeSetInfo["dcterms:creator"]["rdf:resource"];
		csCreator = csCreator.substr(csCreator.lastIndexOf("/")+1);
		csCreator = UserNames[csCreator];
		csCreator = "\nBy: " + csCreator;
    }
    var csCreated = changeSetInfo["dcterms:created"];
    var csCreatedPretty = "Created: " + getTimeLabel(csCreated).prettyDate + csCreator;
    if (document.getElementById("changeSetDeliveredItems").innerHTML == "Loading..."){
		document.getElementById("changeSetDeliveredItems").innerHTML = "None";
	}
	if (document.getElementById("changeSetReviewItems").innerHTML == "Loading..."){
		document.getElementById("changeSetReviewItems").innerHTML = "None";
	}

	var parentDiv;
    if (changeSetTitle.indexOf("(delivered)") != -1) {
        if (document.getElementById("changeSetDeliveredItems").innerHTML == "None"){
			document.getElementById("changeSetDeliveredItems").innerHTML = "";
		}
        const changeSetReviewItem = document.createElement('div');
        changeSetReviewItem.setAttribute("title", csCreatedPretty);
        changeSetTitle = changeSetTitle.substr(0, changeSetTitle.indexOf("(delivered)"));
        changeSetReviewItem.innerHTML = changeSetTitle;
        var d = document.getElementById('changeSetDeliveredItems');
        var insertAtEnd = true;
        if (d.children.length > 0){
            for (var item of d.children){
            	if (item.innerHTML > changeSetTitle){
            		insertAtEnd = false;
                    d.insertBefore(changeSetReviewItem, item);
            		break;
            	}
            }
        }
        if (insertAtEnd){
        	d.appendChild(changeSetReviewItem);
        }
    } else {
        if (document.getElementById("changeSetReviewItems").innerHTML == "None"){
            document.getElementById("changeSetReviewItems").innerHTML = "";
        }
        var changeSetReviewItem = document.createElement('div');
        changeSetReviewItem.setAttribute("created", changeSetInfo["dcterms:created"]);
        changeSetReviewItem.setAttribute("title", csCreatedPretty);
        var changeSetLink = document.createElement("a");
        changeSetLink.href = '';
        changeSetLink.innerHTML = changeSetTitle;
        changeSetLink.addEventListener('click', event=>navigateToReview(event, changeSetInfo));
        changeSetReviewItem.appendChild(changeSetLink);
        
        var d = document.getElementById('changeSetReviewItems');
        var insertAtEnd = true;
        if (d.children.length > 0){
            for (var item of d.children){
            	if (item.attributes.created.value > changeSetInfo["dcterms:created"]) {
            		insertAtEnd = false;
                    d.insertBefore(changeSetReviewItem, item);
            		break;
            	}
            }
        }
        if (insertAtEnd){
        	d.appendChild(changeSetReviewItem);
        }
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


function nextArtWComments() {
    gCurrentArtIndex++;
    var nextFound = false;
    for (i = gCurrentArtIndex; i<gOrderedArtifacts.length; i++){
    	var divId = "m" + gOrderedArtifacts[i].ModuleId + "a" + gOrderedArtifacts[i].ArtifactId;
        if (gArtifactsWithShownComments.indexOf(divId)!=-1){
			nextFound = true;
			gCurrentArtIndex = i;
			break;
        }
    }
    if (!nextFound){
        alert("Reached the last artifact with comments matching the filter! Continuing from start.");
        gCurrentArtIndex = 0;//Start from beginning if none found after.
        for (i = gCurrentArtIndex; i<gOrderedArtifacts.length; i++){
            var divId = "m" + gOrderedArtifacts[i].ModuleId + "a" + gOrderedArtifacts[i].ArtifactId;
			if (gArtifactsWithShownComments.indexOf(divId)!=-1){
				gCurrentArtIndex = i;
				break;
            }
        }
    }
    setSelArtifact();
}

function prevArtWComments() {
    gCurrentArtIndex--;
    var prevFound = false;
    for (i = gCurrentArtIndex; i >= 0; i--){
        var divId = "m" + gOrderedArtifacts[i].ModuleId + "a" + gOrderedArtifacts[i].ArtifactId;
        if (gArtifactsWithShownComments.indexOf(divId) !=- 1){
			prevFound = true;
			gCurrentArtIndex = i;
			break;
        }
    }
    if (!prevFound){
        alert("Reached the first artifact with comments matching the filter! Continuing from end.");
        gCurrentArtIndex = gOrderedArtifacts.length-1;//Start from end if none found before.
        for (i = gCurrentArtIndex; i >= 0; i--){
            var divId = "m" + gOrderedArtifacts[i].ModuleId + "a" + gOrderedArtifacts[i].ArtifactId;
            if (gArtifactsWithShownComments.indexOf(divId) !=- 1){
				gCurrentArtIndex = i;
				break;
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
            var msgText;
            if (gReviewerInfo[gMyUserId]){
            	if (gReviewerInfo[gMyUserId].artifactsNotReviewed.length > 0 ){
            		msgText = "Reviewed " + gReviewerInfo[gMyUserId].artifactsNotReviewed.length + " additional changes to";
            	} else {
            		msgText = "Done reviewing";
            	}
            } else {
            	msgText = "Done reviewing";
            }
            addWIComment(msgText + " " + CSLink + "." + hiddenInfo);
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

function getUserPhoto(userId){
    if (UserPhotos[userId]==null){
		userNumber++;
		if (userNumber>8){
			userNumber = 1;
		}
		UserPhotos[userId] = "images/user" + userNumber + ".svg";
    }
    return UserPhotos[userId];
}

function initCLMUserInfo(){
	if (UserNames==null){
		UserNames = new Object();
		var url = RTCURL() + "oslc/users";
        returnAllOSLCResults(url, CLMUserInfoReturn, true);
	}
	
}

function CLMUserInfoReturn(data){
	var userNumber = 0;
	for (var u of data){
		UserNames[u.userId] = u.title;
		if (u.photo.url){
			UserPhotos[u.userId] = u.photo.url;
		} else {
            //We handle the population of the user photos when we add comments to help get different colors per user from the 8 options available.
		} 
	}
}
function showHideResolvedComments(){
	gShowResolvedComments = !gShowResolvedComments;
	filterComments();
	setupShowHideResolvedCommentsButton();
}

function showHideOthersComments(){
	gShowOthersComments = !gShowOthersComments;
	filterComments();
	setupShowHideOthersCommentsButton();
}

function showHideUnansweredComments(){
	gShowUnansweredComments = !gShowUnansweredComments;
	filterComments();
	setupShowHideUnansweredCommentsButton();
}

function filterComments(){
	var rDivs = gCommentPane.getElementsByClassName("Resolved");
    var oDivs = gCommentPane.getElementsByClassName("anothersComment");
    var uDivs = gCommentPane.getElementsByClassName("unansweredComment");
    var unresolvedCommentsCount = gCommentPane.children.length - rDivs.length -1; //Extra 1 is the "New Comment" entry
    document.getElementById("commentSummary").innerHTML = unresolvedCommentsCount + " Unresolved";
    //First, show all that should be shown
    if (gShowOthersComments){
    	for (d of oDivs){
        	$(d).show();
        }
    }
    if (gShowResolvedComments){
    	for (d of rDivs){
        	$(d).show();
        }
    }
    if (gShowUnansweredComments){
    	for (d of uDivs){
        	$(d).show();
        }
    }
    //Then, hide all that should be hidden
    if (!gShowOthersComments){
    	for (d of oDivs){
        	$(d).hide();
        }
    }
    if (!gShowResolvedComments){
    	for (d of rDivs){
        	$(d).hide();
        }
    }
    if (!gShowUnansweredComments){
    	for (d of uDivs){
        	$(d).hide();
        }
    }
    
    gArtifactsWithShownComments = [];
    for (var modId in gModuleComments){
    	for (var cIndex in gModuleComments[modId]){
    		var show = true;
    		var c = gModuleComments[modId][cIndex];
    		if (!gShowOthersComments){
                if (c.userId!=gMyUserId){
                	show = false;
                }
    		}
    		if (!gShowResolvedComments){
                if (c.state=="Resolved"){
                	show = false;
                }
    		}
            if (!gShowUnansweredComments){
                if (isUnanswered(c)){
                	show = false;
                }
    		}
            if (show){
                gArtifactsWithShownComments.push("m" + modId + "a" + c.artifactId);
            }
    	}
    }


}

