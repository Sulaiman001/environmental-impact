/*global define,dojo,dojoConfig,esri,esriConfig,alert,self:true,dijit,params,unescape,dialog:true*/
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
    "dojo/dom-construct",
    "dojo/on",
    "dojo/topic",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/dom-style",
    "dojo/dom-attr",
    "dojo/dom",
    "dojo/query",
    "dojo/dom-class",
    "esri/tasks/GeometryService",
    "dijit/Dialog",
    "dojo/string",
    "dojo/_base/html",
    "dojo/text!./templates/reportsTemplate.html",
    "dojo/_base/Color",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/PictureMarkerSymbol",
    "dijit/TooltipDialog",
    "dijit/place",
    "dijit/form/CheckBox",
    "dijit/form/Button",
    "esri/graphic",
    "esri/tasks/BufferParameters",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "esri/layers/GraphicsLayer",
    "esri/toolbars/draw",
    "dijit/form/HorizontalSlider",
    "dijit/form/HorizontalRule",
    "dijit/form/HorizontalRuleLabels",
    "dijit/form/RadioButton",
    "../scrollBar/scrollBar",
    "dojo/Deferred",
    "dojo/DeferredList",
    "esri/tasks/query",
    "esri/tasks/QueryTask",
    "esri/request",
    "dojo/_base/json",
    "esri/geometry/Point",
    "dojo/string",
    "dojo/number",
    "esri/geometry/Polyline",
    "esri/tasks/Geoprocessor",
    "esri/tasks/DataFile",
    "dijit/form/Select",
    "esri/tasks/ParameterValue",
    "esri/tasks/FeatureSet",
    "esri/dijit/Print",
    "esri/tasks/PrintParameters",
    "esri/tasks/PrintTask",
    "esri/tasks/ProjectParameters",
    "esri/SpatialReference",
    "widgets/locator/locator"

], function (declare, domConstruct, on, topic, lang, array, domStyle, domAttr, dom, query, domClass, GeometryService, Dialog, string, html, template, Color, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, TooltipDialog, Place, CheckBox, Button, Graphic, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, GraphicsLayer, Draw, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, RadioButton, ScrollBar, Deferred, DeferredList, Query, QueryTask, esriRequest, dojoJson, Point, dojoString, dojoNumber, Polyline, Geoprocessor, DataFile, SelectList, ParameterValue, FeatureSet, Print, PrintParameters, PrintTask, ProjectParams, SpatialReference, LocatorTool) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        logoContainer: null,
        aoiPanelScrollbar: null,
        reportPanelScrollbar: null,
        stagedBuffer: null,
        featureGeometryArray: null,
        sliderDistance: null,
        sliderUnitValue: null,
        polyLine: null,
        name: null,
        fAnalysisArray: [],
        _selectedAOI: null,
        AOIAttributes: [],
        configData: dojo.configData,
        startPointLongitude: null,
        startPointLatitude: null,
        resultDispalyFields: {},
        featureArrayCollection: [],
        reportArrayCollection: [],
        dataFormatType: [],
        convertedUnitType: null,
        _timer: null,
        _isDblClick: false,
        _previousGraphics: [],
        emailSharingData: null,
        barringArr: [],
        selectFeatureMapPointArr: [],
        _bearingDistDeferredArray: [],
        _sharingBearingValue: null,
        _sharingBearingDistance: null,
        hasAreaStandardUnit: false,
        isCoordinateTab: false,
        shapeFileUploaded: false,
        _setSharedExtent: true,
        _previousShapeFile: null,
        _coordinatesMapPoint: null,
        _failedQueryLayers: [],
        _layersWithNoFields: [],
        _downloadReportCount: null,

        /**
        * create reports widget
        * @class
        * @memberOf widgets/reports/reports
        */
        postCreate: function () {
            var locatorParams, LegendWidthChange, windowWidth;
            this.logoContainer = query(".esriControlsBR")[0];
            dojoJson.activatedDrawTool = false;
            dojo.locateInitialCoordinates = false;
            dojo.selectFeatureEnabled = false;
            topic.subscribe("toggleWidget", lang.hitch(this, function (widgetID) {
                if (widgetID !== "reports") {
                    /**
                    * @memberOf widgets/reports/reports
                    */
                    if (html.coords(this.applicationHeaderReportContainer).h > 0) {
                        domClass.replace(this.domNode, "esriCTReportsImg", "esriCTReportsImgSelected");
                        domClass.replace(this.applicationHeaderReportContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                        if (this.logoContainer) {
                            if (dojo.query('.esriCTdivLegendbox').length > 0 || dojo.configData.ShowLegend) {
                                dojo.setLegnedWidth = true;
                                topic.publish("setLegendWidth");
                                var legendPanel = dojo.query('.esriCTdivLegendbox');
                                if (legendPanel.length > 0) {
                                    domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (document.body.clientWidth + 4) + 'px');
                                }
                                domClass.remove(this.logoContainer, "esriCTMapLogo");
                                domClass.add(this.logoContainer, "esriCTMapLogoBottom");
                            }
                        }
                    }
                } else {
                    dojo.setLegnedWidth = false;
                    topic.publish("setLegendWidth");
                    LegendWidthChange = document.body.clientWidth - parseInt(document.getElementById('esriCTAOIContainer').clientWidth, 10);
                    if (dojo.query('.esriCTdivLegendbox').length > 0) {
                        domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (LegendWidthChange + 2) + 'px');
                    }
                    this._showAOITab();
                    this.resizeAOIPanel();
                    //set Default text
                    this._setDefaultAddress();
                }
                topic.publish("deactivateToolbar");
                //remove the highlight of the draw tool icon if selected
                this._disableDrawToolHighlight();
                dojo.selectFeatureEnabled = false;
                this.isCoordinateTab = false;
                dojo.locateInitialCoordinates = false;
            }));
            this.domNode = domConstruct.create("div", {
                "title": sharedNls.tooltips.reports,
                "class": "esriCTHeaderIcons esriCTReportsImg",
                "id": "reportsHeaderIcon"
            }, null);
            this._showHideContainer();
            this._subscribeEvents();
            this.divInitialCoordinates.title = sharedNls.tooltips.selectInitialCoordinates;

            /**
            * minimize other open header panel widgets and show AOI panel
            */
            this.applicationReportsContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            this.applicationReportsContainer.appendChild(this.applicationHeaderReportContainer);
            this._showAOITab();
            this.reportHandle = this.own(on(this.domNode, "click", lang.hitch(this, function () {
                topic.publish("toggleWidget", "reports");
                if (dojo.query('.esriCTdivLegendbox').length > 0) {
                    if (domClass.contains(this.domNode, "esriCTReportsImgSelected")) {
                        dojo.setLegnedWidth = true;
                        domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (document.body.clientWidth + 4) + "px");
                    } else {
                        dojo.setLegnedWidth = false;
                        LegendWidthChange = document.body.clientWidth - parseInt(document.getElementById('esriCTAOIContainer').clientWidth, 10);
                        domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (LegendWidthChange + 2) + 'px');
                    }
                }
                domStyle.set(this.applicationHeaderReportContainer, "display", "block");
                this._showHideContainer();
            })));
            if (this.logoContainer) {
                if (dojo.query('.esriCTdivLegendbox').length > 0 || dojo.configData.ShowLegend) {
                    domClass.add(this.logoContainer, "esriCTMapLogoBottom");
                    domClass.add(this.logoContainer, "esriCTMapLogo");
                } else {
                    domClass.add(this.logoContainer, "esriCTMapLogo");
                }
            }
            this.own(on(this.areaOfInterestTab, "click", lang.hitch(this, function () {
                if (domStyle.get(this.areaOfInterestContainer, "display") !== "block") {
                    this._showAOITab();
                    this.resizeAOIPanel(500);
                }
            })));

            this.own(on(this.esriCTClearAOIButton, "click", lang.hitch(this, function () {
                var i, node1, node2, BearingTextboxLength = dojo.query('.esriCTBearingTextbox');
                //disable draw tool icons
                dojo.selectFeatureEnabled = false;
                topic.publish("deactivateToolbar");
                topic.publish("hideMapTip");
                //remove the highlight of the draw tool icon if selected
                this._disableDrawToolHighlight();
                domAttr.set(this.addLatitudeValue, "value", "");
                domAttr.set(this.addLongitudeValue, "value", "");
                //clear the values of uploaded shapefile if any
                dom.byId("fileName").value = "";
                this.previousFileName = "";
                this.shapeFileUploaded = false;
                //clears the file input textbox value by redrawing the node
                node1 = dom.byId("fileUploadContainer").parentNode.innerHTML;
                dom.byId("fileUploadContainer").parentNode.innerHTML = node1;
                this._browseFileEvent();
                //clear the values of uploaded analysis shapefile if any
                dom.byId("analysisFileName").value = "";
                node2 = dom.byId("analysisFileUploadContainer").parentNode.innerHTML;
                dom.byId("analysisFileUploadContainer").parentNode.innerHTML = node2;
                this._browseAnalysisFileEvent();
                this.previousAnalysisFileName = "";
                //reset the slider value
                this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                //clear all the bearing value textboxes if any
                for (i = 0; i < BearingTextboxLength.length; i++) {
                    this._destroyBearingTextBox();
                }
                this.barringArr = [];
                //disable coordinates tab values
                this.isCoordinateTab = false;
                dojo.locateInitialCoordinates = false;
                this.AOIAttributes.length = 0;
                try {
                    this.emailSharingData = null;
                    topic.publish("shareDataThroughEmail", this.emailSharingData);
                } catch (err) {
                    alert(err.message);
                }
                this._clearAllGraphics();
            })));
            this.own(on(this.addBearingTextBox, "click", lang.hitch(this, function () {
                document.activeElement.blur();
                if (this.addLatitudeValue.value === "" && this.addLongitudeValue.value === "") {
                    alert(sharedNls.errorMessages.defineStartPointMessage);
                } else if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length === 0 || (this.map.getLayer("locatorGraphicsLayer").graphics.length > 0) ||
                        (this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length > 0 && (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes && this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes.sourcename === "geoLocationSearch"))) {
                    //if no start point on map or geolocation point on map, do not add bearing distance value
                    alert(sharedNls.errorMessages.defineStartPointMessage);
                } else {
                    var validRecord = (this._validateBearingInputText() && this._validateLocateValue()),
                        validNumericValue = this._validateNumericInputText();
                    if (validRecord && validNumericValue) {
                        this._addBearingTextBox(null, true);
                        this.addBearingValue.value = "";
                        this.addDistanceMiles.value = "";
                    }
                }
            })));
            this.own(on(this.reportTab, "click", lang.hitch(this, function () {
                topic.publish("deactivateToolbar");
                if (!dojo.selectFeatureEnabled) {
                    //select feature tool is not activated
                    this._initializeReportCreation();
                } else {
                    //select feature tool is activated, show alert message to complete the select feature operation
                    alert(sharedNls.errorMessages.selectFeatureError);
                }
            })));
            this.addLatitudeValue.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });
            this.addLatitudeValue.onpaste = lang.hitch(this, function (evt) {
                return false;
            });
            this.addLongitudeValue.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });
            this.addLongitudeValue.onpaste = lang.hitch(this, function (evt) {
                return false;
            });
            this.addBearingValue.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });
            this.addBearingValue.onpaste = lang.hitch(this, function (evt) {
                return false;
            });
            this.addDistanceMiles.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });
            this.addDistanceMiles.onpaste = lang.hitch(this, function (evt) {
                return false;
            });
            this.own(on(this.locateLatLongValue, "click", lang.hitch(this, function () {
                if (this._validateLocateValue() && this._validateLocateLatLongValues()) {
                    this.startPointLatitude = this.addLatitudeValue.value;
                    this.startPointLongitude = this.addLongitudeValue.value;
                    this._relocateInitialPoint();
                }
            })));
            this._createSelectionTool();
            this.resizeAOIPanel(500);
            this._createDownloadOption();
            this._browseFileEvent();
            this.own(on(this.esriCTUploadButton, "click", lang.hitch(this, function (event) {
                var _self = this,
                    isZipFile,
                    shapeFilePath = document.getElementById('fileUploadContainer'),
                    reg_exp = /\.zip/i;
                if (shapeFilePath.value.search(reg_exp) === -1) {
                    if (shapeFilePath.value === "") {
                        alert(sharedNls.errorMessages.browseFile);
                        isZipFile = false;
                    } else {
                        alert(sharedNls.errorMessages.inValideZipFile);
                        shapeFilePath.form.reset();
                        isZipFile = false;
                    }
                } else {
                    this._generateFeatureCollection(this.name, _self);
                    isZipFile = true;
                }
                return isZipFile;
            })));
            this.own(on(this.divInitialCoordinates, "click", lang.hitch(this, function () {
                dojo.locateInitialCoordinates = true;
                this.isCoordinateTab = true;
                dojo.selectFeatureEnabled = false;
            })));
            locatorParams = {
                defaultAddress: dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress,
                preLoaded: false,
                parentDomNode: this.divplaceNameSearch,
                map: this.map,
                graphicsLayerId: "esriGraphicsLayerMapSettings",
                locatorSettings: dojo.configData.LocatorSettings,
                configSearchSettings: dojo.configData.SearchSettings
            };
            this.placeNameAddressSearch = new LocatorTool(locatorParams);
            this.placeNameAddressSearch.candidateClicked = lang.hitch(this, function (graphic) {
                this.resizeAOIPanel();
                //check if address result is selected
                if (graphic.attributes.location) {
                    //when address result is selected
                    this.addrValue = graphic.name;
                    this._pointGeomStyle = "";
                    topic.publish("createBuffer", [this.placeNameAddressSearch.mapPoint], null);
                } else {
                    //when query result is selected
                    this._showFeatureResult(graphic.geometry);
                }
            });

            //Create webMap_JSON on onclick event of download button
            this.own(on(this.downloadButton, "click", lang.hitch(this, function () {
                var webMapJsonData = this._createMapJsonData();
                if (this._selectedAOI.features[0].geometry) {
                    //when selected aoi has geometry attribute
                    webMapJsonData.mapOptions.extent = this._selectedAOI.features[0].geometry.getExtent().expand(1.2);
                } else {
                    webMapJsonData.mapOptions.extent = this._selectedAOI.features[0].getExtent().expand(1.2);
                }
                this._downloadReport(webMapJsonData);
            })));
            this.reportsLoader = domConstruct.create("img", {
                "class": "esriCTInfoLoader"
            }, this.reportContent);
            domAttr.set(this.reportsLoader, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            this._hideLoadingIndicatorReports();
            this.settingsDialog = new Dialog({
                "class": "esriCTDijitDialog",
                id: "reportDialogId"
            });
            this.own(on(dojo.query(".esriCTUnitLabel"), "click", lang.hitch(this, function (evt) {
                this._toggleAreaUnit();
            })));
            this._browseAnalysisFileEvent();
            this.own(on(this.esriCTAnalysisUploadButton, "click", lang.hitch(this, function (event) {
                var _self = this,
                    isZipFile,
                    analysisFilePath = document.getElementById('analysisFileUploadContainer'),
                    reg_exp = /\.zip/i;
                if (analysisFilePath.value.search(reg_exp) === -1) {
                    if (analysisFilePath.value === "") {
                        alert(sharedNls.errorMessages.browseFile);
                        isZipFile = false;
                    } else {
                        alert(sharedNls.errorMessages.inValideZipFile);
                        analysisFilePath.form.reset();
                        isZipFile = false;
                    }
                } else {
                    this._generateAnalysisFeatureCollection(this.analysisFileName, _self);
                    isZipFile = true;
                }
                return isZipFile;
            })));
            this.map.on("click", lang.hitch(this, function (evt) {
                //check whether coordinate tab is selected and locate initial point tool is activated
                if (dojo.locateInitialCoordinates && this.isCoordinateTab) {
                    this._locateInitialCoordinatePoint(evt.mapPoint);
                }
                //check whether draw tab is selected and select feature tool is activated
                if (dojo.selectFeatureEnabled && !dojo.activatedDrawTool && !this.isCoordinateTab) {
                    if (dojo.hasOnMapClick) {
                        this._clearAllGraphics();
                        dojo.hasOnMapClick = false;
                    }
                    if (this._timer) {
                        clearTimeout(this._timer);
                        this._isDblClick = false;
                    }
                    this._timer = setTimeout(dojo.hitch(this, function () {
                        if (this._isDblClick === false) {
                            topic.publish("showProgressIndicator");
                            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                            this._selectFeatureGraphic(evt);
                        }
                    }), 500);
                }
            }));
            //map double click  for disable the select Feature function
            this.map.on("dbl-click", lang.hitch(this, function (evt) {
                try {
                    //if select feature tool is activated, then complete the select feature opertaion
                    if (dojo.selectFeatureEnabled) {
                        var sd, uv, i, tabName, geomString;
                        sd = this.sliderDistance;
                        uv = this.sliderUnitValue;
                        topic.publish("hideMapTip");
                        //remove the highlight of the draw tool icon if selected
                        this._disableDrawToolHighlight();
                        this._isDblClick = true;
                        dojo.selectFeatureEnabled = false;
                        this.addrValue = this._getAddressValue(tabName);
                        if (this.map.getLayer("hGraphicLayer") && this.map.getLayer("hGraphicLayer").graphics.length > 0) {
                            this._bufferSelectedFeatures();
                            tabName = dojo.query(".esriCTAOILinkSelect")[0].innerHTML;
                            geomString = "";
                            for (i = 0; i < this.selectFeatureMapPointArr.length; i++) {
                                geomString += this.selectFeatureMapPointArr[i].xmax + "," + this.selectFeatureMapPointArr[i].xmin + "," + this.selectFeatureMapPointArr[i].ymax + "," + this.selectFeatureMapPointArr[i].ymin + ",";
                            }
                            geomString = geomString.substring(0, geomString.length - 1);
                            this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "GeomType:" + "eventMapPoint" + "$" + "Geom:" + geomString + "$" + "SD:" + sd + "$" + "UV:" + uv;
                            topic.publish("shareDataThroughEmail", this.emailSharingData);
                        }
                    }
                } catch (err) {
                    alert(err.message);
                }
            }));
            this.map.on("mouse-move", lang.hitch(this, function (evt) {
                //check if select feature tool is activated
                if (dojo.selectFeatureEnabled) {
                    //check if feature is selected already, display tooltip for completing the opertaion
                    if (this.map.getLayer("hGraphicLayer") && this.map.getLayer("hGraphicLayer").graphics.length > 0) {
                        topic.publish("hideMapTip");
                        dialog = new TooltipDialog({
                            content: sharedNls.tooltips.completeFeatureSelection,
                            id: "toolTipDialogues",
                            style: "position: absolute; z-index:1000;"
                        });
                        dialog.startup();
                        domStyle.set(dialog.domNode, "opacity", 0.80);
                        Place.at(dialog.domNode, {
                            x: evt.pageX,
                            y: evt.pageY
                        }, ["TL", "TR"], {
                            x: 5,
                            y: 5
                        });
                    } else {
                        //display tooltip for selecting the feature
                        topic.publish("hideMapTip");
                        dialog = new TooltipDialog({
                            content: sharedNls.tooltips.selectFeature,
                            id: "toolTipDialogues",
                            style: "position: absolute; z-index:1000;"
                        });
                        dialog.startup();
                        domStyle.set(dialog.domNode, "opacity", 0.80);
                        Place.at(dialog.domNode, {
                            x: evt.pageX,
                            y: evt.pageY
                        }, ["TL", "TR"], {
                            x: 5,
                            y: 5
                        });
                    }
                }
                //check if locate initial point tool is activated in coordinates tab
                if (dojo.locateInitialCoordinates) {
                    topic.publish("hideMapTip");
                    dialog = new TooltipDialog({
                        content: sharedNls.tooltips.selectCoordinates,
                        id: "toolTipDialogues",
                        style: "position: absolute; z-index:1000;"
                    });
                    dialog.startup();
                    domStyle.set(dialog.domNode, "opacity", 0.80);
                    Place.at(dialog.domNode, {
                        x: evt.pageX,
                        y: evt.pageY
                    }, ["TL", "TR"], {
                        x: 5,
                        y: 5
                    });
                }
            }));
            this.map.on("mouse-out", lang.hitch(this, function (evt) {
                topic.publish("hideMapTip");
            }));
            if (dojo.query('.esriCTdivLegendbox').length > 0 && dojo.query('.esriCTHeaderReportContainer').length > 0) {
                windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                LegendWidthChange = windowWidth - parseInt(dojo.query('.esriCTHeaderReportContainer')[0].offsetWidth, 10);
                domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (windowWidth + 4) + "px");
            }
        },

        /**
        * analysis shapefile is browsed from input texbox
        * @memberOf widgets/reports/reports
        */
        _browseAnalysisFileEvent: function () {
            this.own(on(dom.byId("analysisFileUploadContainer"), "change", lang.hitch(this, function (event) {
                if (event.target.value !== "") {
                    var fileName = event.target.value,
                        fileNameArray = fileName.split(".")[0].split("\\");
                    this.analysisFileName = fileNameArray[fileNameArray.length - 1];
                    dom.byId('analysisFileName').value = this.analysisFileName;
                }
            })));
        },

        /**
        * shapefile is browsed from input texbox
        * @memberOf widgets/reports/reports
        */
        _browseFileEvent: function () {
            this.own(on(dom.byId("fileUploadContainer"), "change", lang.hitch(this, function (event) {
                if (event.target.value !== "") {
                    var fileName = event.target.value,
                        fileNameArray = fileName.split(".")[0].split("\\");
                    this.name = fileNameArray[fileNameArray.length - 1];
                    dom.byId('fileName').value = this.name;
                }
            })));
        },

        /**
        * list of all published events that needs to be subcribed in this widget
        * @memberOf widgets/reports/reports
        */
        _subscribeEvents: function () {
            topic.subscribe("addPushpinOnMap", lang.hitch(this, this.addPushpinOnMap));
            topic.subscribe("hideMapTip", lang.hitch(this, this.hideMapTip));
            topic.subscribe("createBuffer", lang.hitch(this, this._clearAndCreateBuffer));
            topic.subscribe("setStartPoint", lang.hitch(this, this._setStartPoint));
            topic.subscribe("normalizeStartPoint", lang.hitch(this, this._normalizeStartPoint));
            topic.subscribe("closeDialogBox", lang.hitch(this, this.closeDialogBox));
            topic.subscribe("deactivateToolbar", lang.hitch(this, this.deactivateToolbar));
            topic.subscribe("clearAllGraphics", lang.hitch(this, this._clearAllGraphics));
            topic.subscribe("addressSelected", lang.hitch(this, this._searchAddressSelected));
            topic.subscribe("showCoordinatesPanel", lang.hitch(this, this._showCoordinatesPanel));
            topic.subscribe("displaySelectedFeature", lang.hitch(this, this._selectSharedFeatures));
            topic.subscribe("setSliderValue", lang.hitch(this, this._setSliderValue));
            topic.subscribe("addBearings", lang.hitch(this, this._addBearingTextBox));
            topic.subscribe("displayShapeFile", lang.hitch(this, this._downloadFile));
            topic.subscribe("setSliderDistanceAndUnit", lang.hitch(this, this._setSliderDistanceAndUnit));
            topic.subscribe("displayBufferedSelectedFeature", lang.hitch(this, this._bufferSelectedFeatures));
            topic.subscribe("setPolyline", lang.hitch(this, this._setPolylineData));
            topic.subscribe("shareLocatorAddress", lang.hitch(this, this._createDataForEmailSharing));
            topic.subscribe("fillBearingArr", lang.hitch(this, this._fillBearingArr));
            topic.subscribe("showDrawPanel", lang.hitch(this, this._showDrawPanel));
            topic.subscribe("showClearGraphicsIcon", lang.hitch(this, function () {
                domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
            }));
            topic.subscribe("disableDefaultSharingExtent", lang.hitch(this, function () {
                this._setSharedExtent = false;
            }));
            topic.subscribe("showFeatureResultsOnMap", lang.hitch(this, this._showFeatureResult));
            topic.subscribe("locateInitialPoint", lang.hitch(this, this._locateInitialCoordinatePoint));
            topic.subscribe("resetAOITab", lang.hitch(this, this._resetAOITab));
            topic.subscribe("shareDrawPointFeature", lang.hitch(this, this._drawFeature));
            topic.subscribe("mapResized", lang.hitch(this, this._resizePanels));
            topic.subscribe("resizeAOIPanel", lang.hitch(this, this.resizeAOIPanel));
        },

        _resizePanels: function (duration) {
            if (domStyle.get(this.reportContainer, "display") === "block") {
                this.resizeReportsPanel();
                this._resizeDialogBox();
            } else {
                this.resizeAOIPanel(duration);
            }
        },

        /**
        * reset all the values, arrays and flags of AOI tab
        * @memberOf widgets/reports/reports
        */
        _resetAOITab: function () {
            var node;
            //clear coordinate tab values
            this._destroyBearingTextBox();
            this.addBearingValue.value = "";
            this.addDistanceMiles.value = "";
            //clear the horizontalSlider value
            this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
            //clear upload file url
            dom.byId('fileName').value = "";
            //clears the file input textbox value by redrawing the node
            node = dom.byId("fileUploadContainer").parentNode.innerHTML;
            dom.byId("fileUploadContainer").parentNode.innerHTML = node;
            this._browseFileEvent();
            this.selectFeatureMapPointArr = [];
            this._layerNameArray = [];
            this.resultDispalyFields = {};
            this.emailSharingData = null;
            this._previousGraphics = [];
        },

        /**
        * creating the bearing and distance value array in case of shared url
        * @param {object} shared bearing and distance values
        * @memberOf widgets/reports/reports
        */
        _fillBearingArr: function (bearingArrValue) {
            try {
                this.barringArr = [];
                this.barringArr = bearingArrValue.split(",");
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * validate langitude and latitude textbox values for valid numeric inputs
        * @memberOf widgets/reports/reports
        */
        _validateLocateValue: function () {
            var allFieldValid = false,
                LatValue = this.addLatitudeValue.value,
                LongValue = this.addLongitudeValue.value;
            if ((LongValue !== "") && (LatValue !== "")) {
                if ((!LatValue.match(/^-?\d+(?:\.\d+)?$/)) && (!LongValue.match(/^-?\d+(?:\.\d+)?$/))) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage + " in " + sharedNls.messages.latitude + " and " + sharedNls.messages.longitude);
                } else if (!LatValue.match(/^-?\d+(?:\.\d+)?$/) && LongValue.match(/^-?\d+(?:\.\d+)?$/)) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage + " in " + sharedNls.messages.latitude);
                } else if (!LongValue.match(/^-?\d+(?:\.\d+)?$/) && LatValue.match(/^-?\d+(?:\.\d+)?$/)) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage + " in " + sharedNls.messages.longitude);
                } else {
                    allFieldValid = true;
                }
                return allFieldValid;
            }
        },

        /**
        * validate langitude and latitude textbox values for valid max and min values
        * @memberOf widgets/reports/reports
        */
        _validateLocateLatLongValues: function () {
            if (((lang.trim(this.addLatitudeValue.value) === "" || parseFloat(this.addLatitudeValue.value) <= -90 || parseFloat(this.addLatitudeValue.value) >= 90)) && ((lang.trim(this.addLongitudeValue.value) === "" || parseFloat(this.addLongitudeValue.value) <= -180 || parseFloat(this.addLongitudeValue.value) >= 180))) {
                alert(sharedNls.errorMessages.addLatitudeandLongitudeValue);
                return false;
            }
            if (lang.trim(this.addLatitudeValue.value) === "" || parseFloat(this.addLatitudeValue.value) <= -90 || parseFloat(this.addLatitudeValue.value) >= 90) {
                alert(sharedNls.errorMessages.addLatitudeValue);
                return false;
            }
            if (lang.trim(this.addLongitudeValue.value) === "" || parseFloat(this.addLongitudeValue.value) <= -180 || parseFloat(this.addLongitudeValue.value) >= 180) {
                alert(sharedNls.errorMessages.addLongitudeValue);
                return false;
            }
            if (parseFloat(this.startPointLatitude) === parseFloat(this.addLatitudeValue.value) && parseFloat(this.startPointLongitude) === parseFloat(this.addLongitudeValue.value)) {
                return false;
            }
            return true;
        },

        /**
        * locate initial point of coordinates tab
        * mapPoint is projected from longitude and latitude values of initial point
        * @memberOf widgets/reports/reports
        */
        _relocateInitialPoint: function () {
            var params, geometryService = new GeometryService(dojo.configData.GeometryService);
            this.mapPoint = new Point({
                "x": Number(this.startPointLongitude),
                "y": Number(this.startPointLatitude),
                "spatialReference": {
                    "wkid": 4326
                }
            });
            params = new ProjectParams();
            params.geometries = [this.mapPoint];
            params.outSR = this.map.spatialReference;
            geometryService.project(params, lang.hitch(this, function (geometries) {
                this.map.centerAt(geometries[0]);
                this._locateInitialCoordinatePoint(geometries[0]);
            }));
        },

        /**
        * set initial point and coordinate values of coordinates tab in case of shared url
        * @param {object} mapPoint selected start point on map
        * @param {object} bearingValues bearing and distance value pairs set
        * @memberOf widgets/reports/reports
        */
        _normalizeStartPoint: function (mapPoint, bearingValues) {
            var i, j, params, latLongPoint, deferredList, array = [], geometryService = new GeometryService(dojo.configData.GeometryService);
            this.isCoordinateTab = true;
            //check whether bearing and distance values are present
            if (bearingValues) {
                this._coordinatesMapPoint = mapPoint;
                latLongPoint = new Point({
                    "x": Number(mapPoint.x),
                    "y": Number(mapPoint.y),
                    "spatialReference": this.map.spatialReference
                });
                this._sharedBearingValues = bearingValues;
                params = new ProjectParams();
                params.geometries = [latLongPoint];
                params.outSR = new SpatialReference({ wkid: 4326 });
                geometryService.project(params, lang.hitch(this, function (geometries) {
                    this._setStartPoint(geometries[0], mapPoint);
                    //add bearing distance value textbox and draw on map
                    for (i = 0; i < bearingValues.split(",").length; i = i + 2) {
                        this._addBearingTextBox(bearingValues.split(",")[i] + "," + bearingValues.split(",")[i + 1]);
                    }
                    deferredList = new DeferredList(this._bearingDistDeferredArray);
                    deferredList.then(lang.hitch(this, function (result) {
                        array.length = 0;
                        array.push([this.initialPoint.x, this.initialPoint.y]);
                        for (j = 0; j < result.length; j++) {
                            array.push([result[j][1][0].x, result[j][1][0].y]);
                        }
                        this.polyLine = new Polyline(new esri.SpatialReference({
                            "wkid": this.map.spatialReference.wkid
                        }));
                        this.polyLine.addPath(array);
                        this._updateAOIOnMap();
                    }));
                }));
            }
        },

        /**
        * set slider distance unit and value in case of shared url
        * @param {object} sd slider distance
        * @param {object} uv slider distance unit value
        * @memberOf widgets/reports/reports
        */
        _setSliderDistanceAndUnit: function (sd, uv) {
            try {
                this.sliderDistance = sd;
                this.sliderUnitValue = uv;
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * set polyline values of coordinates tab in case of shared url
        * @param {object} polyline polyline data
        * @memberOf widgets/reports/reports
        */
        _setPolylineData: function (polyline) {
            try {
                this.polyLine = null;
                this.polyLine = polyline;
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * locate coordinates tab start point on map
        * @param {object} mapPoint point geometry on map
        * @memberOf widgets/reports/reports
        */
        _locateInitialCoordinatePoint: function (mapPoint, latLongValues) {
            this._coordinatesMapPoint = mapPoint;
            var latLongPoint, geometryService, params, geoLocationPushpin, locatorMarkupSymbol, graphic, tabName, style, lat, long, bearingArr, x, y, uv, sd, coordinatex, coordinatey, jsonData;
            topic.publish("hideMapTip");
            dojo.locateInitialCoordinates = false;
            geoLocationPushpin = dojoConfig.baseURL + dojo.configData.LocatorSettings.DefaultLocatorSymbol;
            locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(geoLocationPushpin, dojo.configData.LocatorSettings.MarkupSymbolSize.width, dojo.configData.LocatorSettings.MarkupSymbolSize.height);
            locatorMarkupSymbol.setOffset(dojo.configData.LocatorSettings.MarkupSymbolSize.width / 4, dojo.configData.LocatorSettings.MarkupSymbolSize.height / 2);
            graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {}, null);
            graphic.attributes.sourcename = "aOISearch";
            this._clearAllGraphics();
            this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
            geometryService = new GeometryService(dojo.configData.GeometryService);
            this._coordinatesMapPoint = mapPoint;
            if (this.mapPoint) {
                this._setStartPoint(this.mapPoint, mapPoint);
                this._setSharedExtent = false;
            } else {
                latLongPoint = new Point({
                    "x": Number(mapPoint.x),
                    "y": Number(mapPoint.y),
                    "spatialReference": this.map.spatialReference
                });
                params = new ProjectParams();
                params.geometries = [latLongPoint];
                params.outSR = new SpatialReference({ wkid: 4326 });
                geometryService.project(params, lang.hitch(this, function (geometries) {
                    this._setStartPoint(geometries[0], mapPoint);
                    this._setSharedExtent = false;
                }));
            }
            //update email sharing data for coordinates tab initial point value
            if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length > 0) {
                try {
                    tabName = dojo.query(".esriCTAOILinkSelect")[0].innerHTML;
                    this.addrValue = this._getAddressValue(tabName);
                    style = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.style;
                    lat = dom.byId("addLatitudeValue").value;
                    long = dom.byId("addLongitudeValue").value;
                    bearingArr = this.barringArr.toString();
                    x = this._coordinatesMapPoint.x;
                    y = this._coordinatesMapPoint.y;
                    sd = this.sliderDistance;
                    uv = this.sliderUnitValue;
                    coordinatex = this._coordinatesMapPoint.x;
                    coordinatey = this._coordinatesMapPoint.y;
                    if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].geometry.type === "polyline") {
                        jsonData = JSON.stringify(this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].geometry.paths);
                    }
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "STYLE:" + style + "$" + "LAT:" + lat + "$" + "LONG:" + long + "$" + "BEARING:" + bearingArr + "$" + "X:" + x + "$" + "Y:" + y + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "point" + "$" + "SB:" + false + "$" + "GEOM:" + jsonData + "$" + "CX:" + coordinatex + "$" + "CY:" + coordinatey;
                    topic.publish("shareDataThroughEmail", this.emailSharingData);
                } catch (err) {
                    alert(err.message);
                }
            }
            topic.publish("hideProgressIndicator");
        },

        /*
        * buffer the selected feature geometry of draw tab
        * @memberOf widgets/reports/reports
        */
        _bufferSelectedFeatures: function () {
            var graphicLayerCollection = this.map.getLayer("hGraphicLayer").graphics,
                geometryCollection = [],
                i,
                graphicGeometry;
            this.map.getLayer("tempBufferLayer").clear();
            for (i = 0; i < graphicLayerCollection.length; i++) {
                graphicGeometry = graphicLayerCollection[i].geometry.type === "extent" ? this._createPolygonFromExtent(graphicLayerCollection[i].geometry) : graphicLayerCollection[i].geometry;
                geometryCollection.push(graphicGeometry);
            }
            this._createBuffer(geometryCollection);
        },

        /**
        * convert extent type of geometry to Polygon geometry
        * @param {object} geometry extent type of geometry
        * @memberOf widgets/reports/reports
        */
        _createPolygonFromExtent: function (geometry) {
            var polygon = new esri.geometry.Polygon(geometry.spatialReference);
            polygon.addRing([
                [geometry.xmin, geometry.ymin],
                [geometry.xmin, geometry.ymax],
                [geometry.xmax, geometry.ymax],
                [geometry.xmax, geometry.ymin],
                [geometry.xmin, geometry.ymin]
            ]);
            return polygon;
        },

        /**
        * set slider unit value in case of shared url
        * @param {object} sliderVal slider unit value
        * @memberOf widgets/reports/reports
        */
        _setSliderValue: function (sliderVal) {
            try {
                this.sliderUnitValue = sliderVal;
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * select Feature result query functionality
        * @param {object} evt map onClick event
        * @memberOf widgets/reports/reports
        */
        _selectFeatureGraphic: function (evt) {
            try {
                var index, deferredListResult, queryGeometry,
                    onMapFeaturArray = [];
                queryGeometry = this._extentFromPoint(evt.mapPoint);
                this.selectFeatureMapPointArr.push(queryGeometry);
                for (index = 0; index < dojo.configSearchSettings.length; index++) {
                    if (this._checkLayerVisibility(dojo.configSearchSettings[index].QueryURL)) {
                        this._executeQueryTask(index, queryGeometry, onMapFeaturArray);
                    }
                }
                deferredListResult = new DeferredList(onMapFeaturArray); //passlist of n no of queries for n no of layers
                deferredListResult.then(lang.hitch(this, this._highlightSelectedFeatures), function (err) {
                    topic.publish("hideProgressIndicator");
                    alert(err.message);
                });
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * Description
        * @method _checkLayerVisibility
        * @param {} layerUrl
        * @return returnVal
        */
        _checkLayerVisibility: function (layerUrl) {
            var layer, lastChar, mapLayerUrl, layerUrlIndex = layerUrl.split('/'),
                returnVal = false;
            layerUrlIndex = layerUrlIndex[layerUrlIndex.length - 1];
            for (layer in this.map._layers) {
                if (this.map._layers.hasOwnProperty(layer)) {
                    if (this.map._layers[layer].url === layerUrl) {
                        if (this.map._layers[layer].visibleAtMapScale) {
                            returnVal = true;
                            break;
                        }
                    } else if (this.map._layers[layer].visibleLayers) {
                        lastChar = this.map._layers[layer].url[this.map._layers[layer].url.length - 1];
                        if (lastChar === "/") {
                            mapLayerUrl = this.map._layers[layer].url + layerUrlIndex;
                        } else {
                            mapLayerUrl = this.map._layers[layer].url + "/" + layerUrlIndex;
                        }
                        if (mapLayerUrl === layerUrl) {
                            if (array.indexOf(this.map._layers[layer].visibleLayers, parseInt(layerUrlIndex, 10)) !== -1) {
                                if (this.map._layers[layer].visibleAtMapScale) {
                                    if (this.map._layers[layer].dynamicLayerInfos) {
                                        if (this.map.__LOD.scale < this.map._layers[layer].dynamicLayerInfos[parseInt(layerUrlIndex, 10)].minScale) {
                                            returnVal = true;
                                            break;
                                        }
                                    } else {
                                        returnVal = true;
                                        break;
                                    }
                                } else {
                                    returnVal = true;
                                    break;
                                }
                            }
                        }
                    }
                }
            }
            return returnVal;
        },

        /**
        * highlight the Feature result on map
        * @param {object} result query result
        * @memberOf widgets/reports/reports
        */
        _highlightSelectedFeatures: function (result) { //once n no of queries are resolved it will come here in result
            var j, i, geoType, symbol, graphic, graphicLayer;
            graphicLayer = this.map.getLayer("hGraphicLayer");
            if (!graphicLayer) {
                graphicLayer = new GraphicsLayer();
                graphicLayer.id = "hGraphicLayer";
                this.map.addLayer(graphicLayer);
            }
            if (result) {
                for (j = 0; j < result.length; j++) {
                    if (result[j][0] === true) {
                        if (result[j][1].features && result[j][1].features.length > 0) {
                            for (i = 0; i < result[j][1].features.length; i++) {
                                geoType = result[j][1].features[i].geometry.type;
                                symbol = this._createSelectedFeatureSymbol(geoType);
                                graphic = new Graphic(result[j][1].features[i].geometry, symbol);
                                graphicLayer.add(graphic);
                            }
                            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
                        }
                    }
                }
                topic.publish("hideProgressIndicator");
            }
        },

        /**
        * create symbol for selected feature in draw tab
        * @param {object} geometryType geometryType of selected feature
        * @memberOf widgets/reports/reports
        */
        _createSelectedFeatureSymbol: function (geometryType) {
            var symbol;
            switch (geometryType) {
            case "point":
                symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_SOLID);
                symbol.setOutline(new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[0], 10), parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[1], 10), parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[2], 10)]), dojo.configData.SelectFeatureSymbology.SymbolWidth));
                break;
            case "polyline":
                symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[0], 10), parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[1], 10), parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[2], 10)]), dojo.configData.SelectFeatureSymbology.SymbolWidth);
                break;
            case "extent":
                symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[0], 10), parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[1], 10), parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[2], 10)]), dojo.configData.SelectFeatureSymbology.SymbolWidth);
                break;
            case "polygon":
                symbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[0], 10), parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[1], 10), parseInt(dojo.configData.SelectFeatureSymbology.SymbolColor.split(",")[2], 10)]), dojo.configData.SelectFeatureSymbology.SymbolWidth);
                break;
            default:
                symbol = new SimpleFillSymbol();
                break;
            }
            return symbol;
        },

        /**
        * create symbol for draw tool geometries in draw tab
        * @param {object} geometryType geometryType of drawn tool
        * @memberOf widgets/reports/reports
        */
        _createFeatureSymbol: function (geometryType) {
            var symbol;
            switch (geometryType) {
            case "point":
                symbol = new SimpleMarkerSymbol();
                this._pointGeomStyle = "drawnFeature";
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
        },

        /**
        * execute query for features on clicked map point
        * @param {object} index
        * @param {object} queryGeometry
        * @param {array} onMapFeaturArray
        * @memberOf widgets/reports/reports
        */
        _executeQueryTask: function (index, queryGeometry, onMapFeaturArray) {
            var queryTask, queryParms, queryOnRouteTask;
            queryTask = new esri.tasks.QueryTask(dojo.configSearchSettings[index].QueryURL);
            queryParms = new esri.tasks.Query();
            queryParms.outSpatialReference = this.map.spatialReference;
            queryParms.returnGeometry = true;
            queryParms.geometry = queryGeometry;
            queryParms.outFields = ["*"];
            queryOnRouteTask = queryTask.execute(queryParms, lang.hitch(this, function (results) {
                var deferred = new Deferred();
                deferred.resolve(results);
                return deferred.promise;
            }), function (err) {
                alert(err.message);
            });
            onMapFeaturArray.push(queryOnRouteTask);
        },

        /**
        * get extent of the map point
        * @param {object} point selected map point
        * @memberOf widgets/reports/reports
        */
        _extentFromPoint: function (point) {
            var tolerance, screenPoint, pnt1, pnt2, mapPoint1, mapPoint2;
            tolerance = 9;
            screenPoint = this.map.toScreen(point);
            pnt1 = new esri.geometry.Point(screenPoint.x - tolerance, screenPoint.y + tolerance);
            pnt2 = new esri.geometry.Point(screenPoint.x + tolerance, screenPoint.y - tolerance);
            mapPoint1 = this.map.toMap(pnt1);
            mapPoint2 = this.map.toMap(pnt2);
            return new esri.geometry.Extent(mapPoint1.x, mapPoint1.y, mapPoint2.x, mapPoint2.y, this.map.spatialReference);
        },

        /**
        * create download report select options for report type and report PDF format
        * @memberOf widgets/reports/reports
        */
        _createDownloadOption: function () {
            this._setDownloadReportType();
            this._setReportFormatOption();
        },

        /**
        * set download report type
        * @memberOf widgets/reports/reports
        */
        _setDownloadReportType: function () {
            var reportTypeOption;
            array.forEach(dojo.configData.ReportDownloadSettings.ReportSettings, function (reportType) {
                reportTypeOption = domConstruct.create("div", {
                    "class": "esriCTReportTypelabel",
                    "innerHTML": reportType.Label,
                    "type": reportType.Type
                }, this.downloadReportTypeValues);

                on(reportTypeOption, 'click', lang.hitch(this, function (evt) {
                    domClass.remove(dojo.query(".esriCTReportTypeSelected", this.downloadReportContainer)[0], "esriCTReportTypeSelected");
                    domClass.add(evt.currentTarget, "esriCTReportTypeSelected");
                    this.report_type = domAttr.get(evt.currentTarget, "type");
                }));
            }, this);
            this._resetDownloadOptions();
        },

        /**
        * set download report format
        * @memberOf widgets/reports/reports
        */
        _setReportFormatOption: function () {
            var reportFormatOption, downloadReportFormatValues;
            if (!this._disabledReportOptions()) {
                domConstruct.create("div", {
                    "class": "esriCTlabel",
                    "innerHTML": this.sharedNls.titles.selectFormat
                }, this.downloadReportFormat);
                downloadReportFormatValues = domConstruct.create("div", {
                    "class": "esriCTDownloadReportRowValues"
                }, this.downloadReportFormat);
                //create the report format node for each value in downloadSettings
                array.forEach(dojo.configData.DataDownloadSettings, function (reportFormat) {
                    if (reportFormat.Enabled) {
                        reportFormatOption = domConstruct.create("div", {
                            "class": "esriCTReportlabel",
                            "innerHTML": reportFormat.Label,
                            "format": reportFormat.Format,
                            "serviceURL": reportFormat.GPServiceURL
                        }, downloadReportFormatValues);

                        on(reportFormatOption, 'click', lang.hitch(this, function (evt) {
                            if (domClass.contains(evt.currentTarget, "esriCTReportTypeSelected")) {
                                domClass.remove(evt.currentTarget, "esriCTReportTypeSelected");
                                this.dataFormatType.splice(array.indexOf(this.dataFormatType, evt.currentTarget), 1);
                            } else {
                                domClass.add(evt.currentTarget, "esriCTReportTypeSelected");
                                this.dataFormatType.push(evt.currentTarget);
                            }
                        }));
                    }
                }, this);
            }
        },

        /**
        * verify if all the download report format options are disabled
        * @memberOf widgets/reports/reports
        */
        _disabledReportOptions: function () {
            var i, allDisabled = true;
            for (i = 0; i < dojo.configData.DataDownloadSettings.length; i++) {
                if (dojo.configData.DataDownloadSettings[i].Enabled) {
                    allDisabled = false;
                    break;
                }
            }
            return allDisabled;
        },

        /**
        * set the download report type and report option to default
        * @memberOf widgets/reports/reports
        */
        _resetDownloadOptions: function () {
            var i, reportTypeValues;
            reportTypeValues = dojo.query(".esriCTReportTypelabel", this.downloadReportContainer);
            domClass.add(reportTypeValues[0], "esriCTReportTypeSelected");
            if (domClass.contains(reportTypeValues[1], "esriCTReportTypeSelected")) {
                domClass.remove(reportTypeValues[1], "esriCTReportTypeSelected");
            }
            this.report_type = "Quick";
            if (this.dataFormatType.length > 0) {
                for (i = 0; i < this.dataFormatType.length; i++) {
                    domClass.remove(this.dataFormatType[i], "esriCTReportTypeSelected");
                }
                this.dataFormatType = [];
            }
        },

        /**
        * enable select feature draw option in draw tab
        * @memberOf widgets/reports/reports
        */
        _selectFeature: function () {
            dojo.selectFeatureEnabled = true;
            dojo.activatedDrawTool = false;
            topic.publish("deactivateToolbar");
            dojo.hasOnMapClick = true;
        },

        /**
        * set initial point for coordinates tab
        * @param {normalizedVal} normalized value of map point
        * @param {initialPoint} map point
        * @memberOf widgets/reports/reports
        */
        _setStartPoint: function (latLongPoint, initialPoint) {
            this.initialPoint = initialPoint;
            this.addLongitudeValue.value = this.startPointLongitude = parseFloat(latLongPoint.x).toFixed(5);
            this.addLatitudeValue.value = this.startPointLatitude = parseFloat(latLongPoint.y).toFixed(5);
            if (this.AOIAttributes.length > 0) {
                //bearing and distance values are already drawn on map
                //redraw these values with new start point
                this._reDrawCoordinateValues();
            } else {
                //set new Polyline and add update polyline path for new initial point
                this.polyLine = new Polyline(new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
                this._addCoordinatePolyLineValues(initialPoint);
            }
        },

        /**
        * set polyline path values
        * @param {initialPoint} map point
        * @memberOf widgets/reports/reports
        */
        _addCoordinatePolyLineValues: function (initialPoint) {
            if (this.polyLine.paths.length === 0) {
                //polyline path is empty, add initial point
                if (initialPoint) {
                    this.polyLine.addPath([
                        [initialPoint.x, initialPoint.y]
                    ]);
                }
            } else if (this.polyLine.paths[0].length > 0) {
                //append polyline path for new bearing distance value
                this._updateBearingDistList();
            }
        },

        /**
        * redraw polyline values of coordinates tab when initial point is changed or bearing distance value is deleted
        * @memberOf widgets/reports/reports
        */
        _reDrawCoordinateValues: function () {
            var intialLat, initiallong, AOIAttributesArray, i, j, initialbearing, initialdistance, distanceUnit, aoiAttributesIndex, mapPointsArray = [], deferredList, array = [];
            AOIAttributesArray = dojo.clone(this.AOIAttributes);
            this.AOIAttributes.length = 0;
            for (i = 0; i < AOIAttributesArray.length; i++) {
                if (i === 0) {
                    initiallong = this.startPointLongitude;
                    intialLat = this.startPointLatitude;
                } else {
                    initiallong = this.AOIAttributes[i - 1].longitude;
                    intialLat = this.AOIAttributes[i - 1].latitude;
                }
                initialbearing = AOIAttributesArray[i].bearing;
                initialdistance = AOIAttributesArray[i].distance;
                distanceUnit = AOIAttributesArray[i].unit;
                aoiAttributesIndex = AOIAttributesArray[i].aoiAttributesIndex;
                mapPointsArray.push(this.destVincenty(initiallong, intialLat, initialbearing, this._convertDistanceIntoMiles(initialdistance, distanceUnit), false, aoiAttributesIndex));
            }
            deferredList = new DeferredList(mapPointsArray);
            deferredList.then(lang.hitch(this, function (result) {
                array.length = 0;
                array.push([this.initialPoint.x, this.initialPoint.y]);
                for (j = 0; j < result.length; j++) {
                    array.push([result[j][1][0].x, result[j][1][0].y]);
                }
                this.polyLine = new Polyline(new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
                this.polyLine.addPath(array);
                this._updateAOIOnMap();
            }));
        },

        /**
        * update bearing and distance value pair to the list of polyline path values
        * @memberOf widgets/reports/reports
        */
        _updateBearingDistList: function () {
            var j, intialLat, initiallong, initialbearing, initialdistance, distanceUnit, aoiAttributesIndex, bearingDistDeferred, array = [];
            if (this.AOIAttributes.length === 0) {
                initiallong = this.startPointLongitude;
                intialLat = this.startPointLatitude;
                aoiAttributesIndex = this._getAOIAttrubutesIndex();
            } else {
                initiallong = this.AOIAttributes[this.AOIAttributes.length - 1].longitude;
                intialLat = this.AOIAttributes[this.AOIAttributes.length - 1].latitude;
                aoiAttributesIndex = this.AOIAttributes[this.AOIAttributes.length - 1].aoiAttributesIndex + 1;
            }
            initialbearing = this.addBearingValue.value;
            initialdistance = this.addDistanceMiles.value;
            if (initialbearing === "" && initialdistance === "") {
                initialbearing = this._sharingBearingValue;
                initialdistance = this._sharingBearingDistance;
            }
            distanceUnit = dojo.configData.BearingDistanceUnit;
            if (this._sharedBearingValues && this._sharedBearingValues.split(",").length > 1 && this._setSharedExtent) {
                this._bearingDistDeferredArray.push(this.destVincenty(initiallong, intialLat, initialbearing, this._convertDistanceIntoMiles(initialdistance, distanceUnit), false, aoiAttributesIndex));
            } else {
                bearingDistDeferred = this.destVincenty(initiallong, intialLat, initialbearing, this._convertDistanceIntoMiles(initialdistance, distanceUnit), false, aoiAttributesIndex);
                bearingDistDeferred.then(lang.hitch(this, function (bearingDistValue) {
                    array.length = 0;
                    for (j = 0; j < this.polyLine.paths[0].length; j++) {
                        array.push([this.polyLine.paths[0][j][0], this.polyLine.paths[0][j][1]]);
                    }
                    array.push([bearingDistValue[0].x, bearingDistValue[0].y]);
                    this.polyLine = new Polyline(new esri.SpatialReference({
                        "wkid": this.map.spatialReference.wkid
                    }));
                    this.polyLine.addPath(array);
                    this._updateAOIOnMap();
                }));
            }
        },

        /**
        * draw the polyline of coordinates tab on map
        * @memberOf widgets/reports/reports
        */
        _updateAOIOnMap: function () {
            var polylineSymbol;
            polylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(dojo.configData.AOISymbology.LineSymbolColor.split(",")[0], 10),
                parseInt(dojo.configData.AOISymbology.LineSymbolColor.split(",")[1], 10),
                parseInt(dojo.configData.AOISymbology.LineSymbolColor.split(",")[2], 10)
                ]), dojo.configData.AOISymbology.LineSymbolWidth);
            this._clearAllLayerGraphics();
            this.map.getLayer("esriGraphicsLayerMapSettings").add(new Graphic(this.polyLine, polylineSymbol));
            //check the shared extent flag in case of shared url
            if (window.location.toString().split("?extent=").length > 1 && this._setSharedExtent) {
                topic.publish("setMapExtent");
                if (this.AOIAttributes.length === ((this._sharedBearingValues.split(",").length) / 2) && this.sliderDistance === 0) {
                    this._setSharedExtent = false;
                } else if (this.sliderDistance > 0) {
                    topic.publish("createBuffer", this._getGeometryCollection("esriGraphicsLayerMapSettings"), null);
                }
            } else {
                if (this.sliderDistance === 0) {
                    topic.publish("hideProgressIndicator");
                }
                topic.publish("createBuffer", this._getGeometryCollection("esriGraphicsLayerMapSettings"), null);
                this.map.setExtent(this.polyLine.getExtent().expand(1.6));
            }
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");

        },

        /**
        * draw the polyline of coordinates tab on map
        * @param {object} layerId layer name of the geometry
        * @memberOf widgets/reports/reports
        */
        _getGeometryCollection: function (layerId) {
            var i, geomCollection = [];
            for (i = 0; i < this.map.getLayer(layerId).graphics.length; i++) {
                geomCollection.push(this.map.getLayer(layerId).graphics[i].geometry);
            }
            return geomCollection;
        },

        /**
        * show/hide of header panel options
        * @memberOf widgets/reports/reports
        */
        _showHideContainer: function () {
            if (html.coords(this.applicationHeaderReportContainer).h > 1) {
                /**
                * when user clicks on share icon in header panel, close the sharing panel if it is open
                */
                domClass.add(this.applicationHeaderReportContainer, "esriCTZeroHeight");
                if (this.logoContainer) {
                    domClass.remove(this.logoContainer, "esriCTMapLogo");
                }
                domClass.replace(this.domNode, "esriCTReportsImg", "esriCTReportsImgSelected");
                domClass.replace(this.applicationHeaderReportContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                topic.publish("setMaxLegendLength");
                this.settingsDialog.hide();
            } else {
                /**
                * when user clicks on share icon in header panel, open the sharing panel if it is closed
                */
                domClass.remove(this.applicationHeaderReportContainer, "esriCTZeroHeight");
                if (this.logoContainer) {
                    if (dojo.query('.esriCTdivLegendbox').length > 0 || dojo.configData.ShowLegend) {
                        domClass.add(this.logoContainer, "esriCTMapLogoBottom");
                        domClass.add(this.logoContainer, "esriCTMapLogo");
                    } else {
                        domClass.add(this.logoContainer, "esriCTMapLogo");
                    }
                }
                domClass.replace(this.domNode, "esriCTReportsImgSelected", "esriCTReportsImg");
                domClass.replace(this.applicationHeaderReportContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                domClass.replace(this.areaOfInterestContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                topic.publish("setMinLegendLength");
            }
        },

        /**
        * display AOI panel
        * @memberOf widgets/reports/reports
        */
        _showAOITab: function () {
            domStyle.set(this.divChangeUnit, "display", "none");
            if (domStyle.get(this.reportContainer, "display") === "block") {
                domStyle.set(this.reportContainer, "display", "none");
                domStyle.set(this.downloadButton, "display", "none");
                domStyle.set(this.areaOfInterestContainer, "display", "block");
                domClass.replace(this.areaOfInterestTab, "esriCTAreaOfInterestTabSelected", "esriCTAreaOfInterestTab");
                domClass.replace(this.areaOfInterestContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                domClass.replace(this.reportTab, "esriCTReportTabSelected", "esriCTReportTab");
                if (this.settingsDialog) {
                    this.settingsDialog.hide();
                }
                if (domStyle.get(this.uploadAOIContainer, "display") === "block") {
                    domStyle.set(this.uploadAOIContainer, "display", "none");
                }
            }
        },

        /**
        * display report panel
        * @memberOf widgets/reports/reports
        */
        _showReportsTab: function () {
            try {
                if (domStyle.get(this.reportContainer, "display") === "none") {
                    domStyle.set(this.reportContainer, "display", "block");
                    domStyle.set(this.downloadButton, "display", "block");
                    domStyle.set(this.areaOfInterestContainer, "display", "none");
                    domClass.replace(this.areaOfInterestTab, "esriCTAreaOfInterestTab", "esriCTAreaOfInterestTabSelected");
                    domClass.replace(this.reportTab, "esriCTReportTab", "esriCTReportTabSelected");
                    if (domStyle.get(this.uploadAOIContainer, "display") === "none") {
                        domStyle.set(this.uploadAOIContainer, "display", "block");
                    }
                }
            } catch (error) {
                alert("error");
            }
        },

        /**
        * set the default address value when address textbox is empty
        * delete the no address result found container if present
        * @memberOf widgets/reports/reports
        */
        _setDefaultAddress: function () {
            var noPlacenameResult, noDrawResult, noCoordinatesResult;
            //reset placename tab address search
            if (this.placeNameAddressSearch.lastSearchString === "") {
                topic.publish("setDefaultTextboxValue", this.placeNameAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress);
            }
            noPlacenameResult = dojo.query(".esriCTDivNoResultFound", this.placeNameAddressSearch.divAddressList);
            if (noPlacenameResult.length > 0) {
                domConstruct.destroy(noPlacenameResult[0]);
                topic.publish("setDefaultTextboxValue", this.placeNameAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress);
            }
            //reset draw tab address search
            if (this.drawTabAddressSearch) {
                if (this.drawTabAddressSearch.lastSearchString === "") {
                    topic.publish("setDefaultTextboxValue", this.drawTabAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIAddress);
                }
                noDrawResult = dojo.query(".esriCTDivNoResultFound", this.drawTabAddressSearch.divAddressList);
                if (noDrawResult.length > 0) {
                    domConstruct.destroy(noDrawResult[0]);
                    topic.publish("setDefaultTextboxValue", this.drawTabAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIAddress);
                }
            }
            //reset coordinates tab address search
            if (this.bearingAddressSearch) {
                if (this.bearingAddressSearch.lastSearchString === "") {
                    topic.publish("setDefaultTextboxValue", this.bearingAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress);
                }
                noCoordinatesResult = dojo.query(".esriCTDivNoResultFound", this.bearingAddressSearch.divAddressList);
                if (noCoordinatesResult.length > 0) {
                    domConstruct.destroy(noCoordinatesResult[0]);
                    topic.publish("setDefaultTextboxValue", this.bearingAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress);
                }
            }
        },

        /**
        * create selection tool and draw point,polygon or polyline
        * @memberOf widgets/reports/reports
        */
        _createSelectionTool: function () {
            var divAreaIntContainer, divSelectFeatureContainer, divFeatureSelectionContainer, divSelectionContainer, _self, selectedUnitValue, radioContent, i, radioContentDiv, spanRadioContent, selectFeature;
            //display draw tools icons and label
            divAreaIntContainer = domConstruct.create("div", {
                "class": "esriCTAreaIntContainer",
                "id": "esriCTAreaIntContainer"
            }, null);
            domConstruct.place(divAreaIntContainer, this.divAOIAddressContent, "after");
            domConstruct.create("div", {
                "innerHTML": dojo.configData.DrawTab.DefineAOILabel,
                "class": "esriCTAOIlabel"
            }, divAreaIntContainer);
            divSelectionContainer = domConstruct.create("div", {
                "class": "esriCTDrawingTools"
            }, divAreaIntContainer);
            domConstruct.create("div", {
                "class": "esriCTDrawPoint esriCTSelectionIcon",
                "id": "point",
                "title": sharedNls.titles.pointToolText
            }, divSelectionContainer);
            domConstruct.create("div", {
                "class": "esriCTDrawLine esriCTSelectionIcon",
                "id": "polyline",
                "title": sharedNls.titles.lineToolText
            }, divSelectionContainer);
            domConstruct.create("div", {
                "class": "esriCTDrawRectangle esriCTSelectionIcon",
                "id": "extent",
                "title": sharedNls.titles.rectangleToolText
            }, divSelectionContainer);
            domConstruct.create("div", {
                "class": "esriCTDrawPolygon esriCTSelectionIcon",
                "id": "polygon",
                "title": sharedNls.titles.polygonToolText
            }, divSelectionContainer);
            //display select feature icon and label on seperate row
            divSelectFeatureContainer = domConstruct.create("div", {
                "class": "esriCTSelectFeatureContainer",
                "id": "esriCTSelectFeatureContainer"
            }, null);
            domConstruct.place(divSelectFeatureContainer, divAreaIntContainer, "after");
            domConstruct.create("div", {
                "innerHTML": dojo.configData.DrawTab.SelectFeaturesLabel,
                "class": "esriCTAOIlabel"
            }, divSelectFeatureContainer);
            divFeatureSelectionContainer = domConstruct.create("div", {
                "class": "esriCTDrawingTools"
            }, divSelectFeatureContainer);
            selectFeature = domConstruct.create("div", {
                "class": "esriCTDrawMultiPoint",
                "title": sharedNls.titles.selectFeatureText
            }, divSelectFeatureContainer);
            //register the click event for select feature icon
            this.own(on(selectFeature, "click", lang.hitch(this, function (evt) {
                //remove the highlight of the draw tool icon if selected
                this._disableDrawToolHighlight();
                //highlight the selected draw tool icon
                domClass.add(evt.currentTarget, "esriCTDrawIconSelected esriCTIconSelection");
                this._selectFeature();
            })));
            this.toolbar = new Draw(this.map);
            _self = this;
            //register the click event for each draw tool icon
            array.forEach(query(".esriCTSelectionIcon"), function (value) {
                _self.own(on(value, "click", function (evt) {
                    //remove the highlight of the draw tool icon if selected
                    _self._disableDrawToolHighlight();
                    //highlight the selected draw tool icon
                    domClass.add(evt.currentTarget, "esriCTDrawIconSelected esriCTIconSelection");
                    topic.publish("hideMapTip");
                    _self.activateTool(this.id);
                }));
            });
            this.toolbar.on("draw-end", lang.hitch(this, function (evt) {
                this.selectFeatureMapPointArr = [];
                _self.addToMap(evt);
                dojo.destroy(_self.bearingOuterContainer);
                if (evt.geometry.type === "extent" || evt.geometry.type === "point" || evt.geometry.type === "polyline" || evt.geometry.type === "polygon") {
                    if (this.map.getLayer("hGraphicLayer")) {
                        this.map.getLayer("hGraphicLayer").clear();
                    }
                }
            }));
            this._horizontalSlider = new HorizontalSlider({
                intermediateChanges: true,
                "class": "horizontalSlider",
                "id": "horizontalSlider"
            }, this.horizontalSliderContainer);
            radioContentDiv = domConstruct.create("div", {
                "class": "esriCTRadioButtonDiv"
            }, this.divRadioButtonContainer);
            for (i = 0; i < dojo.configData.DistanceUnitSettings.length; i++) {
                radioContent = domConstruct.create("div", {
                    "class": "esriCTRadioBtn"
                }, radioContentDiv);
                spanRadioContent = domConstruct.create("span", {
                    "class": "esriCTRadioBtnContent esriCTCursorPointer",
                    "id": dojo.configData.DistanceUnitSettings[i].DistanceUnitName
                }, radioContent);
                domAttr.set(spanRadioContent, "index", i);
                domAttr.set(spanRadioContent, "innerHTML", dojo.configData.DistanceUnitSettings[i].DistanceUnitName);
                //update the slider minimum and maximum values as per the selected distance unit
                if (dojo.configData.DistanceUnitSettings[i].Selected) {
                    this._highlightSelectedDistanceUnit();
                    domClass.add(spanRadioContent, "esriCTSelectedDistanceUnit");
                    selectedUnitValue = spanRadioContent.innerHTML;
                    if (dojo.configData.DistanceUnitSettings[i].MinimumValue >= 0) {
                        this._horizontalSlider.value = dojo.configData.DistanceUnitSettings[i].MinimumValue;
                    } else {
                        dojo.configData.DistanceUnitSettings[i].MinimumValue = this._horizontalSlider.value = 0;
                    }
                    if (dojo.configData.DistanceUnitSettings[i].MinimumValue >= 0) {
                        this._horizontalSlider.minimum = dojo.configData.DistanceUnitSettings[i].MinimumValue;
                    } else {
                        dojo.configData.DistanceUnitSettings[i].MinimumValue = this._horizontalSlider.minimum = 0;
                    }
                    if (dojo.configData.DistanceUnitSettings[i].MaximumValue >= 0) {
                        this._horizontalSlider.maximum = dojo.configData.DistanceUnitSettings[i].MaximumValue;
                    } else {
                        dojo.configData.DistanceUnitSettings[i].MaximumValue = this._horizontalSlider.maximum = 100;
                    }
                    this.sliderDistance = parseFloat(dojo.configData.DistanceUnitSettings[i].MinimumValue.toFixed(2));
                    domAttr.set(this.spanSliderValueTextBox, "value", parseFloat(dojo.configData.DistanceUnitSettings[i].MinimumValue));
                    domAttr.set(this.spanSliderValueTextBox, "maxlength", dojo.configData.DistanceUnitSettings[i].MaximumValue.toString().length + 3);
                    domAttr.set(this.spanSliderUnitValue, "innerHTML", selectedUnitValue);
                    this.sliderUnitValue = this._sliderStartEndValue(selectedUnitValue, this._horizontalSlider, i, null);
                }
                if (i === (dojo.configData.DistanceUnitSettings.length - 1)) {
                    domClass.add(radioContent, "esriCTLastElement");
                }
                this.own(on(spanRadioContent, "click", lang.hitch(this, this._getSliderValue)));
            }
            this.own(on(this._horizontalSlider, "change", lang.hitch(this, function (value) {
                if (typeof value === "string") {
                    this.sliderDistance = parseFloat(parseFloat(value).toFixed(2));
                } else {
                    this.sliderDistance = parseFloat(value.toFixed(2));
                }
                domAttr.set(this.spanSliderValueTextBox, "value", this.sliderDistance);
                domAttr.set(this.spanSliderUnitValue, "innerHTML", this.spanSliderUnitValue.innerHTML);
                this._changeSliderValue();
            })));

            this.own(on(this.spanSliderValueTextBox, "keyup", lang.hitch(this, function (evt) {
                var changedValue = this._validateInputSpanValue(evt.currentTarget.value);
                //when changed value is not same as the prvious slider distance value
                if (changedValue !== this.sliderDistance) {
                    if (changedValue !== "" && changedValue <= this._horizontalSlider.maximum) {
                        //update the slider value when changed value is less than maximum slider value
                        this._horizontalSlider._setValueAttr(changedValue);
                        this.sliderDistance = changedValue;
                        this._changeSliderValue();
                    } else if (changedValue === "" || changedValue > this._horizontalSlider.maximum) {
                        //when changed value is not valid, set the slider to last valid value
                        alert(sharedNls.errorMessages.inValideNumericErrorMessage);
                        domAttr.set(this.spanSliderValueTextBox, "value", this.sliderDistance);
                    }
                }
            })));

            this.own(on(this.spanSliderValueTextBox, "blur", lang.hitch(this, function () {
                if (this.spanSliderValueTextBox.value === "") {
                    //when textBox is empty, set the slider and textBox value to last valid value
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage);
                    domAttr.set(this.spanSliderValueTextBox, "value", this.sliderDistance);
                }
            })));

            this.spanSliderValueTextBox.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });

            this.spanSliderValueTextBox.onpaste = lang.hitch(this, function (evt) {
                return false;
            });
            domConstruct.place(this.divRadioButtonContainer, this.divSliderContainer, "after");
            this._createLinkContainer(divAreaIntContainer, divSelectFeatureContainer);
        },

        /**
        * validate the input value of buffer slider text box for decimal and valid number
        * @param {value} input value of the textbox
        * @memberOf widgets/reports/reports
        */
        _validateInputSpanValue: function (value) {
            var validValue = "";
            if (value.indexOf(".") === -1 || (value.indexOf(".") > -1 && this._validateDecimalCount(value) === 1 && (value.split(".", 2)[1] === "" || value.split(".", 2)[1].length <= 2))) {
                //check if the value is not negative or NaN
                if (!(isNaN(Number(value))) && Number(value) >= 0) {
                    validValue = parseFloat(value);
                }
            }
            return validValue;
        },

        /**
        * check the input value for number of decimals
        * @param {value} input value of the textbox
        * @memberOf widgets/reports/reports
        */
        _validateDecimalCount: function (value) {
            var i, count = 0;
            for (i = 0; i < value.length; i++) {
                if (value[i] === ".") {
                    count++;
                }
            }
            return count;
        },

        /**
        * change the buffer slider value
        * @memberOf widgets/reports/reports
        */
        _changeSliderValue: function () {
            var graphics, geometryCollection, startIndexSliderDistance, endIndexSliderDistance, actualSliderDistance, sharedDataArray;
            clearTimeout(this.stagedBuffer);
            this.stagedBuffer = setTimeout(lang.hitch(this, function () {
                try {
                    if (this.map.getLayer("hGraphicLayer") && this.map.getLayer("hGraphicLayer").graphics.length > 0 && !dojo.selectFeatureEnabled) {
                        //in draw tab, features are selected on map
                        this._bufferSelectedFeatures();
                    } else {
                        graphics = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0];
                        if (graphics && graphics.geometry) {
                            geometryCollection = [];
                            geometryCollection.push(graphics.geometry);
                            this.featureGeometry = geometryCollection;
                            this.map.getLayer("tempBufferLayer").clear();
                            if (this.sliderDistance !== 0 && this._validateGraphicSource(graphics) && !dojo.locatorSelectFeature) {
                                topic.publish("createBuffer", this.featureGeometry, this.sliderUnitValue);
                            }
                        }
                    }
                    if ((this.map.getLayer("esriGraphicsLayerMapSettings") && this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length === 0) &&
                            (this.map.getLayer("hGraphicLayer") && this.map.getLayer("hGraphicLayer").graphics.length === 0)) {
                        topic.publish("shareDataThroughEmail", null);
                    }
                    //when slider value is changed to 0, update the email sharing data if present
                    if (this.sliderDistance === 0 && this.emailSharingData) {
                        startIndexSliderDistance = this.emailSharingData.indexOf("SD:");
                        endIndexSliderDistance = this.emailSharingData.indexOf("$", startIndexSliderDistance);
                        actualSliderDistance = parseFloat(this.emailSharingData.slice(startIndexSliderDistance + 3, endIndexSliderDistance));
                        sharedDataArray = this.emailSharingData.split("$");
                        //replace the slider value in the shared data with 0
                        sharedDataArray[array.indexOf(sharedDataArray, ("SD:" + actualSliderDistance))] = "SD:0";
                        this.emailSharingData = sharedDataArray.join("$").toString();
                        topic.publish("shareDataThroughEmail", this.emailSharingData);
                    }
                } catch (err) {
                    alert(err.message);
                }
            }), 500);
        },

        /**
        * check the sourcename of graphic
        * in case of geolocation or aoiSearch result, buffer feature is not enable
        * @memberOf widgets/reports/reports
        */
        _validateGraphicSource: function (graphics) {
            var drawBuffer = true;
            if (graphics.attributes && (graphics.attributes.sourcename === "aOISearch" || graphics.attributes.sourcename === "geoLocationSearch")) {
                drawBuffer = false;
            }
            return drawBuffer;
        },

        /**
        * highlight slider distance unit
        * @memberOf widgets/reports/reports
        */
        _highlightSelectedDistanceUnit: function () {
            array.forEach(query(".esriCTRadioBtnContent"), function (item) {
                if (domClass.contains(item, "esriCTSelectedDistanceUnit")) {
                    domClass.remove(item, "esriCTSelectedDistanceUnit");
                }
            });
        },

        /**
        * get address textbox value for sharing
        * @param {object} tab selected AOI tab
        * @memberOf widgets/reports/reports
        */
        _getAddressValue: function (tab) {
            try {
                var addr;
                switch (tab) {
                case dojo.configData.PlacenameTab.Title:
                    return dojo.query(".esriCTTxtAddress")[1].value;
                case dojo.configData.DrawTab.Title:
                    return dojo.query(".esriCTTxtAddress")[2].value;
                case dojo.configData.CoordinatesTab.Title:
                    if (dojo.query(".esriCTTxtAddress")[3]) {
                        addr = dojo.query(".esriCTTxtAddress")[3].value;
                    } else {
                        addr = dojo.query(".esriCTTxtAddress")[2].value;
                    }
                    return addr;
                default:
                    return null;
                }
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * create data for email sharing
        * @param {object} geometry selected geometry
        * @memberOf widgets/reports/reports
        */
        _createDataForEmailSharing: function (geometry, showBuffer, locatorAddr) {
            try {
                var xmin, xmax, ymin, ymax, bearingArr, geometryType, jsonData, tabName = dojo.query(".esriCTAOILinkSelect")[0].innerHTML, y = null, coordinatex, coordinatey, sourceName, geomString, i,
                    lat = dom.byId("addLatitudeValue").value, long = dom.byId("addLongitudeValue").value, sd = this.sliderDistance, uv = this.sliderUnitValue, x = null;
                if (geometry[0]) {
                    if (geometry[0].x) {
                        x = geometry[0].x;
                    }
                }
                if (geometry[0]) {
                    if (geometry[0].y) {
                        y = geometry[0].y;
                    }
                }
                if (this._coordinatesMapPoint) {
                    if (this._coordinatesMapPoint.x) {
                        coordinatex = this._coordinatesMapPoint.x;
                    }
                    if (this._coordinatesMapPoint.y) {
                        coordinatey = this._coordinatesMapPoint.y;
                    }
                }
                bearingArr = this.barringArr.toString();
                if (geometry[0]) {
                    xmin = geometry[0].xmin;
                    xmax = geometry[0].xmax;
                    ymin = geometry[0].ymin;
                    ymax = geometry[0].ymax;
                }
                if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length > 0) {
                    if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes && this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes.sourcename) {
                        sourceName = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes.sourcename;
                    }
                }
                geometryType = null;
                if (dom.byId("reportsHeaderIcon").className.indexOf("esriCTReportsImgSelected") > -1) {
                    geometryType = geometry[0].type;
                } else {
                    geometryType = "locator";
                    tabName = "locator";
                    if (this.map.getLayer("locatorGraphicsLayer") && this.map.getLayer("locatorGraphicsLayer").graphics && this.map.getLayer("locatorGraphicsLayer").graphics.length > 0) {
                        this._pointGeomStyle = "pushPinFeature";
                    } else {
                        this._pointGeomStyle = "";
                    }
                }
                this.addrValue = this._getAddressValue(tabName);

                switch (geometryType) {
                case "locator":
                    if (geometry[0].type === "polygon") {
                        jsonData = JSON.stringify(geometry[0].rings);
                    }
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + locatorAddr + "$" + "GeomType:" + geometry[0].type + "$" + "GEOM:" + jsonData + "$" + "X:" + x + "$" + "Y:" + y + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "SB:" + false + "$" + "STYLE:" + this._pointGeomStyle;
                    break;
                case "polygon":
                    jsonData = JSON.stringify(geometry[0].rings);
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "GEOM:" + jsonData + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "polygon" + "$" + "SN:" + sourceName;
                    break;
                case "polyline":
                    jsonData = JSON.stringify(geometry[0].paths);
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "BEARING:" + bearingArr + "$" + "LAT:" + lat + "$" + "LONG:" + long + "$" + "GEOM:" + jsonData + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "polyline" + "$" + "CX:" + coordinatex + "$" + "CY:" + coordinatey;
                    break;
                case "extent":
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "XMIN:" + xmin + "$" + "YMIN:" + ymin + "$" + "XMAX:" + xmax + "$" + "YMAX:" + ymax + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "extent";
                    break;
                case "point":
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "LAT:" + lat + "$" + "LONG:" + long + "$" + "BEARING:" + bearingArr + "$" + "X:" + x + "$" + "Y:" + y + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "point" + "$" + "STYLE:" + this._pointGeomStyle + "$" + "SB:" + showBuffer + "$" + "SN:" + sourceName + "$" + "CX:" + coordinatex + "$" + "CY:" + coordinatey;
                    break;
                case "multipoint":
                    jsonData = JSON.stringify(geometry[0].points);
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "GEOM:" + jsonData + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "multipoint";
                    break;
                }
                // update the email sharing data with selected feature geometry if in case of draw tab, select feature AOI present on map
                if (this.selectFeatureMapPointArr.length > 0) {
                    geomString = "";
                    for (i = 0; i < this.selectFeatureMapPointArr.length; i++) {
                        geomString += this.selectFeatureMapPointArr[i].xmax + "," + this.selectFeatureMapPointArr[i].xmin + "," + this.selectFeatureMapPointArr[i].ymax + "," + this.selectFeatureMapPointArr[i].ymin + ",";
                    }
                    geomString = geomString.substring(0, geomString.length - 1);
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "GeomType:" + "eventMapPoint" + "$" + "Geom:" + geomString + "$" + "SD:" + sd + "$" + "UV:" + uv;
                }

                topic.publish("shareDataThroughEmail", this.emailSharingData);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * set buffer slider value
        * @param {array} list of slider attributes
        * @memberOf widgets/reports/reports
        */
        _getSliderValue: function (value) {
            var index, sharedDataArray, startIndexUnitValue, endIndexUnitValue, actualUnitValue, startIndexSliderDistance, endIndexSliderDistance, actualSliderDistance;
            array.forEach(query(".esriCTRadioBtnContent"), function (item) {
                //clear the highlighted distance unit if any
                if (domClass.contains(item, "esriCTSelectedDistanceUnit")) {
                    domClass.remove(item, "esriCTSelectedDistanceUnit");
                }
            });
            domClass.add(value.target, "esriCTSelectedDistanceUnit");
            index = Number(domAttr.get(value.target, "index"));
            this.sliderUnitValue = this._sliderStartEndValue(value.target.innerHTML, this._horizontalSlider, index, true);
            if (this.emailSharingData) {
                sharedDataArray = this.emailSharingData.split("$");
                //replace the slider distance value in the shared data with 0
                startIndexSliderDistance = this.emailSharingData.indexOf("SD:");
                endIndexSliderDistance = this.emailSharingData.indexOf("$", startIndexSliderDistance);
                actualSliderDistance = this.emailSharingData.slice(startIndexSliderDistance + 3, endIndexSliderDistance);
                sharedDataArray[array.indexOf(sharedDataArray, ("SD:" + actualSliderDistance))] = "SD:0";
                //replace the slider unit value in the shared data with selected unit value
                startIndexUnitValue = this.emailSharingData.indexOf("UV:");
                endIndexUnitValue = this.emailSharingData.indexOf("$", startIndexUnitValue);
                actualUnitValue = this.emailSharingData.slice(startIndexUnitValue + 3, endIndexUnitValue);
                sharedDataArray[array.indexOf(sharedDataArray, ("UV:" + actualUnitValue))] = "UV:" + this.sliderUnitValue;
                //update the shared data
                this.emailSharingData = sharedDataArray.join("$").toString();
                topic.publish("shareDataThroughEmail", this.emailSharingData);
            }
        },

        /**
        * when search address is selected from locator tab, clear all the graphic layers and display clearAOI button
        * @memberOf widgets/reports/reports
        */
        _searchAddressSelected: function () {
            this._clearAllGraphics();
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
        },

        /**
        * Clears all graphics and graphics related flags and arrays
        * @memberOf widgets/reports/reports
        */
        _clearAllGraphics: function () {
            this._clearAllLayerGraphics();
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "none");
            this.selectFeatureMapPointArr = [];
            this._layerNameArray = [];
            this.resultDispalyFields = {};
            this.emailSharingData = null;
            this._previousGraphics = [];
            topic.publish("shareDataThroughEmail", this.emailSharingData);
        },

        /**
        * Clears all graphics layers
        * @memberOf widgets/reports/reports
        */
        _clearAllLayerGraphics: function () {
            if (this.map.getLayer("esriGraphicsLayerMapSettings")) {
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            }
            if (this.map.getLayer("tempBufferLayer")) {
                this.map.getLayer("tempBufferLayer").clear();
            }
            if (this.map.getLayer("hGraphicLayer")) {
                this.map.getLayer("hGraphicLayer").clear();
            }
            if (this.map.getLayer("locatorGraphicsLayer")) {
                this.map.getLayer("locatorGraphicsLayer").clear();
            }
            dojo.locatorSelectFeature = false;
        },

        /**
        * Shows SelectedLinkContainer and hide all other containers
        * @param {dom} current selected AOi link container DOM
        * @memberOf widgets/reports/reports
        */
        _showSelectedLinkContainer: function (selectedLinkContainer) {
            domStyle.set(this.placeNameSearch, "display", "none");
            domStyle.set(this.divAOIAddressContent, "display", "none");
            domStyle.set(this.divFileUploadContainer, "display", "none");
            domStyle.set(this.divBearingContainer, "display", "none");
            domStyle.set(selectedLinkContainer, "display", "block");
        },

        /**
        * create AOI tabs
        * @param {dom} divAreaIntContainer
        * @memberOf widgets/reports/reports
        */
        _createLinkContainer: function (divAreaIntContainer, divSelectFeatureContainer) {
            var divLinkUpload, node, divLinkDrawTool, divLinkCoordinates, divLinkplaceName, noResult;
            divLinkplaceName = domConstruct.create("div", {
                "id": "divLinkplaceName",
                "class": "esriCTAOILink esriCTCursorPointer esriCTAOILinkSelect",
                "innerHTML": dojo.configData.PlacenameTab.Title
            }, this.divLinkContainer);
            divLinkDrawTool = domConstruct.create("div", {
                "id": "divLinkDrawTool",
                "class": "esriCTAOILink esriCTCursorPointer",
                "innerHTML": dojo.configData.DrawTab.Title
            }, this.divLinkContainer);
            divLinkUpload = domConstruct.create("div", {
                "id": "divLinkUpload",
                "class": "esriCTAOILink esriCTCursorPointer",
                "innerHTML": dojo.configData.ShapefileTab.Title
            }, this.divLinkContainer);
            divLinkCoordinates = domConstruct.create("div", {
                "id": "divLinkCoordinates",
                "class": "esriCTAOILink esriCTCursorPointer esriCTAOICoordinates",
                "innerHTML": dojo.configData.CoordinatesTab.Title
            }, this.divLinkContainer);
            domStyle.set(divAreaIntContainer, "display", "none");
            domStyle.set(divSelectFeatureContainer, "display", "none");
            // Place Name Search
            on(divLinkplaceName, "click", lang.hitch(this, function () {
                this._destroyBearingTextBox();
                if (domStyle.get(this.placeNameSearch, "display") === "none") {
                    this.deactivateToolbar();
                    //Clear all graphics on click of link
                    this._clearAllGraphics();
                    //clear the horizontalSlider value
                    this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                    //disable the select Feature
                    dojo.selectFeatureEnabled = false;
                    this._isDrawTab = false;
                    //remove the highlight of the draw tool icon if selected
                    this._disableDrawToolHighlight();
                    //disable coordinates tab flags
                    dojo.locateInitialCoordinates = false;
                    this.isCoordinateTab = false;
                    this.addBearingValue.value = "";
                    this.addDistanceMiles.value = "";
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkplaceName"), "esriCTAOILinkSelect");
                    //clear upload file url
                    dom.byId('fileName').value = "";
                    this.previousFileName = "";
                    this.shapeFileUploaded = false;
                    //clears the file input textbox value by redrawing the node
                    node = dom.byId("fileUploadContainer").parentNode.innerHTML;
                    dom.byId("fileUploadContainer").parentNode.innerHTML = node;
                    this._browseFileEvent();
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.placeNameSearch);
                    domStyle.set(divAreaIntContainer, "display", "none");
                    domStyle.set(divSelectFeatureContainer, "display", "none");
                    if (this.placeNameAddressSearch.lastSearchString === "") {
                        topic.publish("setDefaultTextboxValue", this.placeNameAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress);
                    }
                    noResult = dojo.query(".esriCTDivNoResultFound", this.placeNameAddressSearch.divAddressList);
                    if (noResult.length > 0) {
                        //when search result is blank, set the address textBox to default value and clear the search result container
                        domConstruct.destroy(noResult[0]);
                        topic.publish("setDefaultTextboxValue", this.placeNameAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress);
                    }
                }
            }));
            on(divLinkUpload, "click", lang.hitch(this, function () {
                this._destroyBearingTextBox();
                if (domStyle.get(this.divFileUploadContainer, "display") === "none") {
                    this.deactivateToolbar();
                    //Clear all graphics on click of link
                    this._clearAllGraphics();
                    //clear the horizontalSlider value
                    this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                    //disable select Feature
                    dojo.selectFeatureEnabled = false;
                    this._isDrawTab = false;
                    //remove the highlight of the draw tool icon if selected
                    this._disableDrawToolHighlight();
                    //disable coordinates tab flags
                    dojo.locateInitialCoordinates = false;
                    this.isCoordinateTab = false;
                    this.addBearingValue.value = "";
                    this.addDistanceMiles.value = "";
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkUpload"), "esriCTAOILinkSelect");
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.divFileUploadContainer);
                    domStyle.set(divAreaIntContainer, "display", "none");
                    domStyle.set(divSelectFeatureContainer, "display", "none");
                    this.settingsDialog.hide();
                }
            }));
            on(divLinkDrawTool, "click", lang.hitch(this, function () {
                this._showDrawPanel();
            }));
            on(divLinkCoordinates, "click", lang.hitch(this, function () {
                this._showCoordinatesPanel(true);
            }));
        },

        /**
        * This function is used to display draw panel
        * @memberOf widgets/reports/reports
        */
        _showDrawPanel: function () {
            try {
                var locatorParams, noResult, node;
                this._destroyBearingTextBox();
                if (domStyle.get(this.divAOIAddressContent, "display") === "none") {
                    this.deactivateToolbar();
                    //Clear all graphics on click of link
                    this._clearAllGraphics();
                    //clear the horizontalSlider value
                    this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                    //disable the select Feature
                    dojo.selectFeatureEnabled = false;
                    this._isDrawTab = true;
                    //remove the highlight of the draw tool icon if selected
                    this._disableDrawToolHighlight();
                    //disable coordinates tab flags
                    dojo.locateInitialCoordinates = false;
                    this.isCoordinateTab = false;
                    this.addBearingValue.value = "";
                    this.addDistanceMiles.value = "";
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkDrawTool"), "esriCTAOILinkSelect");
                    //clear upload file url
                    dom.byId('fileName').value = "";
                    this.previousFileName = "";
                    this.shapeFileUploaded = false;
                    //clears the file input textbox value by redrawing the node
                    node = dom.byId("fileUploadContainer").parentNode.innerHTML;
                    dom.byId("fileUploadContainer").parentNode.innerHTML = node;
                    this._browseFileEvent();
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.divAOIAddressContent);
                    domStyle.set(dom.byId("esriCTAreaIntContainer"), "display", "block");
                    domStyle.set(dom.byId("esriCTSelectFeatureContainer"), "display", "block");
                    if (this.divDrawAddressSearch.children.length === 0) {
                        locatorParams = {
                            defaultAddress: dojo.configData.LocatorSettings.LocatorDefaultAOIAddress,
                            preLoaded: false,
                            parentDomNode: this.divDrawAddressSearch,
                            map: this.map,
                            graphicsLayerId: "esriGraphicsLayerMapSettings",
                            locatorSettings: dojo.configData.LocatorSettings,
                            configSearchSettings: dojo.configData.SearchSettings
                        };
                        this.drawTabAddressSearch = new LocatorTool(locatorParams);
                        this.drawTabAddressSearch.candidateClicked = lang.hitch(this, this._setSelectedPoint, this.drawTabAddressSearch, false);
                    }
                    if (this.drawTabAddressSearch.lastSearchString === "") {
                        topic.publish("setDefaultTextboxValue", this.drawTabAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIAddress);
                    }
                    noResult = dojo.query(".esriCTDivNoResultFound", this.drawTabAddressSearch.divAddressList);
                    if (noResult.length > 0) {
                        //when search result is blank, set the address textBox to default value and clear the search result container
                        domConstruct.destroy(noResult[0]);
                        topic.publish("setDefaultTextboxValue", this.drawTabAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIAddress);
                    }
                }
                this.settingsDialog.hide();
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * this method handles the search address result selection in Coordinates tab and Draw tab
        * @memberOf widgets/reports/reports
        */
        _setSelectedPoint: function (locator, isCoordinateTab, graphic) {
            var latLongPoint, geometryService, params, _self = this;
            this.resizeAOIPanel();
            this.addrValue = graphic.name;
            this.isCoordinateTab = isCoordinateTab;
            if (graphic.attributes.location) {
                //address search result is selected
                this._pointGeomStyle = "";
                locator.selectedGraphic.attributes.sourcename = "aOISearch";
                //in case of coordinate tab, initial point is set
                if (this.isCoordinateTab) {
                    dojo.locateInitialCoordinates = false;
                    this._coordinatesMapPoint = locator.mapPoint;
                    geometryService = new GeometryService(dojo.configData.GeometryService);
                    latLongPoint = new Point({
                        "x": Number(locator.mapPoint.x),
                        "y": Number(locator.mapPoint.y),
                        "spatialReference": this.map.spatialReference
                    });
                    params = new ProjectParams();
                    params.geometries = [latLongPoint];
                    params.outSR = new SpatialReference({ wkid: 4326 });
                    geometryService.project(params, lang.hitch(locator, function (geometries) {
                        topic.publish("setStartPoint", geometries[0], locator.mapPoint);
                        _self._createDataForEmailSharing([locator.mapPoint], false, null);
                    }));
                } else {
                    this._createDataForEmailSharing([graphic.attributes.location], false, null);
                }
            } else {
                //query search result is selected
                this._showFeatureResult(graphic.geometry);
            }
        },

        /**
        * displays selected feature on map
        * @memberOf widgets/reports/reports
        */
        _showFeatureResult: function (geometry) {
            var latLongPoint, highlightSymbol, highlightGraphic, geometryService, params;
            this._clearAllLayerGraphics();
            if (geometry.type === "point") {
                //selected feature is of Point geometry
                this.map.centerAt(geometry);
                highlightSymbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 15,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([
                            parseInt(dojo.configData.HighlightFeaturesSymbology.MarkerSymbolColor.split(",")[0], 10),
                            parseInt(dojo.configData.HighlightFeaturesSymbology.MarkerSymbolColor.split(",")[1], 10),
                            parseInt(dojo.configData.HighlightFeaturesSymbology.MarkerSymbolColor.split(",")[2], 10),
                            parseFloat(dojo.configData.HighlightFeaturesSymbology.MarkerSymbolTransparency.split(",")[0], 10)
                        ]), 2),
                    new Color([
                        parseInt(dojo.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[0], 10),
                        parseInt(dojo.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[1], 10),
                        parseInt(dojo.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[2], 10),
                        parseFloat(dojo.configData.HighlightFeaturesSymbology.FillSymbolTransparency.split(",")[0], 10)
                    ]));
                highlightGraphic = new Graphic(geometry, highlightSymbol);
                this.map.getLayer("esriGraphicsLayerMapSettings").add(highlightGraphic);
                this._pointGeomStyle = "queryFeature";
                //in case of coordinate tab, initial point is set
                if (this.isCoordinateTab) {
                    this._coordinatesMapPoint = geometry;
                    geometryService = new GeometryService(dojo.configData.GeometryService);
                    latLongPoint = new Point({
                        "x": Number(geometry.x),
                        "y": Number(geometry.y),
                        "spatialReference": this.map.spatialReference
                    });
                    params = new ProjectParams();
                    params.geometries = [latLongPoint];
                    params.outSR = new SpatialReference({ wkid: 4326 });
                    geometryService.project(params, lang.hitch(this, function (geometries) {
                        topic.publish("setStartPoint", geometries[0], geometry);
                        this._setSharedExtent = false;
                    }));
                } else if (!this._isDrawTab) {
                    //buffer is updated on map only in case of placename tab
                    if (window.location.toString().indexOf("?extent=") === -1) {
                        topic.publish("createBuffer", [geometry]);
                    } else if (window.location.toString().split("?extent=").length > 1 && !this._setSharedExtent) {
                        //for shared url if shared extent is false then only set the buffer
                        topic.publish("createBuffer", [geometry]);
                    }
                } else {
                    this._setSharedExtent = false;
                }
            } else {
                //selected feature is of Polygon geometry
                if (this.AOIAttributes.length === 0) {
                    //when no bearing distance values are present, then clear the start point
                    this.addLongitudeValue.value = "";
                    this.addLatitudeValue.value = "";
                }
                highlightSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([
                            parseInt(dojo.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[0], 10),
                            parseInt(dojo.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[1], 10),
                            parseInt(dojo.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[2], 10),
                            parseFloat(dojo.configData.HighlightFeaturesSymbology.LineSymbolTransparency.split(",")[0], 10)
                        ]), 2),
                    new Color([
                        parseInt(dojo.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[0], 10),
                        parseInt(dojo.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[1], 10),
                        parseInt(dojo.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[2], 10),
                        parseFloat(dojo.configData.HighlightFeaturesSymbology.FillSymbolTransparency.split(",")[0], 10)
                    ]));
                highlightGraphic = new Graphic(geometry, highlightSymbol);
                this.map.getLayer("esriGraphicsLayerMapSettings").add(highlightGraphic);
                //buffer is updated on map only in case of placename tab
                if (!this._isDrawTab && !this.isCoordinateTab) {
                    if (window.location.toString().indexOf("?extent=") === -1) {
                        topic.publish("createBuffer", [geometry]);
                    } else if (window.location.toString().split("?extent=").length > 1 && !this._setSharedExtent) {
                        //for shared url if shared extent is false then only set the buffer
                        topic.publish("createBuffer", [geometry]);
                    }
                }
                //set the map extent to selected feature extent only if the url is not shared
                //in case of shared url, check the shared url extent flag
                if (window.location.toString().indexOf("?extent=") > -1 && this._setSharedExtent) {
                    topic.publish("setMapExtent");
                    //diable the flag for draw tab or coordinate tab or else when slider value is 0
                    if (this._isDrawTab || this.isCoordinateTab) {
                        this._setSharedExtent = false;
                    }
                } else {
                    this.map.setExtent(geometry.getExtent());
                }
            }
            //update the graphic sourcename for draw tab and coordinates tab
            if (this._isDrawTab || this.isCoordinateTab) {
                if (!highlightGraphic.attributes) {
                    highlightGraphic.attributes = {};
                }
                highlightGraphic.attributes.sourcename = "aOISearch";
            }
            this._createDataForEmailSharing([highlightGraphic.geometry], false, null);
            topic.publish("hideProgressIndicator");
        },

        /**
        * This function is used to show coordinates panel
        * @memberOf widgets/reports/reports
        */
        _showCoordinatesPanel: function () {
            try {
                var locatorParams, noResult, node;
                this.settingsDialog.hide();
                if (domStyle.get(this.divBearingContainer, "display") === "none") {
                    this._destroyBearingTextBox();
                    domAttr.set(this.addDistanceMiles, "maxlength", dojo.configData.BearingDistanceMaxLimit.toString().length + 3);
                    domAttr.set(this.addBearingValue, "maxlength", 6);
                    this.deactivateToolbar();
                    //Clear all graphics on click of link
                    this._clearAllGraphics();
                    //clear the horizontalSlider value
                    this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                    //disable the select Feature
                    dojo.selectFeatureEnabled = false;
                    this._isDrawTab = false;
                    //remove the highlight of the draw tool icon if selected
                    this._disableDrawToolHighlight();
                    dojo.locateInitialCoordinates = false;
                    this.isCoordinateTab = true;
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkCoordinates"), "esriCTAOILinkSelect");
                    domConstruct.place(this.divBearingContainer, this.divBufferDistance, "before");
                    //clear upload file url
                    dom.byId('fileName').value = "";
                    this.previousFileName = "";
                    this.shapeFileUploaded = false;
                    //clears the file input textbox value by redrawing the node
                    node = dom.byId("fileUploadContainer").parentNode.innerHTML;
                    dom.byId("fileUploadContainer").parentNode.innerHTML = node;
                    this._browseFileEvent();
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.divBearingContainer);
                    domStyle.set(dom.byId("esriCTAreaIntContainer"), "display", "none");
                    domStyle.set(dom.byId("esriCTSelectFeatureContainer"), "display", "none");
                    if (this.divBearingAddressSearch.children.length === 0) {
                        locatorParams = {
                            defaultAddress: dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress,
                            preLoaded: false,
                            parentDomNode: this.divBearingAddressSearch,
                            map: this.map,
                            graphicsLayerId: "esriGraphicsLayerMapSettings",
                            locatorSettings: dojo.configData.LocatorSettings,
                            configSearchSettings: dojo.configData.SearchSettings
                        };
                        this.bearingAddressSearch = new LocatorTool(locatorParams);
                        this.bearingAddressSearch.candidateClicked = lang.hitch(this, this._setSelectedPoint, this.bearingAddressSearch, true);
                    }
                    if (this.bearingAddressSearch.lastSearchString === "") {
                        topic.publish("setDefaultTextboxValue", this.bearingAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress);
                    }
                    noResult = dojo.query(".esriCTDivNoResultFound", this.bearingAddressSearch.divAddressList);
                    if (noResult.length > 0) {
                        //when search result is blank, set the address textBox to default value and clear the search result container
                        domConstruct.destroy(noResult[0]);
                        topic.publish("setDefaultTextboxValue", this.bearingAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress);
                    }
                    this.polyLine = new Polyline(new esri.SpatialReference({
                        "wkid": this.map.extent.spatialReference.wkid
                    }));
                }
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * set bearing panel height
        * @memberOf widgets/reports/reports
        */
        _showBearingHeight: function () {
            var bearingPanelHeight;
            if (this.bearingPanelScrollbar) {
                domClass.add(this.bearingPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.bearingPanelScrollbar.removeScrollBar();
            }
            bearingPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]).h - 138 + "px";
            domStyle.set(this.divBearingDisplayContent, "height", bearingPanelHeight);
            this.bearingPanelScrollbar = new ScrollBar({
                domNode: this.divBearingDisplayContent
            });
            this.bearingPanelScrollbar.setContent(this.divBearingScrollContent);
            this.bearingPanelScrollbar.createScrollBar();
        },
        /**
        * set slider min max value and set distance unit for shape files
        * @param {string} type of distance unit
        * @param {array} list of horizontal slider attributes
        * @param {number} current index of slider
        * @param {boolean} check radio butoon is clicked
        * @memberOf widgets/reports/reports
        */
        _sliderStartEndValue: function (selectedUnitValue, horizontalSlider, index, radioClicked) {
            var sliderStartValue, sliderEndValue, previousUnitValue;
            if (this.sliderUnitValue) {
                previousUnitValue = this.sliderUnitValue;
            }
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
                this.sliderUnitValue = "UNIT_STATUTE_MILE";
                this.shapeFileUnitValue = "esriMiles";
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
                this.sliderUnitValue = "UNIT_FOOT";
                this.shapeFileUnitValue = "esriFeet";
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
                this.sliderUnitValue = "UNIT_METER";
                this.shapeFileUnitValue = "esriMeters";
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
                this.sliderUnitValue = "UNIT_KILOMETER";
                this.shapeFileUnitValue = "esriKilometers";
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
                this.sliderUnitValue = "UNIT_STATUTE_MILE";
                this.shapeFileUnitValue = "esriMiles";
                break;
            }
            domAttr.set(query(".dijitRuleLabel")[0], "innerHTML", sliderStartValue);
            domAttr.set(query(".dijitRuleLabel")[1], "innerHTML", sliderEndValue);
            this._horizontalSlider.minimum = sliderStartValue;
            this._horizontalSlider.maximum = sliderEndValue;
            if (radioClicked && previousUnitValue !== this.sliderUnitValue) {
                //reset the slider to minimum value when unit is changed
                this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[index].MinimumValue);
            }
            domAttr.set(this.spanSliderUnitValue, "innerHTML", selectedUnitValue);
            return this.sliderUnitValue;
        },
        /**
        * activate draw tool
        * @param {number} id of the tool bar
        * @memberOf widgets/reports/reports
        */
        activateTool: function (id) {
            var tool;
            dojo.activatedDrawTool = true;
            tool = id.toUpperCase();
            this.toolbar.activate(Draw[tool]);
            dojo.selectFeatureEnabled = false;
        },
        /**
        * create draw tool geometry to draw on map
        * @param {object} object of the current event
        * @memberOf widgets/reports/reports
        */
        addToMap: function (evt) {
            var graphicGeometry;
            //remove the highlight of the draw tool icon if selected
            this._disableDrawToolHighlight();
            this._clearAllLayerGraphics();
            this.deactivateToolbar();
            graphicGeometry = evt.geometry.type === "extent" ? this._createPolygonFromExtent(evt.geometry) : evt.geometry;
            this._drawFeature(graphicGeometry);
        },
        deactivateToolbar: function () {
            this.toolbar.deactivate();
        },

        /**
        * draw selected geometry on the map
        * @param {object} object of the current event
        * @memberOf widgets/reports/reports
        */
        _drawFeature: function (geometry) {
            var symbol, graphic;
            symbol = this._createFeatureSymbol(geometry.type);
            graphic = new Graphic(geometry, symbol);
            this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
            dojo.isGeoLocationEnabled = false;
            topic.publish("createBuffer", [geometry], this.sliderUnitValue);
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
        },

        /**
        * clears and create buffer
        * @param {object} geometry for creating buffer
        * @memberOf widgets/reports/reports
        */
        _clearAndCreateBuffer: function (geometry) {
            this.map.getLayer("tempBufferLayer").clear();
            this._createBuffer(geometry);
        },
        /**
        * create the buffer based on geometry types of graphic
        * @param {array} geometry for creating buffer
        * @memberOf widgets/reports/reports
        */
        _createBuffer: function (geometryCollection) {
            var geometryService, params, i, j, k, m, p, deferredListSimplifyResult, deferredListBufferResult, simplifyRequestArray = [],
                bufferRequestArray = [],
                unionBufferArray = [],
                unionResultArray = [],
                pointGeometryCollection = [],
                multiPointGeometryCollection = [],
                polylineGeometryCollection = [],
                polygonGeometryCollection = [],
                pointBufferCollection = [],
                multiPointBufferCollection = [],
                polylineBufferCollection = [],
                polygonBufferCollection = [];
            domConstruct.empty(this.reportScrollContent);
            domStyle.set(this.divChangeUnit, "display", "none");
            this._showLoadingIndicatorReports();
            geometryService = new GeometryService(dojo.configData.GeometryService);
            this.featureGeometryArray = geometryCollection;
            dojo.activatedDrawTool = false;
            //set the buffer parameters
            params = new BufferParameters();
            params.distances = [this.sliderDistance];
            params.bufferSpatialReference = new esri.SpatialReference({
                "wkid": this.map.spatialReference.wkid
            });
            params.outSpatialReference = this.map.spatialReference;
            params.unit = GeometryService[this.sliderUnitValue];
            params.unionResults = true;
            params.geodesic = true;
            this._createDataForEmailSharing(geometryCollection, true, null);
            if (this.sliderDistance !== 0) {
                topic.publish("showProgressIndicator");
                //if geometry type are all point or all multipoint, then create buffer without simplification of geometry
                if (this._validateGeometryType()) {
                    params.geometries = this.featureGeometryArray;
                    geometryService.buffer(params, lang.hitch(this, function (geometries) {
                        this.showBuffer(geometries);
                    }));
                } else {
                    //simplify geometry based on geometry type of featureArrayCollection
                    for (i = 0; i < this.featureGeometryArray.length; i++) {
                        switch (this.featureGeometryArray[i].type) {
                        case "point":
                            pointGeometryCollection.push(this.featureGeometryArray[i]);
                            break;
                        case "multipoint":
                            multiPointGeometryCollection.push(this.featureGeometryArray[i]);
                            break;
                        case "polyline":
                            polylineGeometryCollection.push(this.featureGeometryArray[i]);
                            break;
                        case "polygon":
                            polygonGeometryCollection.push(this.featureGeometryArray[i]);
                            break;
                        }
                    }
                    if (polylineGeometryCollection.length > 0) {
                        simplifyRequestArray.push(geometryService.simplify(polylineGeometryCollection));
                    }
                    if (polygonGeometryCollection.length > 0) {
                        simplifyRequestArray.push(geometryService.simplify(polygonGeometryCollection));
                    }
                    deferredListSimplifyResult = new DeferredList(simplifyRequestArray);
                    deferredListSimplifyResult.then(lang.hitch(this, function (result) {
                        if (result[0][0]) {
                            for (j = 0; j < pointGeometryCollection.length; j++) {
                                result[0][1].push(pointGeometryCollection[j]);
                            }
                            for (p = 0; p < multiPointGeometryCollection.length; p++) {
                                result[0][1].push(multiPointGeometryCollection[p]);
                            }
                            //create buffer based on geomtery type of simplify result
                            for (k = 0; k < result[0][1].length; k++) {
                                switch (result[0][1][k].type) {
                                case "point":
                                    pointBufferCollection.push(result[0][1][k]);
                                    break;
                                case "multipoint":
                                    multiPointBufferCollection.push(result[0][1][k]);
                                    break;
                                case "polyline":
                                    polylineBufferCollection.push(result[0][1][k]);
                                    break;
                                case "polygon":
                                    polygonBufferCollection.push(result[0][1][k]);
                                    break;
                                }
                            }
                            //create the buffer geometry for same type of geometry collection
                            if (pointBufferCollection.length > 0) {
                                params.geometries = pointBufferCollection;
                                bufferRequestArray.push(geometryService.buffer(params));
                            }
                            if (multiPointBufferCollection.length > 0) {
                                params.geometries = multiPointBufferCollection;
                                bufferRequestArray.push(geometryService.buffer(params));
                            }
                            if (polylineBufferCollection.length > 0) {
                                params.geometries = polylineBufferCollection;
                                bufferRequestArray.push(geometryService.buffer(params));
                            }
                            if (polygonBufferCollection.length > 0) {
                                params.geometries = polygonBufferCollection;
                                bufferRequestArray.push(geometryService.buffer(params));
                            }
                            deferredListBufferResult = new DeferredList(bufferRequestArray);
                            deferredListBufferResult.then(lang.hitch(this, function (result) {
                                for (m = 0; m < result.length; m++) {
                                    unionBufferArray.push(result[m][1][0]);
                                }
                                if (!result || result.length === 0) {
                                    topic.publish("hideProgressIndicator");
                                }
                                geometryService.union(unionBufferArray, lang.hitch(this, function (geometry) {
                                    unionResultArray.push(geometry);
                                    this.showBuffer(unionResultArray);
                                }), function (err) {
                                    alert(sharedNls.errorMessages.unionGeometryFailed);
                                    topic.publish("hideProgressIndicator");
                                });
                            }));
                        } else {
                            alert(sharedNls.errorMessages.simplifyGeometryFailed);
                            topic.publish("hideProgressIndicator");
                        }
                    }));
                }
                domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
            } else {
                if (this.featureGeometryArray && this.featureGeometryArray.type !== "polygon" && this.featureGeometryArray.type !== "extent") {
                    this.map.getLayer("tempBufferLayer").clear();
                }
                topic.publish("hideProgressIndicator");
            }
        },
        /**
        * validate the geometries if having geometry type as point or multipoint
        * @memberOf widgets/reports/reports
        */
        _validateGeometryType: function () {
            var i, areAllPoint = true,
                areAllMultiPoint = true,
                toSimplify;
            for (i = 0; i < this.featureGeometryArray.length; i++) {
                if (this.featureGeometryArray[i] && this.featureGeometryArray[i].type !== "point") {
                    areAllPoint = false;
                }
                if (this.featureGeometryArray[i] && this.featureGeometryArray[i].type !== "multipoint") {
                    areAllMultiPoint = false;
                }
            }
            //if geometries are all point or all multipoint type, then no need of simplification
            if (areAllPoint || areAllMultiPoint) {
                toSimplify = true;
            } else {
                toSimplify = false;
            }
            return toSimplify;
        },
        /**
        * show buffer
        * @param {object} geometry for showing buffer
        * @memberOf widgets/reports/reports
        */
        showBuffer: function (bufferedGeometries) {
            var symbol, graphic, parameterValue, str;
            symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.LineSymbolTransparency.split(",")[0], 10)]), 2), new Color([parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.FillSymbolTransparency.split(",")[0], 10)]));
            str = window.location.toString().split("/");
            array.forEach(bufferedGeometries, function (geometry) {
                parameterValue = new ParameterValue();
                parameterValue.dataType = "GPFeatureRecordSetLayer";
                graphic = new Graphic(geometry, symbol);
                if (!this.isCoordinateTab) {
                    this.map.getLayer("tempBufferLayer").clear();
                    this.map.getLayer("tempBufferLayer").add(graphic);
                    if (window.location.toString().split("?extent=").length > 1 && this._setSharedExtent) {
                        topic.publish("setMapExtent");
                        this._setSharedExtent = false;
                    } else {
                        this.map.setExtent(graphic.geometry.getExtent().expand(1.6));
                    }
                } else if (this.polyLine && this.polyLine.paths[0].length > 1) {
                    //show buffer only when bearing and distance values are available in coordinates tab
                    this.map.getLayer("tempBufferLayer").clear();
                    this.map.getLayer("tempBufferLayer").add(graphic);
                    if (window.location.toString().split("?extent=").length > 1 && this._setSharedExtent) {
                        topic.publish("setMapExtent");
                        //when shared coordinate value count matches to the drawn cordinate count, set the shared extent flag to false
                        if (this.AOIAttributes.length === ((this._sharedBearingValues.split(",").length) / 2)) {
                            this._setSharedExtent = false;
                        }
                    } else {
                        this.map.setExtent(graphic.geometry.getExtent().expand(1.6));
                    }
                }
            }, this);
            topic.publish("hideProgressIndicator");
        },
        /**
        * get operational layer information
        * @param {object} geometry of the created buffer
        * @memberOf widgets/reports/reports
        */
        _queryLayers: function (geometry) {
            var _self = this,
                index,
                i,
                j,
                k,
                requestHandle,
                deferredListForFeatures,
                deferredListCount,
                statisticType,
                statisticTypeValue,
                standardPointLayerUnit,
                reportFields,
                layerName,
                reportFieldName,
                staticFieldName,
                count,
                deferredListInfo,
                noResultCount = 0,
                reportFieldsCount = 0,
                onMapFeaturArray = [],
                statisticFieldsCount = [],
                statisticFieldsInfo = [];
            this._layerNameArray = [];
            this._unQueriedLayers = [];
            this.queryAllResults = [];
            this._layersWithNoFields = [];
            this.counter = 0;
            domConstruct.empty(this.reportScrollContent);
            this._showLoadingIndicatorReports();
            if (dojo.configSearchSettings.length > 0) {
                for (index = 0; index < dojo.configSearchSettings.length; index++) {
                    requestHandle = esriRequest({
                        "url": dojo.configSearchSettings[index].QueryURL,
                        "content": {
                            "f": "json"
                        },
                        "callbackParamName": "callback"
                    });
                    requestHandle.then(_self.requestSucceeded, _self.requestFailed);
                    onMapFeaturArray.push(requestHandle);
                }
                deferredListForFeatures = new DeferredList(onMapFeaturArray);
                deferredListForFeatures.then(lang.hitch(this, function (featureResult) {
                    this.featureResults = featureResult;
                    if (featureResult) {
                        //query each layer for available feature count
                        for (i = 0; i < dojo.configSearchSettings.length; i++) {
                            statisticFieldsCount.push(this._executeQueryTaskForCount(i, geometry));
                        }
                        deferredListCount = new DeferredList(statisticFieldsCount);
                        deferredListCount.then(lang.hitch(this, function (countResult) {
                            //query the layers which has feature count more than 0
                            for (j = 0; j < countResult.length; j++) {
                                if (countResult[j][1].result > 0) {
                                    if (featureResult[j][1].geometryType === "esriGeometryPoint") {
                                        statisticType = "COUNT";
                                        statisticTypeValue = "count";
                                        standardPointLayerUnit = "";
                                        reportFields = dojo.configSearchSettings[j].QuickSummaryReportFields;
                                        reportFieldsCount = reportFields.length;
                                        layerName = featureResult[j][1].name;
                                        for (count = 0; count < reportFieldsCount; count++) {
                                            reportFieldName = reportFields[count];
                                            staticFieldName = reportFieldName;
                                            statisticFieldsInfo.push(this._executeQueryTaskPointReport(j, geometry, statisticType, reportFieldName, staticFieldName, statisticTypeValue, standardPointLayerUnit, layerName, dojo.configSearchSettings[j].SummaryStatisticFieldUnits));
                                        }
                                        if (reportFieldsCount === 0) {
                                            this._layersWithNoFields.push(featureResult[j][1].name);
                                        }
                                    }
                                    if (featureResult[j][1].geometryType === "esriGeometryPolygon") {
                                        statisticType = "SUM";
                                        statisticTypeValue = "area";
                                        reportFields = dojo.configSearchSettings[j].QuickSummaryReportFields;
                                        reportFieldsCount = reportFields.length;
                                        layerName = featureResult[j][1].name;
                                        for (count = 0; count < reportFieldsCount; count++) {
                                            reportFieldName = reportFields[count];
                                            staticFieldName = dojo.configSearchSettings[j].SummaryStatisticField;
                                            statisticFieldsInfo.push(this._executeQueryTaskPointReport(j, geometry, statisticType, reportFieldName, staticFieldName, statisticTypeValue, sharedNls.titles.areaStandardUnit, layerName, dojo.configSearchSettings[j].SummaryStatisticFieldUnits));
                                        }
                                        if (reportFieldsCount === 0) {
                                            this._layersWithNoFields.push(featureResult[j][1].name);
                                        }
                                    }
                                    if (featureResult[j][1].geometryType === "esriGeometryPolyline") {
                                        statisticType = "SUM";
                                        statisticTypeValue = "length";
                                        reportFields = dojo.configSearchSettings[j].QuickSummaryReportFields;
                                        reportFieldsCount = reportFields.length;
                                        layerName = featureResult[j][1].name;
                                        for (count = 0; count < reportFieldsCount; count++) {
                                            reportFieldName = reportFields[count];
                                            staticFieldName = dojo.configSearchSettings[j].SummaryStatisticField;
                                            statisticFieldsInfo.push(this._executeQueryTaskPointReport(j, geometry, statisticType, reportFieldName, staticFieldName, statisticTypeValue, sharedNls.titles.lengthStandardUnit, layerName, dojo.configSearchSettings[j].SummaryStatisticFieldUnits));
                                        }
                                        if (reportFieldsCount === 0) {
                                            this._layersWithNoFields.push(featureResult[j][1].name);
                                        }
                                    }
                                } else {
                                    //the layers having feature count as 0, store the layernames for reportPanel creation reference
                                    reportFields = dojo.configSearchSettings[j].QuickSummaryReportFields;
                                    reportFieldsCount = reportFields.length;
                                    for (count = 0; count < reportFieldsCount; count++) {
                                        this._unQueriedLayers.push({ index: statisticFieldsInfo.length + this._unQueriedLayers.length, data: [true, { layerName: dojo.configSearchSettings[j].SearchDisplayTitle, result: { features: []}}] });
                                        this._layerNameArray.push(dojo.configSearchSettings[j].SearchDisplayTitle);
                                    }
                                }
                            }
                            if (statisticFieldsInfo.length > 0) {
                                deferredListInfo = new DeferredList(statisticFieldsInfo);
                                deferredListInfo.then(lang.hitch(this, function (infoResult) {
                                    this.queryAllResults = infoResult;
                                    if (infoResult) {
                                        for (k = 0; k < infoResult.length; k++) {
                                            if (infoResult[k][0] === false) {
                                                noResultCount++;
                                            }
                                        }
                                        if (noResultCount === infoResult.length) {
                                            alert(sharedNls.errorMessages.errorPerfomingQuery);
                                            this._hideLoadingIndicatorReports();
                                            this._mergeResults();
                                            this._createReport();
                                        } else {
                                            this._mergeResults();
                                            this._createReport();
                                        }
                                    }
                                }), function (err) {
                                    alert(err.messgae);
                                });
                            } else {
                                this._hideLoadingIndicatorReports();
                                this._mergeResults();
                                this._createReport();
                            }
                        }), function (err) {
                            alert(err.message);
                        });
                    } else {
                        this._hideLoadingIndicatorReports();
                    }
                }), function (err) {
                    alert(err.message);
                });
            } else {
                this._hideLoadingIndicatorReports();
            }
        },

        /**
        * merge the unqueried layers data with queried layer results
        * @memberOf widgets/reports/reports
        */
        _mergeResults: function () {
            var i;
            for (i = 0; i < this._unQueriedLayers.length; i++) {
                this.queryAllResults.splice(this._unQueriedLayers[i].index, 0, this._unQueriedLayers[i].data);
            }
        },

        /**
        * get configured operational layers information
        * @param {object} selected field
        * @memberOf widgets/reports/reports
        */
        requestSucceeded: function (response) {
            var deferred = new Deferred();
            deferred.resolve(response);
        },

        /**
        * failed to get layers information
        * @param {object} error
        * @memberOf widgets/reports/reports
        */
        requestFailed: function (error) {
            alert(error.message);
        },
        /**
        * create report for the selected AOI
        * @memberOf widgets/reports/reports
        */
        _createReport: function () {
            var i, j, k, z, p, fieldName, fieldValuesArray, layerNameIndex;
            this.featureArrayCollection.length = 0;
            this._failedQueryLayers = [];
            for (j = 0; j < dojo.configSearchSettings.length; j++) {
                this.featureArrayCollection.push({
                    layerName: dojo.configSearchSettings[j].SearchDisplayTitle,
                    statisticsTypeValue: "",
                    reportFields: []
                });
            }
            for (i = 0; i < this.queryAllResults.length; i++) {
                if (this.queryAllResults[i][0]) {
                    layerNameIndex = this._validateQueryResultLayerName(i, this.featureArrayCollection);
                    fieldValuesArray = [];
                    if (this.queryAllResults[i][1].result.features.length > 0) {
                        this._createReportFieldValues(this.queryAllResults[i][1], fieldValuesArray);
                        this.featureArrayCollection[layerNameIndex].statisticsTypeValue = this.queryAllResults[i][1].statictypevalue;
                        //set the field alias as fieldName
                        for (p = 0; p < this.queryAllResults[i][1].result.fields.length; p++) {
                            if (this.queryAllResults[i][1].reportFieldName === this.queryAllResults[i][1].result.fields[p].name) {
                                fieldName = this.queryAllResults[i][1].result.fields[p].alias;
                                break;
                            }
                        }
                        this.featureArrayCollection[layerNameIndex].reportFields.push({
                            name: fieldName,
                            fieldValues: fieldValuesArray
                        });
                    }
                } else {
                    layerNameIndex = this._validateQueryResultLayerName(i, this.featureArrayCollection);
                    this._failedQueryLayers.push(this.featureArrayCollection[layerNameIndex].layerName);
                }
            }
            //create display report fields array with layername and respective fields
            for (z = 0; z < this.featureArrayCollection.length; z++) {
                this.resultDispalyFields[this.featureArrayCollection[z].layerName] = [];
                for (k = 0; k < this.featureArrayCollection[z].reportFields.length; k++) {
                    this.resultDispalyFields[this.featureArrayCollection[z].layerName].push(this.featureArrayCollection[z].reportFields[k].name);
                }
            }
            this._displayReport(this.featureArrayCollection);
        },

        /**
        * modify display report data as per fields selecction
        * @memberOf widgets/reports/reports
        */
        _createModifiedReportData: function () {
            var i, j, k, m, x, layerNameIndex, fieldValuesArray, featureArrayCollection = [];
            //reset standard unit display
            this.hasAreaStandardUnit = false;
            for (i = 0; i < this.featureArrayCollection.length; i++) {
                for (x in this.resultDispalyFields) {
                    if (this.resultDispalyFields.hasOwnProperty(x)) {
                        layerNameIndex = this._validateFeatureArrayLayerName(i, featureArrayCollection);
                        //check if layername does not exist in featureArray
                        if (layerNameIndex === -1) {
                            featureArrayCollection.push({
                                layerName: this.featureArrayCollection[i].layerName,
                                statisticsTypeValue: this.featureArrayCollection[i].statisticsTypeValue,
                                reportFields: []
                            });
                            layerNameIndex = featureArrayCollection.length - 1;
                        }
                        for (k = 0; k < this.featureArrayCollection[i].reportFields.length; k++) {
                            for (j = 0; j < this.resultDispalyFields[x].length; j++) {
                                //check for the correct pairing of layername and related report field
                                if (this.featureArrayCollection[i].layerName === x && this.featureArrayCollection[i].reportFields[k].name === this.resultDispalyFields[x][j]
                                        && !this._validateFieldName(featureArrayCollection[layerNameIndex], this.resultDispalyFields[x][j])) {
                                    fieldValuesArray = [];
                                    //reset display of area standard unit
                                    if (this.featureArrayCollection[i].statisticsTypeValue === "area" || this.featureArrayCollection[i].statisticsTypeValue === "length") {
                                        this.hasAreaStandardUnit = true;
                                    }
                                    for (m = 0; m < this.featureArrayCollection[i].reportFields[k].fieldValues.length; m++) {
                                        fieldValuesArray.push({
                                            name: this.featureArrayCollection[i].reportFields[k].fieldValues[m].name,
                                            standardResults: this.featureArrayCollection[i].reportFields[k].fieldValues[m].standardResults,
                                            metricResults: this.featureArrayCollection[i].reportFields[k].fieldValues[m].metricResults
                                        });
                                    }
                                    featureArrayCollection[layerNameIndex].reportFields.push({
                                        name: this.featureArrayCollection[i].reportFields[k].name,
                                        fieldValues: fieldValuesArray
                                    });
                                }
                            }
                        }
                    }
                }
            }
            this._displayReport(featureArrayCollection);
        },

        /**
        * check if the fieldname already exist in featureArrayCollection for the same layer
        * @param {object} feature is the layer of which fieldname is verified
        * @param {object} fieldName which needs to be verified
        * @memberOf widgets/reports/reports
        */
        _validateFieldName: function (feature, fieldName) {
            var i, fieldExist = false;
            for (i = 0; i < feature.reportFields.length; i++) {
                if (feature.reportFields[i].name === fieldName) {
                    fieldExist = true;
                    break;
                }
            }
            return fieldExist;
        },

        /**
        * populate an array of values of a report field
        * @param {object} reportField report field
        * @param {array} fieldValuesArray array which needs to be populated with values of field
        * @memberOf widgets/reports/reports
        */
        _createReportFieldValues: function (reportField, fieldValuesArray) {
            var j, standardResults, metricResults;
            for (j = 0; j < reportField.result.features.length; j++) {
                if (reportField.unit !== "") {
                    //statistics type is SUM
                    this.hasAreaStandardUnit = true;
                    if (reportField.unit.toLowerCase() === sharedNls.titles.areaStandardUnit.toLowerCase()) {
                        standardResults = {
                            value: reportField.result.features[j].attributes.Total,
                            unit: sharedNls.titles.areaStandardUnit
                        };
                        metricResults = {
                            value: reportField.result.features[j].attributes.Total * 0.0040468564300508,
                            unit: sharedNls.titles.areaMetricUnit
                        };
                    } else if (reportField.unit.toLowerCase() === sharedNls.titles.lengthStandardUnit.toLowerCase()) {
                        standardResults = {
                            value: reportField.result.features[j].attributes.Total,
                            unit: sharedNls.titles.lengthStandardUnit
                        };
                        metricResults = {
                            value: reportField.result.features[j].attributes.Total * 1.609344497892563,
                            unit: sharedNls.titles.lengthMetricUnit
                        };
                    }
                } else {
                    //statistics type is COUNT
                    standardResults = {
                        value: reportField.result.features[j].attributes.Total,
                        unit: reportField.unit
                    };
                    metricResults = {
                        value: reportField.result.features[j].attributes.Total,
                        unit: reportField.unit
                    };
                }
                fieldValuesArray.push({
                    name: reportField.result.features[j].attributes[reportField.reportFieldName],
                    standardResults: standardResults,
                    metricResults: metricResults
                });
            }
        },

        /**
        * validate if query result layername is already present in the featureArrayCollection
        * @param {index} index index of layer
        * @param {array} array featureArrayCollection
        * @memberOf widgets/reports/reports
        */
        _validateQueryResultLayerName: function (index, array) {
            var j, itemIndex = -1;
            for (j = 0; j < array.length; j++) {
                if (array[j].layerName === this._layerNameArray[index]) {
                    itemIndex = j;
                }
            }
            return itemIndex;
        },

        /**
        * validate if layername is already present in the featureArrayCollection
        * @param {index} index index of layer
        * @param {array} array featureArrayCollection
        * @memberOf widgets/reports/reports
        */
        _validateFeatureArrayLayerName: function (index, array) {
            var j, itemIndex = -1;
            for (j = 0; j < array.length; j++) {
                if (array[j].layerName === this.featureArrayCollection[index].layerName) {
                    itemIndex = j;
                }
            }
            return itemIndex;
        },

        /**
        * display report for the selected AOI
        * @param {array} featureArrayCollection to display on report panel
        * @memberOf widgets/reports/reports
        */
        _displayReport: function (featureArrayCollection) {
            var i, reportPanelHeight, createReport;
            domConstruct.empty(this.reportScrollContent);
            this._hideLoadingIndicatorReports();
            for (i = 0; i < featureArrayCollection.length; i++) {
                createReport = true;
                this._createReportPanelContent(i, featureArrayCollection[i], createReport);
            }
            this._createDownloadReportData(featureArrayCollection);
            if (this.reportPanelScrollbar) {
                domClass.add(this.reportPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.reportPanelScrollbar.removeScrollBar();
            }
            reportPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]).h - (dojo.coords(this.uploadAOIContainer).h + dojo.coords(this.downloadReportContainer).h + dojo.coords(dojo.query(".esriCTRightPanel")[0]).h + 100) + "px";
            domStyle.set(this.reportContent, "height", reportPanelHeight);
            this.reportPanelScrollbar = new ScrollBar({
                domNode: this.reportContent
            });
            this.reportPanelScrollbar.setContent(this.reportScrollContent);
            this.reportPanelScrollbar.createScrollBar();
        },
        /**
        * create panel for displaying report
        * @param {number} index for the selected feature
        * @param {object} feature from featureArrayCollection
        * @param {flag} createReport flag
        * @memberOf widgets/reports/reports
        */
        _createReportPanelContent: function (index, layerResult, createReport) {
            var divnoDataAvailable, i, j, divReportLayerSettingPanel, divReportLayerPanel, divReportLayersettingIcon, divFieldTypeContent, resultValue, resultUnit, title, target, fieldName;
            divReportLayerPanel = domConstruct.create("div", {
                "class": "esriCTReportLayerPanel"
            }, this.reportScrollContent);
            divReportLayerSettingPanel = domConstruct.create("div", {
                "class": "esriCTReportSettingPanel"
            }, divReportLayerPanel);
            domConstruct.create("div", {
                "class": "esriCTDivReportLayerTitle",
                "innerHTML": layerResult.layerName
            }, divReportLayerSettingPanel);
            divReportLayersettingIcon = domConstruct.create("div", {
                "class": "esriCTSettingsIcon",
                "displayTitle": layerResult.layerName,
                "title": sharedNls.tooltips.reportFields,
                "id": index
            }, divReportLayerSettingPanel);
            this.own(on(divReportLayersettingIcon, "click", lang.hitch(this, function (evt) {
                target = evt.currentTarget || evt.srcElement;
                title = domAttr.get(target, "displayTitle");
                this._configureDialogBox(target.id, title);
            })));
            if (layerResult.reportFields.length === 0) {
                domStyle.set(this.divChangeUnit, "display", "none");
                if (divnoDataAvailable) { //if already no result message is appended in the current structure then remove duplicate,clear it and create new one.
                    domConstruct.destroy(divnoDataAvailable);
                }
                divnoDataAvailable = domConstruct.create("div", {
                    "class": "esriCTReportZoneName"
                }, divReportLayerPanel, "last");
                if (this.featureArrayCollection[index].reportFields.length === 0) {
                    if (array.indexOf(this._failedQueryLayers, this.featureArrayCollection[index].layerName) > -1) {
                        //when fields are incorrectly configured
                        domAttr.set(divnoDataAvailable, "innerHTML", sharedNls.errorMessages.incorrectFields);
                    } else if (array.indexOf(this._layersWithNoFields, this.featureArrayCollection[index].layerName) > -1) {
                        //when fields are not configured
                        domAttr.set(divnoDataAvailable, "innerHTML", sharedNls.errorMessages.noFieldsConfigured);
                    } else {
                        //when layer has no reportfields
                        domAttr.set(divnoDataAvailable, "innerHTML", sharedNls.errorMessages.invalidSearch);
                    }
                    domStyle.set(divReportLayersettingIcon, "display", "none");
                } else {
                    //when all the fields of layer are unchecked
                    domAttr.set(divnoDataAvailable, "innerHTML", sharedNls.errorMessages.noFieldsSelected);
                }
            } else {
                for (i = 0; i < layerResult.reportFields.length; i++) {
                    if (createReport && divnoDataAvailable) {
                        //if report is getting created and no result found error message is already appended with that section then we clear it
                        domConstruct.destroy(divnoDataAvailable);
                        domStyle.set(divReportLayersettingIcon, "display", "block");
                    }
                    createReport = false;
                    fieldName = layerResult.reportFields[i].name;
                    domConstruct.create("div", {
                        "class": "esriCTReportZoneName",
                        "innerHTML": fieldName
                    }, divReportLayerPanel);
                    for (j = 0; j < layerResult.reportFields[i].fieldValues.length; j++) {
                        resultValue = domStyle.get(this.esriCTchangeStandardUnit, "display") === "none" ? layerResult.reportFields[i].fieldValues[j].standardResults.value : layerResult.reportFields[i].fieldValues[j].metricResults.value;
                        resultUnit = domStyle.get(this.esriCTchangeStandardUnit, "display") === "none" ? layerResult.reportFields[i].fieldValues[j].standardResults.unit : layerResult.reportFields[i].fieldValues[j].metricResults.unit;
                        divFieldTypeContent = domConstruct.create("div", {
                            "class": "esriCTReportZoneList"
                        }, divReportLayerPanel);
                        domConstruct.create("span", {
                            "class": "esriCTReportZoneField",
                            "innerHTML": layerResult.reportFields[i].fieldValues[j].name + " "
                        }, divFieldTypeContent);
                        domConstruct.create("span", {
                            "class": "esriCTReportZoneCount",
                            "innerHTML": ("(" + layerResult.statisticsTypeValue + ": " + dojoNumber.format(parseFloat(resultValue)) + " " + resultUnit + ")")
                        }, divFieldTypeContent);
                    }
                }
            }
            //if feature has area unit to display
            if (this.hasAreaStandardUnit) {
                domStyle.set(this.divChangeUnit, "display", "block");
            }
        },

        /**
        * create layer_JSON_for_Quick_report
        * @class
        * @memberOf widgets/reports/reports
        */
        _createDownloadReportData: function (featureArrayCollection) {
            var i, j, k, reportJsonArray = [], summaryFieldsArray, summaryUnits = "", summaryType,
                fieldName, fieldValuesArray, fieldObj, fieldNameDisplayText, fieldValue;
            this.index = 0;
            this.previousIndex = 0;
            for (i = 0; i < featureArrayCollection.length; i++) {
                summaryFieldsArray = [];
                for (j = 0; j < featureArrayCollection[i].reportFields.length; j++) {
                    fieldValuesArray = [];
                    fieldName = featureArrayCollection[i].reportFields[j].name;
                    for (k = 0; k < featureArrayCollection[i].reportFields[j].fieldValues.length; k++) {
                        fieldValue = domStyle.get(this.esriCTchangeStandardUnit, "display") === "none" ? featureArrayCollection[i].reportFields[j].fieldValues[k].standardResults.value : featureArrayCollection[i].reportFields[j].fieldValues[k].metricResults.value;
                        summaryUnits = domStyle.get(this.esriCTchangeStandardUnit, "display") === "none" ? "standard" : "metric";
                        fieldNameDisplayText = featureArrayCollection[i].reportFields[j].fieldValues[k].name;
                        fieldObj = {};
                        fieldObj[fieldNameDisplayText] = fieldValue;
                        fieldValuesArray.push(fieldObj);
                    }
                    summaryFieldsArray.push({
                        fieldName: fieldName,
                        fieldValues: fieldValuesArray
                    });
                }
                //when no results found for a layer
                if (this.featureArrayCollection[i].reportFields.length === 0) {
                    summaryUnits = "";
                    summaryType = "";
                }
                //when no fields selected for a layer
                if (featureArrayCollection[i].reportFields.length === 0) {
                    summaryUnits = "";
                }
                reportJsonArray.push({
                    layerName: featureArrayCollection[i].layerName,
                    summaryType: featureArrayCollection[i].statisticsTypeValue,
                    summaryUnits: featureArrayCollection[i].statisticsTypeValue === "count" ? "" : summaryUnits,
                    summaryFields: summaryFieldsArray
                });
                if (this.hasAreaStandardUnit) {
                    this.convertedUnitType = domStyle.get(this.esriCTchangeStandardUnit, "display") === "none" ? "standard" : "metric";
                } else {
                    this.convertedUnitType = summaryUnits;
                }
            }
            this.reportArrayCollection = reportJsonArray;
        },

        /**
        * create dialog box for detailed summary report
        * @param {string} selected field
        * @param {string} selected field title
        * @memberOf widgets/reports/reports
        */
        _configureDialogBox: function (dialogBoxId, title) {
            var detailFieldValues = [], createContent, i, j;
            for (i = 0; i < this.featureArrayCollection.length; i++) {
                if (parseInt(dialogBoxId, 10) === i) {
                    for (j = 0; j < this.featureArrayCollection[i].reportFields.length; j++) {
                        detailFieldValues.push(this.featureArrayCollection[i].reportFields[j].name);
                    }
                }
            }
            createContent = this.createContent(detailFieldValues, dialogBoxId, title);
            this.settingsDialog.set("content", createContent);
            this.settingsDialog.set("title", title);
            this.settingsDialog.show();
        },
        /**
        * get of count of featuresets
        * @param {number} index of the configured operational layer
        * @param {object} geometry of the buffer
        * @memberOf widgets/reports/reports
        */
        _executeQueryTaskForCount: function (index, geometry) {
            var obj = {},
                queryTask,
                queryLayer,
                currentTime = new Date().getTime().toString(),
                deferred;
            queryTask = new esri.tasks.QueryTask(dojo.configSearchSettings[index].QueryURL);
            queryLayer = new esri.tasks.Query();
            queryLayer.outSpatialReference = this.map.spatialReference;
            queryLayer.returnGeometry = false;
            queryLayer.geometry = geometry;
            queryLayer.where = currentTime + "=" + currentTime;
            queryLayer.outFields = ["*"];
            deferred = new Deferred();
            queryTask.executeForCount(queryLayer, lang.hitch(this, function (results) {
                obj.result = results;
                deferred.resolve(obj);
            }), function (err) {
                alert(err.message);
                deferred.reject();
            });
            return deferred.promise;
        },
        /**
        * get set of featureset from all configured operational layers
        * @param {number} index of the configured operational layer
        * @param {object} geometry of the buffer
        * @param {string} type of static like count,sum etc
        * @param {string} group by filed name
        * @param {string} out static field name
        * @param {string} unit of the calculated static
        * return{object} return deffered promise
        * @memberOf widgets/reports/reports
        */
        _executeQueryTaskPointReport: function (index, geometry, statisticType, reportFieldName, staticFieldName, statisticTypeValue, unit, layerName, statisticFieldUnit) {
            var obj = {},
                queryTask,
                queryLayer,
                statDef,
                currentTime = new Date().getTime().toString(),
                deferred;
            statDef = new esri.tasks.StatisticDefinition();
            statDef.statisticType = statisticType;
            statDef.onStatisticField = staticFieldName;
            statDef.outStatisticFieldName = "Total";
            this._layerNameArray.push(dojo.configSearchSettings[index].SearchDisplayTitle);
            queryTask = new esri.tasks.QueryTask(dojo.configSearchSettings[index].QueryURL);
            queryLayer = new esri.tasks.Query();
            queryLayer.outSpatialReference = this.map.spatialReference;
            queryLayer.returnGeometry = false;
            queryLayer.geometry = geometry;
            queryLayer.where = currentTime + "=" + currentTime;
            queryLayer.outStatistics = [statDef];
            queryLayer.groupByFieldsForStatistics = [reportFieldName];
            queryLayer.outFields = ["*"];
            deferred = new Deferred();
            queryTask.execute(queryLayer, lang.hitch(this, function (results) {
                obj.result = this._convertFieldUnit(results, statisticFieldUnit);
                obj.reportFieldName = reportFieldName;
                obj.statictypevalue = statisticTypeValue;
                obj.layerName = layerName;
                obj.unit = unit;
                deferred.resolve(obj);
            }), function (err) {
                alert(err.message);
                deferred.reject();
            });
            return deferred.promise;
        },

        /**
        * convert the summary statistic field values to standard area/length units
        * @param {object} result layer feature result
        * @param {string} unit unit of a result field value
        * @memberOf widgets/reports/reports
        */
        _convertFieldUnit: function (result, unit) {
            var i;
            for (i = 0; i < result.features.length; i++) {
                switch (unit) {
                //conversion of area units into acres
                case "SQUARE_FEET":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 2.29568336506;
                    break;
                case "SQUARE_KILOMETERS":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 247.105407259;
                    break;
                case "SQUARE_METERS":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 0.000247105;
                    break;
                case "SQUARE_MILES":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 640.000066718;
                    break;
                case "SQUARE_YARDS":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 0.000206611502856;
                    break;
                case "HECTARES":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 2.47105407259;
                    break;
                case "ACRES":
                    break;
                case "ARES":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 0.0247105381;
                    break;
                //conversion of length units into miles
                case "YARDS":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 0.000568181818182;
                    break;
                case "FEET":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 0.000189393939394;
                    break;
                case "KILOMETERS":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 0.621371192237;
                    break;
                case "METERS":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 0.000621371192237;
                    break;
                case "MILES":
                    break;
                case "NAUTICAL_MILES":
                    result.features[i].attributes.Total = result.features[i].attributes.Total * 1.15077944802;
                    break;
                default:
                    break;
                }
            }
            return result;
        },

        /**
        * resize AOI panel
        * @memberOf widgets/reports/reports
        */
        resizeAOIPanel: function (duration) {
            var aoiPanelHeight, node;
            aoiPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]).h - (dojo.coords(dojo.query(".esriCTRightPanel")[0]).h + dojo.coords(dojo.query(".esriCTLinkContainer")[0]).h) - 20 + "px";
            domStyle.set(this.areaOfInterestContainer, "height", aoiPanelHeight);
            node = document.activeElement;
            if (duration) {
                setTimeout(lang.hitch(this, function () {
                    if (node) {
                        this._createAOIPanelScrollBar(node, duration);
                    }
                }), duration);
            } else {
                this._createAOIPanelScrollBar(node);
            }
        },

        /**
        * create scrollbar for AOI panel
        * @param {object} last avtive element node
        * @memberOf widgets/reports/reports
        */
        _createAOIPanelScrollBar: function (node, duration) {
            if (this.aoiPanelScrollbar) {
                domClass.add(this.aoiPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.aoiPanelScrollbar.removeScrollBar();
            }
            this.aoiPanelScrollbar = new ScrollBar({
                domNode: this.areaOfInterestContainer
            });
            this.aoiPanelScrollbar.setContent(this.areaOfInterestContent);
            this.aoiPanelScrollbar.createScrollBar();
            if (dojo.query('.esriCTdivLegendbox').length > 0) {
                this._resizeLegendPanel(true, duration);
            }
            if (node) {
                node.focus();
            }
        },
        /**
        * resize reports panel
        * @memberOf widgets/reports/reports
        */
        resizeReportsPanel: function (duration) {
            if (duration) {
                setTimeout(lang.hitch(this, function () {
                    this._createReportsPanelScrollBar();
                }), duration);
            } else {
                this._createReportsPanelScrollBar();
            }
        },

        _createReportsPanelScrollBar: function () {
            var reportPanelHeight;
            if (this.reportPanelScrollbar) {
                domClass.add(this.reportPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.reportPanelScrollbar.removeScrollBar();
            }
            reportPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]).h - (dojo.coords(this.uploadAOIContainer).h + dojo.coords(this.downloadReportContainer).h + dojo.coords(dojo.query(".esriCTRightPanel")[0]).h + 100) + "px";
            domStyle.set(this.reportContent, "height", reportPanelHeight);
            this.reportPanelScrollbar = new ScrollBar({
                domNode: this.reportContent
            });
            this.reportPanelScrollbar.setContent(this.reportScrollContent);
            this.reportPanelScrollbar.createScrollBar();
            if (dojo.query('.esriCTdivLegendbox').length > 0) {
                this._resizeLegendPanel(false, null);
            }
        },

        /**
        * resize legend panel of the bottom as per the width of right side panel
        * @param {boolean} isAOIPanel will be true when AOI panel is open on ride side and false when report panel is open
        * @param {object} duration time duration after which legend panel resizing will execute
        * @memberOf widgets/reports/reports
        */
        _resizeLegendPanel: function (isAOIPanel, duration) {
            var windowWidth, LegendWidthChange;
            setTimeout(lang.hitch(this, function () {
                windowWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
                if (dojo.setLegnedWidth) {
                    domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (windowWidth + 2) + 'px');
                } else {
                    if (isAOIPanel) {
                        //panel width for AOI panel
                        LegendWidthChange = windowWidth - parseInt(this.areaOfInterestContainer.clientWidth, 10);
                    } else {
                        //panel width for reports panel
                        LegendWidthChange = windowWidth - parseInt(this.reportContainer.clientWidth, 10);
                    }
                    domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (LegendWidthChange + 2) + 'px');
                }
            }), duration ? (duration + 200) : 500);
        },

        /**
        * show loading indicator for report panel
        * @memberOf widgets/reports/reports
        */
        _showLoadingIndicatorReports: function () {
            domStyle.set(this.reportsLoader, "display", "block");
        },

        /**
        * hide loading indicator for report panel
        * @memberOf widgets/reports/reports
        */
        _hideLoadingIndicatorReports: function () {
            domStyle.set(this.reportsLoader, "display", "none");
        },
        /**
        *create content to be shown in report panel
        * @param {object} list of fields to be configured
        * @param {string} checked field out of configured field
        * @return{string} return content to be displayed
        * @memberOf widgets/reports/reports
        */
        createContent: function (detailFieldValues, dialogBoxId, title) {
            var _self = this, fieldIndex,
                customButton,
                divSettingDialogContainer,
                divCheckboxContainer,
                divCheckboxScrollContainer;
            divSettingDialogContainer = domConstruct.create("div", {
                "class": "esriCTDialogBoxContainer"
            }, null);
            domConstruct.create("div", {
                "class": "esriCTReportFieldsHeader",
                "innerHTML": sharedNls.messages.selectReportFields
            }, divSettingDialogContainer);
            divCheckboxScrollContainer = domConstruct.create("div", {
                "class": "esriCTCheckboxScrollContainer"
            }, divSettingDialogContainer);
            divCheckboxContainer = domConstruct.create("div", {
                "class": "esriCTCheckboxScrollContent"
            }, divCheckboxScrollContainer);
            for (fieldIndex = 0; fieldIndex < detailFieldValues.length; fieldIndex++) {
                this._addReportCheckBox(title, fieldIndex, divCheckboxContainer, detailFieldValues);
            }
            this.dijitDialogPaneActionControl = domConstruct.create("div", {}, divSettingDialogContainer);
            this.spanDialogBox = domConstruct.create("span", {
                "class": "esriCTspanDialogBox"
            }, this.dijitDialogPaneActionControl);
            customButton = new Button({
                label: "OK"
            }, this.spanDialogBox);
            clearTimeout(this.stagedDialogBox);
            this.stagedDialogBox = setTimeout(lang.hitch(this, function () {
                this.dialogBoxScrollbar = new ScrollBar({
                    domNode: divCheckboxScrollContainer
                });
                this.dialogBoxScrollbar.setContent(divCheckboxContainer);
                this.dialogBoxScrollbar.createScrollBar();
            }), 500);
            on(customButton, "click", function () {
                _self.settingsDialog.hide();
                _self.resultDispalyFields = dojo.clone(_self.tempDisplayFields);
                _self._createModifiedReportData();
            });
            return divSettingDialogContainer;
        },

        /**
        * select and highlight the features on map of draw tab in case of shared url
        * @param {object} featureSet
        * @memberOf widgets/reports/reports
        */
        _selectSharedFeatures: function (featureSet) {
            var i, index, pointExtent, deferredListResult,
                onMapFeaturArray = [];
            this.selectFeatureMapPointArr = [];
            for (i = 0; i < featureSet.split(",").length; i = i + 4) {
                pointExtent = new esri.geometry.Extent({
                    "xmax": parseFloat(unescape(featureSet.split(",")[i])),
                    "xmin": parseFloat(unescape(featureSet.split(",")[i + 1])),
                    "ymax": parseFloat(unescape(featureSet.split(",")[i + 2])),
                    "ymin": parseFloat(unescape(featureSet.split(",")[i + 3])),
                    "spatialReference": this.map.spatialReference
                });
                this.selectFeatureMapPointArr.push(pointExtent);
                for (index = 0; index < dojo.configSearchSettings.length; index++) {
                    this._executeQueryTask(index, pointExtent, onMapFeaturArray);
                }
            }
            try {
                deferredListResult = new DeferredList(onMapFeaturArray); //passlist of n no of queries for n no of layers
                deferredListResult.then(lang.hitch(this, function (result) {
                    this._highlightSelectedFeatures(result);
                    this._bufferSelectedFeatures();
                }), function (err) {
                    alert(err.message);
                });
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * create report tab checkbox
        * @memberOf widgets/reports/reports
        */
        _addReportCheckBox: function (title, fieldIndex, divCheckboxContainer, detailFieldValues) {
            var addReportCheckBox, divDetailReportField, self;
            this.divCheckBox = domConstruct.create("div", {
                "class": "esriCTDivCheckboxContent"
            }, divCheckboxContainer);
            if (array.indexOf(this.resultDispalyFields[title], detailFieldValues[fieldIndex]) === -1) {
                addReportCheckBox = new CheckBox({
                    name: "TypecheckBox",
                    checked: false,
                    "layerName": title,
                    value: detailFieldValues[fieldIndex]
                });
            } else {
                addReportCheckBox = new CheckBox({
                    name: "TypecheckBox",
                    checked: true,
                    "layerName": title,
                    value: detailFieldValues[fieldIndex]
                });
            }
            addReportCheckBox.placeAt(this.divCheckBox, "first");
            divDetailReportField = domConstruct.create("div", {
                "class": "esriCTDiv"
            }, this.divCheckBox);
            divDetailReportField.innerHTML = detailFieldValues[fieldIndex];
            self = this;
            self.tempDisplayFields = dojo.clone(self.resultDispalyFields);
            on(addReportCheckBox, "click", function (evt) {
                var itemIndex, st;
                st = domAttr.get(this.domNode.lastChild, "aria-checked");
                if (st === "true") {
                    evt.currentTarget.checked = false;
                } else {
                    evt.currentTarget.checked = true;
                }
                if (evt.currentTarget.checked) {
                    if (array.indexOf(self.tempDisplayFields[this.layerName], evt.currentTarget.value) === -1) {
                        self.tempDisplayFields[this.layerName].splice(itemIndex, 0, evt.currentTarget.value);
                    }
                } else {
                    if (array.indexOf(self.tempDisplayFields[this.layerName], evt.currentTarget.value) >= 0) {
                        itemIndex = array.indexOf(self.tempDisplayFields[this.layerName], evt.currentTarget.value);
                        self.tempDisplayFields[this.layerName].splice(itemIndex, 1);
                    }
                }
            });
        },

        /**
        * hide moving dijit dialog box
        * @class
        * @memberOf widgets/reports/reports
        */
        hideMapTip: function () {
            if (dijit.byId('toolTipDialogues')) {
                dijit.byId('toolTipDialogues').destroy();
            }
        },

        /**
        * add dynamic textbox for entering bearing and distance value
        * @class
        * @memberOf widgets/reports/reports
        */
        _addBearingTextBox: function (value) {
            try {
                var bearingTextBoxContainer, bearingFirstColumn, bearingSecondColumn, bearingThirdColumn, bearingFourthColumn, bearingFifthColumn,
                    inputFirstColumnText, inputSecondClmnTxt, inputThirdClmnTxt, inputFourthClmnTxt, aoiAttributesIndex;
                this.bearingOuterContainer = domConstruct.create("div", {}, this.divBearingTextboxContainer);
                bearingTextBoxContainer = domConstruct.create("div", {
                    "class": "esriCTBearingTextbox"
                }, this.bearingOuterContainer, "last");
                bearingFirstColumn = domConstruct.create("div", {
                    "class": "esriCTBearingFirstColumn"
                }, bearingTextBoxContainer);
                inputFirstColumnText = document.createElement("label");
                inputFirstColumnText.type = "text";
                inputFirstColumnText.innerHTML = sharedNls.titles.bearingLabel;
                bearingFirstColumn.appendChild(inputFirstColumnText);
                bearingSecondColumn = domConstruct.create("div", {
                    "class": "esriCTBearingSecondColumn esriCTLabelAlignment"
                }, bearingTextBoxContainer);
                inputSecondClmnTxt = document.createElement("label");
                inputSecondClmnTxt.type = "text";
                if (value) {
                    inputSecondClmnTxt.innerHTML = value.split(",")[0];
                    this._sharingBearingValue = value.split(",")[0];
                } else {
                    inputSecondClmnTxt.innerHTML = this.addBearingValue.value;
                }
                bearingSecondColumn.appendChild(inputSecondClmnTxt);
                bearingThirdColumn = domConstruct.create("div", {
                    "class": "esriCTBearingThirdColumn"
                }, bearingTextBoxContainer);
                inputThirdClmnTxt = document.createElement("label");
                inputThirdClmnTxt.type = "text";
                inputThirdClmnTxt.innerHTML = sharedNls.titles.distanceLabel;
                bearingThirdColumn.appendChild(inputThirdClmnTxt);
                bearingFourthColumn = domConstruct.create("div", {
                    "class": "esriCTBearingFourthColumn esriCTLabelAlignment"
                }, bearingTextBoxContainer);
                inputFourthClmnTxt = document.createElement("label");
                inputFourthClmnTxt.type = "text";
                // distance parameter in configurable
                if (value) {
                    inputFourthClmnTxt.innerHTML = value.split(",")[1] + " " + dojo.configData.BearingDistanceUnit;
                    this._sharingBearingDistance = value.split(",")[1];
                } else {
                    inputFourthClmnTxt.innerHTML = this.addDistanceMiles.value + " " + dojo.configData.BearingDistanceUnit;
                }
                if (!value) {
                    this.barringArr.push(this.addBearingValue.value, this.addDistanceMiles.value);
                }
                bearingFourthColumn.appendChild(inputFourthClmnTxt);
                aoiAttributesIndex = this._getAOIAttrubutesIndex();
                bearingFifthColumn = domConstruct.create("div", {
                    "class": "esriCTBearingFifthColumn"
                }, bearingTextBoxContainer);
                this.destroyTxtBox = domConstruct.create("div", {
                    "class": "esriCTCloseIcon esriCTCloseButtonAlignment",
                    "aoiAttributesIndex": aoiAttributesIndex
                }, bearingFifthColumn);
                this.own(on(this.destroyTxtBox, "click", lang.hitch(this, function (evt) {
                    topic.publish("showProgressIndicator");
                    var index;
                    aoiAttributesIndex = domAttr.get(evt.currentTarget, "aoiAttributesIndex");
                    this._clearAllGraphics();
                    if (this.AOIAttributes.length > 0) {
                        for (index = 0; index < this.AOIAttributes.length; index++) {
                            if (parseInt(this.AOIAttributes[index].aoiAttributesIndex, 10) === parseInt(aoiAttributesIndex, 10)) {
                                this.barringArr.splice(array.indexOf(this.barringArr, this.AOIAttributes[index].bearing), 2);
                                this.AOIAttributes.splice(index, 1);
                                break;
                            }
                        }
                        if (this.AOIAttributes.length === 0) {
                            this._relocateInitialPoint();
                        } else {
                            this._reDrawCoordinateValues();
                        }
                        dojo.destroy(bearingTextBoxContainer);
                    }
                })));
                this._addCoordinatePolyLineValues();
                this.resizeAOIPanel(500);
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * convert the distance of coordinates from input unit into meters
        * supported units are feet, meters, miles and kilometers
        * @param {object} input distance value
        * @param {object} input distance unit
        * @memberOf widgets/reports/reports
        */
        _convertDistanceIntoMiles: function (distance, inputUnit) {
            var convertedDistance = distance;
            if (inputUnit.toLowerCase() === "miles") {
                convertedDistance = distance * 1609;
            } else if (inputUnit.toLowerCase() === "feet") {
                convertedDistance = distance / 3.281;
            } else if (inputUnit.toLowerCase() === "meters") {
                convertedDistance = distance;
            } else if (inputUnit.toLowerCase() === "kilometers") {
                convertedDistance = distance * 1000;
            }
            return convertedDistance;
        },

        /**
        * get current index of object from AOIAttributes array
        * @memberOf widgets/reports/reports
        */
        _getAOIAttrubutesIndex: function () {
            var aoiAttributesIndex;
            if (this.AOIAttributes.length === 0) {
                aoiAttributesIndex = 1;
            } else {
                aoiAttributesIndex = parseInt(this.AOIAttributes[this.AOIAttributes.length - 1].aoiAttributesIndex, 10) + 1;
            }
            return aoiAttributesIndex;
        },
        toRad: function (n) {
            return n * Math.PI / 180;
        },
        toDeg: function (n) {
            return n * 180 / Math.PI;
        },

        /**
        * calculate destination point given bearing,distance and bearing
        * @memberOf widgets/reports/reports
        */
        destVincenty: function (lon1, lat1, brng, dist, isRemoved, aoiAttributesIndex) {
            var tmp, lat2, lambda, long2, sinSigma, cosSigma, C, L, geometryService, latLongPoint, params,
                a = 6378137,
                deltaSigma,
                cos2SigmaM,
                b = 6356752.3142,
                f = 1 / 298.257223563,
                s = dist,
                alpha1 = this.toRad(brng),
                sinAlpha1 = Math.sin(alpha1),
                cosAlpha1 = Math.cos(alpha1),
                tanU1 = (1 - f) * Math.tan(this.toRad(lat1)),
                cosU1 = 1 / Math.sqrt((1 + tanU1 * tanU1)),
                sinU1 = tanU1 * cosU1,
                sigma1 = Math.atan2(tanU1, cosAlpha1),
                sinAlpha = cosU1 * sinAlpha1,
                cosSqAlpha = 1 - sinAlpha * sinAlpha,
                uSq = cosSqAlpha * (a * a - b * b) / (b * b),
                A = 1 + uSq / 16384 * (4096 + uSq * (-768 + uSq * (320 - 175 * uSq))),
                B = uSq / 1024 * (256 + uSq * (-128 + uSq * (74 - 47 * uSq))),
                sigma = s / (b * A),
                sigmaP = 2 * Math.PI;
            while (Math.abs(sigma - sigmaP) > 1e-12) {
                cos2SigmaM = Math.cos(2 * sigma1 + sigma);
                sinSigma = Math.sin(sigma);
                cosSigma = Math.cos(sigma);
                deltaSigma = B * sinSigma * (cos2SigmaM + B / 4 * (cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM) - B / 6 * cos2SigmaM * (-3 + 4 * sinSigma * sinSigma) * (-3 + 4 * cos2SigmaM * cos2SigmaM)));
                sigmaP = sigma;
                sigma = s / (b * A) + deltaSigma;
            }
            tmp = sinU1 * sinSigma - cosU1 * cosSigma * cosAlpha1;
            lat2 = Math.atan2(sinU1 * cosSigma + cosU1 * sinSigma * cosAlpha1, (1 - f) * Math.sqrt(sinAlpha * sinAlpha + tmp * tmp));
            lambda = Math.atan2(sinSigma * sinAlpha1, cosU1 * cosSigma - sinU1 * sinSigma * cosAlpha1);
            C = f / 16 * cosSqAlpha * (4 + f * (4 - 3 * cosSqAlpha));
            L = lambda - (1 - C) * f * sinAlpha * (sigma + C * sinSigma * (cos2SigmaM + C * cosSigma * (-1 + 2 * cos2SigmaM * cos2SigmaM)));
            lat2 = this.toDeg(lat2);
            long2 = parseFloat(lon1) + this.toDeg(L);
            this.AOIAttributes.push({
                "longitude": long2,
                "latitude": lat2,
                "bearing": brng,
                "distance": dist,
                "unit": "meters",
                "aoiAttributesIndex": aoiAttributesIndex
            });
            geometryService = new GeometryService(dojo.configData.GeometryService);
            latLongPoint = new Point({
                "x": Number(long2),
                "y": Number(lat2),
                "spatialReference": {
                    "wkid": 4326
                }
            });
            params = new ProjectParams();
            params.geometries = [latLongPoint];
            params.outSR = this.map.spatialReference;
            return geometryService.project(params);
        },

        /**
        * validate input textBox values for only numeric inputs
        * @memberOf widgets/reports/reports
        */
        onlyNumbers: function (evt) {
            var charCode;
            if (!evt) { evt = window.event; }
            charCode = evt.which || event.keyCode;
            if (charCode > 31 && (charCode < 48 || charCode > 57)) {
                if (charCode === 43 || charCode === 45 || charCode === 46) {
                    return true;
                }
                return false;
            }
            return true;
        },

        /**
        * validate input textBox values for only numeric inputs and dot values
        * @memberOf widgets/reports/reports
        */
        _validateNumericInputText: function () {
            var allFieldValid = false,
                BearingValue = this.addBearingValue.value,
                DistanceValue = this.addDistanceMiles.value;
            if ((BearingValue !== "") && (DistanceValue !== "")) {
                if ((!BearingValue.match(/^-?\d+(?:\.\d+)?$/)) && (!DistanceValue.match(/^-?\d+(?:\.\d+)?$/))) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage + " in " + sharedNls.titles.bearingLabel + " and " + sharedNls.titles.distanceLabel);
                } else if ((!BearingValue.match(/^-?\d+(?:\.\d+)?$/)) && (DistanceValue.match(/^-?\d+(?:\.\d+)?$/)) && !(this._validateDecimalCount(BearingValue) === 1)) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage + " in " + sharedNls.titles.bearingLabel);
                } else if ((BearingValue.match(/^-?\d+(?:\.\d+)?$/)) && (!DistanceValue.match(/^-?\d+(?:\.\d+)?$/)) && !(this._validateDecimalCount(DistanceValue) === 1)) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage + " in " + sharedNls.titles.distanceLabel);
                } else {
                    allFieldValid = true;
                }
                return allFieldValid;
            }
        },

        /**
        * Validate the text box such that mandatory field should not be left empty
        * @memberOf widgets/reports/reports
        */
        _validateBearingInputText: function () {
            var allFieldValid = false;
            if (lang.trim(this.addLatitudeValue.value) === "" || parseFloat(this.addLatitudeValue.value) <= -90 || parseFloat(this.addLatitudeValue.value) >= 90) {
                alert(sharedNls.errorMessages.addLatitudeValue);
            } else if (lang.trim(this.addLongitudeValue.value) === "" || parseFloat(this.addLongitudeValue.value) <= -180 || parseFloat(this.addLongitudeValue.value) >= 180) {
                alert(sharedNls.errorMessages.addLongitudeValue);
            } else if (lang.trim(this.addBearingValue.value) === "" || parseFloat(this.addBearingValue.value) < 0 || parseFloat(this.addBearingValue.value) > 360) {
                alert(sharedNls.errorMessages.addBearingValue);
            } else if (lang.trim(this.addDistanceMiles.value) === "") {
                alert(string.substitute(sharedNls.errorMessages.addDistanceMiles, [dojo.configData.BearingDistanceUnit]));
            } else if (parseFloat(this.addDistanceMiles.value) <= 0 || parseFloat(this.addDistanceMiles.value) > dojo.configData.BearingDistanceMaxLimit) {
                alert(string.substitute(sharedNls.errorMessages.distanceMaxLimit, [dojo.configData.BearingDistanceMaxLimit]));
            } else {
                allFieldValid = true;
            }
            return allFieldValid;
        },

        /**
        * generate uploaded shapefile geometry
        * @param {string} uploaded shapefile name
        * @memberOf widgets/reports/reports
        */
        _generateFeatureCollection: function (fileName) {
            if (fileName) {
                if (this.previousFileName !== fileName) {
                    this.previousFileName = fileName;
                    topic.publish("showProgressIndicator");
                    var params, uploadFileUrl, shapefileToolsUrl;
                    // Set GP service for uploading shapefile
                    shapefileToolsUrl = dojo.configData.ShapefileTools;
                    uploadFileUrl = shapefileToolsUrl.substring(0, shapefileToolsUrl.lastIndexOf("/") + 1) + "uploads/upload";
                    params = {
                        'f': 'json'
                    };
                    //use the rest generate operation to generate a feature collection from the zipped shapefile
                    esriRequest({
                        url: uploadFileUrl,
                        content: params, //content is data or file and its format
                        form: dom.byId('uploadForm'),
                        handleAs: 'json',
                        load: lang.hitch(this, this.uploadSucceeded),
                        error: this.errorHandler
                    });
                }
            } else {
                alert(sharedNls.errorMessages.browseFile);
            }
        },
        errorHandler: function (error) {
            alert(error.message);
            topic.publish("hideProgressIndicator");
        },

        /**
        * generate uploaded shapefile geometry in reports tab
        * @ param {string} uploaded shapefile name
        * @ method widgets/reports/reports
        */
        _generateAnalysisFeatureCollection: function (fileName) {
            if (fileName) {
                if (this.previousAnalysisFileName !== fileName) {
                    this.previousAnalysisFileName = fileName;

                    topic.publish("showProgressIndicator");
                    var params, uploadFileUrl, shapefileToolsUrl;
                    // Set GP service for uploading analysis
                    shapefileToolsUrl = dojo.configData.ShapefileTools;
                    uploadFileUrl = shapefileToolsUrl.substring(0, shapefileToolsUrl.lastIndexOf("/") + 1) + "uploads/upload";
                    params = {
                        'f': 'json'
                    };
                    //use the rest generate operation to generate a feature collection from the zipped shapefile
                    esriRequest({
                        url: uploadFileUrl,
                        content: params, //content is data or file and its format
                        form: dom.byId('uploadAnalysisForm'),
                        handleAs: 'json',
                        load: lang.hitch(this, this.uploadAnalysisSucceeded),
                        error: this.errorAnalysisHandler
                    });
                }
            } else {
                alert(sharedNls.errorMessages.browseFile);
            }
        },

        /**
        * successful upload of shapefile in reports tab
        * @param {object} repsonse
        * @memberOf widgets/reports/reports
        */
        uploadAnalysisSucceeded: function (response) {
            var gp = new Geoprocessor(dojo.configData.ShapefileTools),
                itemID,
                dataFile,
                params;
            itemID = response.item.itemID;
            dataFile = new DataFile();
            dataFile.itemID = itemID;
            this.storeAnalysisShapeFile = dataFile;
            params = {
                "Area_of_Interest": this._selectedAOI,
                "Zip_File_URL": this.storeAnalysisShapeFile
            };
            gp.submitJob(params, lang.hitch(this, this.gpAnalysisJobComplete), this.gpAnlysisJobStatus, this.gpAnalysisJobFailed);
        },
        errorAnalysisHandler: function (error) {
            alert(error.message);
            topic.publish("hideProgressIndicator");
        },

        /**
        * successful upload of shapefile in AOI tab
        * @param {object} repsonse
        * @memberOf widgets/reports/reports
        */
        uploadSucceeded: function (response) {
            var gp = new Geoprocessor(dojo.configData.ShapefileTools),
                itemID,
                dataFile,
                params;
            itemID = response.item.itemID;
            dataFile = new DataFile();
            dataFile.itemID = itemID;
            params = {
                "Zip_File_URL": dataFile
            };
            gp.outSpatialReference = this.map.spatialReference;
            gp.outputSpatialReference = this.map.spatialReference;
            gp.submitJob(params, lang.hitch(this, this.gpJobComplete), this.gpJobStatus, this.gpJobFailed);
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
        },
        gpJobFailed: function (error) {
            alert(error.message);
            topic.publish("hideProgressIndicator");
        },
        gpJobComplete: function (jobInfo) {
            var gp = new Geoprocessor(dojo.configData.ShapefileTools);
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gp.getResultData(jobInfo.jobId, "Output_AOI", lang.hitch(this, function (output) {
                    this._downloadFile(output, null);
                }));
            }
        },
        gpAnalysisJobComplete: function (jobInfo) {
            var gp = new Geoprocessor(dojo.configData.ShapefileTools);
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gp.getResultData(jobInfo.jobId, "Summary_Table", lang.hitch(this, this._downloadAnalysisFile));
            } else {
                alert(sharedNls.errorMessages.esriJobFailToAnlayse);
                topic.publish("hideProgressIndicator");
            }
        },

        /**
        * download the features of shapefile in reports tab and update the report panel content
        * @param {object} repsonse
        * @memberOf widgets/reports/reports
        */
        _downloadAnalysisFile: function (SumTable) {
            var elementsTobeRemoved, statisticType = "count";
            if (SumTable.value.features.length === 0) {
                //reset the shapefile values when no features found in the uploaded shapefile
                this.storeAnalysisShapeFile = "";
                if (this.shapeFileUploaded) {
                    this.shapeFileUploaded = false;
                    this.featureArrayCollection.splice(0, 1);
                    this._layerNameArray.splice(0, 1);
                    delete this.resultDispalyFields[this._previousShapeFile];
                    this._createModifiedReportData();
                }
                this._previousShapeFile = null;
                alert(sharedNls.errorMessages.noFeaturesInAOI);
                topic.publish("hideProgressIndicator");
                return;
            }
            elementsTobeRemoved = this.shapeFileUploaded ? 1 : 0;
            this.fAnalysisArray = [];
            if (SumTable.value.features[0].attributes.area_acres) {
                statisticType = "area";
            } else if (SumTable.value.features[0].attributes.length_Miles) {
                statisticType = "length";
            }
            this.fAnalysisArray.push({
                layerName: this.analysisFileName,
                statisticsTypeValue: statisticType,
                reportFields: []
            });

            array.forEach(SumTable.value.features, lang.hitch(this, function (item, index) {
                this._createAnalysisReportFieldValues(item);
            }));
            this.featureArrayCollection.splice(0, elementsTobeRemoved, this.fAnalysisArray[0]);
            this._layerNameArray.splice(0, elementsTobeRemoved, this.fAnalysisArray[0].layerName);
            this._pushResultDisplayFields();
            this._createModifiedReportData();
            this.shapeFileUploaded = true;
            topic.publish("hideProgressIndicator");
        },

        /**
        * arrange the report fields of shapefile features in a object
        * @memberOf widgets/reports/reports
        */
        _pushResultDisplayFields: function () {
            var i, shapeFileResultFields = [];
            for (i = 0; i < this.fAnalysisArray[0].reportFields.length; i++) {
                shapeFileResultFields.push(this.fAnalysisArray[0].reportFields[i].name);
            }
            if (this.shapeFileUploaded) {
                delete this.resultDispalyFields[this._previousShapeFile];
            }
            this._previousShapeFile = this.fAnalysisArray[0].layerName;
            this.resultDispalyFields[this.fAnalysisArray[0].layerName] = shapeFileResultFields;
        },

        /**
        * populate an array of values of a report field for shapefile
        * @param {object} item shapefile feature
        * @memberOf widgets/reports/reports
        */
        _createAnalysisReportFieldValues: function (item) {
            var fieldIndex, standardResults, metricResults, fieldValuesArray = [];
            if (item.attributes.area_acres) {
                standardResults = {
                    value: parseFloat(item.attributes.area_acres, 10),
                    unit: sharedNls.titles.areaStandardUnit
                };
                metricResults = {
                    value: parseFloat(item.attributes.area_sqkm, 10),
                    unit: sharedNls.titles.areaMetricUnit
                };
            } else if (item.attributes.length_Miles) {
                standardResults = {
                    value: parseFloat(item.attributes.length_Miles, 10),
                    unit: sharedNls.titles.lengthStandardUnit
                };
                metricResults = {
                    value: parseFloat(item.attributes.length_Km, 10),
                    unit: sharedNls.titles.lengthMetricUnit
                };
            } else {
                //statistics type is COUNT
                standardResults = {
                    value: parseInt(item.attributes.Count, 10),
                    unit: ""
                };
                metricResults = {
                    value: parseInt(item.attributes.Count, 10),
                    unit: ""
                };
            }
            fieldIndex = this._getreportFieldIndex(item.attributes.summaryfield);
            if (fieldIndex > -1) {
                this.fAnalysisArray[0].reportFields[fieldIndex].fieldValues.push({
                    name: item.attributes.summaryvalue,
                    standardResults: standardResults,
                    metricResults: metricResults
                });
            } else {
                fieldValuesArray.push({
                    name: item.attributes.summaryvalue,
                    standardResults: standardResults,
                    metricResults: metricResults
                });
                this.fAnalysisArray[0].reportFields.push({ name: item.attributes.summaryfield, fieldValues: fieldValuesArray });
            }
        },

        /**
        * verify if the report field is present in the shapefile fields array
        * @param {object} fieldName a value of report field to compare and check the availability in array
        * @memberOf widgets/reports/reports
        */
        _getreportFieldIndex: function (fieldName) {
            var i, fieldIndex = -1;
            for (i = 0; i < this.fAnalysisArray[0].reportFields.length; i++) {
                if (this.fAnalysisArray[0].reportFields[i].name === fieldName) {
                    fieldIndex = i;
                    break;
                }
            }
            return fieldIndex;
        },

        /**
        * download the features of shapefile in AOI tab and display it on map
        * @param {object} repsonse
        * @memberOf widgets/reports/reports
        */
        _downloadFile: function (output, bufferValue) {
            try {
                this._clearAllLayerGraphics();
                var geometryService = new GeometryService(dojo.configData.GeometryService),
                    feature,
                    symbol,
                    rendererColor,
                    lineColor,
                    fillColor,
                    graphicObj,
                    geometryCollection = [];

                if (output.value) {
                    feature = output.value.features[0];
                    this.shapeFilegeometryType = output.value.features[0].geometry.type;
                } else {
                    feature = {};
                    feature.geometry = output;
                }
                // check if features are present to display on map
                if (feature && feature.geometry) {
                    geometryService.simplify([feature.geometry], lang.hitch(this, function (geometries) {
                        //check the feature geometry type and display it on map
                        if ((geometries[0] && geometries[0].type === "multipoint") || (geometries[0] && geometries[0].type === "point")) {
                            symbol = new SimpleMarkerSymbol();
                        } else if (geometries[0] && geometries[0].type === "polyline") {
                            symbol = new SimpleLineSymbol();
                        } else {
                            rendererColor = new dojo.Color([parseInt(dojo.configData.RendererColor.split(",")[0], 10), parseInt(dojo.configData.RendererColor.split(",")[1], 10), parseInt(dojo.configData.RendererColor.split(",")[2], 10), 0.65]);
                            lineColor = new Color();
                            lineColor.setColor(rendererColor);
                            fillColor = new Color();
                            fillColor.setColor(rendererColor);
                            fillColor.a = 0.25;
                            symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                        }
                        graphicObj = new Graphic(geometries[0], symbol);
                        this.map.getLayer("esriGraphicsLayerMapSettings").add(graphicObj);
                        //for shared url, check the shared map extent, else set the map extent to graphic extent
                        if (window.location.toString().indexOf("?extent=") > -1 && this._setSharedExtent) {
                            topic.publish("setMapExtent");
                            //add buffer to the map is present
                            if (bufferValue > 0) {
                                dijit.byId("horizontalSlider").setValue(bufferValue);
                            } else {
                                this._setSharedExtent = false;
                            }
                        } else {
                            this.map.setExtent(graphicObj.geometry.getExtent().expand(1.6));
                            geometryCollection.push(feature.geometry);
                            topic.publish("createBuffer", geometryCollection);
                        }
                        if (this.sliderDistance === 0) {
                            topic.publish("hideProgressIndicator");
                        }
                    }), lang.hitch(this, function (err) {
                        alert(sharedNls.errorMessages.invalidGeometry);
                        topic.publish("hideProgressIndicator");
                    }));
                } else {
                    alert(sharedNls.errorMessages.noFeaturesFound);
                    topic.publish("hideProgressIndicator");
                }
            } catch (err) {
                alert(err.message);
                topic.publish("hideProgressIndicator");
            }
        },

        gpJobStatus: function (update) {
            if (update.jobStatus === "esriJobFailed") {
                alert(sharedNls.errorMessages.esriJobFailMessage);
                topic.publish("hideProgressIndicator");
                return;
            }
        },
        gpAnlysisJobStatus: function (update) {
            if (update.jobStatus === "esriJobFailed") {
                topic.publish("hideProgressIndicator");
            }
        },
        gpAnalysisJobFailed: function (err) {
            alert(err.message);
            topic.publish("hideProgressIndicator");
        },

        /**
        * toggle area unit to the selected unit
        * @memberOf widgets/reports/reports
        */
        _toggleAreaUnit: function () {
            if (domStyle.get(this.esriCTchangeStandardUnit, "display") === "block") {
                this.convertedUnitType = "Standard";
                domStyle.set(this.esriCTchangeMetricUnit, "display", "block");
                domStyle.set(this.esriCTchangeStandardUnit, "display", "none");
            } else if (domStyle.get(this.esriCTchangeStandardUnit, "display") === "none") {
                this.convertedUnitType = "Metric";
                domStyle.set(this.esriCTchangeMetricUnit, "display", "none");
                domStyle.set(this.esriCTchangeStandardUnit, "display", "block");
            }
            this._createModifiedReportData();
        },

        closeDialogBox: function () {
            this.settingsDialog.hide();
        },

        _resizeDialogBox: function () {
            if (domStyle.get(this.settingsDialog.domNode, "display") === "block") {
                this.settingsDialog.hide();
                setTimeout(lang.hitch(this, function () {
                    this.settingsDialog.show();
                }), 500);
            }
        },

        /**
        * download report in PDF or data file format
        * @param {object} jsonObject webMapJSON object for download
        * @memberOf widgets/reports/reports
        */
        _downloadReport: function (jsonObject) {
            var loadingMsgFailed = true, loadingMsgNodes, gp, params, i, j, layersArray = [], logoURL;
            topic.publish("showProgressIndicator");
            this.downloadWindow = window.open("./loading.htm");
            this._downloadReportCount = 0;
            //display a loading message in blank window
            try {
                //for chrome and firefox
                on(this.downloadWindow, "load", lang.hitch(this, function (obj) {
                    loadingMsgFailed = false;
                    loadingMsgNodes = query("#reportLoadingMsg", this.downloadWindow.document);
                    if (loadingMsgNodes !== null && loadingMsgNodes.length > 0) {
                        loadingMsgNodes[0].innerHTML = sharedNls.messages.reportLoadingText;
                    }
                }));
            } catch (err) {
                loadingMsgFailed = true;
            }
            if (loadingMsgFailed) {
                //for Internet Explorer
                setTimeout(lang.hitch(this, function () {
                    loadingMsgNodes = query("#reportLoadingMsg", this.downloadWindow.document);
                    if (loadingMsgNodes !== null && loadingMsgNodes.length > 0) {
                        loadingMsgNodes[0].innerHTML = sharedNls.messages.reportLoadingText;
                    }
                }), 100);
            }
            //set logo url
            if (dojo.configData.CustomLogoUrl !== "") {
                logoURL = dojoConfig.baseURL + dojo.configData.CustomLogoUrl;
            } else if (dojo.configData.ApplicationIcon !== "") {
                logoURL = dojoConfig.baseURL + dojo.configData.ApplicationIcon;
            } else {
                logoURL = "";
            }
            params = {
                "Web_Map_as_JSON": JSON.stringify(jsonObject),
                "Report_Type": this.report_type,
                "AOI": this._selectedAOI,
                "Report_Units": this.convertedUnitType,
                "Report_Subtitle": this.summaryReportTitle.value,
                "Logo_URL": logoURL
            };
            if (this.report_type === "Detailed") {
                this._initiateDetailedReport(params);
            } else {
                params.Quickreport_Data = JSON.stringify(this.reportArrayCollection);
                gp = new Geoprocessor(dojo.configData.ReportDownloadSettings.GPServiceURL);
                gp.submitJob(params, lang.hitch(this, this._gpPDFSubmitJobComplete));
                this._downloadReportCount++;
            }
            if (this.dataFormatType.length > 0) {
                //set the parameters for report format
                for (j = 0; j < this.featureResults.length; j++) {
                    layersArray.push(this.featureResults[j][1].name);
                }
                for (i = 0; i < this.dataFormatType.length; i++) {
                    if (domAttr.get(this.dataFormatType[i], "format") === "Excel") {
                        params = {
                            "Layers_to_Clip": layersArray,
                            "Area_Of_Interest": this._selectedAOI
                        };
                        gp = new Geoprocessor(domAttr.get(this.dataFormatType[i], "serviceURL"));
                        gp.submitJob(params, lang.hitch(this, this._gpSubmitJobComplete, domAttr.get(this.dataFormatType[i], "serviceURL"), "OutputZipFile"));
                        this._downloadReportCount++;
                    }
                    if (domAttr.get(this.dataFormatType[i], "format") === "Shapefile - SHP - .shp" || domAttr.get(this.dataFormatType[i], "format") === "File Geodatabase - GDB - .gdb") {
                        params = {
                            "Layers_to_Clip": layersArray,
                            "Area_Of_Interest": this._selectedAOI,
                            "Feature_Format": domAttr.get(this.dataFormatType[i], "format")
                        };
                        gp = new Geoprocessor(domAttr.get(this.dataFormatType[i], "serviceURL"));
                        gp.submitJob(params, lang.hitch(this, this._gpSubmitJobComplete, domAttr.get(this.dataFormatType[i], "serviceURL"), "Output_Zip_File"));
                        this._downloadReportCount++;
                    }
                }
            }
        },

        /**
        * create PDF detailed summary report
        * @param {object} params parameters for GP servcie
        * @memberOf widgets/reports/reports
        */
        _initiateDetailedReport: function (params) {
            var i, j, k, gp, fieldName, alias, layerFields, fieldNameAlias, layerFieldsCollection = [];
            params.Report_Units = this.convertedUnitType === "" ? "Standard" : this.convertedUnitType;
            for (i = 0; i < dojo.configSearchSettings.length; i++) {
                fieldNameAlias = {};
                layerFields = {};
                for (j = 0; j < dojo.configSearchSettings[i].DetailSummaryReportFields.length; j++) {
                    fieldName = dojo.configSearchSettings[i].DetailSummaryReportFields[j];
                    for (k = 0; k < this.featureResults[i][1].fields.length; k++) {
                        if (this.featureResults[i][1].fields[k].name === dojo.configSearchSettings[i].DetailSummaryReportFields[j]) {
                            alias = this.featureResults[i][1].fields[k].alias;
                            break;
                        }
                    }
                    //if alias is not present for any field, fieldName will be used
                    if (!alias) {
                        fieldNameAlias[fieldName] = fieldName;
                    } else {
                        fieldNameAlias[fieldName] = alias;
                    }
                }
                layerFields.LayerTitle = this.featureResults[i][1].name;
                layerFields.SearchDisplayTitle = dojo.configSearchSettings[i].SearchDisplayTitle;
                layerFields.DetailSummaryReportFields = fieldNameAlias;
                layerFieldsCollection.push(layerFields);
            }
            params.Report_Fields = JSON.stringify(layerFieldsCollection);
            if (this.storeAnalysisShapeFile) {
                params.Shapefile_Analysis = this.storeAnalysisShapeFile;
            }
            gp = new Geoprocessor(dojo.configData.ReportDownloadSettings.GPServiceURL);
            gp.submitJob(params, lang.hitch(this, this._gpPDFSubmitJobComplete));
            this._downloadReportCount++;
        },

        _gpSubmitJobComplete: function (serviceURL, outputParam, jobInfo) {
            var gp = new Geoprocessor(serviceURL);
            this._downloadReportCount--;
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gp.getResultData(jobInfo.jobId, outputParam, lang.hitch(this, this._gpGetResultJobComplete));
            } else {
                alert(sharedNls.errorMessages.esriJobFailToGenerateReport);
                if (this._downloadReportCount === 0) {
                    topic.publish("hideProgressIndicator");
                    this.downloadWindow.close("./loading.htm");
                }
            }
        },

        _gpPDFSubmitJobComplete: function (jobInfo) {
            var gp = new Geoprocessor(dojo.configData.ReportDownloadSettings.GPServiceURL);
            this._downloadReportCount--;
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gp.getResultData(jobInfo.jobId, "Output_PDF", lang.hitch(this, this._gpPDFGetResultJobComplete));
            } else {
                alert(sharedNls.errorMessages.esriJobFailToGenerateReport);
                if (this._downloadReportCount === 0) {
                    topic.publish("hideProgressIndicator");
                    this.downloadWindow.close("./loading.htm");
                }
            }
        },

        _gpPDFGetResultJobComplete: function (result) {
            this._downloadPDFFile(result.value.url);
        },

        _gpGetResultJobComplete: function (result) {
            this._downloadDataFile(result.value.url);
        },

        /**
        * download PDF report
        * @param {url} outputFileUrl file url for download
        * @memberOf widgets/reports/reports
        */
        _downloadPDFFile: function (outputFileUrl) {
            this.downloadWindow.location = outputFileUrl;
            if (this._downloadReportCount === 0) {
                topic.publish("hideProgressIndicator");
            }
        },

        /**
        * download report format file
        * @param {url} outputFileUrl file url for download
        * @memberOf widgets/reports/reports
        */
        _downloadDataFile: function (outputFileUrl) {
            var iframe = document.createElement('iframe');
            iframe.id = 'hiddenReportDownloader';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframe.src = outputFileUrl;
            if (this._downloadReportCount === 0) {
                topic.publish("hideProgressIndicator");
            }
        },

        /**
        * create JSON data for download report
        * @memberOf widgets/reports/reports
        */
        _createMapJsonData: function () {
            var i, j, printTaskObj = new PrintTask(),
                jsonObject, legendOptions = [];
            printTaskObj.legendAll = true;
            jsonObject = printTaskObj._getPrintDefinition(this.map);
            jsonObject.operationalLayers[0].maxScale = 0;
            jsonObject.operationalLayers[0].minScale = 0;
            if (printTaskObj.allLayerslegend && printTaskObj.allLayerslegend.length > 0) {
                //populate the layers for legends in download report
                for (i = 0; i < printTaskObj.allLayerslegend.length; i++) {
                    //legends to be displayed only for featureLayers in download report
                    if (printTaskObj.allLayerslegend[i].id !== "tempBufferLayer" && printTaskObj.allLayerslegend[i].id !== "esriGraphicsLayerMapSettings" && printTaskObj.allLayerslegend[i].id !== "locatorGraphicsLayer" && printTaskObj.allLayerslegend[i].id !== "hGraphicLayer") {
                        legendOptions.push(printTaskObj.allLayerslegend[i]);
                        if (this.map._layers[printTaskObj.allLayerslegend[i].id].type === "Feature Layer") {
                            for (j = 0; j < jsonObject.operationalLayers.length; j++) {
                                if (jsonObject.operationalLayers[j].id === this.map._layers[printTaskObj.allLayerslegend[i].id].id) {
                                    jsonObject.operationalLayers[j].title = this.map._layers[printTaskObj.allLayerslegend[i].id].name;
                                    break;
                                }
                            }
                        }
                    }
                }
                jsonObject.layoutOptions = {};
                jsonObject.layoutOptions.legendOptions = {
                    operationalLayers: legendOptions
                };
            }
            jsonObject.mapOptions.spatialReference = jsonObject.mapOptions.extent.spatialReference;
            jsonObject.exportOptions = {
                "outputSize": [620, 820]
            };
            return jsonObject;
        },

        /**
        * initialize report creation data
        * @memberOf widgets/reports/reports
        */
        _initializeReportCreation: function () {
            var i, bufferedGraphics, bufferLayerGraphics = this.map.getLayer("tempBufferLayer") ? this.map.getLayer("tempBufferLayer").graphics : [],
                featureLayerGraphics = this.map.getLayer("hGraphicLayer") ? this.map.getLayer("hGraphicLayer").graphics : [],
                graphicLayerGraphics = this.map.getLayer("esriGraphicsLayerMapSettings") ? this.map.getLayer("esriGraphicsLayerMapSettings").graphics : [],
                geometryService = new GeometryService(dojo.configData.GeometryService);
            //check whether previous graphics is same as the new graphics
            if (this._previousGraphics.length > 0 && this._validatePreviousGraphicLayers(bufferLayerGraphics, featureLayerGraphics, graphicLayerGraphics)) {
                //if graphics is same display the previous report panel, without query opertaion
                this._showReportsTab();
                if (this.hasAreaStandardUnit) {
                    domStyle.set(this.divChangeUnit, "display", "block");
                }
                this.resizeReportsPanel();
                //remove the highlight of the draw tool icon if selected
                this._disableDrawToolHighlight();
                return;
            }
            if (bufferLayerGraphics.length > 0) {
                //set previous graphics
                this._previousGraphics = [];
                this._previousGraphics.push(bufferLayerGraphics[0]);
                for (i = 0; i < featureLayerGraphics.length; i++) {
                    this._previousGraphics.push(featureLayerGraphics[i]);
                }
                if (graphicLayerGraphics.length > 0) {
                    this._previousGraphics.push(graphicLayerGraphics[0]);
                }
                bufferedGraphics = this._getGeometryCollection("tempBufferLayer");
                this._showReportsTab();
                this._resetReportTab();
                this._queryLayers(bufferedGraphics[0]);
                this._createDownloadAOI(bufferedGraphics[0]);
                this.resizeReportsPanel();
            } else if (featureLayerGraphics.length > 0) {
                if (this._validateQueryGeometries("hGraphicLayer")) {
                    this._previousGraphics = [];
                    for (i = 0; i < featureLayerGraphics.length; i++) {
                        this._previousGraphics.push(featureLayerGraphics[i]);
                    }
                    bufferedGraphics = this._getGeometryCollection("hGraphicLayer");
                    this._showReportsTab();
                    this._resetReportTab();
                    geometryService.union(bufferedGraphics, lang.hitch(this, function (unionGeometry) {
                        this._queryLayers(unionGeometry);
                        this._createDownloadAOI(unionGeometry);
                    }));
                    this.resizeReportsPanel();
                } else {
                    alert(sharedNls.errorMessages.bufferSliderValue);
                }
            } else if (graphicLayerGraphics.length > 0 && !dojo.locatorSelectFeature) {
                if (this._validateQueryGeometries("esriGraphicsLayerMapSettings") && !graphicLayerGraphics[0].attributes) {
                    this._previousGraphics = [];
                    this._previousGraphics.push(graphicLayerGraphics[0]);
                    bufferedGraphics = this._getGeometryCollection("esriGraphicsLayerMapSettings");
                    this._showReportsTab();
                    this._resetReportTab();
                    geometryService.union(bufferedGraphics, lang.hitch(this, function (unionGeometry) {
                        this._queryLayers(unionGeometry);
                        this._createDownloadAOI(unionGeometry);
                    }));
                    this.resizeReportsPanel();
                } else {
                    if (!this._validateAOI(graphicLayerGraphics)) {
                        alert(sharedNls.errorMessages.defineAOI);
                    } else if (this.sliderDistance === 0) {
                        alert(sharedNls.errorMessages.bufferSliderValue);
                    }
                }
            } else {
                alert(sharedNls.errorMessages.defineAOI);
            }
        },

        /**
        * validate the graphics of all layers with the previously drawn graphics
        * @param {object} bufferLayerGraphics graphics present on tempBufferLayer
        * @param {object} featureLayerGraphics graphics present on hGraphicLayer
        * @param {object} graphicLayerGraphics graphics present on esriGraphicsLayerMapSettings layer
        * @memberOf widgets/reports/reports
        */
        _validatePreviousGraphicLayers: function (bufferLayerGraphics, featureLayerGraphics, graphicLayerGraphics) {
            var previousGraphics;
            //checks if the buffer layer graphic is same
            if (bufferLayerGraphics.length > 0 && bufferLayerGraphics[0] === this._previousGraphics[0]) {
                previousGraphics = this._previousGraphics.slice(1);
                //when buffer layer graphics are same, check whether other graphics layer are having the same graphics as previous
                if ((featureLayerGraphics.length > 0 && this._compareFeatureLayerGraphics(featureLayerGraphics, previousGraphics)) ||
                        (graphicLayerGraphics.length > 0 && graphicLayerGraphics[0] === previousGraphics[0])) {
                    return true;
                }
                return false;
            }
            //when buffer layer graphic was not present in the previous graphics
            if (bufferLayerGraphics.length > 0 && bufferLayerGraphics[0] !== this._previousGraphics[0]) {
                return false;
            }
            //when only feature layer graphics are present, check if the graphics are same as the previous graphics
            if (featureLayerGraphics.length > 0 && this._compareFeatureLayerGraphics(featureLayerGraphics, this._previousGraphics)) {
                return true;
            }
            //when only graphics layer graphics are present, check if the graphics are same as the previous graphics
            if (graphicLayerGraphics.length > 0 && graphicLayerGraphics[0] === this._previousGraphics[0]) {
                return true;
            }
            return false;
        },

        /**
        * validate the graphics of hGraphicLayer with the previously drawn graphics
        * @param {object} graphics graphics present on hGraphicLayer
        * @param {object} previousGraphics graphics present previously on hGraphicLayer
        * @memberOf widgets/reports/reports
        */
        _compareFeatureLayerGraphics: function (graphics, previousGraphics) {
            var i, equalArrays = true;
            if (graphics.length === previousGraphics.length) {
                for (i = 0; i < previousGraphics.length; i++) {
                    if (array.indexOf(graphics, previousGraphics[i]) === -1) {
                        equalArrays = false;
                        break;
                    }
                }
            }
            return equalArrays;
        },

        /**
        * checks if graphic on esriGraphicsLayerMapSettings layer is a valid AOI to display report panel
        * @param {object} graphics graphics present on esriGraphicsLayerMapSettings layer
        * @memberOf widgets/reports/reports
        */
        _validateAOI: function (graphics) {
            var isValidAOI = true;
            if ((graphics[0].attributes && graphics[0].attributes.sourcename === "geoLocationSearch") || (this.map.getLayer("locatorGraphicsLayer").graphics.length > 0)
                    || ((this._isDrawTab || this.isCoordinateTab) && graphics[0].attributes && graphics[0].attributes.sourcename === "aOISearch") || dojo.locatorSelectFeature) {
                isValidAOI = false;
            }
            return isValidAOI;
        },

        /**
        * validate AOI geometries for all polygon or extent
        * @param {object} layerId layerID of a featureLayer of which geometry needs to be validated
        * @memberOf widgets/reports/reports
        */
        _validateQueryGeometries: function (layerId) {
            var i, areAllPolygon = true;
            for (i = 0; i < this.map.getLayer(layerId).graphics.length; i++) {
                if (this.map.getLayer(layerId).graphics[i].geometry.type !== "polygon" && this.map.getLayer(layerId).graphics[i].geometry.type !== "extent") {
                    areAllPolygon = false;
                }
            }
            return areAllPolygon;
        },

        /**
        * report panel related flags and values are reset
        * @memberOf widgets/reports/reports
        */
        _resetReportTab: function () {
            var node;
            this._resetDownloadOptions();
            dom.byId("analysisFileName").value = "";
            node = dom.byId("analysisFileUploadContainer").parentNode.innerHTML;
            dom.byId("analysisFileUploadContainer").parentNode.innerHTML = node;
            this._browseAnalysisFileEvent();
            this.previousAnalysisFileName = "";
            this.shapeFileUploaded = false;
            this.storeAnalysisShapeFile = "";
            this._previousShapeFile = null;
            //reset standard unit display
            this.hasAreaStandardUnit = false;
            domStyle.set(this.esriCTchangeStandardUnit, "display", "none");
            domStyle.set(this.esriCTchangeMetricUnit, "display", "block");
            domStyle.set(this.divChangeUnit, "display", "none");
            //reset the download summary report title to default value
            this.summaryReportTitle.value = "Area of Interest (AOI) Information";
            this._disableDrawToolHighlight();
        },

        _disableDrawToolHighlight: function () {
            var selectedIcons;
            selectedIcons = query(".esriCTDrawIconSelected");
            if (selectedIcons.length > 0) {
                domClass.remove(selectedIcons[0], "esriCTDrawIconSelected esriCTIconSelection");
            }
        },

        /**
        * create the AOI for download report
        * @param {object} graphicGeometry geometry of the graphics drawn on buffer layer or feature layer or graphics layer
        * @memberOf widgets/reports/reports
        */
        _createDownloadAOI: function (graphicGeometry) {
            var graphic = new Graphic(), features = [], featureSet = new FeatureSet();
            graphic.geometry = graphicGeometry;
            features.push(graphic);
            featureSet = new FeatureSet();
            featureSet.features = features;
            featureSet.displayFieldName = "";
            featureSet.geometryType = "esriGeometryPolygon";
            featureSet.spatialReference = this.map.spatialReference;
            featureSet.fields = [];
            featureSet.exceededTransferLimit = false;
            this._selectedAOI = featureSet;
        },

        /**
        * destroy distance and bearing textboxes
        * @memberOf widgets/reports/reports
        */
        _destroyBearingTextBox: function () {
            var i;
            if (this.divBearingTextboxContainer) {
                for (i = this.divBearingTextboxContainer.children.length; i > 3; i--) {
                    this.divBearingTextboxContainer.removeChild(this.divBearingTextboxContainer.lastChild);
                }
            }
            this.addLatitudeValue.value = "";
            this.addLongitudeValue.value = "";
            this.AOIAttributes.length = 0;
        }
    });
});