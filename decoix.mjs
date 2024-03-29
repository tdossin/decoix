// decoix

import scrape from "website-scraper";
import * as plugins from "website-scraper/plugins";
// import PuppeteerPlugin from "website-scraper-puppeteer"; // TODO: not sure if we need this yet
import liveServer from "live-server";

const decoixTarget =
  "https://www.pikespeak.edu/_training/degree-search-test.php"; // URL for the page you want to duplicate
const decoixDirectory = "./_pikes_peak_157224"; // Local folder for the website files
const decoixHost = "127.0.0.2"; // Host to use for local website
const decoixPort = "8888"; // Port to use for local website

// Install the required packages
//> npm i
// Declare your variables and run the script
//> npm run decoix

const scrapeOptions = {
  urls: [decoixTarget],
  directory: decoixDirectory,
  recursive: false,
  maxRecursiveDepth: null,
  subdirectories: [
    { directory: "", extensions: [".html", ".ico"] },
    {
      directory: "_resources/images",
      extensions: [".jpg", ".png", ".svg", ".gif", ".mp4"],
    },
    { directory: "_resources/js", extensions: [".js"] },
    { directory: "_resources/css", extensions: [".css"] },
    {
      directory: "_resources/fonts",
      extensions: [".woff", ".woff2", ".eot", ".ttf"],
    },
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
  root: decoixDirectory, // Set root directory that's being served
  wait: 1000, // Waits for all changes, before reloading (ms)
};

console.warn("Scraping URL: " + decoixTarget + "...");

// create promise
scrape(scrapeOptions).then((result) => {
  console.log("Scrape complete!");
  console.log("...");
  console.warn(
    "Serving directory '" + decoixDirectory + "' @",
    serverParams.host + ":" + serverParams.port
  );
  // start local server
  liveServer.start(serverParams);
});

// remove any unneeded external URL calls (blogs, trackers, etc.) to eliminate CORS errors
