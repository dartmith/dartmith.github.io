var oTooltip = new(function () {
    var nOverX, nOverY, nLeftPos, nTopPos, oNode, bOff = true;
    this.active = function () {
        return !bOff;
    };

    this.follow = function (e) {
        if (bOff) { return; }
        var mouseX = e.clientX, mouseY = e.clientY;
        nLeftPos += mouseX - nOverX;
        nTopPos += mouseY - nOverY;
        oNode.style.left = nLeftPos + "px";
        oNode.style.top = nTopPos + "px";
        nOverX = mouseX; nOverY = mouseY;
    };

    this.remove = function () {
        if (bOff) { return; }
        bOff = true;
        document.body.removeChild(oNode);
    };

    this.setContent = function (content) {
        oNode.innerHTML = content;
    };

    this.show = function (content) {
        oNode.style.display = '';
    };

     this.hide = function (content) {
        oNode.style.display = 'none';
    };
    
    this.append = function (oMsEvnt2, sTxtContent, className, initX, initY) {
        //the event and sTxtContent is required. ClassName, initX and Y are optionally provided to change the default appearance.
        if (className==null){
            className = 'puptip';
        }
        oNode.className = className;
        oNode.innerHTML = sTxtContent;
        oNode.style.display = '';
        if (bOff) {
            document.body.appendChild(oNode);
            bOff = false;
        }
        if ((initX==null)||(initY==null)){
            var nScrollX = document.documentElement.scrollLeft || document.body.scrollLeft;
            var nScrollY = document.documentElement.scrollTop || document.body.scrollTop;
            var nWidth = oNode.offsetWidth + 50;
            var nHeight = oNode.offsetHeight + 30;
            nOverX = oMsEvnt2.clientX;
            nOverY = oMsEvnt2.clientY;
            nLeftPos = document.body.offsetWidth - nOverX - nScrollX > nWidth ? nOverX + nScrollX + 10 : document.body.offsetWidth - nWidth + 16;
            if (nOverY + nHeight < window.innerHeight) {
                nTopPos = nOverY + nScrollY + 20;
            } else {
                if (nOverY + nScrollY - nHeight < 0) {
                    nTopPos = nOverY + nScrollY + 20;
                } else {
                    nTopPos = nOverY + nScrollY - nHeight + 20;
                }
            }
        } else {
            nOverX = oMsEvnt2.clientX;
            nOverY = oMsEvnt2.clientY;
            
            nLeftPos = initX;
            nTopPos = initY;
        }
        
        oNode.style.left = nLeftPos + "px";
        oNode.style.top = nTopPos + "px";
    };

    this.init = function () {
        oNode = document.createElement("div");
        oNode.style.position = "absolute";
    };
})();