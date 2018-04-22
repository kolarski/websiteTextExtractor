import {EventEmitter} from 'events';
const chromeLauncher = require('chrome-launcher');
const CDP = require('chrome-remote-interface');

export default class Spider extends EventEmitter {
    rootUrl: string;
    options: {[key: string]: any } = {
        noExternalUrls: true,
        skipIfUrlContains: [],
        debug: false,
        pageLimit: 100000,
        extractText: 'document.getElementsByTagName(\'body\')[0].innerText'
    };
    visited: Set<string> = new Set();
    queue: Array<string> = [];
    constructor(rootUrl: string, options: {[key: string]: any }) {
        super();
        this.rootUrl = rootUrl;
        this.options = Object.assign(this.options, options);
        this.init();
    }
    init () {
        this.visited = new Set();
        this.queue = [this.rootUrl];
    }
    addUrlToQueue(url: string) {
        this.queue.push(url);
        this.emit('new-queue-url', url);
    }
    addUrlToVisited(url: string, body: string) {
        this.visited.add(url)
        this.emit('visited', {url, body});
    }
    async run() {
        this.init();
        const chrome = await chromeLauncher.launch({
            chromeFlags: [
                '--disable-gpu',
                '--headless',
                '--blink-settings=imagesEnabled=false'
            ]
        });
        const protocol = await CDP({
            port: chrome.port
        });

        const {DOM, Page, Runtime} = protocol;
        await Promise.all([Page.enable(), Runtime.enable(), DOM.enable()]);
        
        
        while(this.queue.length > 0 && (this.visited.size < this.options.pageLimit)) {
            const currentUrl = this.queue.pop();
            if (typeof currentUrl === 'undefined') continue;
            if (this.options.debug === true) console.log('Visiting... ', decodeURIComponent(currentUrl));
            if (this.options.debug === true) console.log('Queue Size: ', this.queue.length);
            
            await Page.navigate({ url: currentUrl });
            await Page.loadEventFired();
            const links = `JSON.stringify({
                links: [...document.links].map(l => {
                    return l.href.split('#')[0].toLowerCase();
                }).filter(l => {
                    return l.indexOf(top.location.host.toString()) !== -1
                }),
                body: ${this.options.extractText}
            })`;
            console.log(links);
            const result = await Runtime.evaluate({ expression: links });
            
            if (typeof result.result.value === 'undefined') {
                this.emit('unprocessable-result', result.result, currentUrl);
                continue;
            }
            const r = JSON.parse(result.result.value);
            
            if (this.options.skipIfUrlContains.length > 0) {
                r.links = r.links.filter((link: string) => {
                    let keepLink = true;
                    this.options.skipIfUrlContains.forEach((skipString: string) => {
                        if(link.indexOf(skipString) !== -1) {
                            keepLink = false;
                            this.emit('skiped-result', link);
                            return;
                        }
                    });
                    return keepLink;
                })
            }
            
            const newLinks: Set<string> = new Set(r.links);
            
            [...newLinks].forEach((url: string) => {
                if (!this.visited.has(url) && this.queue.indexOf(url) === -1) {
                    this.addUrlToQueue(url);
                }
            });
            console.log(r.body);
            this.addUrlToVisited(currentUrl, r.body);
        }
        this.emit('finished');
        protocol.close();
        chrome.kill(); 
    }
}