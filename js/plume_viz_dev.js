(function () {
  "use strict";

  var util = new edaplotjs.Util();
  var timeline;
  var url_root = "https://cocalc-www.createlab.org/pardumps/video/";
  var date_to_index;
  var current_date = "2019-04-02";

  // Handles the sending of cross-domain iframe requests.
  function post(type, data) {
    pm({
      target: window.parent,
      type: type,
      data: data,
      origin: document.referrer
    });
  }

  // Send the query string to the parent page, so that the parent can set the query string
  function sendQueryStringToParent(updated_query_url) {
    post("update-parent-query-url", updated_query_url);
  }

  function getShareQuery(date_str) {
    return "?date=" + date_str;
  }

  function buildDateIndexMap(data) {
    var m = {};
    var L = data.length;
    for (var i = 0; i < L; i++) {
      var d = data[i];
      m[d[3]] = L - i - 1;
    }
    return m;
  }

  function setDateFromShareURL() {
    var query_paras = util.parseVars(window.location.search);
    if ("date" in query_paras) {
      if (Object.keys(date_to_index).indexOf(query_paras["date"]) > -1) {
        current_date = query_paras["date"];
      }
    }
    timeline.selectBlockByIndex(date_to_index[current_date]);
  }

  function init() {
    var $vid = $("#video-viewer");
    util.addVideoClearEvent();
    $.getJSON("data/plume_viz_dev.json", function (data) {
      // Build the dictionary that maps date to the block index
      date_to_index = buildDateIndexMap(data["data"]);
      // Create timeline
      var timeline_setting = {
        select: function ($e, obj) {
          var metadata = $e.data();
          $vid.one("canplay", function () {
            // Play the video
            util.handleVideoPromise(this, "play");
          });
          $vid.prop("src", url_root + metadata["file_name"]);
          util.handleVideoPromise($vid.get(0), "load"); // load to reset video promise
          var updated_query_url = getShareQuery(metadata["date"])
          sendQueryStringToParent(updated_query_url);
          util.setShareUrl(updated_query_url);
        },
        colorBin: [0, 16, 32, 46, 77, 183],
        colorRange: ["#ededed", "#dbdbdb", "#afafaf", "#848383", "#545454", "#000000"],
        useColorQuantiles: true,
        data: data["data"],
        columnNames: data["columnNames"],
        dataIndexForLabels: 0, // columnNames[0] is used for the label of the block
        dataIndexForColors: 1 // columnNames[1] is used for the color of the block
      };
      timeline = new edaplotjs.TimelineHeatmap("timeline-container", timeline_setting);
      setDateFromShareURL();
    });
  }

  $(init);
})();