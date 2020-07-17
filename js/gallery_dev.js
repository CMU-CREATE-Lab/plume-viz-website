(function () {
  "use strict";

  var util = new edaplotjs.Util();
  var timeline;
  var url_root = "https://cocalc-www.createlab.org/pardumps/video/"

  function init() {
    util.addVideoClearEvent();
    $.getJSON("data/plume_viz.json", function (data) {
      var timeline_setting = {
        click: function ($e, obj) {
          console.log("click", $e.data(), obj);
        },
        select: function ($e, obj) {
          console.log("select", $e.data(), obj);
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
      timeline.selectFirstBlock();
    });
  }

  $(init);
})();