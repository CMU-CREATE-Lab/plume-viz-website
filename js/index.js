(function () {
  "use strict";

  var util = new edaplotjs.Util();

  function setIframeSrc() {
    var $viz_iframe = $("#viz-iframe");
    var src = "plume_viz.html" + window.location.search;
    $viz_iframe.prop("src", src);
  }

  // Handles the cross-domain request from the iframe child
  pm.bind("update-parent-query-url", function (updated_query_url) {
    util.setShareUrl(updated_query_url);
  });

  window.sensorOverlayLoaded = (srcWindow, sensorOverlayOptions) => {

    // change options here
    sensorOverlayOptions.sensorSearchText = "tVOC"
    sensorOverlayOptions.colorMapAmplificationFactor = 1.0
    sensorOverlayOptions.markerSize =  15.0
    sensorOverlayOptions.sizerLookupFunctionFactory = (feedId, channelName) => {
      if (channelName.indexOf("tVOC") > -1) {
        return (value) => {
          return Math.min(Math.max(Math.sqrt(value/10.0)+5.0, 5.0), 25.0)
        }
      }
      else if ((channelName.indexOf("PM2") > -1) || (channelName.indexOf("PM025") > -1)) {
        return (value) => {
          return Math.min(Math.max(Math.sqrt(value)+3.0, 3.0), 25.0)
        }
      }
      else if (channelName.indexOf("SO2_PPM") > -1) {
        return (value) => {
          return Math.min(Math.max(Math.sqrt(1000.0*value*10.0)+5.0, 5.0), 25.0)
        }
      }
      else if (channelName.indexOf("SO2") > -1) {
        return (value) => {
          return Math.min(Math.max(Math.sqrt(value*10.0)+5.0, 5.0), 25.0)
        }
      }
      else {
        return (value) => sensorOverlayOptions.markerSize
      }
    }
    // sensorOverlayOptions.colorizerLookupFunctionFactory = (feedId, channelName) => {
    //   if (channelName.indexOf("tVOC") > -1) {
    //     return (value) => {
    //       if (value === undefined) {
    //         return [0,0,0,0]; // transparent
    //       } else if (value < 350.0) {
    //         return [0.0, 0.7, 0.0, 1.0]; // green
    //       } else if (value < 1000) {  
    //         return [1.0, 1.0, 0.0, 1.0]; // yellow
    //       } else {
    //         return [1.0, 0.0, 0.0, 1.0]; // red
    //       }
    //     }
    //   }
    // }

    // populate selector options
    let sensorOverlaySelector = srcWindow.document.getElementById("sensorOverlaySelector")
    if (sensorOverlaySelector) {

      let sensorOverlaySelectorOptions = {
        "No Monitors": {
          sensorSearchText: "RAMP",
          sensorSearchNegativeTerms: ["RAMP"],
        },
	"AirViz tVOC Monitors": {
          sensorSearchText: "tVOC",
          colorizerLookupFunctionFactory: (value) => undefined,
        },

        "All PM2.5 Monitors": {
          sensorSearchText: "PM",
          sensorSearchNegativeTerms: [],
          markerSize: 10.0,
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        "ACHD PM2.5 Monitors": {
          sensorSearchText: "ACHD PM2",
          sensorSearchNegativeTerms: ["RAMP"],
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        "RAMP PM2.5 Monitors": {
          sensorSearchText: "RAMP PM",
          sensorSearchNegativeTerms: ["PurpleAir"],
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        "PurpleAir PM2.5 Monitors": {
          sensorSearchText: "Purple PM2",
          colorizerLookupFunctionFactory: (value) => undefined,
          markerSize: 10.0,
        },
        "ACHD SO2 Monitors": {
          sensorSearchText: "ACHD SO2",
          sensorSearchNegativeTerms: ["RAMP"],
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        "RAMP SO2 Monitors": {
          sensorSearchText: "RAMP SO2",
          sensorSearchNegativeTerms: [],
          colorizerLookupFunctionFactory: (value) => undefined,
        },
      }

      // populate UI element
      for (let name in sensorOverlaySelectorOptions) {
        // set default values for unspecified fields from sensorOverlayOptions
        let option = sensorOverlaySelectorOptions[name]
        option = Object.assign({}, sensorOverlayOptions, option)
        sensorOverlaySelectorOptions[name] = option

        // create option element
        let optionElement = srcWindow.document.createElement("option")
        optionElement.text = name
        sensorOverlaySelector.add(optionElement)
      }

      // populate sensor selector
      sensorOverlaySelector.addEventListener("change", (event) => {
        srcWindow.sensorOverlaySetOptions(sensorOverlaySelectorOptions[event.target.value])
      })

    }


    // dispatch back to overlay
    srcWindow.sensorOverlaySetOptions(sensorOverlayOptions)

  }

  $(setIframeSrc);
})();
