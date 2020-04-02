var oTooltip = new(function () {
    var nOverX, nOverY, nLeftPos, nTopPos, oNode, bOff = true;
    this.follow = function (oMsEvnt1) {
        if (bOff) { return; }
        var mouseX = oMsEvnt1.clientX, mouseY = oMsEvnt1.clientY;
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
    
    this.append = function (oMsEvnt2, sTxtContent) {
        oNode.innerHTML = sTxtContent;
        if (bOff) {
            document.body.appendChild(oNode);
            bOff = false;
        }
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

        oNode.style.left = nLeftPos + "px";
        oNode.style.top = nTopPos + "px";
};

this.init = function () {
    oNode = document.createElement("div");
    oNode.className = "puptip";
    oNode.style.position = "absolute";
};
})();