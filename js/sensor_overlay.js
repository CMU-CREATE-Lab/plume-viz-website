

import {StaticMapOverlay} from "./explore/staticMapOverlay.js"
import {ESDR, TiledDataEvaluator} from "./explore/esdrFeeds.js"



let isVideoPollingEnabled = false
let lastVideoPlayerTime = undefined
let currentVideoDate = undefined
let currentVideoEpochTime = undefined
let mapOverlay = undefined
let esdr = undefined
let allEsdrFeedsReceived = false
let feedMarkerColorizers = new Map()


function setCurrentVideoTime(videoTime) {
	currentVideoEpochTime = videoTime
	// console.log("video epoch", videoTime)



	for (let [feedId, colorizer] of feedMarkerColorizers) {
		colorizer.setCurrentTime(currentVideoEpochTime)
	}

}

function videoTimeChanged(video) {
	// console.log("videoTimeChanged")
	// no date set, yet, do nothing
	if (currentVideoDate === undefined) {
		return
	}

	// do nothing if time hasn't actually changed
	let currentVideoTime = video.currentTime
	if (lastVideoPlayerTime === currentVideoTime) {
		return
	}

	lastVideoPlayerTime = currentVideoTime

	let u = currentVideoTime/video.duration
	let timeOffset = 24*60*60*u

	setCurrentVideoTime(currentVideoDate.getTime()/1000.0 + timeOffset)
}

function videoPollAnimationFrameHandler(timestamp, video) {
	videoTimeChanged(video)

	if (isVideoPollingEnabled)
		window.requestAnimationFrame( (timestamp) => videoPollAnimationFrameHandler(timestamp, video) )
}

function startPollingVideoTime(video) {
	if (!isVideoPollingEnabled) {
		isVideoPollingEnabled = true
		window.requestAnimationFrame( (timestamp) => videoPollAnimationFrameHandler(timestamp, video) )
	}
}


function stopPollingVideoTime(video) {
	if (isVideoPollingEnabled) {
		isVideoPollingEnabled = false
	}
}


function colorizeFeedOnMap(feedId, channelName) {
  let colorizer = new TiledDataEvaluator(esdr.dataSourceForChannel(feedId, channelName))

  mapOverlay.setColorizerForFeed(feedId, channelName, colorizer)

  feedMarkerColorizers.set(feedId, colorizer)

  if (currentVideoDate) {
    colorizer.setCurrentRange({min: currentVideoDate.getTime()/1000.0, max: currentVideoDate.getTime()/1000.0 + 24*60*60})

    if (currentVideoEpochTime) {
    	colorizer.setCurrentTime(currentVideoEpochTime)
    }
  }


}

function esdrFeedsReceived(feedIds, progress) {
	// console.log("esdrFeedsReceived", progress)

  mapOverlay.setDataSource(esdr, {rejectedFeeds: new Set(feedIds)})
  // mapOverlay.setDataSource(esdr)

	if (progress.current == progress.total)
		allEsdrFeedsReceived = true
}


function processEsdrSearchResults(searchResults, isAppendUpdate) {
	// console.log("processEsdrSearchResults", searchResults)

	// don't add dots until all feeds have been received
	if (!allEsdrFeedsReceived)
		return

	let so2Names = new Set(["SO2", "SO2_PPM", "SO2_PPB"])

	for (let {feedId: feedId, channels: channels} of searchResults) {
		let feed = esdr.feeds.get(feedId)
		// filter out the RAMPS sensors, as their SO2 is unreliable
		if (feed.name.indexOf("RAMP") > -1)
			continue

		channels = channels.filter( name => so2Names.has(name))
		if (channels.length > 0) {
			// console.log("colorizing", feedId, channels[0])
			colorizeFeedOnMap(feedId, channels[0])
			// esdr.selectChannelWithId(channelId, true)
  		mapOverlay.selectFeed(feedId, true)		
  	}
	}

}

function addVideoEventListeners(video) {
	video.addEventListener("play", (event) => {
		startPollingVideoTime(video)
	})

	video.addEventListener("pause", (event) => {
		stopPollingVideoTime(video)
	})

	video.addEventListener("durationchange", (event) => {
		// console.log("video duration", video.duration)
	})

	video.addEventListener("ended", (event) => {
		// video is on auto loop and just continues
		// stopPollingVideoTime(video)
	})
	video.addEventListener("emptied", (event) => {
		// console.log("emptied")

		// currentVideoDate = undefined
		// currentVideoEpochTime = undefined
		stopPollingVideoTime(video)

	})
	video.addEventListener("loadeddata", (event) => {
		// console.log("loadeddata")
		lastVideoPlayerTime = undefined
		videoTimeChanged(video)
	})

	video.addEventListener("seeked", (event) => {
		videoTimeChanged(video)
	})
	video.addEventListener("timeupdate", (event) => {
		videoTimeChanged(video)

	})
}

function initSensorOverlay() {
	let video = document.getElementById("video-viewer")
	let videoContainer = document.getElementById("video-container")
	let legend = document.getElementById("legend")

	let overlayDiv = document.createElement("div")
	overlayDiv.setAttribute("class", "noselect")
	overlayDiv.style.pointerEvents = "none"
	overlayDiv.style.position = "absolute"
	// overlayDiv.style.zIndex = 1
	overlayDiv.style.top = "0"
	overlayDiv.style.left = "0"
	overlayDiv.style.width = `${videoContainer.offsetWidth}px`
	overlayDiv.style.height = `${videoContainer.offsetHeight}px`
	overlayDiv.style.backgroundColor = "none"

	videoContainer.insertBefore(overlayDiv, legend)


	if (!window.plumeVizDateChangeListeners) {
		window.plumeVizDateChangeListeners = []
	}

	window.plumeVizDateChangeListeners.push((dateString) => {
		// console.log("plumeVizDateChangeListener", dateString)

		// plumeviz videos are in local east-coast time, and change depending on EDT/EST being in effect
		// and also start at 9pm local time the previous day
		let tz = "America/New_York"

		let date = luxon.DateTime.fromISO(dateString, { zone: tz }).minus({ hours: 3, }).toJSDate()
		// console.log("theDate", date)

		currentVideoDate = date

		let minTime = currentVideoDate.getTime()/1000.0
		let maxTime = currentVideoDate.getTime()/1000.0 + 24*60*60
		// console.log("theDate", date, minTime, maxTime)

		for (let [feedId, colorizer] of feedMarkerColorizers) {
  		colorizer.setCurrentRange({min: minTime, max: maxTime}, true)
		}

		videoTimeChanged(video)
	})

	// coordinates as per Randy's notes in "Plume and Smoke" google doc
	let mapBox = {
		min: {lat: 40.19740606389117, lng: -80.21541759011052},
		max: {lat: 40.65260973628207, lng: -79.61736838677}
	}


	esdr = new ESDR(mapBox)
	mapOverlay = new StaticMapOverlay(overlayDiv, mapBox)

	esdr.searchQuery = {text: "ACHD SO2"}

  // install search results callback
  esdr.searchCallback = (searchResults, isAppendUpdate) => processEsdrSearchResults(searchResults, isAppendUpdate)
  // start loading feed data
  esdr.loadFeeds( (feedIds, progress) => esdrFeedsReceived(feedIds, progress) )

  addVideoEventListeners(video)

  window.addEventListener("resize", (event) => {
  	overlayDiv.style.width = `${videoContainer.offsetWidth}px`
		overlayDiv.style.height = `${videoContainer.offsetHeight}px`
  })
}



initSensorOverlay()