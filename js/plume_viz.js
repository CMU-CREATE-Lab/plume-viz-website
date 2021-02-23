(function () {
  "use strict";

  var util = new edaplotjs.Util();
  var timeline;
  var date_to_index;
  var current_date = "2021-02-21"; // the default date
  var current_year = current_date.split("-")[0];
  var widgets = new edaplotjs.Widgets();
  var $calendar_select;
  var $vid;
  var plume_viz_data;

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
    for (var k in data) {
      var m_k = {}
      var data_k = data[k]["data"];
      var L = data_k.length;
      for (var i = 0; i < L; i++) {
        var d = data_k[i];
        m_k[d[3]] = L - i - 1;
      }
      m[k] = m_k;
    }
    return m;
  }

  function initCalendarBtn() {
    $calendar_select = $("#calendar");;

    // Add event to the calendar select
    $calendar_select.on("change", function () {
      var $selected = $calendar_select.find(":selected");
      var selected_value = $selected.val();
      if (selected_value != -1 && selected_value != current_year) {
        current_year = selected_value;
        createTimeline(plume_viz_data[current_year]);
        timeline.selectFirstBlock();
      }
      // Have selector go back to showing default option
      $(this).prop("selectedIndex", 0);

    });
  }

  function drawCalendar(year_list) {
    $calendar_select.empty();
    $calendar_select.append($('<option selected value="-1">Year</option>'));
    for (var i = year_list.length - 1; i >= 0; i--) {
      var year = year_list[i];
      $calendar_select.append($('<option value="' + year + '">' + year + '</option>'));
    }
  }

  // Use the TimelineHeatmap charting library to draw the timeline
  function createTimeline(data) {
    var $timeline_container = $("#timeline-container").empty();
    var timeline_setting = {
      select: function ($e, obj) {
        var metadata = $e.data();
        $vid.one("canplay", function () {
          // Play the video
          util.handleVideoPromise(this, "play");
        });

        // inform potential listeners of date change (like the sensor overlay)
        if (window.plumeVizDateChangeListeners)
          for (var listener of window.plumeVizDateChangeListeners) {
            listener(metadata.date)
          }

        $vid.prop("src", metadata["url"]);
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

    // Add horizontal scrolling to the timeline
    // Needed because Android <= 4.4 won't scroll without this
    addTouchHorizontalScroll($timeline_container);
  }

  function addTouchHorizontalScroll(elem) {
    var scrollStartPos, startTime, endTime, newPos, startTouchX, endTouchX;
    $(elem).on("touchstart", function (e) {
      startTime = new Date().getTime();
      newPos = 0;
      endTouchX = null;
      startTouchX = e.originalEvent.touches[0].pageX;
      scrollStartPos = this.scrollLeft + startTouchX;
      e.preventDefault();
    }).on("touchmove", function (e) {
      endTouchX = e.originalEvent.touches[0].pageX;
      newPos = scrollStartPos - endTouchX;
      this.scrollLeft = newPos;
      e.preventDefault();
    });
  }

  function init() {
    $vid = $("#video-viewer");
    util.addVideoClearEvent();
    widgets.setCustomLegend($("#legend"));
    if ($(window).width() < 450) {
      $( ".custom-legend" ).accordion( "option", "active", false );
    }

    var query_paras = util.parseVars(window.location.search);
    var json_path;
    if ("showAll" in query_paras && query_paras["showAll"]) {
      json_path = "data/plume_viz.json";
    }
    else {
      json_path = "data/plume_viz_selected.json";
    }
    $.getJSON(json_path, function (data) {
      plume_viz_data = data
      // Build the dictionary that maps date to the block index
      date_to_index = buildDateIndexMap(plume_viz_data);
      var available_years = Object.keys(date_to_index);
      // If there is a date in the URL, select that date on the timeline
      var query_paras = util.parseVars(window.location.search);
      if ("date" in query_paras) {
        var d = query_paras["date"];
        var y = d.split("-")[0];
        if (available_years.indexOf(y) > -1) {
          var available_dates = Object.keys(date_to_index[y]);
          if (available_dates.indexOf(d) > -1) {
            current_date = d;
            current_year = y;
          }
        }
      }
      createTimeline(plume_viz_data[current_year]);
      // Set the calendar button events
      initCalendarBtn();
      // Fill in the dropdown menu in the calendar dropdown
      drawCalendar(available_years);
      timeline.selectBlockByIndex(date_to_index[current_year][current_date]);
    });
  }

  $(init);
})();
