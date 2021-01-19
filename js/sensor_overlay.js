

import {StaticMapOverlay} from "./explore/staticMapOverlay.js"
import {ESDR, TiledDataEvaluator} from "./explore/esdrFeeds.js"
import {ImagePeeker} from "./explore/imagePeeker.js"



let isVideoPollingEnabled = false
let lastVideoPlayerTime = undefined
let currentVideoDate = undefined
let currentVideoEpochTime = undefined
let mapOverlay = undefined
let esdr = undefined
let allEsdrFeedsReceived = false
let feedSearchResults = undefined
let feedMarkerColorizers = new Map()
let feedMarkerSizers = new Map()

let overlayOptions = {
	sensorSearchText: "ACHD SO2",
	colorMapAmplificationFactor: 1.0,
	sizerLookupFunctionFactory: () => (() => 15.0),
	markerSize: 15.0,
	// filter out the RAMPS sensors, as their SO2 is unreliable
	sensorSearchNegativeTerms: ["RAMP"],
	// "pm_sensor_voltage" removed
	allowedSensorChannelNames: new Set(["SO2", "SO2_PPM", "SO2_PPB", "tvoc", "tVOC_internal_0", "PM25_UG_M3", "PM2_5", "PM025"]),
	colorizerLookupFunctionFactory: (feedId, channelName) => undefined,
}

function setCurrentVideoTime(videoTime) {
	currentVideoEpochTime = videoTime
	// console.log("video epoch", videoTime)



	for (let [feedId, colorizer] of feedMarkerColorizers) {
		colorizer.setCurrentTime(currentVideoEpochTime)
	}
	for (let [feedId, sizer] of feedMarkerSizers) {
		sizer.evaluator.setCurrentTime(currentVideoEpochTime)
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

function getCurrentTimeRange() {
	if (currentVideoDate)
		return {min: currentVideoDate.getTime()/1000.0, max: currentVideoDate.getTime()/1000.0 + 24*60*60}
	else
		return undefined
}

function colorMapForChannel(feedId, channelName) {
	let colorMap = undefined

		if (channelName.indexOf("SO2") == 0) {
			// Randy's PurpleAir approx color scale for SO2
			let so2max = 8*12 // 8 PPB should be red in this color scale
			if (channelName.indexOf("SO2_PPM") == 0) 
				so2max *= 0.001
			return {texture: "img/purpleair-0-to-1200-colormap.png", range: {min: 0.0, max: so2max}}
		}


	if (!colorMap)
		colorMap = ESDR.sparklineColorMap(feedId, channelName)

	return colorMap
}

function colorMapLookup(feedId, channelName) {
	let colorMap = colorMapForChannel(feedId, channelName)

	if (!colorMap)
		return (value) => undefined

	let imagePeeker = colorMap.texture ? new ImagePeeker(colorMap.texture) : undefined

	if (imagePeeker)
		return (value) => imagePeeker.colorMapLookup(value, colorMap.range)
	else
		return (value) => undefined
}


function colorizeFeedOnMap(feedId, channelName) {
  let colorizer = new TiledDataEvaluator(esdr.dataSourceForChannel(feedId, channelName))

  let colorLookupFunction = overlayOptions.colorizerLookupFunctionFactory(feedId, channelName)

  if (!colorLookupFunction)
  	colorLookupFunction = colorMapLookup(feedId, channelName)

  mapOverlay.setColorizerForFeed(feedId, channelName, colorizer, colorLookupFunction, overlayOptions.colorMapAmplificationFactor)

  let sizer = {
  	sizeForValue: overlayOptions.sizerLookupFunctionFactory(feedId, channelName),
  	evaluator: new TiledDataEvaluator(esdr.dataSourceForChannel(feedId, channelName)),
  }

  mapOverlay.setSizerForFeed(feedId, channelName, sizer)

  feedMarkerColorizers.set(feedId, colorizer)
  feedMarkerSizers.set(feedId, sizer)

  if (currentVideoDate) {
    colorizer.setCurrentRange(getCurrentTimeRange())
    sizer.evaluator.setCurrentRange(getCurrentTimeRange())

    if (currentVideoEpochTime) {
    	colorizer.setCurrentTime(currentVideoEpochTime)
    	sizer.evaluator.setCurrentTime(currentVideoEpochTime)
    }
  }


}

function clearColorizers() {
	for (let [feedId, colorizer] of feedMarkerColorizers) {
	  mapOverlay.setColorizerForFeed(feedId, undefined, undefined)		
	}
	for (let [feedId, sizer] of feedMarkerSizers) {
	  mapOverlay.setSizerForFeed(feedId, undefined, undefined)		
	}
}

function populateColorizers() {
	if (!feedSearchResults)
		return

	let currentTimeRange = getCurrentTimeRange()
	for (let {feedId: feedId, channels: channels} of feedSearchResults) {
		let feed = esdr.feeds.get(feedId)
		// exclude feed names that any contain negative term
		let isExcludedByTerm = overlayOptions.sensorSearchNegativeTerms.some(term => feed.name.indexOf(term) > -1)
		let isExcludedByTime = currentTimeRange && ((parseFloat(feed.maxTimeSecs || 0.0) <= currentTimeRange.max) || (parseFloat(feed.minTimeSecs || 0.0) >= currentTimeRange.min))

		if (isExcludedByTerm || isExcludedByTime || !channels)
			continue

		channels = channels.filter( name => overlayOptions.allowedSensorChannelNames.has(name))
		if (channels.length > 0) {
			// console.log("colorizing", feedId, channels[0])
			colorizeFeedOnMap(feedId, channels[0])
			// esdr.selectChannelWithId(channelId, true)
  		mapOverlay.selectFeed(feedId, true)		
  	}
	}

}


function resetDataSource(feedIds) {
	feedIds = feedIds || esdr.feeds.keys()

	let markerSize = overlayOptions.markerSize || 15.0

  mapOverlay.setDataSource(esdr, {rejectedFeeds: new Set(feedIds), markerSize: markerSize})

}


function esdrFeedsReceived(feedIds, progress) {
	// console.log("esdrFeedsReceived", progress)


  resetDataSource(feedIds)

	if (progress.current == progress.total)
		allEsdrFeedsReceived = true
}


function processEsdrSearchResults(searchResults, isAppendUpdate) {
	// console.log("processEsdrSearchResults", searchResults)

	// don't add dots until all feeds have been received
	if (!allEsdrFeedsReceived)
		return

	feedSearchResults = searchResults

	populateColorizers()

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


function hashChangeListener() {
  // TODO: implement event handling on hash changes
  // - does hash change when we set it via updateUrlHash()?
  // - need to refactor initialization to use the proper methods for setting up the UI based on initial hash and later changes the same way
  console.log("URL hash changed!")
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
		// console.log("theDate", date, minTime, maxTime)

		clearColorizers()
		populateColorizers()
		// for (let [feedId, colorizer] of feedMarkerColorizers) {
  // 		colorizer.setCurrentRange(getCurrentTimeRange(), true)
		// }

		videoTimeChanged(video)
	})

	// coordinates as per Randy's notes in "Plume and Smoke" google doc
	let mapBox = {
		min: {lat: 40.19740606389117, lng: -80.21541759011052},
		max: {lat: 40.65260973628207, lng: -79.61736838677}
	}


	esdr = new ESDR(mapBox)
	mapOverlay = new StaticMapOverlay(overlayDiv, mapBox)

	mapOverlay.colors.defaultFeedFillColor = [0.0, 0.0, 0.0, 0.0]
	mapOverlay.colors.defaultFeedStrokeColor = [0.0, 0.0, 0.0, 0.0]
	mapOverlay.colors.rejectedFeedFillColor = [0.0, 0.0, 0.0, 0.0]
	mapOverlay.colors.rejectedFeedStrokeColor = [0.0, 0.0, 0.0, 0.0]
	mapOverlay.colors.selectedFeedStrokeColor = [0.0, 0.0, 0.0, 0.0]
	mapOverlay.colors.activeFeedStrokeColor = [0.0, 0.0, 0.0, 0.0]
	mapOverlay.markerScreenScale = 600.0

	esdr.searchQuery = {text: overlayOptions.sensorSearchText}

  // install search results callback
  esdr.searchCallback = (searchResults, isAppendUpdate) => processEsdrSearchResults(searchResults, isAppendUpdate)
  // start loading feed data
  esdr.loadFeeds( (feedIds, progress) => esdrFeedsReceived(feedIds, progress) )

  addVideoEventListeners(video)

  window.addEventListener("resize", (event) => {
  	overlayDiv.style.width = `${videoContainer.offsetWidth}px`
		overlayDiv.style.height = `${videoContainer.offsetHeight}px`
  })


	window.addEventListener('hashchange', () => hashChangeListener)

	window.sensorOverlaySetOptions = (sensorOverlayOptions) => {
		clearColorizers()
		feedMarkerColorizers = new Map()
		feedMarkerSizers = new Map()
		overlayOptions = sensorOverlayOptions

		// reset dataSource to be able to change marker size
		resetDataSource()

		esdr.searchQuery = {text: overlayOptions.sensorSearchText}

	}

  if (window.parent.sensorOverlayLoaded)
    window.parent.sensorOverlayLoaded(window, overlayOptions)


}



initSensorOverlay()