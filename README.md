# Node.JS package for scraping and text extraction

The packet provides simple API to extract the text information from websites. 

It contains two main modules:
* Site crawer
* Text extraction module

It uses Headless Chrome for web scraping and supports all SPA/JS websites.

### Performance note
The library simulates human behaviour (using Chrome browser) and loads the pages sequantually so you won't get good crawing speeds as you might by just grabbing the HTML source code of the URL. 

In future versions I might add option to fall back if possible to fast concurent crawer if page can be scraped without full blown browser.

## Usage
```js
const options = { // For all available options look below...
   skipIfUrlContains: [
        '.pdf'
   ]
}
const spider = new Spider('https://www.toureiffel.paris/en', options);
await spider.run();
```
Now you can hook to the events from the scraper like so: 
```js
spider.on('visited', (data: any) => {
    console.log(data.url, data.body);
});
spider.on('finished', () => {
    console.log('Scraping completed');
});
spider.on('unprocessable-result', (response, url) => {
    console.log(response, url);
});
spider.on('skiped-result', (url) => {
    console.log(url);
});
```

Available Scraper Options:

* extractText
* pageLimit
* debug
* skipIfUrlContains


# Future development: 
* Unit tests
* Switch to using Puppeteer
* Option to scrape predefined list of URLs
* Duplicated text analysis and removal (Menus and fixed texts on every page)
* Respect robots.txt

Note: Library is still WIP and not production ready.



#### Author: Alex Kolarski <aleks.rk@gmail.com>