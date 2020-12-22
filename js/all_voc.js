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