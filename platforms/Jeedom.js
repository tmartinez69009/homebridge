// Jeedom JSON API SmartApp required
// https://github.com/jnewland/Jeedom/blob/master/JSON.groovy
//
var types = require("../lib/HAP-NodeJS/accessories/types.js");
var request = require('request');

function JeedomPlatform(log, config){
  this.log            = log;
  this.jeedom_ip      = config["jeedom_ip"];
  this.jeedom_port    = config["jeedom_port"];
  this.jeedom_url     = config["jeedom_url"]+'/';
  jeedom_api_key = config["jeedom_api_key"];
  url_jeedom = 'http://'+this.jeedom_ip+':'+this.jeedom_port+'/'+this.jeedom_url+'core/api/jeeApi.php';
}

JeedomPlatform.prototype = {
  accessories: function(callback) {
    this.log("Fetching Jeedom devices...");

    var that = this;
    var foundAccessories = [];
	
	request.post(url_jeedom, {json: true,
		form: {
		    request: '{"jsonrpc":"2.0","method":"getModulesList","params":{"apikey":"'+jeedom_api_key+'","plugin":"homebridge","slave_id":"1"}}'
		  }
		}, function(err, res, json) {
		if (!err && res.statusCode == 200) {
			json.result.map(function(s){
				accessory = new JeedomAccessory(that.log, s.name, s.commands);
	            foundAccessories.push(accessory);
		});
		callback(foundAccessories);
		} else {
        that.log("There was a problem authenticating with Jeedom.");
      }
	});
  }
}

function JeedomAccessory(log, name, commands) {
  // device info
  this.name     = name;
  this.commands = commands;
  this.log      = log;
}

JeedomAccessory.prototype = {

  command: function(c,value) {
    this.log(this.name + " sending command " + c);
    var options="";
    var cmdid = this.commands[c];
    if (value != undefined) {
      cmdid = this.commands['level'];
      options = '"options":{"slider":"'+value+'"},';
    }

    var that = this;
    request.post(url_jeedom, {json: true,
		form: {
		    request: '{"jsonrpc":"2.0","method":"cmd::execCmd","params":{"apikey":"'+jeedom_api_key+'","id":"'+cmdid+'",'+options+'"slave_id":"1"}}'
		  }
		}, function(err, response) {
		if (err) {
        that.log("There was a problem sending command " + c + " to" + that.name);
        that.log(url);
      } else {
        that.log(that.name + " sent command " + c);
      }
	})
  },

  informationCharacteristics: function() {
    return [
      {
        cType: types.NAME_CTYPE,
        onUpdate: null,
        perms: ["pr"],
        format: "string",
        initialValue: this.name,
        supportEvents: false,
        supportBonjour: false,
        manfDescription: "Name of the accessory",
        designedMaxLength: 255
      },{
        cType: types.MANUFACTURER_CTYPE,
        onUpdate: null,
        perms: ["pr"],
        format: "string",
        initialValue: "Jeedom",
        supportEvents: false,
        supportBonjour: false,
        manfDescription: "Manufacturer",
        designedMaxLength: 255
      },{
        cType: types.MODEL_CTYPE,
        onUpdate: null,
        perms: ["pr"],
        format: "string",
        initialValue: "Rev-1",
        supportEvents: false,
        supportBonjour: false,
        manfDescription: "Model",
        designedMaxLength: 255
      },{
        cType: types.SERIAL_NUMBER_CTYPE,
        onUpdate: null,
        perms: ["pr"],
        format: "string",
        initialValue: "A1S2NASF88EW",
        supportEvents: false,
        supportBonjour: false,
        manfDescription: "SN",
        designedMaxLength: 255
      },{
        cType: types.IDENTIFY_CTYPE,
        onUpdate: null,
        perms: ["pw"],
        format: "bool",
        initialValue: false,
        supportEvents: false,
        supportBonjour: false,
        manfDescription: "Identify Accessory",
        designedMaxLength: 1
      }
    ]
  },

  controlCharacteristics: function(that) {
    cTypes = [{
      cType: types.NAME_CTYPE,
      onUpdate: null,
      perms: ["pr"],
      format: "string",
      initialValue: this.name,
      supportEvents: true,
      supportBonjour: false,
      manfDescription: "Name of service",
      designedMaxLength: 255
    }]

    if (this.commands['on'] != undefined) {
      cTypes.push({
        cType: types.POWER_STATE_CTYPE,
        onUpdate: function(value) {
          if (value == 0) {
            that.command("off")
          } else {
            that.command("on")
          }
        },
        perms: ["pw","pr","ev"],
        format: "bool",
        initialValue: 0,
        supportEvents: true,
        supportBonjour: false,
        manfDescription: "Change the power state",
        designedMaxLength: 1
      })
    }

    if (this.commands['on'] != undefined) {
      cTypes.push({
        cType: types.BRIGHTNESS_CTYPE,
        onUpdate: function(value) { that.command("setLevel", value); },
        perms: ["pw","pr","ev"],
        format: "int",
        initialValue:  0,
        supportEvents: true,
        supportBonjour: false,
        manfDescription: "Adjust Brightness of Light",
        designedMinValue: 0,
        designedMaxValue: 100,
        designedMinStep: 1,
        unit: "%"
      })
    }

    if (this.commands['setHue'] != undefined) {
      cTypes.push({
        cType: types.HUE_CTYPE,
        onUpdate: function(value) { that.command("setHue", value); },
        perms: ["pw","pr","ev"],
        format: "int",
        initialValue:  0,
        supportEvents: true,
        supportBonjour: false,
        manfDescription: "Adjust Hue of Light",
        designedMinValue: 0,
        designedMaxValue: 360,
        designedMinStep: 1,
        unit: "arcdegrees"
      })
    }

    if (this.commands['setSaturation'] != undefined) {
      cTypes.push({
        cType: types.SATURATION_CTYPE,
        onUpdate: function(value) { that.command("setSaturation", value); },
        perms: ["pw","pr","ev"],
        format: "int",
        initialValue:  0,
        supportEvents: true,
        supportBonjour: false,
        manfDescription: "Adjust Brightness of Light",
        designedMinValue: 0,
        designedMaxValue: 100,
        designedMinStep: 1,
        unit: "%"
      })
    }

    return cTypes
  },

  sType: function() {
    if (this.commands['level'] != undefined) {
      return types.LIGHTBULB_STYPE
    } else {
      return types.SWITCH_STYPE
    }
  },

  getServices: function() {
    var that = this;
    var services = [{
      sType: types.ACCESSORY_INFORMATION_STYPE,
      characteristics: this.informationCharacteristics(),
    },
    {
      sType: this.sType(),
      characteristics: this.controlCharacteristics(that)
    }];
    this.log("Loaded services for " + this.name)
    return services;
  }
};

module.exports.accessory = JeedomAccessory;
module.exports.platform = JeedomPlatform;
