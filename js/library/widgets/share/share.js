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
    "dojo/DeferredList",
    "widgets/share/commonShare"

    ], function (declare, domConstruct, lang, domAttr, on, dom, domClass, domGeom, domStyle, string, html, template, _WidgetBase, _TemplatedMixin,
    _WidgetsInTemplateMixin, sharedNls, topic, esriRequest, Polyline, Polygon, PictureMarkerSymbol, SimpleMarkerSymbol, Multipoint, SimpleFillSymbol, SimpleLineSymbol,
    SpatialReference, BufferParameters, GeometryService, Point, Graphic, Color, GeometryExtent, array, query, DeferredList, commonShare) {
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

                topic.subscribe("modulesLoaded", lang.hitch(this, function () {
                    this._loadShareData();
                }));

                topic.subscribe("baseMapIndex", lang.hitch(this, function (preLayerIndex, selectedBaseMapIndex, presentThumbNail) {
                    this._baseMapIndex = preLayerIndex;
                    this._selectedBaseMapIndex = selectedBaseMapIndex;
                    this._presentThumbNail = presentThumbNail;
                }));

                topic.subscribe("infoWindowData", lang.hitch(this, function (mapPoint) {
                    //check if the mapPoint of infoWindow has the attribute property containing featureLayer and ObjectID
                    if (mapPoint.attributes) {
                        this._infoX = mapPoint.geometry.x;
                        this._infoY = mapPoint.geometry.y;
                        this._infoWindowObjID = mapPoint.attributes.OBJECTID;
                        this._infoWindowLayerID = mapPoint.layer.Title + "_" + mapPoint.layer.QueryLayerId;
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

                /**
                * add event handlers to sharing options
                */
                on(this.divFacebook, "click", lang.hitch(this, function () {
                    this._share("facebook");
                }));
                on(this.divTwitter, "click", lang.hitch(this, function () {
                    this._share("twitter");
                }));
                on(this.divMail, "click", lang.hitch(this, function () {
                    this._share("email");
                }));
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * check the loading url for the extent of shared map
        * if extent is present proceed with loading of shared data
        * @memberOf widgets/share/share
        */
        _loadShareData: function () {
            if (window.location.toString().split("?extent=").length > 1) {
                var currentExtentLegend, graphicDetails;
                currentExtentLegend = this._getQueryString('extent');
                currentExtentLegend = decodeURIComponent(currentExtentLegend);
                graphicDetails = currentExtentLegend.split('|');
                this.extentPoints = graphicDetails[0].split(",");
                this._actualData = graphicDetails[1];
                this._replicateSharedData(graphicDetails);
                this._fetchData(graphicDetails);
            }
        },

        /**
        * replicate the shared data
        * @memberOf widgets/share/share
        */
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

        /**
        * based on shared url parameters, proceed with the loading of share data
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _fetchData: function (graphicDetails) {
            try {
                if (graphicDetails.length > 0) {
                    graphicDetails = this._getGraphicDetailsObject(graphicDetails);
                    if (graphicDetails) {

                        if (graphicDetails.BMI) {
                            topic.publish("setBaseMap", graphicDetails.BMI, graphicDetails.SBI, graphicDetails.PTI);
                        }
                        //check for the infoWindow if present
                        if (graphicDetails.SHOWINFO === "true") {
                            var evt, pointGeometry;
                            evt = {};
                            pointGeometry = new Point(Number(graphicDetails.INFOX), Number(graphicDetails.INFOY), new esri.SpatialReference({
                                "wkid": this.map.spatialReference.wkid
                            }));
                            evt.mapPoint = pointGeometry;
                            //check if infoWindow featureLayer and objectID is present
                            if (graphicDetails.INFOFEATUREID && graphicDetails.INFOLAYERID) {
                                topic.publish("showInfoWindowOnMap", pointGeometry, [graphicDetails.INFOFEATUREID, graphicDetails.INFOLAYERID]);
                            } else {
                                topic.publish("displayInfoWindow", evt);
                            }
                        }
                        //if AOI panel is selected in shared data, check for the selected tab
                        if (graphicDetails.TAB) {
                            switch (graphicDetails.TAB) {
                            case "locator":
                                this._displayLocatorData(graphicDetails);
                                break;
                            case "geolocation":
                                this._displayGeoLocationData(graphicDetails);
                                break;
                            case dojo.configData.PlacenameTab.Title:
                                this._displayPlaceNameData(graphicDetails);
                                break;
                            case dojo.configData.DrawTab.Title:
                                this._displayDrawData(graphicDetails);
                                break;
                            case dojo.configData.CoordinatesTab.Title:
                                this._displayCoordinatesData(graphicDetails);
                                break;
                            case dojo.configData.ShapefileTab.Title:
                                this._displayShapefileData(graphicDetails);
                                break;
                            }
                        } else {
                            topic.publish("disableDefaultSharingExtent");
                        }
                    }
                }
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * display the placeName tab data
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayPlaceNameData: function (graphicDetails) {
            try {
                this._displayGeometry(graphicDetails);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * display the Draw tab data
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayDrawData: function (graphicDetails) {
            try {
                this._displayGeometry(graphicDetails);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * display the coordinates tab data
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayCoordinatesData: function (graphicDetails) {
            try {
                this._displayGeometry(graphicDetails);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * display the shapefile tab data
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayShapefileData: function (graphicDetails) {
            try {
                this._displayGeometry(graphicDetails);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * display the shared AOI data based on the geometry type of graphic
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
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

        /**
        * highlight the draw tab and publish an event to report widget to highlight the selected features on map
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displaySelectedFeature: function (graphicDetails) {
            try {
                this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                this._setSliderProperties(graphicDetails);
                topic.publish("displaySelectedFeature", graphicDetails.Geom);
                if (parseFloat(graphicDetails.SD) > 0) {
                    topic.publish("setSliderDistanceAndUnit", parseFloat(graphicDetails.SD), graphicDetails.UV);
                    dijit.byId("horizontalSlider").setValue(parseFloat(graphicDetails.SD));
                } else {
                    topic.publish("disableDefaultSharingExtent");
                    this._setEmailSharingMapExtent();
                }
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * split the comma seperated shared data parameters in a object
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
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

        /**
        * create the symbols to draw on map as per the geometry type
        * @param {object} type of geometry
        * @memberOf widgets/share/share
        */
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

        /**
        * highlight and publish an event to create the AOI panel tab
        * set the address search textbox value if textBox is present
        * @param {object} tabName tab that needs to be highlighted
        * @param {object} address shared value of address
        * @memberOf widgets/share/share
        */
        _highlightTab: function (tabName, address) {
            try {
                if (dojo.query(".esriCTAOILinkSelect")[0]) {
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                }
                switch (tabName) {
                case dojo.configData.PlacenameTab.Title:
                    domClass.add(dom.byId("divLinkplaceName"), "esriCTAOILinkSelect");
                    this._hideContainer();
                    dom.byId("placeNameSearch").style.display = "block";
                    dojo.query(".esriCTTxtAddress")[1].value = (address === "") ? dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress : unescape(address);
                    break;
                case dojo.configData.ShapefileTab.Title:
                    domClass.add(dom.byId("divLinkUpload"), "esriCTAOILinkSelect");
                    this._hideContainer();
                    dom.byId("divFileUploadContainer").style.display = "block";
                    break;
                case dojo.configData.DrawTab.Title:
                    domClass.add(dom.byId("divLinkDrawTool"), "esriCTAOILinkSelect");
                    topic.publish("showDrawPanel");
                    dojo.query(".esriCTTxtAddress")[2].value = (address === "") ? dojo.configData.LocatorSettings.LocatorDefaultAOIAddress : unescape(address);
                    break;
                case dojo.configData.CoordinatesTab.Title:
                    domClass.add(dom.byId("divLinkCoordinates"), "esriCTAOILinkSelect");
                    topic.publish("showCoordinatesPanel");
                    dojo.query(".esriCTTxtAddress")[2].value = (address === "") ? dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress : unescape(address);
                    break;
                }
            } catch (err) {
                alert(err.message);
            }
        },

        _hideContainer: function () {
            try {
                dom.byId("placeNameSearch").style.display = "none";
                dom.byId("divFileUploadContainer").style.display = "none";
                dom.byId("divAOIAddressContent").style.display = "none";
                dom.byId("divBearingContainer").style.display = "none";
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * display the shared point feature on map as per the style of point and shared AOI panel tab
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayPointData: function (graphicDetails) {
            try {
                var pointGeometry;
                this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                this._setSliderProperties(graphicDetails);
                dijit.byId("horizontalSlider").setValue(parseFloat(graphicDetails.SD));
                pointGeometry = new Point(Number(graphicDetails.X), Number(graphicDetails.Y), new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
                if (graphicDetails.STYLE === "queryFeature") {
                    //when point geometry is of query result feature
                    topic.publish("showFeatureResultsOnMap", pointGeometry);
                } else {
                    if (graphicDetails.TAB === dojo.configData.CoordinatesTab.Title) {
                        //in coordinates tab, point geometry is an initial point
                        topic.publish("locateInitialPoint", pointGeometry);
                    } else {
                        this._addGraphic(pointGeometry, graphicDetails);
                        if (graphicDetails.TAB !== dojo.configData.DrawTab.Title && parseFloat(graphicDetails.SD) > 0) {
                            topic.publish("createBuffer", [pointGeometry], null);
                        }
                    }
                }
                topic.publish("showClearGraphicsIcon");
                if (parseFloat(graphicDetails.SD) === 0) {
                    topic.publish("disableDefaultSharingExtent");
                }
                this._setEmailSharingMapExtent();
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * set the slider unit, distance and minimum and maximum values
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _setSliderProperties: function (graphicDetails) {
            this._setSliderMinAndMaxValue(this._convertSelectedValue(graphicDetails));
            domAttr.set(dom.byId("spanSliderValueTextBox"), "value", parseFloat(graphicDetails.SD));
            domAttr.set(dom.byId("spanSliderUnitValue"), "innerHTML", this._convertSelectedValue(graphicDetails));
            //remove the highlighted distance unit if any
            array.forEach(query(".esriCTRadioBtnContent"), function (item) {
                if (domClass.contains(item, "esriCTSelectedDistanceUnit")) {
                    domClass.remove(item, "esriCTSelectedDistanceUnit");
                }
            });
            //highlight the shared distance unit
            domClass.add(dom.byId(this._convertSelectedValue(graphicDetails)), "esriCTSelectedDistanceUnit");
            topic.publish("setSliderValue", graphicDetails.UV);
        },

        /**
        * get the slider unit value from shared parameter and return the value to be highlighted
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
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

        /**
        * set the slider minimum and maximum values as per the shared distance unit
        * @param {object} the slider distance unit
        * @memberOf widgets/share/share
        */
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

        /**
        * check the shared value of selected AOI panel tab and display the polygon geometry on map accordingly
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayPolygonData: function (graphicDetails) {
            try {
                var graphic, polygon, symbol, horizontalSlider;
                horizontalSlider = dijit.byId("horizontalSlider");
                polygon = new Polygon();
                polygon.rings = JSON.parse(unescape(graphicDetails.GEOM));
                polygon.spatialReference = new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                });
                this._setSliderProperties(graphicDetails);
                //check if selected AOI panel tab is a shapefile
                if (graphicDetails.TAB === dojo.configData.ShapefileTab.Title) {
                    this._highlightTab(graphicDetails.TAB, "");
                    topic.publish("displayShapeFile", polygon, parseFloat(graphicDetails.SD));
                } else {
                    this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                    if (graphicDetails.SN === "aOISearch" || graphicDetails.TAB === dojo.configData.PlacenameTab.Title) {
                        //if sourcename of geometry is aOISearch it is a query result feature of draw or coordinate tab
                        //polygon geometry in case of Placename tab is a query result Feature
                        topic.publish("showFeatureResultsOnMap", polygon);
                        //buffer will be drawn only in case of Placename tab
                        if (parseFloat(graphicDetails.SD) > 0 && graphicDetails.TAB === dojo.configData.PlacenameTab.Title) {
                            horizontalSlider.setValue(parseFloat(graphicDetails.SD));
                        } else {
                            topic.publish("disableDefaultSharingExtent");
                        }
                    } else {
                        //a shared polygon is drawn using a draw tool of Draw tab
                        symbol = this._createFeatureSymbol(polygon.type);
                        graphic = new Graphic(polygon, symbol);
                        this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                        if (parseFloat(graphicDetails.SD) > 0) {
                            horizontalSlider.setValue(parseFloat(graphicDetails.SD));
                        } else {
                            topic.publish("disableDefaultSharingExtent");
                        }
                    }
                }
                topic.publish("showClearGraphicsIcon");
                this._setEmailSharingMapExtent();
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * check the shared value of selected AOI panel tab and display the polyline geometry on map accordingly
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayPolylineData: function (graphicDetails) {
            try {
                var polyline, pointGeometry, symbol, graphic, horizontalSlider;
                horizontalSlider = dijit.byId("horizontalSlider");
                polyline = new Polyline();
                this._setSliderProperties(graphicDetails);
                //if GEOM parameter value is present, create a polyline with shared geometry data
                if (graphicDetails.GEOM && graphicDetails.GEOM !== "undefined") {
                    polyline.paths = JSON.parse(unescape(graphicDetails.GEOM));
                    polyline.spatialReference = new esri.SpatialReference({
                        "wkid": this.map.spatialReference.wkid
                    });
                }
                if (graphicDetails.TAB === dojo.configData.ShapefileTab.Title) {
                    this._highlightTab(graphicDetails.TAB, "");
                    topic.publish("displayShapeFile", polyline, parseFloat(graphicDetails.SD));
                } else {
                    this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                    if (graphicDetails.TAB === dojo.configData.CoordinatesTab.Title) {
                        //get the mapPoint from shared point geometry values
                        pointGeometry = new Point(Number(graphicDetails.CX), Number(graphicDetails.CY), new esri.SpatialReference({
                            "wkid": this.map.spatialReference.wkid
                        }));
                        if ((graphicDetails.LAT) && (graphicDetails.LONG)) {
                            dom.byId("addLatitudeValue").value = parseFloat(graphicDetails.LAT);
                            dom.byId("addLongitudeValue").value = parseFloat(graphicDetails.LONG);
                        }
                        if (parseFloat(graphicDetails.SD) > 0) {
                            horizontalSlider.setValue(parseFloat(graphicDetails.SD));
                        }
                        //publish an event to set and draw a startPoint and bearing distance values on map
                        topic.publish("normalizeStartPoint", pointGeometry, graphicDetails.BEARING, graphicDetails.SN);
                    } else {
                        //a shared polyline is drawn using a draw tool of Draw tab
                        symbol = this._createFeatureSymbol(polyline.type);
                        graphic = new Graphic(polyline, symbol);
                        this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                        topic.publish("showClearGraphicsIcon");
                        if (parseFloat(graphicDetails.SD) > 0) {
                            horizontalSlider.setValue(parseFloat(graphicDetails.SD));
                        } else {
                            topic.publish("disableDefaultSharingExtent");
                        }
                    }
                }
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * display the multipoint geometry of shapefile on map
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayMulipointData: function (graphicDetails) {
            try {
                var multipoint;
                multipoint = new Multipoint();
                multipoint.points = JSON.parse(unescape(graphicDetails.GEOM));
                multipoint.spatialReference = new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                });
                this._highlightTab(graphicDetails.TAB, "");
                topic.publish("displayShapeFile", multipoint, parseFloat(graphicDetails.SD));
                this._setSliderProperties(graphicDetails);
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * display the shared geolocation point on map
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayGeoLocationData: function (graphicDetails) {
            try {
                var pointGeometry;
                pointGeometry = new Point(Number(graphicDetails.X), Number(graphicDetails.Y), new esri.SpatialReference({
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

        /**
        * display the shared graphics of geometry type extent on map
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayExtentData: function (graphicDetails) {
            try {
                var extent, symbol, graphic;
                extent = new esri.geometry.Extent({
                    "xmin": graphicDetails.XMIN,
                    "ymin": graphicDetails.YMIN,
                    "xmax": graphicDetails.XMAX,
                    "ymax": graphicDetails.YMAX,
                    "spatialReference": {
                        "wkid": this.map.spatialReference.wkid
                    }
                });
                this._setSliderProperties(graphicDetails);
                this._highlightTab(graphicDetails.TAB, graphicDetails.ADDR);
                symbol = this._createFeatureSymbol(extent.type);
                graphic = new Graphic(extent, symbol);
                if (parseFloat(graphicDetails.SD) > 0) {
                    dijit.byId("horizontalSlider").setValue(parseFloat(graphicDetails.SD));
                    topic.publish("createBuffer", [extent], null);
                } else {
                    topic.publish("disableDefaultSharingExtent");
                }
                this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                topic.publish("showClearGraphicsIcon");
                this._setEmailSharingMapExtent();
                this._replicateSharedData(null);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * highlight the search tab and display the shared locator data on map
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _displayLocatorData: function (graphicDetails) {
            try {
                var pointGeometry, polygon;
                pointGeometry = new Point(Number(graphicDetails.X), Number(graphicDetails.Y), new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
                this._setSliderProperties(graphicDetails);
                domAttr.set(dojo.query(".esriCTTxtAddress")[0], "defaultAddress", unescape(graphicDetails.ADDR));
                //set the buffer value if present
                if (parseFloat(graphicDetails.SD) > 0) {
                    dijit.byId("horizontalSlider").setValue(parseFloat(graphicDetails.SD));
                } else {
                    topic.publish("disableDefaultSharingExtent");
                }
                topic.publish("toggleWidget", "locator");
                if (graphicDetails.GeomType !== "polygon") {
                    //point geometry
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

        /**
        * get all the shared values in a seperate string from the shared url
        * @param {string} a key value from the url used for seperation
        * @memberOf widgets/share/share
        */
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

        /**
        * add the point geometry on map as per the graphic style and shared tabname
        * @param {object} a point to drawn on map
        * @param {array} collection of shared map extent and data parameters
        * @memberOf widgets/share/share
        */
        _addGraphic: function (mapPoint, graphicDetails) {
            try {
                var locatorMarkupSymbol, geoLocationPushpin, graphic, attr;
                geoLocationPushpin = dojoConfig.baseURL + dojo.configData.LocatorSettings.DefaultLocatorSymbol;
                locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(geoLocationPushpin, dojo.configData.LocatorSettings.MarkupSymbolSize.width, dojo.configData.LocatorSettings.MarkupSymbolSize.height);
                if ((graphicDetails.TAB === dojo.configData.CoordinatesTab.Title) && (graphicDetails.CX) && (graphicDetails.CY)) {
                    locatorMarkupSymbol.setOffset(dojo.configData.LocatorSettings.MarkupSymbolSize.width / 4, dojo.configData.LocatorSettings.MarkupSymbolSize.height / 2);
                }
                if (graphicDetails.STYLE === "drawnFeature") {
                    //shared point is drawn using draw tool of Draw tab
                    topic.publish("shareDrawPointFeature", mapPoint);
                    //set the slider value
                    if (parseFloat(graphicDetails.SD) === 0) {
                        topic.publish("disableDefaultSharingExtent");
                    }
                    dijit.byId("horizontalSlider").setValue(parseFloat(graphicDetails.SD));
                    return;
                }
                graphic = new Graphic(mapPoint, locatorMarkupSymbol, null, null);
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                //check if showbuffer parameter is false
                if (graphicDetails.SB === "false") {
                    attr = {};
                    //shared point is drawn using draw or coordinate tab or geolocation
                    if (graphicDetails.TAB === dojo.configData.DrawTab.Title || graphicDetails.TAB === dojo.configData.CoordinatesTab.Title || graphicDetails.SN === "aOISearch") {
                        attr.sourcename = "aOISearch";
                    } else if (graphicDetails.TAB === "geolocation" || graphicDetails.SN === "geoLocationSearch") {
                        attr.sourcename = "geoLocationSearch";
                    }
                    graphic.attributes = attr;
                    topic.publish("disableDefaultSharingExtent");
                }
                //in case of search tab, add the point geometry on locatorGraphicsLayer
                if (graphicDetails.TAB === "locator") {
                    this.map.getLayer("locatorGraphicsLayer").add(graphic);
                } else {
                    //except search tab, point geometry is drawn on esriGraphicsLayerMapSettings
                    this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                }
                topic.publish("showClearGraphicsIcon");
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
            var mapExtent, url, urlStr, urlPath;
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

                // Attempt the shrinking of the URL
                this.getTinyUrl = commonShare.getTinyLink(urlStr, dojo.configData.MapSharingOptions.TinyURLServiceURL);
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
        * @memberOf widgets/share/share
        */
        _share: function (site) {

            /*
            * hide share panel once any of the sharing options is selected
            */
            if (html.coords(this.divAppContainer).h > 0) {
                domClass.replace(this.domNode, "esriCTImgSocialMedia", "esriCTImgSocialMediaSelected");
                domClass.replace(this.divAppContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
            }

            // Do the share
            commonShare.share(this.getTinyUrl, dojo.configData.MapSharingOptions, site);
        },

        /**
        * set the default mapExtent as per the shared value of map extent
        * @memberOf widgets/share/share
        */
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