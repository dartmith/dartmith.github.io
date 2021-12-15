const applicationURL = () => {
    var href = window.location.href;
    var len = href.indexOf("/", 9);
    var len = href.indexOf("/", len + 1) + 1;
    return href.substr(0, len);
}

const proxyUri = url => {
    if (url.indexOf(applicationURL()) != 0) {
        return applicationURL() + "proxy?uri=" + encodeURIComponent(url);
    }
    return url;
}

const getData = url => {
    let data;
    $.ajax({
        headers: {
            'Accept': 'application/json',
            'OSLC-Core-Version': '2.0'
        },
        async: false,
        url: proxyUri(url),
        success: response => {
            data = response;
        },
        error: response => console.log(response),
    });
    return data;
}

const setErrorMessageForWorkItemInput = msg => {
    let errorContent = document.createElement('p');
    errorContent.innerHTML = msg;

    const errorDiv = document.getElementById('workItemInputError');
    errorDiv.appendChild(errorContent);
}

const getChangeSetUrlsFromWorkItem = workItemId => {
    const url = 'https://maximus:9443/ccm/rpt/repository/workitem?fields=workitem/workItem[id=${workItemId}]/(id|summary|auditableLinks/*/*)';

    const changeSets = [];
    $.ajax({
        url: proxyUri(url),
        headers: {
            'Accept': 'application/json',
            'OSLC-Core-Version': '2.0'
        },
        async: false,
        success: response => {
            if ($.isXMLDoc(response)) {
                const workItemXML = response;
                $workitemXMLSummary = $(workitemXML).find('uri').each((_, val) => {
                    if ($(val).text().includes('changeset')) {
                        changeSets.push($(val).text());
                    }
                });
            }
        },
        error: () => setErrorMessageForWorkItemInput('Invalid Work Item Number, Try Again')
    });

    return changeSets;
}

const setChangedModules = modules => {
    modules.forEach(mod => {
        const lineItemContent = $('<p></p>').attr({
            'class': 'moduleLineContent',
        }).text(mod['rrm:identifier'].content + ': ' + mod['rrm:title'].content);

        const lineItem = $('<a></a>').attr({
            'class': 'moduleLineItem',
            'title': mod['rrm:title'].content,
        }).append(lineItemContent);

        $('#moduleListContainer').append(lineItem);
    });
}

const navigateToReview = (event, changeSetInfo) => {
    //do a loading indicator
    event.preventDefault();

    const url = 'https://maximus:9443/rm/publish/diff?sourceConfigUri='
        + encodeURIComponent(Object.keys(changeSetInfo)[0]) + '&targetConfigUri=' +
        encodeURIComponent('https://maximus:9443/rm/cm/stream/_DsuipgHyEei46vKZzlZU2g');
    const comparisonData = $.xml2json(getData(url));
    const schemaData = getData('https://maximus:9443/rm/publish/comparisons?metadata=schema');

    $('#workItemContainer').hide();
    $('#reviewContainer').css('display', 'flex');
    const artifacts = comparisonData['document']['ds:dataSource']['ds:artifact'];
    const modules = artifacts.filter(artifact => artifact['rrm:format'].content === 'Module');
    setChangedModules(modules);

    // console.log(artifacts);
    // console.log(modules);
    // console.log(getData(url));
    // console.log(comparisonData);
    // console.log(schemaData);
}
// Creates and Adds ChangeSet Items to the DOM
const addChangeSetReviewItems = changeSetInfo => {
    const changeSetTitle = changeSetInfo[Object.keys(changeSetInfo)[0]]['http://purl.org/dc/terms/title'][0].value;

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

    const workItemId = document.getElementById('workItemInput').value;
    const changeSets = getChangeSetUrlsFromWorkItem(workItemId);
    // const changeSets = getChangeSetUrlsFromWorkItem(25238);

    changeSets.forEach(changeSet => {
        const changeSetInfo = getData(changeSet);
        addChangeSetReviewItems(changeSetInfo);
    });
}