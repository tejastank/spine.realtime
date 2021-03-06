(function() {
  var $, Ajax, Base, Collection, Include, Model, Singleton;
  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; }, __hasProp = Object.prototype.hasOwnProperty, __extends = function(child, parent) {
    for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; }
    function ctor() { this.constructor = child; }
    ctor.prototype = parent.prototype;
    child.prototype = new ctor;
    child.__super__ = parent.prototype;
    return child;
  };
  Spine || (Spine = require("spine"));
  $ = Spine.$;
  Model = Spine.Model;
  Ajax = {
    enabled: true,
    pending: false,
    requests: [],
    getURL: function(object) {
      return object && (typeof object.url === "function" ? object.url() : void 0) || object.url;
    },
    disable: function(callback) {
      this.enabled = false;
      callback();
      return this.enabled = true;
    },
    requestNext: function() {
      var next;
      next = this.requests.shift();
      if (next) {
        return this.request.apply(this, next);
      } else {
        return this.pending = false;
      }
    },
    request: function(params) {
      var success;
      success = params.success;
      params.success = __bind(function() {
        if (typeof success === "function") {
          success.apply(null, arguments);
        }
        return this.requestNext();
      }, this);
      return $.ajax(params);
    },
    send: function() {
      if (!this.enabled) {
        return;
      }
      if (this.pending) {
        return this.requests.push(arguments);
      } else {
        this.pending = true;
        return this.request.apply(this, arguments);
      }
    }
  };
  Base = (function() {
    function Base() {}
    Base.prototype.defaults = {
      contentType: "application/json",
      processData: false
    };
    Base.prototype.send = function(params, defaults) {
      return Ajax.send($.extend({}, this.defaults, defaults, params));
    };
    return Base;
  })();
  Collection = (function() {
    __extends(Collection, Base);
    function Collection(model) {
      this.model = model;
      this.recordsResponse = __bind(this.recordsResponse, this);
      Collection.__super__.constructor.apply(this, arguments);
      this.url = Ajax.getURL(this.model);
    }
    Collection.prototype.findAll = function(params) {
      return this.send(params, {
        type: "GET",
        url: this.url,
        success: this.recordsResponse(params)
      });
    };
    Collection.prototype.fetch = function() {
      return this.findAll({
        success: __bind(function(records) {
          return this.model.refresh(records);
        }, this)
      });
    };
    Collection.prototype.recordsResponse = function(params) {
      var success;
      success = params.success;
      return __bind(function(data, status, xhr) {
        model.trigger("ajaxSuccess", null, status, xhr);
        return typeof success === "function" ? success(this.model.fromJSON(data)) : void 0;
      }, this);
    };
    return Collection;
  })();
  Singleton = (function() {
    __extends(Singleton, Base);
    function Singleton(record) {
      this.record = record;
      this.blankResponse = __bind(this.blankResponse, this);
      this.recordResponse = __bind(this.recordResponse, this);
      Singleton.__super__.constructor.apply(this, arguments);
      this.model = this.record.constructor;
      this.url = Ajax.getURL(this.record);
    }
    Singleton.prototype.find = function(params) {
      return this.send(params({
        type: "GET",
        url: this.url
      }));
    };
    Singleton.prototype.create = function(params) {
      return this.send(params({
        type: "POST",
        data: JSON.stringify(this.record),
        url: this.base.url,
        success: this.recordResponse(params)
      }));
    };
    Singleton.prototype.update = function(params) {
      return this.send(params({
        type: "PUT",
        data: JSON.stringify(this.record),
        url: this.url,
        success: this.recordResponse(params)
      }));
    };
    Singleton.prototype.destroy = function(params) {
      return this.send(params({
        type: "DELETE",
        url: this.url,
        success: this.blankResponse(params)
      }));
    };
    Singleton.prototype.recordResponse = function(params) {
      var success;
      success = params.success;
      return __bind(function(data, status, xhr) {
        this.record.trigger("ajaxSuccess", this.record, status, xhr);
        if (!data || params.data === data) {
          return;
        }
        data = this.model.fromJSON(data);
        if (data.id && this.record.id !== data.id) {
          this.record.updateID(data.id);
        }
        Ajax.disable(function() {
          return this.record.updateAttributes(data.attributes());
        });
        return typeof success === "function" ? success(this.record) : void 0;
      }, this);
    };
    Singleton.prototype.blankResponse = function(params) {
      var success;
      success = params.success;
      return __bind(function(data, status, xhr) {
        this.record.trigger("ajaxSuccess", this.record, status, xhr);
        return typeof success === "function" ? success(this.record) : void 0;
      }, this);
    };
    return Singleton;
  })();
  Model.host = "";
  Include = {
    ajax: function() {
      return new Singleton(this);
    },
    url: function() {
      var base;
      base = Ajax.getURL(this.constructor);
      if (base.charAt(base.length - 1) !== "/") {
        base += "/";
      }
      base += encodeURIComponent(this.id);
      return base;
    }
  };
  Model.Ajax = {
    ajax: function() {
      return new Collection(this);
    },
    extended: function() {
      this.change(function(record, type) {
        return record.ajax[type]();
      });
      this.fetch(function() {
        var _ref;
        return (_ref = this.ajax()).fetch.apply(_ref, arguments);
      });
      return this.include(Include);
    },
    url: function() {
      return "" + Model.host + "/" + (this.className.toLowerCase()) + "s";
    }
  };
  Spine.Ajax = Ajax;
  if (typeof module !== "undefined" && module !== null) {
    module.exports = Ajax;
  }
}).call(this);
