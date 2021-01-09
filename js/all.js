(function () {
  "use strict";

  var util = new edaplotjs.Util();

  function setIframeSrc() {
    var $viz_iframe = $("#viz-iframe");
    var url_end = window.location.search;
    var src;
    if (url_end == "") {
      src = "plume_viz.html?showAll=true";
    }
    else {
      src = "plume_viz.html" + url_end + "&showAll=true";
    }
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
    //   if (channelName.indexOf("PM2") > -1) {
    //     return (value) => {
    //       // EPA PM2.5 scale
    //       if (value === undefined) {
    //         return [0,0,0,0]; // transparent
    //       } else if (value < 15.0) {
    //         return [0.0, 0.7, 0.0, 1.0]; // green
    //       } else if (value < 40) {  
    //         return [1.0, 1.0, 0.0, 1.0]; // yellow
    //       } else if (value < 65) {  
    //         return [1.0, 0.6, 0.0, 1.0]; // orange
    //       } else if (value < 150) {  
    //         return [1.0, 0.0, 0.0, 1.0]; // red
    //       } else if (value < 250) {  
    //         return [1.0, 0.0, 0.9, 1.0]; // purple
    //       } else {
    //         return [0.18, 0.0, 0.0, 1.0]; // maroon
    //       }
    //     }
    //   }
    //   if (channelName.indexOf("SO2") > -1) {
    //     return (value) => {
    //       // EPA PM2.5 scale
    //       if (value === undefined) {
    //         return [0,0,0,0]; // transparent
    //       } else if (value < 35.0) {
    //         return [0.0, 0.7, 0.0, 1.0]; // green
    //       } else if (value < 75) {  
    //         return [1.0, 1.0, 0.0, 1.0]; // yellow
    //       } else if (value < 185) {  
    //         return [1.0, 0.6, 0.0, 1.0]; // orange
    //       } else if (value < 304) {  
    //         return [1.0, 0.0, 0.0, 1.0]; // red
    //       } else if (value < 604) {  
    //         return [1.0, 0.0, 0.9, 1.0]; // purple
    //       } else {
    //         return [0.18, 0.0, 0.0, 1.0]; // maroon
    //       }
    //     }
    //   }
    // }

    // populate selector options
    let sensorOverlaySelector = srcWindow.document.getElementById("sensorOverlaySelector")
    if (sensorOverlaySelector) {

      let sensorOverlaySelectorOptions = {
        "AirViz tVOC Sensors": {
          sensorSearchText: "tVOC",
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        "All PM2.5 Sensors": {
          sensorSearchText: "PM2",
          sensorSearchNegativeTerms: [],
          markerSize: 10.0,
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        "ACHD PM2.5 Sensors": {
          sensorSearchText: "ACHD PM2",
          sensorSearchNegativeTerms: ["RAMP"],
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        "RAMP PM2.5 Sensors": {
          sensorSearchText: "RAMP PM2",
          sensorSearchNegativeTerms: [],
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        "PurpleAir PM2.5 Sensors": {
          sensorSearchText: "Purple PM2",
          colorizerLookupFunctionFactory: (value) => undefined,
          markerSize: 10.0,
        },
        "ACHD SO2 Sensors": {
          sensorSearchText: "ACHD SO2",
          sensorSearchNegativeTerms: ["RAMP"],
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        "RAMP SO2 Sensors": {
          sensorSearchText: "RAMP SO2",
          sensorSearchNegativeTerms: [],
          colorizerLookupFunctionFactory: (value) => undefined,
        },
        // "AirViz tVOC Sensors (gradient)": {
        //   sensorSearchText: "tVOC",
        //   colorizerLookupFunctionFactory: (value) => undefined,
        // },
        // "All PM2.5 Sensors (gradient)": {
        //   sensorSearchText: "PM2",
        //   sensorSearchNegativeTerms: [],
        //   colorizerLookupFunctionFactory: (value) => undefined,
        // },
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