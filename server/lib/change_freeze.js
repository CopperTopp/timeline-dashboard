// Unused - Short term work around to parse data from an HTML page.

var S = require('string');

var YearFactory = function(change_freeze_page, logger) {
  this.logger = logger;
  this.source_page = change_freeze_page;
};

YearFactory.prototype.populate = function(callback)  {
  var WebDriver = require('selenium-webdriver');
  var driver = new WebDriver.Builder().withCapabilities(WebDriver.Capabilities.chrome()).build();
  
  var raw_string = this.raw_string;
  var yearFactory = this;
  driver.get(this.source_page);
  driver.getPageSource().then(function(page_source) {
    raw_string = S(page_source).stripTags().between('Change Freeze Dates', 'End of Year Freeze').s;
    driver.close();
    yearFactory.years = {};
    var matches = raw_string.match(/\d{4} Change Freeze Dates/g);
    //console.log(matches);
    for (var i = 0, l = matches.length, name, chunk, start_tag, end_tag; i < l; i++) {
      name = matches[i].match(/(\d{4}) Change Freeze Dates/)[1];
      //console.log("year name: " + name);
      start_tag = matches[i];
      if (i + 1 < l) {
        end_tag = matches[i+1];
      } else {
        end_tag = '';
      }
      logger.debug("Reading Between Tage ["+start_tag+"] and ["+end_tag+"]");
      chunk = S(raw_string).between(matches[i], matches[i+1]).s;
      raw_string = raw_string.replace(chunk, '');
      logger.debug("Section Read Between Tags is ["+chunk+"]");
      yearFactory.years[name] = new Year(name, chunk, logger);
    }
    callback(yearFactory);
  });  
};
YearFactory.prototype.getEvents = function(callback) {
  var year;
  for (year in this.years) {
    //console.log("Year ["+year+"]");
    year = this.years[year];
    for (var ei = 0, el = year.events.length; ei < el; ei++) {
      callback(year.events[ei]);
      //console.log("Event ["+event.name+"]");
      //console.log("   Starts ["+JSON.stringify(event.start_time, null, 2)+"]");
      //console.log("   Ends   ["+JSON.stringify(event.end_time, null, 2)+"]");
    }
  }
};

var Year = function(name, chunk, logger) {
  this.name = name;
  this.events = [];
  logger.info("Evaluating Year ["+name+"]");
  var events = this.events;
  S(chunk).lines().forEach(function(line) {
    if (S(line).collapseWhitespace() == '') {
      return;
    }
    //console.log("Year [" + name + "] Line [" + line + "]");
    events.push(new Event(line, name, logger));
  });
};

var Event = function(line, year, logger) {
  this.logger = logger;
  this.month_map = {
    "January":   0,
    "February":  1,
    "March":     2,
    "April":     3,
    "May":       4,
    "June":      5,
    "July":      6,
    "August":    7,
    "September": 8,
    "October":   9,
    "November":  10,
    "December":  11
  };
  this.year = Number(year);
  //console.log("\nEvent line ["+line+"]");
  var matches = line.match(/(.*?):(.*)/);
  //console.log("Event Matches ["+JSON.stringify(matches, null, 2)+"]");
  this.name = S(matches[1]).collapseWhitespace().s;
  this.tag = this.name.replace(/\s+/g, '') + '_' + year;
  this.parseDate(matches[2]);
};
Event.prototype.parseDate = function(raw_date) {
  this.start_time = new Date();
  this.start_time.setFullYear(this.year);
  this.end_time = new Date();
  this.end_time.setFullYear(this.year);
  
  raw_date = S(raw_date).strip('PT?', 'PT',
                               'Monday,',
                               'Tuesday,',
                               'Wednesday,',
                               'Thursday,',
                               'Friday,',
                               'Saturday,',
                               'Sunday,');
  var splits;
  if (raw_date.indexOf(' to ') > -1) {
    splits = raw_date.split(' to ');
  } else {
    splits = raw_date.split('-');
  }
  var raw_start = splits[0], raw_end = splits[1];
  var day_match;
  for (var month in this.month_map) {
    if (raw_start.indexOf(month) > -1) {
      day_match = raw_start.match(new RegExp(month + " (\\d+)"));
      this.start_time.setMonth(this.month_map[month], day_match[1]);
    }
    if (raw_end.indexOf(month) > -1) {
      day_match = raw_end.match(new RegExp(month + " (\\d+)"));
      this.end_time.setMonth(this.month_map[month], day_match[1]);
    }
  }
  if (this.end_time.getMonth() < this.start_time.getMonth()) {
    //Assume we rolled over a year, such as a date from December to January, so increment end year
    this.end_time.year++;
    this.end_time.setFullYear(this.end_time.getFullYear() + 1);
  }
  this.parseTime(raw_start, this.start_time);
  this.parseTime(raw_end, this.end_time);
  
  this.logger.info("Added Scheduled Change Freeze Event ["+this.name+"]");
  this.logger.info("    Which Starts "+this.start_time);
  this.logger.info("    And Ends     "+this.end_time);
};
Event.prototype.parseTime = function(raw_time, date_obj) {
  var time1_matches = raw_time.match(/(\d{1,2}):(\d{2})([a|p]m)/);
  var time2_matches = raw_time.match(/(\d{1,2})([a|p]m)/);
  if (time1_matches) {
    //console.log("---- Matched Time1 ["+JSON.stringify(time1_matches, null, 2)+"]");
    this.setTime(time1_matches[1], time1_matches[2], time1_matches[3], date_obj);
  } else if (time2_matches) {
    //console.log("---- Matched Time2 ["+JSON.stringify(time2_matches, null, 2)+"]");
    this.setTime(time2_matches[1], '00', time2_matches[2], date_obj);
  } else {
    //console.log("---- No Matched Time ["+raw_time+"]");
    this.setTime('12', '00', 'am', date_obj);
  }
};
Event.prototype.setTime = function(hours, minutes, tod, date_obj) {
  hours = Number(hours);
  minutes = Number(minutes);
  if (tod.toLowerCase() === 'pm' ) {
    hours += 12;
  }
  date_obj.setHours(hours, minutes, 0, 0);
};

module.exports = YearFactory;