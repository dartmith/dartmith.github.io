/*
 Licensed Materials - Property of IBM
 mod-exp.js
 � Copyright IBM Corporation 2014

U.S. Government Users Restricted Rights:  Use, duplication or disclosure restricted by GSA ADP Schedule Contract with IBM Corp. 
*/
var lastClicked;
var $loadingImage;

$(function() {
	// this function is run when the document is ready.
	$loadingImage = $("<div style='margin:0;position:absolute;top:50%;left:50%;margin-right:-50%;transform:translate(-50%,-50%);text-align:center;'><div><svg width='32' height='32' viewBox='0 0 42 42'><defs><linearGradient x1='8.042%' y1='0%' y2='100%' id='a'><stop stop-color='#000' stop-opacity='0' offset='0%'/><stop stop-color='#000' stop-opacity='.231' offset='63.146%'/><stop stop-color='#000' offset='100%'/></linearGradient></defs><g fill='none' fill-rule='evenodd'><g transform='translate(1 1)'><path d='M36 20c0-9.94-8.06-20-20-20' stroke='url(#a)' stroke-width='6'><animateTransform attributeName='transform' type='rotate' from='0 20 20' to='360 20 20' dur='0.75s' repeatCount='indefinite'/></path></g></g></svg></div><div style='color:grey;'>Loading</div></div>");
	gadgets.window.adjustHeight(0);
});

// Subscribe to the ARTIFACT_OPENED event 
RM.Event.subscribe(RM.Event.ARTIFACT_OPENED, function(ref) {
	// this function is invoked whenever the user opens an artifact
	// the parameter "ref" is an RM.ArtifactRef and is a reference
	// to the artifact that was just opened.  
	//
	// We'll use this ref and ask for the FORMAT of the artifact it refers
	// to, if it's a module, we can go ahead and build the explorer.
	$("#explorer").empty();
	RM.Data.getAttributes(ref, RM.Data.Attributes.FORMAT, function(opResult) {
		if (opResult.code === RM.OperationResult.OPERATION_OK) {
			var attrs = opResult.data[0];
			if (attrs.values[RM.Data.Attributes.FORMAT] === RM.Data.Formats.MODULE) {
				gadgets.window.adjustHeight(200);
				buildExplorer(ref);
			} else {
				// it's not a module so empty the explorer.
				gadgets.window.adjustHeight(0);
			}
		}
	});
});

function buildExplorer(ref) {
	// This function builds the explorer tree
	// 
	// First, given the reference to the opened artifact,
	// fetch the structure, and in addition ask for the attributes
	// Name, Identifier, Is Heading, Section Number and Depth.

	$loadingImage.appendTo($("#explorer"));


	// Note that we can ask for any attributes we want in this call.
	RM.Data.getContentsStructure(ref, [
		RM.Data.Attributes.NAME,
		RM.Data.Attributes.IDENTIFIER,
		RM.Data.Attributes.IS_HEADING,
		RM.Data.Attributes.SECTION_NUMBER,
		RM.Data.Attributes.DEPTH
	], function(opResult) {
		$("#explorer").empty();
		
		// this function is invoked when the call to fetch the structure
		// along with the attributes we asked for has completed.
		
		if (opResult.code === RM.OperationResult.OPERATION_OK) {
			// good news, the call worked, so lets get the
			// data from the result, this is an Array of RM.StructureNode
			// objects.
			var rows = opResult.data,
				parent = $("#explorer"),
				deepest = 1,
				idToNodeMap = {}; // we'll use this map to keep a list of
								  // ID to DOM Elements
			
			// iterate over the rows, the forEach method of Array calls
			// the supplied function for every element in an array.
			rows.forEach(function(row) {
				
				var hasChildren = (row.children.length > 0),
					depth = row.values[RM.Data.Attributes.DEPTH],
					isHeading = row.values[RM.Data.Attributes.IS_HEADING],
					section = row.values[RM.Data.Attributes.SECTION_NUMBER],
					title = row.values[RM.Data.Attributes.NAME],
					id = row.values[RM.Data.Attributes.IDENTIFIER],
					node;
				if (hasChildren){
					var test = false;
					row.children.forEach(element => {
						if (element.values[RM.Data.Attributes.IS_HEADING]){
							test = true;
						}
					});
					hasChildren = test;
				}
				// Above, we worked out whether the row has any children,
				// we read it's depth, whether it is a heading, it's section
				// it's title and it's ID.

				// we want to indent items based on their depth, we'll add a
				// CSS class to the node we create to help achieve this.
				if (depth > 6) {
					depth = "depthGreaterThan6";
				}

				if (depth > deepest) {
					deepest = depth;
				}
				
				// create a span node with a class of "item",
				// fill it's contents depending on whether the row
				// is a heading or not.  Change this code to control
				// the display of each row in the explorer adding more
				// or less information if desired.
				if (isHeading){
					var item = $("<span class='item'><span class='sectionNumber'>"+section+"</span>&nbsp"+title+"</span>")
							.addClass("heading")
							.on("click", function(event) {
								// Call the RM.Client.setSelection method
								// suppling the RM.ArtifactRef which refers
								// to the current row
								RM.Client.setSelection(row.ref);
								var n = event.target.parentElement;
								if (n===lastClicked){
									event.target.parentElement.classList.toggle("collapsed");
								} else {
									lastClicked = n;
									event.target.parentElement.classList.remove("collapsed");
								}
								
								setTimeout(gadgets.window.adjustHeight);
							});
				
					// if the row has a parent, extract the DOM node we will already
					// have made
					if (row.parent) {
						parent = idToNodeMap[row.parent.values[RM.Data.Attributes.IDENTIFIER]];
					} else {
						// if it has no parent, it is a top level item, so add it
						// to the explorer.
						parent = $("#explorer");
					}

					

					// create a div to wrap the span we made, and add it
					// to the appropriate parent.							
					node = $("<div class='row collapsed depth"+depth+"'></div>")
							.append(item)
							.appendTo(parent);

					// store this node in our map, we need to convert the 
					// id to a string, hence the ""+ at the beginning.
					// the map is just a simple JavaScript object it 
					// be of the form :
					// {
					//	 "433": DOMElement,
					//	 "512": DOMElement
					// }
					
					idToNodeMap[""+id] = node;

					// Finally, if our row has children, add
					// an "expander" - the little plus or minus
					// to toggle the children
					if (hasChildren) {
						var expander = $("<div class='expander'></div>")
							.on("click", function() {
								// we show or hide items simply by adding or removing a class we'll
								// write CSS rules to hide or show nodes based on the presence of this class
								node.toggleClass("collapsed");
								setTimeout(gadgets.window.adjustHeight);
							});
							
						node.addClass("parent").append(expander);
					}
				}
			});

			gadgets.window.adjustHeight();
			// On IE10 if the extension is collapsed, the adjust height
			// call results in an incorrect height of 2px, so even when you expand
			// the extension it only grows to 2px, check here that the
			// height is at least 155 which is the minimum height.
			setTimeout(function() {
				if (gadgets.window.getHeight() < 155) {
					gadgets.window.adjustHeight(155);
				}
			});
		}
	});
	
}


