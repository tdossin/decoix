// Handy Dandy Website Scraper

const scrapeTarget = "/"; // This is the URL for the page you want to duplicate

const scrapeToDirectory = "./_ORIG"; // This is the local folder for the website files

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

// create promise
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
