/*global define,dojo,dojoConfig,Modernizr,alert,esri */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true,indent:4 */
/*
 | Copyright 2013 Esri
 |
 | Licensed under the Apache License, Version 2.0 (the "License");
 | you may not use this file except in compliance with the License.
 | You may obtain a copy of the License at
 |
 |    http://www.apache.org/licenses/LICENSE-2.0
 |
 | Unless required by applicable law or agreed to in writing, software
 | distributed under the License is distributed on an "AS IS" BASIS,
 | WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 | See the License for the specific language governing permissions and
 | limitations under the License.
 */
//============================================================================================================================//
define([
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom-construct",
    "dojo/on",
    "dojo/topic",
    "dijit/_WidgetBase",
    "esri/tasks/GeometryService",
    "esri/geometry/Point",
    "esri/symbols/PictureMarkerSymbol",
    "esri/SpatialReference",
    "esri/graphic",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "esri/tasks/BufferParameters",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "dojo/_base/Color",
    "esri/geometry/Polyline",
    "esri/geometry/Polygon",
    "dojo/_base/array",
    "dojo/dom-style"
], function (declare, lang, domConstruct, on, topic, _WidgetBase, GeometryService, Point, PictureMarkerSymbol, SpatialReference, Graphic, sharedNls, BufferParameters, SimpleFillSymbol, SimpleLineSymbol, Color, Polyline, Polygon, array, domStyle) {

    //========================================================================================================================//

    return declare([_WidgetBase], {
        sharedNls: sharedNls,
        graphicValues: null,
        emailSharedData: null,
        emailSharingData: null,

        /**
        * create geolocation widget
        *
        * @class
        * @name widgets/geoLocation/geoLocation
        */
        postCreate: function () {
            try {
                /**
                * Modernizr.geolocation checks for support for geolocation on client browser
                * if browser is not supported, geolocation widget is not created
                */
                if (Modernizr.geolocation) {
                    this.domNode = domConstruct.create("div", {
                        "title": sharedNls.tooltips.locate,
                        "class": "esriCTTdGeolocation"
                    }, null);
                    this.own(on(this.domNode, "click", lang.hitch(this, function () {
                        /**
                        * minimize other open header panel widgets and call geolocation service
                        */
                        topic.publish("toggleWidget", "geolocation");
                        topic.publish("closeDialogBox");
                        topic.publish("setMaxLegendLength");
                        this._showCurrentLocation();
                    })));
                }
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * get device location from geolocation service
        * @param {string} dojo.configData.GeometryService Geometry service url specified in configuration file
        * @memberOf widgets/geoLocation/geoLocation
        */

        _showCurrentLocation: function () {
            var mapPoint, self = this, currentBaseMap, geometryServiceUrl, geometryService;
            geometryServiceUrl = dojo.configData.GeometryService;
            geometryService = new GeometryService(geometryServiceUrl);

            /**
            * get device location using geolocation service
            * @param {object} position Co-ordinates of device location in spatialReference of wkid:4326
            */
            navigator.geolocation.getCurrentPosition(lang.hitch(this, function (position) {
                mapPoint = new Point(Number(position.coords.longitude), Number(position.coords.latitude), new SpatialReference({
                    wkid: 4326
                }));

                /**
                * projects the device location on the map
                * @param {string} dojo.configData.ZoomLevel Zoom level specified in configuration file
                * @param {object} mapPoint Map point of device location in spatialReference of wkid:4326
                * @param {object} newPoint Map point of device location in spatialReference of map
                */
                geometryService.project([mapPoint], self.map.spatialReference).then(lang.hitch(this, function (newPoint) {
                    currentBaseMap = self.map.getLayer("defaultBasemap");
                    if (!currentBaseMap) {
                        currentBaseMap = self.map.getLayer("defaultBasemap0");
                    }
                    if (currentBaseMap.visible) {
                        if (!currentBaseMap.fullExtent.contains(newPoint[0])) {
                            alert(sharedNls.errorMessages.invalidLocation);
                            return;
                        }
                    }
                    mapPoint = newPoint[0];
                    self.map.centerAndZoom(mapPoint, dojo.configData.ZoomLevel);
                    self._addGraphic(mapPoint);
                    try {
                        this.emailSharingData = "TAB:" + "geolocation" + "$" + "X:" + mapPoint.x + "$" + "Y:" + mapPoint.y + "$" + "SD:" + null + "$" + "UV:" + null + "$" + "SB:" + false;
                        topic.publish("shareDataThroughEmail", this.emailSharingData);
                    } catch (err) {
                        alert(err.message);
                    }
                }), function () {
                    alert(sharedNls.errorMessages.invalidProjection);
                });
            }), function () {
                alert(sharedNls.errorMessages.invalidLocation);
            });
        },

        /**
        * add push pin on the map
        * @memberOf widgets/geoLocation/geoLocation
        * @method _addGraphic
        * @param {object} mapPoint Map point of device location in spatialReference of map
        * @return
        */
        _addGraphic: function (mapPoint) {
            var locatorMarkupSymbol, geoLocationPushpin, graphic;
            geoLocationPushpin = dojoConfig.baseURL + dojo.configData.LocatorSettings.DefaultLocatorSymbol;
            locatorMarkupSymbol = new PictureMarkerSymbol(geoLocationPushpin, "35", "35");
            graphic = new Graphic(mapPoint, locatorMarkupSymbol, null, null);
            if (!graphic.attributes) {
                graphic.attributes = {};
            }
            graphic.attributes.sourcename = "geoLocationSearch";
            topic.publish("clearAllGraphics");
            this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
            topic.publish("resetAOITab");
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
            dojo.isGeoLocationEnabled = true;
        }

    });
});
