/*global define,dojo,alert,esri,dijit,unescape,dojoConfig */
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
define(["dojo/_base/declare",
    "dojo/dom-construct",
    "dojo/_base/lang",
    "dojo/dom-attr",
    "dojo/on",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/string",
    "dojo/_base/html",
    "dojo/text!./templates/shareTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/topic",
    "esri/request",
    "esri/geometry/Polyline",
    "esri/geometry/Polygon",
    "esri/symbols/PictureMarkerSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/geometry/Multipoint",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/SpatialReference",
    "esri/tasks/BufferParameters",
    "esri/tasks/GeometryService",
    "esri/geometry/Point",
    "esri/graphic",
    "dojo/_base/Color",
    "esri/geometry/Extent",
    "dojo/_base/array",
    "dojo/query",
    "dojo/DeferredList"
    ], function (declare, domConstruct, lang, domAttr, on, dom, domClass, domGeom, domStyle, string, html, template, _WidgetBase, _TemplatedMixin,
    _WidgetsInTemplateMixin, sharedNls, topic, esriRequest, Polyline, Polygon, PictureMarkerSymbol, SimpleMarkerSymbol, Multipoint, SimpleFillSymbol, SimpleLineSymbol,
    SpatialReference, BufferParameters, GeometryService, Point, Graphic, Color, GeometryExtent, array, query, DeferredList) {
    //========================================================================================================================//
    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        emailSharedData: null,
        _baseMapIndex: "",
        _selectedBaseMapIndex: "",
        _presentThumbNail: "",
        _infoX: "",
        _infoY: "",
        _infoWindowVisibility: "",
        _infoWindowObjID: "",
        _infoWindowLayerID: "",
        extentPoints: [],
        _actualData: "",
        _isDataValid: true,
        _setExtentOnLoad: true,

        /**
        * create share widget
        *
        * @class
        * @name widgets/share/share
        */
        postCreate: function () {
            try {
                var applicationHeaderDiv;
                /**
                * close share panel if any other widget is opened
                * @param {string} widget Key of the newly opened widget
                */
                topic.subscribe("toggleWidget", lang.hitch(this, function (widgetID) {
                    if (widgetID !== "share") {
                        /**
                        * divAppContainer Sharing Options Container
                        * @member {div} divAppContainer
                        * @private
                        * @memberOf widgets/share/share
                        */
                        if (html.coords(this.divAppContainer).h > 0) {
                            domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMediaSelected");
                            domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                        }
                    } else {
                        if (domClass.contains(this.divAppContainer, "esriCTHideContainerHeight")) {
                            this._setShareContainerHeight();
                        }
                    }
                    topic.publish("closeDialogBox");
                }));
                this.domNode = domConstruct.create("div", {
                    "title": sharedNls.tooltips.share,
                    "class": "esriCTHeaderIcons esriCTImgSocialMedia"
                }, null);
                this.own(on(this.domNode, "click", lang.hitch(this, function () {
                    /**
                    * minimize other open header panel widgets and show share panel
                    */
                    topic.publish("toggleWidget", "share");
                    topic.publish("setMaxLegendLength");
                    this._showHideShareContainer();
                    //this._shareLink();
                })));
                applicationHeaderDiv = domConstruct.create("div", {
                    "class": "esriCTApplicationShareicon"
                }, dom.byId("esriCTParentDivContainer"));
                applicationHeaderDiv.appendChild(this.divAppContainer);
                on(this.imgEmbedding, "click", lang.hitch(this, function () {
                    this._showEmbeddingContainer();
                }));
                topic.subscribe("shareDataThroughEmail", lang.hitch(this, function (emailSharingData) {
                    this.emailSharedData = emailSharingData;
                }));

                if (window.location.toString().split("?extent=").length > 1) {
                    setTimeout(lang.hitch(this, function () {
                        var currentExtentLegend, graphicDetails;
                        currentExtentLegend = this._getQueryString('extent');
                        currentExtentLegend = decodeURIComponent(currentExtentLegend);
                        graphicDetails = currentExtentLegend.split('|');
                        this.extentPoints = graphicDetails[0].split(",");
                        this._actualData = graphicDetails[1];
                        this._replicateSharedData(graphicDetails);
                        this._fetchData(graphicDetails);
                        if (!graphicDetails.TAB) {
                            topic.publish("disableDefaultSharingExtent");
                        }
                    }), 6000);
                }

                topic.subscribe("baseMapIndex", lang.hitch(this, function (preLayerIndex, selectedBaseMapIndex, presentThumbNail) {
                    this._baseMapIndex = preLayerIndex;
                    this._selectedBaseMapIndex = selectedBaseMapIndex;
                    this._presentThumbNail = presentThumbNail;
                }));

                topic.subscribe("infoWindowData", lang.hitch(this, function (mapPoint) {
                    if (mapPoint.attributes) {
                        this._infoX = mapPoint.geometry.x;
                        this._infoY = mapPoint.geometry.y;
                        this._infoWindowObjID = mapPoint.attributes.OBJECTID;
                        this._infoWindowLayerID = mapPoint.layer.QueryLayerId;
                    } else {
                        this._infoX = mapPoint.x;
                        this._infoY = mapPoint.y;
                        this._infoWindowObjID = "";
                        this._infoWindowLayerID = "";
                    }
                }));

                topic.subscribe("infoWindowVisibilityStatus", lang.hitch(this, function (value) {
                    this._infoWindowVisibility = value;
                }));

                topic.subscribe("setMapExtent", lang.hitch(this, function () {
                    this._setEmailSharingMapExtent();
                }));

            } catch (err) {
                alert(err.message);
            }
        },

        _replicateSharedData: function (graphicDetails) {
            try {
                if (graphicDetails) {
                    graphicDetails = this._getGraphicDetailsObject(graphicDetails);
                    if (graphicDetails.BEARING) {
                        topic.publish("fillBearingArr", graphicDetails.BEARING);
                    }
                }
                topic.publish("shareDataThroughEmail", this._actualData);
            } catch (err) {
                alert(err.message);
            }
        },

        _fetchData: function (graphicDetails) {
            try {
                if (graphicDetails.length > 0) {
                    graphicDetails = this._getGraphicDetailsObject(graphicDetails);
                    if (graphicDetails) {

                        if (graphicDetails.BMI) {
                            topic.publish("setBaseMap", graphicDetails.BMI, graphicDetails.SBI, graphicDetails.PTI);
                        }
                        if (graphicDetails.SHOWINFO === "true") {
                            var evt, pointGeometry;
                            evt = {};
                            pointGeometry = new Point(graphicDetails.INFOX, graphicDetails.INFOY, new esri.SpatialReference({
                                "wkid": this.map.spatialReference.wkid
                            }));
                            evt.mapPoint = pointGeometry;
                            if (graphicDetails.INFOFEATUREID && graphicDetails.INFOLAYERID) {
                                topic.publish("showInfoWindowOnMap", pointGeometry, [graphicDetails.INFOFEATUREID, graphicDetails.INFOLAYERID]);
                            } else {
                                topic.publish("displayInfoWindow", evt);
                            }
                        }

                        switch (graphicDetails.TAB) {
                        case "locator":
                            this._displayLocatorData(graphicDetails);
                            break;
                        case "geolocation":
                            this._displayGeoLocationData(graphicDetails);
                            break;
                        case "Placename":
                            this._displayPlaceNameData(graphicDetails);
                            break;
                        case "Draw":
                            this._displayDrawData(graphicDetails);
                            break;
                        case "Coordinates":
                            this._displayCoordinatesData(graphicDetails);
                            break;
                        case "Shapefile":
                            this._displayShapefileData(graphicDetails);
                            break;
                        }
                    }
                }
            } catch (err) {
                alert(err.message);
            }
        },
        _displayPlaceNameData: function (graphicDetails) {
            try {
                this._displayGeometry(graphicDetails);
            } catch (err) {
                alert(err.message);
            }
        },
        _displayDrawData: function (graphicDetails) {
            try {
                this._displayGeometry(graphicDetails);
            } catch (err) {
                alert(err.message);
            }
        },
        _displayCoordinatesData: function (graphicDetails) {
            try {
                this._displayGeometry(graphicDetails);
            } catch (err) {
                alert(err.message);
            }
        },
        _displayShapefileData: function (graphicDetails) {
            try {
                this._displayGeometry(graphicDetails);
            } catch (err) {
                alert(err.message);
            }
        },
        _displayGeometry: function (graphicDetails) {
            try {
                switch (graphicDetails.GeomType) {
                case "point":
                    this._displayPointData(graphicDetails);
                    break;
                case "polyline":
                    this._displayPolylineData(graphicDetails);
                    break;
                case "extent":
                    this._displayExtentData(graphicDetails);
                    break;
                case "polygon":
                    this._displayPolygonData(graphicDetails);
                    break;
                case "multipoint":
                    this._displayMulipointData(graphicDetails);
                    break;
                case "eventMapPoint":
                    this._displaySelectedFeature(graphicDetails);
                    break;
                }
            } catch (err) {
                alert(err.message);
            }
        },
        _displaySelectedFeature: function (graphicDetails) {
            try {
                this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                topic.publish("displaySelectedFeature", graphicDetails.Geom);
                if (graphicDetails.SD > 0) {
                    topic.publish("setSliderDistanceAndUnit", graphicDetails.SD, graphicDetails.UV);
                    dijit.byId("horizontalSlider").setValue(graphicDetails.SD);
                } else {
                    topic.publish("disableDefaultSharingExtent");
                    this._setEmailSharingMapExtent();
                }
                this._setSliderMinAndMaxValue(this._convertSelectedValue(graphicDetails));
                domAttr.set(dom.byId("spanSliderValueTextBox"), "value", graphicDetails.SD);
                domAttr.set(dom.byId("spanSliderUnitValue"), "innerHTML", this._convertSelectedValue(graphicDetails));
                this._removeHighlightedUnit();
                this._highlightUnit(graphicDetails);
                topic.publish("setSliderValue", graphicDetails.UV);
                //this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },
        _getGraphicDetailsObject: function (graphicDetails) {
            try {
                var i, obj;
                if (graphicDetails[1]) {
                    obj = {};
                    for (i = 0; i < graphicDetails[1].split("$").length; i++) {
                        obj[graphicDetails[1].split("$")[i].split(":")[0]] = graphicDetails[1].split("$")[i].split(":")[1];
                    }
                    return obj;
                }
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to create symbols
        _createFeatureSymbol: function (geometryType) {
            try {
                var symbol;
                switch (geometryType) {
                case "point":
                    symbol = new SimpleMarkerSymbol();
                    break;
                case "polyline":
                    symbol = new SimpleLineSymbol();
                    break;
                case "extent":
                    symbol = new SimpleFillSymbol();
                    break;
                case "polygon":
                    symbol = new SimpleFillSymbol();
                    break;
                default:
                    symbol = new SimpleFillSymbol();
                    break;
                }
                return symbol;
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to highlight tab
        _highlightTab: function (tabName, address) {
            try {
                if (dojo.query(".esriCTAOILinkSelect")[0]) {
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                }
                switch (tabName) {
                case "Placename":
                    domClass.add(dom.byId("divLinkplaceName"), "esriCTAOILinkSelect");
                    this._hideContainer("placeNameSearch");
                    dom.byId("placeNameSearch").style.display = "block";
                    dojo.query(".esriCTTxtAddress")[1].value = (address === "") ? dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress : unescape(address);
                    break;
                case "Shapefile":
                    domClass.add(dom.byId("divLinkUpload"), "esriCTAOILinkSelect");
                    this._hideContainer("divFileUploadContainer");
                    dom.byId("divFileUploadContainer").style.display = "block";
                    break;
                case "Draw":
                    domClass.add(dom.byId("divLinkDrawTool"), "esriCTAOILinkSelect");
                    topic.publish("showDrawPanel");
                    dojo.query(".esriCTTxtAddress")[2].value = (address === "") ? dojo.configData.LocatorSettings.LocatorDefaultAOIAddress : unescape(address);
                    break;
                case "Coordinates":
                    domClass.add(dom.byId("divLinkCoordinates"), "esriCTAOILinkSelect");
                    topic.publish("showCoordinatesPanel");
                    dojo.query(".esriCTTxtAddress")[2].value = (address === "") ? dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress : unescape(address);
                    break;
                }
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to hide container
        _hideContainer: function (container) {
            try {
                dom.byId("placeNameSearch").style.display = "none";
                dom.byId("divFileUploadContainer").style.display = "none";
                dom.byId("divAOIAddressContent").style.display = "none";
                dom.byId("divBearingContainer").style.display = "none";
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to display point data
        _displayPointData: function (graphicDetails) {
            try {
                var geometryService, params, pointGeometry;
                this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                pointGeometry = new Point(graphicDetails.X, graphicDetails.Y, new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
                if (graphicDetails.STYLE === "queryFeature") {
                    topic.publish("showFeatureResultsOnMap", pointGeometry);
                } else {
                    if (graphicDetails.TAB === "Coordinates") {
                        topic.publish("locateInitialPoint", pointGeometry);
                    } else {
                        this._addGraphic(pointGeometry, graphicDetails);
                        if (graphicDetails.TAB !== "Draw" && graphicDetails.SD > 0) {
                            dijit.byId("horizontalSlider").setValue(graphicDetails.SD);
                            geometryService = new GeometryService(dojo.configData.GeometryService);
                            params = new BufferParameters();
                            params.distances = [graphicDetails.SD];
                            params.bufferSpatialReference = new esri.SpatialReference({
                                "wkid": this.map.spatialReference.wkid
                            });
                            params.outSpatialReference = this.map.spatialReference;
                            params.unit = GeometryService[graphicDetails.UV];
                            params.geometries = [pointGeometry];
                            geometryService.buffer(params, lang.hitch(this, function (geometries) {
                                this.showBuffer(geometries);
                            }));
                        }
                    }
                }
                this._setSliderMinAndMaxValue(this._convertSelectedValue(graphicDetails));
                domAttr.set(dom.byId("spanSliderValueTextBox"), "value", graphicDetails.SD);
                domAttr.set(dom.byId("spanSliderUnitValue"), "innerHTML", this._convertSelectedValue(graphicDetails));
                this._removeHighlightedUnit();
                this._highlightUnit(graphicDetails);
                topic.publish("setSliderValue", graphicDetails.UV);
                topic.publish("showClearGraphicsIcon");
                if (graphicDetails.SD === 0) {
                    topic.publish("disableDefaultSharingExtent");
                }
                this._setEmailSharingMapExtent();
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },
        _highlightUnit: function (graphicDetails) {
            try {
                domClass.add(dom.byId(this._convertSelectedValue(graphicDetails)), "esriCTSelectedDistanceUnit");
            } catch (err) {
                alert(err.message);
            }
        },
        _removeHighlightedUnit: function () {
            try {
                array.forEach(query(".esriCTRadioBtnContent"), function (item) {
                    if (domClass.contains(item, "esriCTSelectedDistanceUnit")) {
                        domClass.remove(item, "esriCTSelectedDistanceUnit");
                    }
                });
            } catch (err) {
                alert(err.message);
            }
        },
        _convertSelectedValue: function (graphicDetails) {
            try {
                switch (graphicDetails.UV) {
                case "UNIT_STATUTE_MILE":
                    return "Miles";
                case "UNIT_FOOT":
                    return "Feet";
                case "UNIT_METER":
                    return "Meters";
                case "UNIT_KILOMETER":
                    return "Kilometers";
                }
            } catch (err) {
                alert(err.message);
            }
        },
        _setSliderMinAndMaxValue: function (selectedUnitValue) {
            try {
                var index, sliderStartValue, sliderEndValue;
                for (index = 0; index < dojo.configData.DistanceUnitSettings.length; index++) {
                    if (dojo.configData.DistanceUnitSettings[index].DistanceUnitName === selectedUnitValue) {
                        switch (selectedUnitValue) {
                        case "Miles":
                            if (dojo.configData.DistanceUnitSettings[index].MinimumValue >= 0) {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                            } else {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue = 0;
                            }
                            if (dojo.configData.DistanceUnitSettings[index].MaximumValue >= 0) {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                            } else {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue = 100;
                            }
                            break;
                        case "Feet":
                            if (dojo.configData.DistanceUnitSettings[index].MinimumValue >= 0) {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                            } else {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue = 0;
                            }
                            if (dojo.configData.DistanceUnitSettings[index].MaximumValue >= 0) {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                            } else {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue = 100;
                            }
                            break;
                        case "Meters":
                            if (dojo.configData.DistanceUnitSettings[index].MinimumValue >= 0) {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                            } else {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue = 0;
                            }
                            if (dojo.configData.DistanceUnitSettings[index].MaximumValue >= 0) {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                            } else {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue = 100;
                            }
                            break;
                        case "Kilometers":
                            if (dojo.configData.DistanceUnitSettings[index].MinimumValue >= 0) {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                            } else {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue = 0;
                            }
                            if (dojo.configData.DistanceUnitSettings[index].MaximumValue >= 0) {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                            } else {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue = 100;
                            }
                            break;
                        default:
                            if (dojo.configData.DistanceUnitSettings[index].MinimumValue >= 0) {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                            } else {
                                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue = 0;
                            }
                            if (dojo.configData.DistanceUnitSettings[index].MaximumValue >= 0) {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                            } else {
                                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue = 100;
                            }
                            break;
                        }
                        domAttr.set(query(".dijitRuleLabel")[0], "innerHTML", sliderStartValue);
                        domAttr.set(query(".dijitRuleLabel")[1], "innerHTML", sliderEndValue);
                        domAttr.set(dijit.byId("horizontalSlider"), "minimum", sliderStartValue);
                        domAttr.set(dijit.byId("horizontalSlider"), "maximum", sliderEndValue);
                    }
                }
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to display polygon data
        _displayPolygonData: function (graphicDetails) {
            try {
                var k, m, geometryService, graphic, params, polygon, deferredListSimplifyResult, symbol, bufferRequestArray = [],
                    simplifyRequestArray = [], unionResultArray = [], unionBufferArray = [], polygonBufferCollection = [], deferredListBufferResult = [];
                geometryService = new GeometryService(dojo.configData.GeometryService);
                params = new BufferParameters();
                params.distances = [graphicDetails.SD];
                params.bufferSpatialReference = new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                });
                params.outSpatialReference = this.map.spatialReference;
                params.unit = GeometryService[graphicDetails.UV];
                polygon = new Polygon();
                polygon.rings = JSON.parse(unescape(graphicDetails.GEOM));
                polygon.spatialReference = new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                });
                params.geometries = [polygon];
                if (graphicDetails.TAB === "Shapefile") {
                    this._highlightTab(graphicDetails.TAB, "");
                    topic.publish("displayShapeFile", polygon);
                } else {
                    this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                    if (graphicDetails.SN === "aOISearch" || graphicDetails.TAB === "Placename") {
                        topic.publish("showFeatureResultsOnMap", polygon);
                        if (graphicDetails.SD > 0 && graphicDetails.TAB === "Placename") {
                            simplifyRequestArray.push(geometryService.simplify([polygon]));
                            deferredListSimplifyResult = new DeferredList(simplifyRequestArray);
                            deferredListSimplifyResult.then(lang.hitch(this, function (result) {
                                for (k = 0; k < result[0][1].length; k++) {
                                    if (result[0][1][k].type === "polygon") {
                                        polygonBufferCollection.push(result[0][1][k]);
                                    }
                                }
                                params.geometries = polygonBufferCollection;
                                bufferRequestArray.push(geometryService.buffer(params));
                                deferredListBufferResult = new DeferredList(bufferRequestArray);
                                deferredListBufferResult.then(lang.hitch(this, function (result) {
                                    for (m = 0; m < result.length; m++) {
                                        unionBufferArray.push(result[m][1][0]);
                                    }
                                    geometryService.union(unionBufferArray, lang.hitch(this, function (geometry) {
                                        unionResultArray.push(geometry);
                                        this.showBuffer(unionResultArray);
                                    }));
                                }));
                            }));
                        }
                    } else {
                        symbol = this._createFeatureSymbol(polygon.type);
                        graphic = new Graphic(polygon, symbol);
                        this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                    }
                }
                this._setSliderMinAndMaxValue(this._convertSelectedValue(graphicDetails));
                domAttr.set(dom.byId("spanSliderValueTextBox"), "value", graphicDetails.SD);
                domAttr.set(dom.byId("spanSliderUnitValue"), "innerHTML", this._convertSelectedValue(graphicDetails));
                this._removeHighlightedUnit();
                this._highlightUnit(graphicDetails);
                topic.publish("setSliderValue", graphicDetails.UV);
                topic.publish("showClearGraphicsIcon");
                if (graphicDetails.SD > 0) {
                    dijit.byId("horizontalSlider").setValue(graphicDetails.SD);
                }
                this._setEmailSharingMapExtent();
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to display polyline data
        _displayPolylineData: function (graphicDetails) {
            try {
                var geometryService, params, polyline, pointGeometry, symbol, graphic;
                geometryService = new GeometryService(dojo.configData.GeometryService);
                params = new BufferParameters();
                params.distances = [graphicDetails.SD];
                params.bufferSpatialReference = new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                });
                params.outSpatialReference = this.map.spatialReference;
                params.unit = GeometryService[graphicDetails.UV];
                polyline = new Polyline();
                if (graphicDetails.GEOM && graphicDetails.GEOM !== "undefined") {
                    polyline.paths = JSON.parse(unescape(graphicDetails.GEOM));
                    polyline.spatialReference = new esri.SpatialReference({
                        "wkid": this.map.spatialReference.wkid
                    });
                }
                params.geometries = [polyline];
                if (graphicDetails.TAB === "Shapefile") {
                    topic.publish("displayShapeFile", polyline);
                    this._highlightTab(graphicDetails.TAB, "");
                    this._setSliderMinAndMaxValue(this._convertSelectedValue(graphicDetails));
                    domAttr.set(dom.byId("spanSliderValueTextBox"), "value", graphicDetails.SD);
                    domAttr.set(dom.byId("spanSliderUnitValue"), "innerHTML", this._convertSelectedValue(graphicDetails));
                    this._removeHighlightedUnit();
                    this._highlightUnit(graphicDetails);
                    topic.publish("setSliderValue", graphicDetails.UV);
                } else {
                    this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                    if (graphicDetails.TAB === "Coordinates") {
                        pointGeometry = new Point(graphicDetails.CX, graphicDetails.CY, new esri.SpatialReference({
                            "wkid": this.map.spatialReference.wkid
                        }));
                        if ((graphicDetails.LAT) && (graphicDetails.LONG)) {
                            dom.byId("addLatitudeValue").value = parseFloat(graphicDetails.LAT);
                            dom.byId("addLongitudeValue").value = parseFloat(graphicDetails.LONG);
                        }
                        topic.publish("normalizeStartPoint", pointGeometry, graphicDetails.BEARING, graphicDetails.SN);
                    } else {
                        symbol = this._createFeatureSymbol(polyline.type);
                        graphic = new Graphic(polyline, symbol);
                        this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                        topic.publish("showClearGraphicsIcon");
                        if (graphicDetails.SD > 0) {
                            geometryService.buffer(params, lang.hitch(this, function (geometries) {
                                this.showBuffer(geometries);
                            }));
                        }
                    }
                    this._setSliderMinAndMaxValue(this._convertSelectedValue(graphicDetails));
                    domAttr.set(dom.byId("spanSliderValueTextBox"), "value", graphicDetails.SD);
                    domAttr.set(dom.byId("spanSliderUnitValue"), "innerHTML", this._convertSelectedValue(graphicDetails));
                    this._removeHighlightedUnit();
                    this._highlightUnit(graphicDetails);
                    topic.publish("setSliderValue", graphicDetails.UV);
                }
                if (graphicDetails.SD > 0) {
                    dijit.byId("horizontalSlider").setValue(graphicDetails.SD);
                } else {
                    this._setEmailSharingMapExtent();
                }
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to display multipoint data
        _displayMulipointData: function (graphicDetails) {
            try {
                var geometryService, params, multipoint;
                geometryService = new GeometryService(dojo.configData.GeometryService);
                params = new BufferParameters();
                params.distances = [graphicDetails.SD];
                params.bufferSpatialReference = new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                });
                params.outSpatialReference = this.map.spatialReference;
                params.unit = GeometryService[graphicDetails.UV];
                multipoint = new Multipoint();
                multipoint.points = JSON.parse(unescape(graphicDetails.GEOM));
                multipoint.spatialReference = new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                });
                params.geometries = [multipoint];
                topic.publish("displayShapeFile", multipoint);
                if (graphicDetails.SD > 0) {
                    geometryService.buffer(params, lang.hitch(this, function (geometries) {
                        this.showBuffer(geometries);
                    }));
                    dijit.byId("horizontalSlider").setValue(graphicDetails.SD);
                }
                this._highlightTab(graphicDetails.TAB, "");
                this._setSliderMinAndMaxValue(this._convertSelectedValue(graphicDetails));
                domAttr.set(dom.byId("spanSliderValueTextBox"), "value", graphicDetails.SD);
                domAttr.set(dom.byId("spanSliderUnitValue"), "innerHTML", this._convertSelectedValue(graphicDetails));
                this._removeHighlightedUnit();
                this._highlightUnit(graphicDetails);
                topic.publish("setSliderValue", graphicDetails.UV);
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to display geo-location data
        _displayGeoLocationData: function (graphicDetails) {
            try {
                var pointGeometry;
                pointGeometry = new Point(graphicDetails.X, graphicDetails.Y, new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
                this._addGraphic(pointGeometry, graphicDetails);
                topic.publish("toggleWidget", "locator");
                this._setEmailSharingMapExtent();
                topic.publish("disableDefaultSharingExtent");
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to display extent data
        _displayExtentData: function (graphicDetails) {
            try {
                var geometryService, params, extent, symbol, graphic;
                geometryService = new GeometryService(dojo.configData.GeometryService);
                params = new BufferParameters();
                params.distances = [graphicDetails.SD];
                params.bufferSpatialReference = new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                });
                params.outSpatialReference = this.map.spatialReference;
                params.unit = GeometryService[graphicDetails.UV];
                extent = new esri.geometry.Extent({
                    "xmin": graphicDetails.XMIN,
                    "ymin": graphicDetails.YMIN,
                    "xmax": graphicDetails.XMAX,
                    "ymax": graphicDetails.YMAX,
                    "spatialReference": {
                        "wkid": this.map.spatialReference.wkid
                    }
                });
                params.geometries = [extent];
                this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                symbol = this._createFeatureSymbol(extent.type);
                graphic = new Graphic(extent, symbol);
                if (graphicDetails.SD > 0) {
                    geometryService.buffer(params, lang.hitch(this, function (geometries) {
                        this.showBuffer(geometries);
                    }));
                    dijit.byId("horizontalSlider").setValue(graphicDetails.SD);
                } else {
                    topic.publish("disableDefaultSharingExtent");
                }
                this._setSliderMinAndMaxValue(this._convertSelectedValue(graphicDetails));
                domAttr.set(dom.byId("spanSliderValueTextBox"), "value", graphicDetails.SD);
                domAttr.set(dom.byId("spanSliderUnitValue"), "innerHTML", this._convertSelectedValue(graphicDetails));
                this._removeHighlightedUnit();
                this._highlightUnit(graphicDetails);
                topic.publish("setSliderValue", graphicDetails.UV);
                this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                topic.publish("showClearGraphicsIcon");
                this._setEmailSharingMapExtent();
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to display locator data.
        _displayLocatorData: function (graphicDetails) {
            try {
                var pointGeometry, polygon;
                pointGeometry = new Point(graphicDetails.X, graphicDetails.Y, new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
                this._setSliderMinAndMaxValue(this._convertSelectedValue(graphicDetails));
                domAttr.set(dom.byId("spanSliderValueTextBox"), "value", graphicDetails.SD);
                domAttr.set(dom.byId("spanSliderUnitValue"), "innerHTML", this._convertSelectedValue(graphicDetails));
                this._removeHighlightedUnit();
                this._highlightUnit(graphicDetails);
                topic.publish("setSliderValue", graphicDetails.UV);
                if (graphicDetails.SD > 0) {
                    dijit.byId("horizontalSlider").setValue(graphicDetails.SD);
                } else {
                    topic.publish("disableDefaultSharingExtent");
                }
                topic.publish("toggleWidget", "locator");
                if (graphicDetails.GeomType !== "polygon") {
                    if (graphicDetails.STYLE === "pushPinFeature") {
                        this._addGraphic(pointGeometry, graphicDetails);
                    }
                } else {
                    polygon = new Polygon();
                    polygon.rings = JSON.parse(unescape(graphicDetails.GEOM));
                    polygon.spatialReference = new esri.SpatialReference({
                        "wkid": this.map.spatialReference.wkid
                    });
                    topic.publish("sharedLocatorFeature", polygon, graphicDetails.ADDR);
                }
                this._setEmailSharingMapExtent();
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to get query string
        _getQueryString: function (key) {
            try {
                var extentValue = "", regex, qs;
                regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
                qs = regex.exec(window.location.href);
                if (qs && qs.length > 0) {
                    extentValue = qs[1];
                }
                return extentValue;
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to add graphic
        _addGraphic: function (mapPoint, graphicDetails) {
            try {
                var locatorMarkupSymbol, geoLocationPushpin, graphic, attr;
                geoLocationPushpin = dojoConfig.baseURL + dojo.configData.LocatorSettings.DefaultLocatorSymbol;
                locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(geoLocationPushpin, dojo.configData.LocatorSettings.MarkupSymbolSize.width, dojo.configData.LocatorSettings.MarkupSymbolSize.height);
                if ((graphicDetails.TAB === "Coordinates") && (graphicDetails.CX) && (graphicDetails.CY)) {
                    locatorMarkupSymbol.setOffset(dojo.configData.LocatorSettings.MarkupSymbolSize.width / 4, dojo.configData.LocatorSettings.MarkupSymbolSize.height / 2);
                }
                if (graphicDetails.STYLE === "drawnFeature") {
                    dijit.byId("horizontalSlider").setValue(graphicDetails.SD);
                    topic.publish("shareDrawPointFeature", mapPoint);
                    return;
                }
                graphic = new Graphic(mapPoint, locatorMarkupSymbol, null, null);
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                if (graphicDetails.SB === "false") {
                    attr = {};
                    if (graphicDetails.TAB === "Draw" || graphicDetails.TAB === "Coordinates" || graphicDetails.SN === "aOISearch") {
                        attr.sourcename = "aOISearch";
                    } else if (graphicDetails.TAB === "geolocation" || graphicDetails.SN === "geoLocationSearch") {
                        attr.sourcename = "geoLocationSearch";
                    }
                    graphic.attributes = attr;
                }
                if (graphicDetails.TAB === "locator") {
                    this.map.getLayer("locatorGraphicsLayer").add(graphic);
                } else {
                    this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                }
                topic.publish("showClearGraphicsIcon");
            } catch (err) {
                alert(err.message);
            }
        },
        // This function is used to show buffer
        showBuffer: function (bufferedGeometries) {
            try {
                var _self, symbol, graphic;
                _self = this;
                topic.publish("disableDefaultSharingExtent");
                symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.LineSymbolTransparency.split(",")[0], 10)]), 2), new Color([parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.FillSymbolTransparency.split(",")[0], 10)]));
                array.forEach(bufferedGeometries, function (geometry) {
                    graphic = new Graphic(geometry, symbol);
                    _self.map.getLayer("tempBufferLayer").clear();
                    _self.map.getLayer("tempBufferLayer").add(graphic);
                    topic.publish("showClearGraphicsIcon");
                });
                this._setEmailSharingMapExtent();
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },
        _showEmbeddingContainer: function () {
            var height;
            if (domGeom.getMarginBox(this.divShareContainer).h > 1) {
                domClass.add(this.divShareContainer, "esriCTShareBorder");
                domClass.replace(this.divShareContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
            } else {
                height = domGeom.getMarginBox(this.divShareCodeContainer).h + domGeom.getMarginBox(this.divShareCodeContent).h;
                domClass.remove(this.divShareContainer, "esriCTShareBorder");
                domClass.replace(this.divShareContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                domStyle.set(this.divShareContainer, "height", height + 'px');
            }
            this._setShareContainerHeight(height);
        },
        _setShareContainerHeight: function (embContainerHeight) {
            var contHeight = domStyle.get(this.divAppHolder, "height");
            if (domClass.contains(this.divShareContainer, "esriCTShowContainerHeight")) {
                if (embContainerHeight) {
                    contHeight += embContainerHeight;
                } else {
                    contHeight += domStyle.get(this.divShareContainer, "height");
                }
            }
            //adding 2px in height of share container to display border
            domStyle.set(this.divAppContainer, "height", contHeight + 2 + "px");
        },

        /**
        * display sharing panel
        * @param {array} dojo.configData.MapSharingOptions Sharing option settings specified in configuration file
        * @memberOf widgets/share/share
        */
        _shareLink: function () {
            var mapExtent, url, urlStr, encodedUri, urlPath;
            /**
            * get current map extent to be shared
            */
            if (domGeom.getMarginBox(this.divShareContainer).h <= 1) {
                domClass.add(this.divShareContainer, "esriCTShareBorder");
            }
            this.divShareCodeContent.value = "<iframe width='100%' height='100%' src='" + location.href + "'></iframe> ";
            domAttr.set(this.divShareCodeContainer, "innerHTML", sharedNls.titles.webpageDisplayText);
            mapExtent = this._getMapExtent();
            url = esri.urlToObject(window.location.toString());
            urlPath = url.path.replace("#", "").replace("?", "");
            try {
                /**
                * call tinyurl service to generate share URL
                */
                if (this.emailSharedData === null) {
                    urlStr = encodeURI(urlPath) + "?extent=" + mapExtent + "|" + "BMI:" + this._baseMapIndex + "$" + "SBI:" + this._selectedBaseMapIndex + "$" + "INFOX:" + this._infoX + "$" + "INFOY:" + this._infoY + "$" + "SHOWINFO:" + this._infoWindowVisibility + "$" + "INFOFEATUREID:" + this._infoWindowObjID + "$" + "INFOLAYERID:" + this._infoWindowLayerID + "$" + "PTI:" + this._presentThumbNail;
                } else {
                    urlStr = encodeURI(urlPath) + "?extent=" + mapExtent + "|" + this.emailSharedData + "$" + "BMI:" + this._baseMapIndex + "$" + "SBI:" + this._selectedBaseMapIndex + "$" + "INFOX:" + this._infoX + "$" + "INFOY:" + this._infoY + "$" + "SHOWINFO:" + this._infoWindowVisibility + "$" + "INFOFEATUREID:" + this._infoWindowObjID + "$" + "INFOLAYERID:" + this._infoWindowLayerID + "$" + "PTI:" + this._presentThumbNail;
                }
                encodedUri = encodeURIComponent(urlStr);
                url = string.substitute(dojo.configData.MapSharingOptions.TinyURLServiceURL, [encodedUri]);
                esriRequest({
                    url: url
                }, {
                    useProxy: true
                }).then(lang.hitch(this, function (response) {

                    this._isDataValid = true;
                    var tinyUrl, tinyResponse;
                    tinyResponse = response.data;
                    if (tinyResponse) {
                        tinyUrl = tinyResponse.url;
                    }
                    this._displayShareContainer(tinyUrl, urlStr);
                }), lang.hitch(this, function (error) {

                    this._isDataValid = false;
                    this._displayShareContainer(null, urlStr);
                    alert(sharedNls.errorMessages.unableToShareURL);
                }));
            } catch (err) {

                alert(err.message);
            }
        },
        /* show and hide share container
        * @memberOf widgets/share/share
        */
        _showHideShareContainer: function (tinyUrl, urlStr) {

            if (html.coords(this.divAppContainer).h > 0) {
                /**
                * when user clicks on share icon in header panel, close the sharing panel if it is open
                */
                domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMediaSelected");
                domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
            } else {
                /**
                * when user clicks on share icon in header panel, open the sharing panel if it is closed
                */
                domClass.replace(this.domNode, "esriCTImgSocialMediaSelected", "esriCTImgSocialMedia");
                domClass.replace(this.divAppContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                this._shareLink();
            }
        },
        /**
        * return display share container
        * @return {string} urlStr shared full url
        * @return {string} tinyUrl shared bitly url
        * @memberOf widgets/share/share
        */
        _displayShareContainer: function (tinyUrl, urlStr) {

            /**
            * remove event handlers from sharing options
            */
            if (this.facebookHandle) {
                this.facebookHandle.remove();
                this.twitterHandle.remove();
                this.emailHandle.remove();
            }
            /**
            * add event handlers to sharing options
            */
            this.facebookHandle = on(this.divFacebook, "click", lang.hitch(this, function () {
                this._share("facebook", tinyUrl, urlStr);
            }));
            this.twitterHandle = on(this.divTwitter, "click", lang.hitch(this, function () {
                this._share("twitter", tinyUrl, urlStr);
            }));
            this.emailHandle = on(this.divMail, "click", lang.hitch(this, function () {
                this._share("email", tinyUrl, urlStr);
            }));
        },
        /**
        * return current map extent
        * @return {string} Current map extent
        * @memberOf widgets/share/share
        */
        _getMapExtent: function () {
            var extents = Math.round(this.map.extent.xmin).toString() + "," + Math.round(this.map.extent.ymin).toString() + "," + Math.round(this.map.extent.xmax).toString() + "," + Math.round(this.map.extent.ymax).toString();
            return extents;
        },
        /**
        * share application detail with selected share option
        * @param {string} site Selected share option
        * @param {string} tinyUrl Tiny URL for sharing
        * @param {string} urlStr Long URL for sharing
        * @memberOf widgets/share/share
        */
        _share: function (site, tinyUrl, urlStr) {

            /*
            * hide share panel once any of the sharing options is selected
            */
            if (html.coords(this.divAppContainer).h > 0) {
                domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMediaSelected");
                domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
            }
            try {
                if (this._isDataValid) {
                    if (tinyUrl) {
                        this._shareOptions(site, tinyUrl);
                    } else {
                        domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMediaSelected");
                        this._shareOptions(site, urlStr);
                    }
                } else {
                    alert(sharedNls.errorMessages.unableToShareURL);
                }
            } catch (err) {
                alert(sharedNls.errorMessages.shareFailed);
            }
        },

        _setEmailSharingMapExtent: function () {
            try {
                var mapDefaultExtent = new GeometryExtent({
                    "xmin": parseFloat(this.extentPoints[0]),
                    "ymin": parseFloat(this.extentPoints[1]),
                    "xmax": parseFloat(this.extentPoints[2]),
                    "ymax": parseFloat(this.extentPoints[3]),
                    "spatialReference": {
                        "wkid": this.map.spatialReference.wkid
                    }
                });
                this.map.setExtent(mapDefaultExtent);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * generate sharing URL and share with selected share option
        * @param {string} site Selected share option
        * @param {string} url URL for sharing
        * @memberOf widgets/share/share
        */
        _shareOptions: function (site, url) {
            switch (site) {
            case "facebook":
                window.open(string.substitute(dojo.configData.MapSharingOptions.FacebookShareURL, [url]));
                break;
            case "twitter":
                window.open(string.substitute(dojo.configData.MapSharingOptions.TwitterShareURL, [url]));
                break;
            case "email":
                parent.location = string.substitute(dojo.configData.MapSharingOptions.ShareByMailLink, [url]);
                break;
            }
        }
    });
});