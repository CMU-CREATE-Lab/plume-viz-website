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
 
    // populate selector options
    let sensorOverlaySelector = srcWindow.document.getElementById("sensorOverlaySelector")
    if (sensorOverlaySelector) {

      let sensorOverlaySelectorOptions = {
        "AirViz tVOC Sensors": {
          sensorSearchText: "tVOC",
        },
        "All PM2.5 Sensors": {
          sensorSearchText: "PM2",
          sensorSearchNegativeTerms: [],
          markerSize: 10.0,
        },
        "ACHD PM2.5 Sensors": {
          sensorSearchText: "ACHD PM2",
          sensorSearchNegativeTerms: ["RAMP"],
        },
        "RAMP PM2.5 Sensors": {
          sensorSearchText: "RAMP PM2",
          sensorSearchNegativeTerms: [],
        },
        "PurpleAir PM2.5 Sensors": {
          sensorSearchText: "Purple PM2",
          markerSize: 10.0,
        },
        "ACHD SO2 Sensors": {
          sensorSearchText: "ACHD SO2",
          sensorSearchNegativeTerms: ["RAMP"],
        },
        "RAMP SO2 Sensors": {
          sensorSearchText: "RAMP SO2",
          sensorSearchNegativeTerms: [],
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