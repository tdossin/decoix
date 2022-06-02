// Decoix

import scrape from "website-scraper";
import * as plugins from "website-scraper/plugins";
//import PuppeteerPlugin from "website-scraper-puppeteer"; // not sure if we need this yet
import liveServer from "live-server";
import path from "path";

const scrapeTarget = "https://www.yale.edu/"; // URL for the page you want to duplicate
const scrapeToDirectory = "./_ORIG_NOPLUGIN"; // Local folder for the website files
const decoixHost = "127.0.0.2"; // Host to use for local website
const decoixPort = "8888"; // Port to use for local website

// Use Node to run the scraper script by typing
// > node scraper.mjs

const scrapeOptions = {
  urls: [scrapeTarget],
  directory: scrapeToDirectory,
  recursive: false,
  maxRecursiveDepth: null,
  subdirectories: [
    { directory: "", extensions: [".html", ".ico"] },
    { directory: "img", extensions: [".jpg", ".png", ".svg", ".gif"] },
    { directory: "vid", extensions: [".mp4"] },
    { directory: "js", extensions: [".js"] },
    { directory: "css", extensions: [".css"] },
    { directory: "fonts", extensions: [".woff", ".woff2", ".eot", ".ttf"] },
    { directory: "orphans", extensions: ["."] },
  ],
  // plugins: [
  //   new PuppeteerPlugin({
  //     launchOptions: { headless: false } /* optional */,
  //     scrollToBottom: { timeout: 10000, viewportN: 10 } /* optional */,
  //     blockNavigation: false /* optional */,
  //   }),
  // ],
};

const serverParams = {
  host: decoixHost, // Set the address to use for the local server
  port: decoixPort, // Set the server port
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
