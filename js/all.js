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

  $(setIframeSrc);
})();