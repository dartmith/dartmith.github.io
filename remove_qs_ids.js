var currentRef;
var working = false;

$(function() {
	// this function is run when the document is ready.
	gadgets.window.adjustHeight;
    
    $("#loadingDiv").hide();
	$("#btnExecute").on("click", function() {
		working = true;
		if (document.getElementById('btnExecute').innerHTML == 'Analyze Module'){
			buildInfo(currentRef);
		} else {
            buildInfo(currentRef, true);
		}
	});
});

// Subscribe to the ARTIFACT_SAVED event 
RM.Event.subscribe(RM.Event.ARTIFACT_SAVED, function(ref) {
	if (working==false){
		ResetWidget();
	}
});

// Subscribe to the ARTIFACT_OPENED event 
RM.Event.subscribe(RM.Event.ARTIFACT_OPENED, function(ref) {
	working = false;
	// this function is invoked whenever the user opens an artifact
	// the parameter "ref" is an RM.ArtifactRef and is a reference
	// to the artifact that was just opened.  
	//
	// We'll use this ref and ask for the FORMAT of the artifact it refers
	// to, if it's a module, we can go ahead and display the UID info.
	ResetWidget();
	RM.Data.getAttributes(ref, RM.Data.Attributes.FORMAT, function(opResult) {
		if (opResult.code === RM.OperationResult.OPERATION_OK) {
			var attrs = opResult.data[0];
			if (attrs.values[RM.Data.Attributes.FORMAT] === RM.Data.Formats.MODULE) {
				$("#btnExecute").show();
				$("#moduleInfo").hide();
				gadgets.window.adjustHeight();
				currentRef = ref;
			} else {
				// it's not a module so hide the widget.
				$("#btnExecute").hide();
				$("#moduleInfo").show();
				gadgets.window.adjustHeight();
			}
		}
	});
});

function ResetWidget(){
	working = false;
	document.getElementById('info').innerHTML= "";
	document.getElementById('btnExecute').innerHTML = 'Analyze Module';
	$("#loadingDiv").hide();
	$("#infoDiv").show();
	gadgets.window.adjustHeight();
}

function buildInfo(ref, saveChanges=false) {
	// This function builds the explorer tree
	// 
	// First, given the reference to the opened artifact,
	// fetch the structure, and in addition ask for the attributes
	// Name, Identifier, Is Heading, Section Number and Depth.
    $("#loadingDiv").show();
    $("#infoDiv").hide();

	gadgets.window.adjustHeight();

	// Note that we can ask for any attributes we want in this call, e.g.
	// below we ask for the "Status" attribute, you could use additional
	// attributes to modify the appearance of the explorer.
	RM.Data.getContentsStructure(ref, [
		RM.Data.Attributes.PRIMARY_TEXT,
		RM.Data.Attributes.IDENTIFIER,
		"UID"
	], function(opResult) {
		// this function is invoked when the call to fetch the structure
		// along with the attributes we asked for has completed.
		
		if (opResult.code === RM.OperationResult.OPERATION_OK) {
			// good news, the call worked, so lets get the
			// data from the result, this is an Array of RM.StructureNode
			// objects.
			var rows = opResult.data,
				totalArtifactsWithUID = 0,
				artifactsToMove = [],
                artifactsWhichCantMove = [];
			
			// iterate over the rows, the forEach method of Array calls
			// the supplied function for every element in an array.
			rows.forEach(function(row) {
				
				var content = row.values[RM.Data.Attributes.PRIMARY_TEXT],
					id = row.values[RM.Data.Attributes.IDENTIFIER],
					uid = row.values["UID"],
					node;
				if (content!=null){
					if (content.indexOf("[UID:") > 0 ){
						if (uid===undefined){
							artifactsWhichCantMove.push(row);
						} else {
							artifactsToMove.push(row);
						}
						totalArtifactsWithUID++;
					}
				}
			});
            
            if (saveChanges){
                moveUIDs(artifactsToMove);
            } else {
            	var msg = '';
            	if (totalArtifactsWithUID > 0 ){
            		if (artifactsWhichCantMove.length > 0 ){
						msg = artifactsToMove.length + " of " + totalArtifactsWithUID + " artifacts containing UIDs can be processed.<br>The remaining "+ artifactsWhichCantMove.length + " artifacts do not have a UID attribute.";
					} else {
                        msg = "All " + totalArtifactsWithUID + " artifacts containing UIDs can be processed.";
					}
            	} else {
            		msg = "This module has no artifacts with UIDs.";
            	}
            	working = false;
            	document.getElementById('info').innerHTML= msg;
				document.getElementById('btnExecute').innerHTML = 'Execute';
				$("#infoDiv").show();
				$("#loadingDiv").hide();
				gadgets.window.adjustHeight();
            }
		}
	});
}

function moveUIDs(artifactsToMove){
	var toSave = [];
	var problems = "";
	if (artifactsToMove.length > 0){
		artifactsToMove.forEach(function(item){
			var curText = item.values[RM.Data.Attributes.PRIMARY_TEXT];
			var UIDs = [];
			var curUID = item.values["UID"];
			var sRng = 0;
			var eRng = 1;

			while (eRng > 0) {
				sRng = curText.indexOf("[UID:", eRng);
				if (sRng > 0) {
					eRng = curText.indexOf("]", sRng);
					if (eRng > 0 ){
						if ((eRng - sRng)<13){//Limit how long the UID can be, in case the closing bracket is missing
							UIDs.push(curText.substr(sRng + 5, eRng-sRng-5).trim());
							curText = curText.substr(0, sRng).trimEnd() + ' ' + curText.substr(eRng + 1).trimStart();
						} else {
							problems = problems + "Inconsistent usage of '[UID:' was found in artifact " + item.values[RM.Data.Attributes.IDENTIFIER] + "\n";	
						}
					} else {
						eRng = 0;
						problems = problems + "Inconsistent usage of '[UID:' was found in artifact " + item.values[RM.Data.Attributes.IDENTIFIER] + "\n";
					}
				} else {
					eRng = 0;
				}
			}

			item.values[RM.Data.Attributes.PRIMARY_TEXT] = curText;
			item.values["UID"] = UIDs.join(", ");

			var attrVal = new RM.AttributeValues();
			var artAttrs = new RM.ArtifactAttributes();
			artAttrs.values = attrVal;
			artAttrs.ref = item.ref;
			attrVal[RM.Data.Attributes.PRIMARY_TEXT] = curText;
			if ((curUID==null)||(curUID=='')){
				attrVal['UID'] =  UIDs.join(", ");
			} else {
				attrVal['UID'] =  curUID + ", " + UIDs.join(", ");
			}

			toSave.push(artAttrs);
		});

		  // Perform a bulk save for all changed artifacts

		RM.Data.setAttributes(toSave, function(result){
			var msg = '';
			if(result.code == RM.OperationResult.OPERATION_OK) {
				if (problems=='') {
					msg = "Operation Successful!";
				} else {
					msg = "Operation Successful, with the following warnings:<br>" + problems;
				}
			} else {
				msg = "Operation Failed with result:<br>" + result;
			}
			document.getElementById('info').innerHTML= msg;
			document.getElementById('btnExecute').innerHTML = 'Analyze Module';
			$("#loadingDiv").hide();
			$("#infoDiv").show();
			gadgets.window.adjustHeight();
			window.setTimeout(working = false, 4000);
		});
	} else {
		working = false;
		document.getElementById('info').innerHTML= "There were no artifacts to modify.";
		document.getElementById('btnExecute').innerHTML = 'Analyze Module';
		$("#loadingDiv").hide();
		$("#infoDiv").show();
		gadgets.window.adjustHeight();
	}
}
