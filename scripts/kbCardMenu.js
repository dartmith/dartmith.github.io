var debug = false;
var cardMenu = new(function () {
    var menu;
    var preW;
    var card;

    this.show = function (e) {
        //This function builds a menu that provides options for moving a card's state, reassigning the owner, etc. The event listener shall be placed on the kbCard class.
        this.closeMenu();
        card = getParentCard(e.target);
        card.classList.add('kbCardMenuActive');
        WI = WIsObj[card.id];
        var m = "<div id='openWIButton' class='menuButton' onclick='nowEditing();window.open(\"" + WI.url + "\", \"_blank\");'>Edit</div>";
        
        mStates = StateIdtoNextValidStateName[WI.state.id];
        m += "<div class='menuSeparator'>Move To:</div>";
        for (var s of mStates){
            oC = "moveCard(" + card.id + ", \"" + s + "\");cardMenu.closeMenu(event);"; 
            m += "<div onclick='" + oC + "' class='menuButton'>" + s + "</div>";
        }
        m += "<div class='menuSeparator'>Other Actions:</div>";
        if (myUserName!=WI.ownedBy.title){
            m += "<div onclick='takeOwnership(" + card.id + ");cardMenu.closeMenu(event);' class='menuButton'>Take Ownership</div>";
        }
        oC = "createWICopy(" + card.id + ");cardMenu.closeMenu(event);";
        m += "<div onclick='" + oC + "' class='menuButton'>Copy</div>";
        oC = "showNewCommentForm(" + card.id + ");cardMenu.closeMenu(event);"; 
        m += "<div onclick='" + oC + "' class='menuButton'>Add Comment</div>";

        menu = document.createElement("div");
        preW = document.createElement("div");

        if (debug==false){
            menu.addEventListener("mouseleave", function(){
                cardMenu.closeMenu();
            });
        }
        menu.style.position = preW.style.position = "absolute";
        menu.className = preW.className = 'kbMenu';
        preW.id = 'preWCard';
        preW.style.textAlign="left";
        preW.style.padding="10px";
        preW.innerHTML = getWIPreview(WI);
        menu.innerHTML = m;
        document.body.appendChild(menu);
        document.body.appendChild(preW);
        preW.style.width="calc(50% - 44px)";
        preW.style.top = "12px";
        preW.style.marginBottom = "12px";

        var menuWidth = menu.offsetWidth;
        var menuHeight = menu.offsetHeight;
        var X = e.clientX;
        var Y = e.clientY;
        var bodyWidth = document.body.offsetWidth;
        var bodyHeight = document.body.offsetHeight;
        var maxMenuLeft = bodyWidth;
        if (X < bodyWidth/2){   //Cursor on left half.
            maxMenuLeft = bodyWidth/2;
        }
        var menuLeft = maxMenuLeft - X > menuWidth ? X - 3 : maxMenuLeft - menuWidth - 3;

        if (X < bodyWidth/2){   //Cursor on left half.
            var pLeft = menuLeft + menuWidth + 12;
        } else {                //Cursor on right half
            var pLeft = menuLeft + 12- bodyWidth/2;
        }
        preW.style.left = pLeft + "px";

        var menuTop = 0;
        var resizeNeeded = false;
        if (Y + menuHeight < bodyHeight) {
            menuTop = Y - 3;
        } else {
            menuTop = Y - menuHeight + 3;
            if (menuTop <0){
                menuTop = Y - 3;//If the window is simply too small, then resize the gadget to fit the menu.
                resizeNeeded = true;
            } else {
                menu.appendChild(document.getElementById('openWIButton'));
            }
        }

        menu.style.left = menuLeft + "px";
        menu.style.top = menuTop + "px";

        if (resizeNeeded){
            resize();
        }
    };
    this.closeMenu = function(){
        if (menu!=null){
            document.body.removeChild(menu);
            document.body.removeChild(preW);
            card.classList.remove('kbCardMenuActive');
            card = null;
            menu=null;
            resize();
        }
    }

    function getWIPreview(WI){
        var c = "<div style='float:right;width:100px;height:100px;'><img style='background-color:white;height:100px;' src='" + UserPhoto[WI.ownedBy.title] + "'></div>";
        c+="<div style='font-size:20px;font-weight:bold;'>";
        c+=WI.type.title;
        c+=" " + WI.id;
        c+="</div>";
        
        c+="<div style='padding-bottom:10px;'>" + WI.title + "</div>";
        c+="<table id='prevWIPropTable'>";
        c+="<tr><td>Owner:</td><td></td><td>" + WI.ownedBy.title + "</td></tr>";
        c+="<tr><td>State:</td><td><img src='" + WI.state.iconUrl + "'/></td><td>" +  WI.state.title + "</td></tr>";
        c+="</table>";

        c+='<div id="preWIloading" style="height:calc(100% - 100px);margin:auto;clear:right;position:relative"><div style="margin:0;position:absolute;top:50%;left:50%;margin-right:-50%;transform:translate(-50%,-50%);text-align:center;"><div>';
        c+='<svg width="32" height="32" viewBox="0 0 42 42"><defs><linearGradient x1="8.042%" y1="0%" y2="100%" id="b"><stop stop-color="#000" stop-opacity="0" offset="0%"/><stop stop-color="#000" stop-opacity=".231" offset="63.146%"/><stop stop-color="#000" offset="100%"/></linearGradient></defs><g fill="none" fill-rule="evenodd"><g transform="translate(1 1)"><path d="M36 20c0-9.94-8.06-20-20-20" stroke="url(#b)" stroke-width="6"><animateTransform attributeName="transform" type="rotate" from="0 20 20" to="360 20 20" dur="0.75s" repeatCount="indefinite"/></path></g></g></svg>';
        c+='</div><div style="color:grey;">Loading</div></div> </div>';

        var OSLCproperties = 'dc:creator{*},oslc_cm:priority{*},rtc_cm:plannedFor{dc:title},dc:description,rtc_cm:filedAgainst{dc:title},dc:created,rtc_cm:comments{*{*}},dc:subject';
        getWorkingWI(WI.id, OSLCproperties, cardMenu.displayWIPreview);
        return c;
    }
    this.displayWIPreview = function displayWIPreview(WI){
        var preW = document.getElementById('preWCard');
        var loadingIcon = document.getElementById('preWIloading');
        preW.removeChild(loadingIcon);
        var noneSpan = "<span style='color:grey'>None</span>";
        var div = document.createElement('div');
        var c = "";
        if (preW!=null){
            var propTable = document.getElementById('prevWIPropTable');
            var propRows = [];
            propRows.push("<td>Priority:</td><td><img src='" + WI.priority.iconUrl + "'/></td><td>" +  WI.priority.title + "</td>");
            propRows.push("<td>Iteration:</td><td></td><td>" +  WI.plannedFor.title + "</td>");
            propRows.push("<td>Category:</td><td></td><td>" +  WI.filedAgainst.title + "</td>");
            for (var row of propRows){
                var curRow = document.createElement('tr');
                curRow.innerHTML = row;
                propTable.appendChild(curRow);
            }
            c+="<div style='padding-top:10px;font-weight:bold;'>Description</div>";
            var WIDesc = WI.description;
            if (WIDesc==''){
                WIDesc = noneSpan;
            }
            c+="<div>" + WIDesc + "</div>";
            var comLen = Object.keys(WI.comments).length;
            c+="<div style='padding-top:10px;font-weight:bold;'>Comments</div>";
            if (comLen>0){
                for (var i = comLen-1; i>=0; i--){
                    var com = WI.comments[i];
                    var uIcon = "<div class='photoDiv'><img class='userPhoto' src='"+ getUserPhoto(com.creator) + "'></div>";
                    var ts = getTimeLabel(com.created);
                    c+= "<div class='namePlate' style='border-bottom-right-radius:16px;'>" + uIcon + "<div class='namePad' style='padding-right:16px;'>" + com.creator.title + "<div style='font-weight:normal;color:grey;float:right'" + ts.title + ">" + ts.timeAgo + "</div></div></div>";
                    c+="<div style='padding-left:16px;padding-bottom:10px;'>" + com.description + "</div>";
                }
            } else {
                c+="<div>" + noneSpan + "</div>";
            }
        }
        div.innerHTML = c;
        preW.appendChild(div);
        resize();
    }

})();