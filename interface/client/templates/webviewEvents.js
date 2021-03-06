
webviewChangeUrl = function(tabId, e){
    if(e.type === 'did-navigate-in-page' && !e.isMainFrame)
        return;

    var url = Helpers.sanitizeUrl(e.url || this.getURL());

    console.log(e.type, tabId, url);

    // make sure to not store error pages in history
    if(!url || url.indexOf('mist/errorPages/') !== -1)
        return;

    // update the URL
    Tabs.update(tabId, {$set: {
        url: url
    }});
};

// fired by "did-stop-loading"
webviewLoadStop = function(tabId, e){
    var webview = this,
        url = Helpers.sanitizeUrl(webview.getURL()),
        title = webview.getTitle();

    console.log(e.type, tabId, url);

    // IS BROWSER
    if(tabId === 'browser') {

        // ADD to doogle last visited pages
        if((find = _.find(LastVisitedPages.find().fetch(), function(historyEntry){
                if(!historyEntry.url) return;
                var historyEntryOrigin = new URL(historyEntry.url).origin;
                return (url.indexOf(historyEntryOrigin) !== -1);
            })))
            LastVisitedPages.update(find._id, {$set: {
                timestamp: moment().unix(),
                url: url
            }});
        else
            LastVisitedPages.insert({
                name: title,
                url: url,
                // icon: '',
                timestamp: moment().unix()
            });

        // ADD to doogle history
        if(find = History.findOne({url: url}))
            History.update(find._id, {$set: {timestamp: moment().unix()}});
        else
            History.insert({
                name: title,
                url: url,
                // icon: '',
                timestamp: moment().unix()
            });
    }
};


// fired by "did-get-redirect-request"
// fired by "new-window"
// fired by "will-navigate"
webviewLoadStart = function(currentTabId, e){
    var webview = this;

    if(e.type === 'did-get-redirect-request' && !e.isMainFrame)
        return;
    
    // stop this action, as the redirect happens reactive through setting the URL attribute
    e.preventDefault(); // doesnt work
    webview.stop();
    ipc.send('backendAction_stopFocusedWebviewNavigation'); // race condition? cant cancel fast enough sometimes?

    console.log(e.type, currentTabId, e);

    var url = Helpers.sanitizeUrl(e.newURL || e.url);
    var tabId = Helpers.getTabIdByUrl(url);

    // if new window (_blank) open in tab, or browser
    if(e.type === 'new-window' && tabId === currentTabId)
        tabId = 'browser';

    var tab = Tabs.findOne(tabId);

    if(tab.url !== url) {
        Tabs.update(tabId, {$set: {
            redirect: url,
            url: url
        }});
    }
    LocalStore.set('selectedTab', tabId);
};