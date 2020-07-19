(function () {
  "use strict";

  var util = new edaplotjs.Util();
  var $gallery_no_data_text = $('<span class="gallery-no-data-text">No videos are found.</span>');
  var $gallery_error_text = $('<span class="gallery-error-text">Oops!<br>Server may be down or busy.<br>Please come back later.</span>');
  var $gallery_loading_text = $('<span class="gallery-loading-text"></span>');
  var $gallery_not_supported_text = $('<span class="gallery-not-supported-text">We are sorry!<br>Your browser is not supported.</span>');
  var $gallery;
  var $gallery_videos;
  var video_items = [];
  var $page_nav;
  var $page_back;
  var $page_next;
  var $page_control;
  var url_root = "https://cocalc-www.createlab.org/pardumps/video/"

  function updateGallery($new_content) {
    $gallery_videos.detach(); // detatch prevents the click event from being removed
    $gallery.empty().append($new_content);
  }

  function showNoGalleryMsg() {
    updateGallery($gallery_no_data_text);
  }

  function showGalleryErrorMsg() {
    updateGallery($gallery_error_text);
  }

  function showGalleryLoadingMsg() {
    updateGallery($gallery_loading_text);
  }

  function showGalleryNotSupportedMsg() {
    updateGallery($gallery_not_supported_text);
  }

  // Create a video label element
  // IMPORTANT: Safari on iPhone only allows displaying maximum 16 videos at once
  // UPDATE: starting from Safari 12, more videos are allowed
  function createVideo() {
    var $item = $("<a class='flex-column'></a>");
    // "autoplay" is needed for iPhone Safari to work
    // "preload" is ignored by mobile devices
    // "disableRemotePlayback" prevents chrome casting
    // "playsinline" and "playsInline" prevents playing video fullscreen
    var $vid = $("<video autoplay loop muted playsinline playsInline disableRemotePlayback></video>");
    $item.append($vid);
    var $control = $("<div class='label-control'></div>");
    // Add the date and time information
    var $dt = $("<p class='text-small-margin'><i></i></p>");
    $control.append($dt)
    $item.append($control);
    $item.append($("<i></i>"));
    return $item;
  }

  // Input v need to have "file_name"
  function updateItem($item, v) {
    var $i_i = $item.children("i").removeClass();
    //$i_i.html("&#10004;").addClass("custom-text-primary-dark-theme");
    $i_i.text("");
    var $vid = $item.find("video");
    $vid.one("canplay", function () {
      // Play the video
      util.handleVideoPromise(this, "play");
    });
    var src_url = url_root + v["file_name"];
    $vid.prop("src", src_url);
    util.handleVideoPromise($vid.get(0), "load"); // load to reset video promise
    return $item;
  }

  function updateVideos(video_data) {
    // Add videos
    for (var i = 0; i < video_data.length; i++) {
      var v = video_data[i];
      var $item;
      if (typeof video_items[i] === "undefined") {
        $item = createVideo(v);
        video_items.push($item);
        $gallery_videos.append($item);
      } else {
        $item = video_items[i];
      }
      $item = updateItem($item, v);
      if ($item.hasClass("force-hidden")) {
        $item.removeClass("force-hidden");
      }
    }
    // Hide exceeding videos
    for (var i = video_data.length; i < video_items.length; i++) {
      var $item = video_items[i];
      if (!$item.hasClass("force-hidden")) {
        $item.addClass("force-hidden");
      }
    }
  }

  function initPagination(data_sources) {
    $page_nav = $("#page-navigator");
    $page_control = $("#page-control");
    $page_back = $("#page-back");
    $page_next = $("#page-next");
    $page_nav.pagination({
      dataSource: data_sources,
      className: "paginationjs-custom",
      pageSize: 4,
      showPageNumbers: false,
      showNavigator: true,
      showGoInput: true,
      showGoButton: true,
      showPrevious: false,
      showNext: false,
      callback: function (data, pagination) {
        if (typeof data !== "undefined" && data.length > 0) {
          $(window).scrollTop(0);
          updateGallery($gallery_videos);
          updateVideos(data);
        } else {
          $(window).scrollTop(0);
          showNoGalleryMsg();
        }
        // Handle UI
        var total_page = Math.ceil(pagination["totalNumber"] / pagination["pageSize"]);
        if (typeof total_page !== "undefined" && !isNaN(total_page) && total_page != 1) {
          if ($page_control.hasClass("force-hidden")) {
            $page_control.removeClass("force-hidden");
          }
          var page_num = pagination["pageNumber"];
          if (page_num == 1) {
            $page_back.prop("disabled", true);
          } else {
            $page_back.prop("disabled", false);
          }
          if (page_num == total_page) {
            $page_next.prop("disabled", true);
          } else {
            $page_next.prop("disabled", false);
          }
        } else {
          if (!$page_control.hasClass("force-hidden")) {
            $page_control.addClass("force-hidden");
          }
        }
      }
    });
    $page_back.on("click", function () {
      showGalleryLoadingMsg();
      $page_nav.pagination("previous");
    });
    $page_next.on("click", function () {
      showGalleryLoadingMsg();
      $page_nav.pagination("next");
    });
  }

  function init() {
    util.addVideoClearEvent();
    $gallery = $(".gallery");
    $gallery_videos = $(".gallery-videos");
    if (util.browserSupported()) {
      showGalleryLoadingMsg();
    } else {
      console.warn("Browser not supported.");
      showGalleryNotSupportedMsg();
    }
    $.getJSON("data/plume_viz_old.json", function (data) {
      initPagination(data);
    });
  }

  $(init);
})();