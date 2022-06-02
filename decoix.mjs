// Handy Dandy Website Scraper

const scrapeTarget = "/";
// This is the URL you want to scrape

const scrapeToDirectory = "./_ORIG";
// This is where the scraped files will be placed on your computer

// Go to the scrapeToDirectory and initialize it as an npm project by typing
// > npm init -y

// Required: NodeJS/npm, 'website-scraper', 'live-server' packages

// if you haven't done so, install the required packages
// > npm i website-scraper live-server -g

import scrape from "website-scraper";
import * as plugins from "website-scraper/plugins";
import liveServer from "live-server";
import path from "path";

// Use Node to run the scraper script by typing
// > node scraper.mjs

const scrapeOptions = {
  urls: [scrapeTarget],
  directory: scrapeToDirectory,
  subdirectories: [
    { directory: "img", extensions: [".jpg", ".png", ".svg"] },
    { directory: "vid", extensions: [".mp4"] },
    { directory: "js", extensions: [".js"] },
    { directory: "css", extensions: [".css"] },
    { directory: "fonts", extensions: [".woff", ".woff2", ".eot", ".ttf"] },
  ],
};

const serverParams = {
  port: 8888, // Set the server port
  host: "127.0.0.2", // Set the address to use for the local server
  root: scrapeToDirectory, // Set root directory that's being served
  wait: 1000, // Waits for all changes, before reloading (ms)
};

console.warn("Scraping URL: " + scrapeTarget + "...");

// with promise
scrape(scrapeOptions).then((result) => {
  console.log("Scrape complete!");
  console.log("...");
  console.warn(
    "Serving directory '" + scrapeToDirectory + "' @",
    serverParams.host + ":" + serverParams.port
  );
  // start local server
  liveServer.start(serverParams);
});

// remove any unneeded external URL calls (blogs, trackers, etc.) to eliminate CORS errors
