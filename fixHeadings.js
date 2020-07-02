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
		RM.Data.Attributes.NAME,
		RM.Data.Attributes.IDENTIFIER,
		RM.Data.Attributes.IS_HEADING,
		RM.Data.Attributes.SECTION_NUMBER,
		RM.Data.Attributes.DEPTH,
		RM.Data.Attributes.ARTIFACT_TYPE
	], function(opResult) {
		// this function is invoked when the call to fetch the structure
		// along with the attributes we asked for has completed.
		
		if (opResult.code === RM.OperationResult.OPERATION_OK) {
			// good news, the call worked, so lets get the
			// data from the result, this is an Array of RM.StructureNode
			// objects.
			var rows = opResult.data,
				totalHeadings = 0,
				artifactsToMakeHeadingType = [];
			
			// iterate over the rows, the forEach method of Array calls
			// the supplied function for every element in an array.
			rows.forEach(function(row) {
				
				var isHeading = row.values[RM.Data.Attributes.IS_HEADING];
				if (isHeading){
					totalHeadings++;
					var aType = row.values[RM.Data.Attributes.ARTIFACT_TYPE].name;
					if (aType != 'Heading'){
						artifactsToMakeHeadingType.push(row);
					}
				}
			});
            
            if (saveChanges){
                makeHeadings(artifactsToMakeHeadingType);
            } else {
            	var msg = '';
            	if (artifactsToMakeHeadingType.length > 0 ){
            		if (artifactsToMakeHeadingType.length == totalHeadings){
                        msg = "All of the " + totalHeadings + " headings in this module will be changed to be type: 'Heading'. Click Execute to commit the changes.";
            		} else {
            			msg = artifactsToMakeHeadingType.length + " of " + totalHeadings + " headings in this module will be changed to be type: 'Heading'. Click Execute to commit the changes.";
            		}
            	} else {
            		msg = "The headings in this module are all OK.";
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

function makeHeadings(artifactsToMakeHeadingType){
	var toSave = [];
	var problems = "";
	if (artifactsToMakeHeadingType.length > 0){
		artifactsToMakeHeadingType.forEach(function(item){
			toSave.push(item.ref);
		});
        RM.Client.setSelection(toSave);
		  // Perform a bulk save for all changed artifacts
		document.getElementById('info').innerHTML= "Artifacts Selected. Now use the Bulk Arrtibute Change feature to change the artifact type to 'Heading'.";
		document.getElementById('btnExecute').innerHTML = 'Analyze Module';
		$("#loadingDiv").hide();
		$("#infoDiv").show();
		gadgets.window.adjustHeight();
		window.setTimeout(working = false, 4000);
	} else {
		working = false;
		document.getElementById('info').innerHTML= "There were no artifacts to modify.";
		document.getElementById('btnExecute').innerHTML = 'Analyze Module';
		$("#loadingDiv").hide();
		$("#infoDiv").show();
		gadgets.window.adjustHeight();
	}
}
