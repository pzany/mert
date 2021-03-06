// MERT App based on IONIC Framework

/*
services.js
(c) Philip Pang, July 2016

Initial codebase written by Philip Pang with enhancements
by:
- David Prasad
- Ratheesh Kumar
*/


myservices = angular.module('services', []);

myservices.factory('User',function () {
  var model = {
    name: "philip",
    token: ""
  };

  var userObj = {

    getModel: function () {
      return model;
    },

    setModel: function (m) {
      model = m;
    },

    getName: function () {
      return model.name;
    },

    setName: function (n) {
      model.name = n;
    },

    getToken: function () {
      return model.token;
    },

    setToken: function (t) {
      model.token = t;
    }

  };

  // export service object globally
  gv_userSvc = userObj;

  // export service object for DI
  return userObj;
});

myservices.factory('Resources', function (MertServer) {

  // populate model with some static data
  // initial static model (testdata.js)
  //var model = gv_Resources;

  // initial model is empty
  var validflag = false;
  var model = [];

  // create service object
  var resourcesObj = {

    load: function () {
      var p = new Promise(function (resolve, reject) {
        var url = "http://" + MertServer + "/vpage2.php?callback=JSON_CALLBACK&h=99";
        url += "&m=mert_svc&cmd=queryTable&p1=Resources";
        doJSONP2(url).then(
          function (data) {
            db("Loaded resources from MERT server. Count = " + data.length);
            model = data;  // cache locally
            validflag = true;
            resolve(data);
          },
          function (error) {
            reject(error);
          }
        );
      });
      return p;
    },

    getModel: function () {
      var self = this;
      var p = new Promise(function (resolve, reject) {
        if (validflag) resolve(model);
        else {
          showWait ("visible","Loading");
          self.load().then(
            function (data) {
              showWait ("hide"); 
              resolve(data);
            },
            function (err) { 
              showwait ("hide");
              reject(err);
            }
          );
        }
      });
      return p;
    },

    refresh: function () {
      var self = this;
      var p = new Promise(function (resolve, reject) {
        validflag = false;
        self.getModel().then(
          function (data) { resolve(data); },
          function (err) { reject(err); }
        );
      });
      return p;
    },

    get: function (id) {
      if (!validflag) return null;
      for (var i = 0; i < model.length; i++) {
        if (parseInt(model[i].id) === parseInt(id)) {
          return model[i];
        }
      }
      return null;
    }
  };

  // export service object globally
  gv_resourcesSvc = resourcesObj;

  // export service object for DI
  return resourcesObj;
});

// Available Booking Dates: stretch for 60 days from current day
myservices.factory('AvailDates', function () {

  // initialise model (empty)
  var model = null;

  var dayArr = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var monthArr = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  // populate initial model with next 60 date strings
  var makeModel = function () {

    var model = [];
    var curDate = new Date();

    for (var i = 0; i < 60; i++) {

      var dd = curDate.getDate();
      var wd = curDate.getDay();
      var mm = curDate.getMonth();
      var yy = curDate.getFullYear();

      var date = yy + "-" + prepad((mm + 1), 2) + "-" + prepad(dd, 2);
      //var date = prepad(dd,2) + " " + monthArr[mm] + " " + yy;
      var dow = dayArr[wd];

      model.push({ dow: dow, date: date });

      curDate.setTime(curDate.getTime() + 1 * 86400000);
    }
    return model;
  };

  // static model
  model = makeModel();

  // create service object
  var availDatesObj = {
    getModel: function () {
      return model;
    },

    getDay: function (n) {
      return model[n];
    }
  };

  // export service object globally
  gv_availDatesSvc = availDatesObj;

  // export service object for DI
  return availDatesObj;
});

// Confirmed Booking Dates
myservices.factory('Bookings', function ($timeout, MertServer) {

  // initial static model (testdata.js)
  //var model = gv_Bookings;

  // initialise model (empty)
  var validflag = false;
  var model = [];

  // create service object
  var bookingsObj = {

    load: function () {
      var p = new Promise(function (resolve, reject) {
        var url = "http://" + MertServer + "/vpage2.php?callback=JSON_CALLBACK&h=99";
        url += "&m=mert_svc&cmd=getBookings&p1=" + getTodayStr();
        doJSONP2 (url).then(
          function (data) {
            db("Loaded bookings from MERT server. Count = " + data.length);
            model = data;  // cache locally
            validflag = true;
            resolve(data);
          },
          function (error) {
            reject(error);
          }
        );
      });
      return p;
    },

    getModel: function () {
      var self = this;
      var p = new Promise(function (resolve, reject) {
        if (validflag) { db('cached bookings'); resolve(model); }
        else {
          showWait ("visible","Loading");
          self.load().then(
            function (data) {
              showWait("hide");
              db('server bookings'); 
              resolve(data);
            },
            function (err) {
              showWait("hide");
              reject(err);
            }
          );
        }
      });
      return p;
    },

    refresh: function () {
      var self = this;
      var p = new Promise(function (resolve, reject) {
        validflag = false;
        self.getModel().then(
          function (data) { resolve(data); },
          function (err) { reject(err); }
        );
      });
      return p;
    },

    // get Booking ID or null, date is "yyyy/mm/dd", time "hhmm"
    getBookingID: function (resID, begDate, begTime) {
      var begTimeStr = "" + begDate + " " + begTime;
      for (var i = 0; i < model.length; i++) {
        if (model[i].res != resID) continue;
        bookStart = model[i].begDate + " " + model[i].begTime;
        bookEnd = model[i].endDate + " " + model[i].endTime;
        if (begTimeStr >= bookStart && begTimeStr < bookEnd) return model[i].id;
      }
      return null;
    },

    // returns Booking object
    getBooking: function (resID, begDate, begTime) {
      if (!validflag) return null;
      var begTimeStr = "" + begDate + " " + begTime;
      for (var i = 0; i < model.length; i++) {
        if (model[i].res != resID) continue;
        bookStart = model[i].begDate + " " + model[i].begTime;
        bookEnd = model[i].endDate + " " + model[i].endTime;
        if (begTimeStr >= bookStart && begTimeStr < bookEnd) return model[i];
      }
      return null;
    },

    // check whether this is a booking object
    isBooking: function (resID, begDate, begTime) {
      if (this.getBookingID(resID, begDate, begTime) != null) return true;
      return false;
    },

    // delete a booking
    delBooking: function (id) {
      var self = this;
      var p = new Promise(function (resolve, reject) {
        var foundFlag = false;
        for (var i = 0; i < model.length; i++) {
          if (model[i].id == id) {
            foundFlag = true;
            break;
          }
        }

        if (!foundFlag) {
          reject("ERROR: booking not found");
          return;
        }

        var whereObj = {
          id: id
        }

        var url = "http://" + MertServer + "/vpage2.php?callback=JSON_CALLBACK&h=99";
        url += "&m=mert_svc&cmd=delTable&p1=Bookings&p2=" + encodeURIComponent(JSON.stringify(whereObj));
        doJSONP2 (url).then(
          function (data) {
            db("Delete MERT server booking status is " + data);
            resolve ("OK");
          }
        );
      });
      return p;
    },

    // add a new Booking object
    addBooking: function (rid, user, begDate, begTime, endDate, endTime) {
      var self = this;
      var c = ",";
      var q = function (w) {
        w = (w + '').replace(/[\\"']/g, '\\$&').replace(/\u0000/g, '\\0');
        return "'" + w + "'";
      };

      var vlist = q(rid) + c + q(user) + c + q(begDate) + c + q(begTime) + c
        + q(endDate) + c + q(endTime);

      var url = "http://" + MertServer + "/vpage2.php?callback=JSON_CALLBACK&h=99";
      url += "&m=mert_svc&cmd=addBooking&p1=" + encodeURIComponent(vlist);

      var p = new Promise(function (resolve, reject) {
        doJSONP2 (url).then(
          function (data) {
            if (data == "OK") {
              db("Add booking to MERT server: Status is " + data);
              resolve(data);
            }
            else {
              reject(data);
            }
          }
        );
      });
      return p;
    }
  };

  // export service object globally
  gv_bookingsSvc = bookingsObj;

  // export service object for DI
  return bookingsObj;
});

//alert ("services.js loaded");