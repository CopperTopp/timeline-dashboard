//  Timeline Directive for AngularJS, implenting D3.js to handle drawing and animation.
//    D3.js uses HTML's SVG element to do it's work.  This may cause browser compatability issues.
//       At this time, FireFox id notoriously slow with SVG animation.
//
//    Draws timeline of an array of objects, designed to be used with angular as the link: in a directive
//      Events should be grouped such that selecting a group will hightlight all the members of that group.
//      Selection handled through external controls, set by the property name in the 'selected' attribute.
//    Defined as an element
//
//          <timeline-chart events='{event collection name}'
//                          selected='{selected parent or grouping}'
//                          domain='{object holding start/end timestamps of initial view}'></timeline-chart>
//
//  events is the main data set array, looking for members with the following the schema:
//    var events = [
//      {
//        _id: <unique_id> (Required for row assignment to work)
//        name: "name",
//        parent: "group1",
//        start_time: <Date Object>,
//        end_time: <Date Object>
//      },
//        ...
//    ];
// 
//  selected allows for setting several groupings, then highlighting events if they are a member of the selected group
//     it follows the schema:
//     var selected = {
//       _id: "name matching 'parent' in event items"  -- This is where the matching happens, between selected._id and event.parent
//     };
// 
//  domain allows for dynamic domains to be set in a bound way and change as the domain is changed.
//     it follows the schema:
//     var domain = {
//       start_time: new Date(<valid date object or string>),
//       end_time:   new Date(<valid date object or string>)
//    };
angular.module('reldashApp')
.directive("timelineChart", ['visible', function(visible_service) {
  return {
    restict: 'E',
    template: '<svg class="timeline"></svg>',
    scope: {
      events: '=',
      selected: '=',
      domain: '='
    },
    link: function(scope, element, attrs) {
      console.log("timeline directive called...");
      var row_count = 5;   //Just set an initial value to calculate intitial height.
      var row_height = 15;
      var margin = {top: 20, right: 20, bottom: 30, left: 40},
          width = 960 - margin.left - margin.right,
          view_height = row_count * row_height;
      
      //Use with more data points to set range encompasing all data points.
      var getDomain = function() {
        var r = [];
        if (scope.domain &&
            scope.domain.start_time &&
            scope.domain.end_time) {
          r = [ new Date(scope.domain.start_time), new Date(scope.domain.end_time) ];
        } else {
          var start_date = new Date(),
              end_date = new Date();
          start_date.setDate(start_date.getDate() - 7);
          end_date.setDate(end_date.getDate() + 7);
          r = [+start_date, +end_date];
        }
        return r;
      };
      
      var xScale = d3.time.scale.utc()
                     .domain(getDomain())
                     .range([0, width]);
      
      var yScale = d3.scale.linear()
                     .domain([0, view_height])
                     .range([view_height, 0]);
      
      var xAxis = d3.svg.axis()
                    .scale(xScale)
                    .orient("bottom")
                    .tickSize(-view_height);
      
      var zoom = d3.behavior.zoom()
                   .x(xScale)
                   .y(yScale)
                   .scaleExtent([0.01, 100])
                   .on("zoom", zoomed);
      
      var tooltip_template = d3.select("body").append("div")
                   .attr("class", "tl_tooltip")
                   .style("opacity", 0);
      
      var timeline = d3.select("svg.timeline")
                  .attr("width", width + margin.left + margin.right)
                  .attr("height", view_height + margin.top + margin.bottom)
                .append("g")
                  .attr("transform", "translate(" + margin.left + "," + margin.top + ")");
      
      var clip = timeline.append("defs").append("svg:clipPath")
                         .attr("id", "clip")
                         .append("svg:rect")
                         .attr("id", "clip-rect")
                         .attr("x", "0")
                         .attr("y", "0")
                         .attr("width", width)
                         .attr("height", view_height + margin.bottom);
      
      var tlContent = timeline.append("g")
        .attr("clip-path", "url(#clip)")
        .attr("class", "content")
        .call(zoom)
        //Disable zoom on double-click so it doesn't interfere with selection clicking
        .on("dblclick.zoom", null);
      
      tlContent.append("rect")
        .attr("width", width)
        .attr("class", "tl_background")
        .attr("height", view_height);
      
      tlContent.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + view_height + ")")
        .call(xAxis);
      
      var today = new Today(xScale);
      var todayBar = tlContent.append("rect")
        .attr({
            "width": function() { return today.width;},
            "height": view_height - 1,
            "class": "today",
            "x": function() { return today.x; },
            "y": 0,
            "stroke": "green",
            "stroke-width": 1
        })
        .style({
            "fill-opacity":   0.1,
            "stroke-opacity": 0.9,
            "fill": "green"
        })
        .call(zoom)
        //Disable zoom on double-click so it doesn't interfere with selection clicking
        .on("dblclick.zoom", null);
      
      function setBBoxOnDrawItems() {
        if (draw_items) {
          var changed = false;
          draw_items.each(function(d) {
            //In IE especially, bbox is protected against write, so must dup it
            var readbox = this.getBBox();
            var bbox = {
              x: this.x.animVal.value,
              y: this.y.animVal.value,
              width: readbox.width,
              height: readbox.height
            }
            //Don't update unless changed to be nice to binding
            if (bbox != d.bbox) d.bbox = bbox;
            if (visible_service && ((d.bbox.x + d.bbox.width) > 0) && (d.bbox.x < width)) {
              visible_service.add(d._id);
            } else {
              visible_service.remove(d._id);
            }
          });
        }
      };
      
      var moveX = function(d) {
        var sd = (d.start_time == undefined)?new Date():new Date(d.start_time);
        return Math.floor(xScale(sd));
      };
      
      var moveY = function(d) {
        var y = 10;
        if (d.bbox) {
          row_height = d.bbox.height + 5;
          y = Math.floor(d.row * row_height);
        }
        return y;
      };
      
      var widthX = function(d) {
        var sx = xScale(new Date(d.start_time));
        var ex = xScale(new Date(d.end_time));
        var w = Math.floor(ex - sx);
        //if less than three, give width for left stroke, 3 fills, and right stroke
        if (!w || w < 3) w = 5;
        return w;
      };
      
      var setID = function(d) { return "id-" + d._id; };
      
      var moveReleaseItemsSize = function() {
        draw_bars.attr('width', widthX);
        draw_items.attr('x', moveX);
          
        setBBoxOnDrawItems();
      };
      
      var moveReleaseItemsRow = function() {
        //If we change rows, use .transition() to animate the change
        draw_items.transition()
                .attr('y', moveY);
      };
      
      function zoomed() {
        redrawData();
      };
      
      function getColor(color_obj, color_name, default_color_string) {
        return (color_obj)?color_obj[color_name]:default_color_string;
      }
      
      var assignRows = function(data) {
        var changed = false;
        //console.log("Entered Assign Rows...");
        if (data) {
          //console.log("There is 'data' to process...");
          var row = 1;
          var cursor = 0;
          for (var i = 0, l = data.length; i < l; i++) {
            data[i].placed = false;
          }
          
          var all_placed = function() {
            var placed = true;
            for (var i = 0, l = data.length; i < l; i++) {
              placed = placed && data[i].placed;
            }
            return placed;
          };
          while (!all_placed()) {
            if (row > 200) break;  //Something's wrong, get out before we lock the browser up
            //Start cursor at LESS THAN the smallest x value.
            cursor = data[0].bbox.x - 10;
            for (var i = 0, l = data.length, d; i < l; i++) {
              d = data[i];
              if ((d.bbox) &&
                  (d.bbox.x > cursor) &&
                  (!d.placed)) {
                if (d.row != row) changed = true;
                d.row = row;
                d.placed = true;
                changed = true;
                cursor = d.bbox.x + d.bbox.width;
              }
            }
            row++;
          }
          row_count = row;
          view_height = (row_count + 1) * (row_height + 3);
        }
        return changed;
      };
      
      var draw_items, draw_bars, draw_tags;
      function drawData() {
        if (scope.draw_events) {
          var matrix;
          draw_items = tlContent.selectAll('g.content')
            .data(scope.draw_events).enter()
            .append('svg')
            .attr('x', moveX)
            .attr('y', moveY)
            .attr('id', setID)
            .attr('class', function(d) {return 'event item p_' + d.parent;})
            .on("mouseenter", function(d) {
              matrix =this.getScreenCTM();//.translate(d.bbox.x, d.bbox.y);
              tooltip_template.transition()
                  .duration(300)
                  .style("opacity", 0.9);
              tooltip_template.html(d._id)
                  //.style("left", (d3.event.pageX) + "px")
                  //.style("top", (d3.event.pageY - 28) + "px");
                  .style("left", (window.pageXOffset + matrix.e) + "px")
                  .style("top", (window.pageYOffset + matrix.f) + "px");
            })
            .on("mouseleave", function(d) {
              tooltip_template.transition()
                  .duration(500)
                  .style("opacity", 0);
            });
          
          setBBoxOnDrawItems();
          //These are inside an svg element, so x, y is relative to the svg's grid
          //  This combines with draw_tags below, making a single unit that can
          //  be moved by manipulating the parent, draw_items
          draw_bars = draw_items.append("rect")
            .attr("x", 1.5)
            .attr("y", 15.5)
            .attr("height", 7)
            .attr("width", widthX)
            .attr("stroke", "grey")
            .attr("stroke-width", 2)
            .attr('id', setID)
            .attr("class", function(d) { return "event bar p_" + d.parent; })
            .style("fill", "lightgrey");
          
          draw_tags = draw_items.append('text')
            .text( function(d) { return d.name; })
            .attr("x", 1.5)
            .attr("y", 10.5)
            .attr("font-family", "sans-serif")
            .attr("font-size", "10px")
            .attr("fill", "grey")
            .attr('id', setID)
            .attr("class", function(d) { return "release tag p_" + d.parent });
          
          tlContent.selectAll('g.content')
            .data(scope.draw_events).exit().remove();
          
          if (assignRows(scope.draw_events)) moveReleaseItemsRow();
        }
      };
      var last_height = 0;
      function redrawData() {
        if (scope.draw_events) {
          moveReleaseItemsSize();
        }
        
        if (view_height !== last_height) {
          last_height = view_height;
          updateHeight();
        }
        
        today.refresh(xScale);
        todayBar.attr({
            "width": function() { return today.width;},
            "x": function() { return today.x; }
        });
        
        if (scope.selected) {
          var search_class = "p_" + scope.selected._id;
          tlContent.selectAll('.bar')
            .attr("stroke", "grey")
            .style("fill", "lightgrey");
          
          tlContent.selectAll('.tag')
            .attr("fill", "grey");
          
          tlContent.selectAll('.bar.' + search_class)
            .attr("stroke", "blue")
            .style("fill", "yellow");
          
          tlContent.selectAll('.tag.' + search_class)
            .attr("fill", "blue");
        }
        
        if (scope.events) {
          if (assignRows(scope.draw_events)) moveReleaseItemsRow();
        }
        
        timeline.select(".x.axis").call(xAxis);
      };
      
      function updateHeight() {
        timeline = d3.select("svg.timeline")
                     .attr("height", view_height + margin.top + margin.bottom);
        yScale.domain([0, view_height])
                    .range([view_height, 0]);
        xAxis.tickSize(-view_height);
        clip.attr("height", view_height + margin.bottom);
        d3.select("rect.tl_background")
                .attr("height", view_height);
        tlContent.select("g.x.axis")
          .attr("transform", "translate(0," + view_height + ")")
          .call(xAxis);
        todayBar.attr("height", view_height - 1);
        
        redrawData();
      };
      
      scope.$watch('domain', function(newVal, oldVal) {
        console.log("Domain Watch fired...");
        xScale.domain(getDomain());
        zoom.x(xScale);
        redrawData();
      }, true);
      
      scope.$watch('selected', function(newVal, oldVal) {
        console.log("Selected Watch fired...");
        redrawData();
      });
      
      scope.$watch('events', function(newVal, oldVal){
        if (!newVal || newVal === oldVal) {
          return;
        }
        var draw_events = [];
        for (var i = 0, l = scope.events.length, new_event; i < l; i++) {
          new_event = scope.events[i];
          if (new_event.start_time && new_event.end_time) {
            draw_events.push({
              _id: new_event._id,
              name: new_event.name,
              parent: new_event.parent,
              start_time: new Date(new_event.start_time),
              end_time: new Date(new_event.end_time),
              row: 0,
              placed: false,
              bbox: {
                x: 0,
                y: 0,
                width: 0,
                height: 0
              }
            });
          }
        }
        scope.draw_events = draw_events.sort(function(a, b) {
          var ad = (a.start_time == undefined)?new Date():new Date(a.start_time);
          var bd = (b.start_time == undefined)?new Date():new Date(b.start_time);
          var compare = 0;  //case where ad == bd
          if (ad < bd) compare = -1;
          if (ad > bd) compare = 1;
          return compare;
        });
      }, true);
      
      var firstDraw = true;
      scope.$watch('draw_events', function(newVal, oldVal){
        if (!newVal || newVal === oldVal) {
          return;
        }
        if (firstDraw) {
          firstDraw = false;
          drawData(tlContent, scope.draw_events);
        } else {
          redrawData(tlContent, scope.draw_events);
        }
      }, true);
    }
  }
}]);