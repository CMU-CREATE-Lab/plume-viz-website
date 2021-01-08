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

    // just add the default option
    let sensorOverlaySelector = srcWindow.document.getElementById("sensorOverlaySelector")
    if (sensorOverlaySelector) {
      let optionElement = srcWindow.document.createElement("option")
      optionElement.text = "VOC Sensors"
      sensorOverlaySelector.add(optionElement)
    }

    // change options here
    sensorOverlayOptions.sensorSearchText = "tVOC"
    sensorOverlayOptions.colorMapAmplificationFactor = 1.0
    sensorOverlayOptions.colorizerLookupFunctionFactory = (feedId, channelName) => {
      return (value) => {
          if (value === undefined) {
        return [0,0,0,0]; // transparent
          } else if (value < 350.0) {
        return [0.0, 0.7, 0.0, 1.0]; // green
          } else if (value < 1000) {  
        return [1.0, 1.0, 0.0, 1.0]; // yellow
          } else {
        return [1.0, 0.0, 0.0, 1.0]; // red
          }
      }
    }

    // dispatch back to overlay
    srcWindow.sensorOverlaySetOptions(sensorOverlayOptions)

  }

  $(setIframeSrc);
})();