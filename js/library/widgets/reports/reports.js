/*global define,dojo,dojoConfig,esri,esriConfig,alert,self:true,dijit,params,dialog:true*/
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
    "dojo/dom-geometry",
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
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Polyline",
    "esri/tasks/Geoprocessor",
    "esri/tasks/DataFile",
    "dijit/form/Select",
    "esri/tasks/ParameterValue",
    "esri/tasks/LinearUnit",
    "esri/tasks/FeatureSet",
    "esri/dijit/Print",
    "esri/tasks/PrintParameters",
    "esri/tasks/PrintTask",
    "esri/tasks/ProjectParameters"

], function (declare, domConstruct, on, topic, lang, array, domStyle, domAttr, dom, query, domClass, domGeom, GeometryService, Dialog, string, html, template, Color, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, TooltipDialog, Place, CheckBox, Button, Graphic, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, GraphicsLayer, Draw, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, RadioButton, ScrollBar, Deferred, DeferredList, Query, QueryTask, esriRequest, dojoJson, Point, dojoString, dojoNumber, webMercatorUtils, Polyline, Geoprocessor, DataFile, SelectList, ParameterValue, LinearUnit, FeatureSet, Print, PrintParameters, PrintTask, ProjectParams) {

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
        flagMultiplePoints: null,
        polyLine: null,
        name: null,
        initialAnalysisValues: null,
        fAnalysisArray: [],
        shapeFileForAnalysis: null,
        initialReportCreated: null,
        AOIAttributes: [],
        configData: dojo.configData,
        initialPoint: null,
        startPointLongitude: null,
        startPointLatitude: null,
        stagedAOIResize: null,
        resultDispalyFields: {},
        featureArrayCollection: [],
        reportArrayCollection: [],
        PDFreportType: null,
        dataFormatType: [],
        resultDataArray: null,
        convertedUnitType: null,
        _timer: null,
        _isDblClick: false,
        pointData: null,
        _previousGraphics: null,
        currentValue: window.orientation,
        /**
        * create reports widget
        *
        * @class
        * @name widgets/reports/reports
        */
        postCreate: function () {
            var locatorParams, LegendWidthChange;
            this.initialReportCreated = true;
            this.logoContainer = query(".esriControlsBR")[0];
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
                                domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (window.innerWidth + 4) + 'px');
                                domClass.remove(this.logoContainer, "esriCTMapLogo");
                                domClass.add(this.logoContainer, "esriCTMapLogoBottom");
                            }
                        }
                    }
                } else {
                    dojo.setLegnedWidth = false;
                    LegendWidthChange = window.innerWidth - parseInt(document.getElementById('esriCTAOIContainer').clientWidth, 10);
                    if (dojo.query('.esriCTdivLegendbox').length > 0) {
                        domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (LegendWidthChange + 2) + 'px');
                    }
                    //set Default text
                    if (lang.trim(this.txtplaceName.value) === "") {
                        this.txtplaceName.value = dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress;
                        domStyle.set(locatorParams.divAddressScrollContent, "display", "none");
                    }
                    if (lang.trim(this.txtAOIAddress.value) === "") {
                        this.txtAOIAddress.value = dojo.configData.LocatorSettings.LocatorDefaultAOIAddress;
                        domStyle.set(locatorParams.divAddressScrollContent, "display", "none");
                    }
                    if (lang.trim(this.txtAOIBearingAddress.value) === "") {
                        this.txtAOIBearingAddress.value = dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress;
                        domStyle.set(locatorParams.divAddressScrollContent, "display", "none");
                    }
                }
                topic.publish("deactivateToolbar");
            }));
            this.domNode = domConstruct.create("div", {
                "title": sharedNls.tooltips.reports,
                "class": "esriCTHeaderIcons esriCTReportsImg"
            }, null);
            this._showHideContainer();
            topic.subscribe("addPushpinOnMap", lang.hitch(this, this.addPushpinOnMap));
            topic.subscribe("resizeAOIPanel", lang.hitch(this, this.resizeAOIPanel));
            topic.subscribe("resizeReportsPanel", lang.hitch(this, this.resizeReportsPanel));
            topic.subscribe("hideMapTip", lang.hitch(this, this.hideMapTip));
            topic.subscribe("createBuffer", lang.hitch(this, this._clearAndCreateBuffer));
            topic.subscribe("setStartPoint", lang.hitch(this, this._setStartPoint));
            topic.subscribe("closeDialogBox", lang.hitch(this, this.closeDialogBox));
            topic.subscribe("resizeDialogBox", lang.hitch(this, this._resizeDialogBox));
            topic.subscribe("deactivateToolbar", lang.hitch(this, this.deactivateToolbar));
            topic.subscribe("clearAllGraphics", lang.hitch(this, this._clearAllGraphics));
            this.divInitialCoordinates.title = sharedNls.tooltips.selectInitialCoordinates;
            domClass.add(dojo.query(".esriCTReportTypelabel", this.downloadReportContainer)[0], "esriCTReportTypeSelected");
            domClass.add(dojo.query(".esriCTReportlabel", this.downloadReportContainer)[0], "esriCTReportTypeSelected");
            this.report_type = dojo.configData.downloadReportType.QuickSummary;
            this.PDFreportType = true;
            /**
            * minimize other open header panel widgets and show AOI panel
            */
            this.applicationReportsContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            this.applicationReportsContainer.appendChild(this.applicationHeaderReportContainer);
            this._showAOITab();

            this.reportHandle = this.own(on(this.domNode, "click", lang.hitch(this, function () {
                topic.publish("toggleWidget", "reports");
                dojo.initialCoordinates = false;
                dojo.selectFeatureEnabled = false;
                if (dojo.query('.esriCTdivLegendbox').length > 0) {
                    if (domClass.contains(this.domNode, "esriCTReportsImgSelected")) {
                        dojo.setLegnedWidth = true;
                        domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (window.innerWidth + 4) + "px");
                    } else {
                        dojo.setLegnedWidth = false;
                        LegendWidthChange = window.innerWidth - parseInt(document.getElementById('esriCTAOIContainer').clientWidth, 10);
                        domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (LegendWidthChange + 2) + 'px');
                    }
                }
                domStyle.set(this.applicationHeaderReportContainer, "display", "block");
                this._showHideContainer();
                if (this.map.getLayer("tempBufferLayer").graphics.length > 0) {
                    domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
                } else if (this.map.getLayer("tempBufferLayer").graphics.length === 0) {
                    domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "none");
                }
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
                this._showAOITab();
                topic.publish("resizeAOIPanel");
            })));
            this.own(on(this.esriCTClearAOIButton, "click", lang.hitch(this, function () {
                var i, BearingTextboxLength = dojo.query('.esriCTBearingTextbox');
                this._clearAllGraphics();
                domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "none");
                domAttr.set(this.addLatitudeValue, "value", "");
                domAttr.set(this.addLongitudeValue, "value", "");
                this.flagMultiplePoints = 0;
                this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                for (i = 0; i < BearingTextboxLength.length; i++) {
                    this._destroyBearingTextBox();
                }
                this.AOIAttributes.length = 0;
                if (dojo.coordinatesPolyLine) {
                    this.polyLine.paths.length = 0;
                    dojo.coordinatesPolyLine = false;
                }
            })));

            this.own(on(this.addBearingTextBox, "click", lang.hitch(this, function () {
                document.activeElement.blur();
                var validRecord = this._validateBearingInputText(),
                    validNumericValue = this._validateNumericInputText();
                if (validRecord && validNumericValue) {
                    this._addBearingTextBox();
                    this.addBearingValue.value = "";
                    this.addDistanceMiles.value = "";
                    dojo.innerCoordinateBufferClear = true;
                }
            })));

            this.own(on(this.reportTab, "click", lang.hitch(this, function () {
                if (!dojo.selectFeatureEnabled) {
                    var i, graphicLayerCollection, bufferedGraphics, isNonPolygonGraphic, geometryArray, geometryService, baseGraphics;
                    if (this.map.getLayer("hGraphicLayer") && this.map.getLayer("hGraphicLayer").graphics.length > 0) {
                        graphicLayerCollection = this.map.getLayer("hGraphicLayer").graphics;
                        bufferedGraphics = this.map.getLayer("tempBufferLayer").graphics;
                        isNonPolygonGraphic = false;
                        geometryArray = [];
                        geometryService = new GeometryService(dojo.configData.GeometryService);
                        for (i = 0; i < graphicLayerCollection.length; i++) {
                            if (this.sliderDistance === 0 && graphicLayerCollection[i].geometry.type !== "polygon") {
                                isNonPolygonGraphic = true;
                            } else {
                                geometryArray.push(graphicLayerCollection[i].geometry);
                            }
                        }
                        if (isNonPolygonGraphic) {
                            alert(sharedNls.errorMessages.bufferSliderValue);
                        } else {
                            if (geometryArray.length > 0) {
                                geometryService.union(geometryArray).then(lang.hitch(this, function (unionGeometry) {
                                    this._showReportsTab();
                                    this._queryLayers(unionGeometry);
                                    topic.publish("resizeReportsPanel");
                                }), function (err) {
                                    alert(err.message);
                                });
                            }
                        }
                    } else {
                        if (this._previousGraphics && this._previousGraphics === this.map.getLayer("tempBufferLayer").graphics[0]) {
                            this._showReportsTab();
                            if (dojo.areaHasRecord) {
                                domStyle.set(this.divChangeUnit, "display", "block");
                            }
                            topic.publish("resizeReportsPanel");
                            return;
                        }
                        this._previousGraphics = this.map.getLayer("tempBufferLayer").graphics[0];
                        bufferedGraphics = this.map.getLayer("tempBufferLayer").graphics[0];
                        baseGraphics = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0];
                        if (bufferedGraphics && bufferedGraphics.geometry) {
                            this._showReportsTab();
                            this._queryLayers(bufferedGraphics.geometry);
                            topic.publish("resizeReportsPanel");
                        } else if (baseGraphics && baseGraphics.geometry) {
                            if (baseGraphics.geometry.type === "point" || baseGraphics.geometry.type === "polyline") {
                                alert(sharedNls.errorMessages.bufferSliderValue);
                            } else {
                                this._showReportsTab();
                                this._queryLayers(baseGraphics.geometry);
                                topic.publish("resizeReportsPanel");
                            }
                        } else {
                            alert(sharedNls.errorMessages.defineAOI);
                        }
                    }
                } else {
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
                if (this._validateLocateLatLongValues()) {
                    this.startPointLatitude = this.addLatitudeValue.value;
                    this.startPointLongitude = this.addLongitudeValue.value;
                    this._relocateInitialPoint();

                }
            })));

            this._createSelectionTool();
            this.flagMultiplePoints = 0;
            topic.publish("resizeAOIPanel");
            topic.publish("resizeReportsPanel");
            this._createSelectOption();

            this.own(on(dom.byId("fileUploadContainer"), "change", lang.hitch(this, function (event) {
                var fileName = event.target.value.toLowerCase(),
                    fileNameArray = fileName.split(".")[0].split("\\");
                this.name = fileNameArray[fileNameArray.length - 1];
                dom.byId('fileName').value = this.name;
            })));

            this.own(on(this.esriCTUploadButton, "click", lang.hitch(this, function (event) {
                var _self = this, isZipFile,
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
                dojo.initialCoordinates = true;
                dojo.selectFeatureEnabled = false;
            })));

            topic.publish("setDefaultTextboxValue", this.txtplaceName, "defaultPlaceNameSearchAddress", dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress);
            this.txtplaceName.value = dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress;
            locatorParams = {
                divSearch: this.divplaceName,
                close: this.clearplaceNameSearchTextbox,
                imgSearchLoader: this.imgplaceName,
                textAddress: this.txtplaceName,
                divResults: this.divplaceNameResults,
                divAddressContent: this.divplaceNameSearchContainer,
                divAddressScrollContent: this.divplaceNameScrollContent,
                bufferDistance: this.sliderDistance,
                isAOISearch: false,
                isPlacenameSearch: true,
                isAOIBearingSearch: false
            };
            //Create webMap_JSON on onclick event of download button
            this.own(on(this.esriCTDownloadButton, "click", lang.hitch(this, function () {
                var webMapJsonData = this._createMapJsonData();
                this._downloadReport(webMapJsonData);
            })));
            topic.publish("attachLocatorEvents", locatorParams);
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

            this.own(on(dom.byId("analysisFileUploadContainer"), "change", lang.hitch(this, function (event) {
                var fileName = event.target.value.toLowerCase(),
                    fileNameArray = fileName.split(".")[0].split("\\");
                this.analysisFileName = fileNameArray[fileNameArray.length - 1];
                dom.byId('analysisFileName').value = this.analysisFileName;
            })));

            this.own(on(this.esriCTAnalysisUploadButton, "click", lang.hitch(this, function (event) {
                var _self = this, isZipFile,
                    shapeFilePath = document.getElementById('analysisFileUploadContainer'),
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

            this.map.on("click", lang.hitch(this, function (evt) {
                dojo.hasPushPin = false;
                if (dojo.initialCoordinates) {
                    this._locateInitialCoordinatePoint(evt.mapPoint);
                }
                if (dojo.selectFeatureEnabled && !dojo.activatedDrawTool && !dojo.initialCoordinates) {
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
                            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                            this._selectFeatureGraphic(evt);
                        }
                    }), 500);
                }

            }));
            //map double click  for disable the select Feature function
            this.map.on("dbl-click", lang.hitch(this, function (evt) {
                if (dojo.selectFeatureEnabled) {
                    topic.publish("hideMapTip");
                    this._isDblClick = true;
                    dojo.selectFeatureEnabled = false;
                    this._bufferSelectedFeatures();
                }
            }));

            this.map.on("mouse-move", lang.hitch(this, function (evt) {
                if (dojo.selectFeatureEnabled) {
                    topic.publish("hideMapTip");
                    dialog = new TooltipDialog({
                        content: sharedNls.tooltips.selectFeature,
                        id: "toolTipDialogues",
                        style: "position: absolute; z-index:1000;"
                    });
                    dialog.startup();
                    domStyle.set(dialog.domNode, "opacity", 0.80);
                    Place.at(dialog.domNode, { x: evt.pageX, y: evt.pageY }, ["TL", "TR"], { x: 5, y: 5 });
                }
                if (dojo.initialCoordinates) {
                    topic.publish("hideMapTip");
                    dialog = new TooltipDialog({
                        content: sharedNls.tooltips.selectCoordinates,
                        id: "toolTipDialogues",
                        style: "position: absolute; z-index:1000;"
                    });
                    dialog.startup();
                    domStyle.set(dialog.domNode, "opacity", 0.80);
                    Place.at(dialog.domNode, { x: evt.pageX, y: evt.pageY }, ["TL", "TR"], { x: 5, y: 5 });
                }
            }));

            this.map.on("mouse-out", lang.hitch(this, function (evt) {
                topic.publish("hideMapTip");
            }));

            if (dojo.query('.esriCTdivLegendbox').length > 0 && dojo.query('.esriCTHeaderReportContainer').length > 0) {
                LegendWidthChange = window.innerWidth - parseInt(dojo.query('.esriCTHeaderReportContainer')[0].offsetWidth, 10);
                domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (window.innerWidth + 4) + "px");
            }

        },

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
                    dojo.initialCoordinates = false;
                }
                return allFieldValid;
            }
        },

        _validateLocateLatLongValues: function () {
            if (this._validateLocateValue() && ((lang.trim(this.addLatitudeValue.value) === "" || lang.trim(this.addLatitudeValue.value) < -90 || lang.trim(this.addLatitudeValue.value) > 90)) && ((lang.trim(this.addLongitudeValue.value) === "" || lang.trim(this.addLongitudeValue.value) < -180 || lang.trim(this.addLongitudeValue.value) > 180))) {
                alert(sharedNls.errorMessages.addLatitudeandLongitudeValue);
                return false;
            }
            if (lang.trim(this.addLatitudeValue.value) === "" || lang.trim(this.addLatitudeValue.value) < -90 || lang.trim(this.addLatitudeValue.value) > 90) {
                alert(sharedNls.errorMessages.addLatitudeValue);
                return false;
            }
            if (lang.trim(this.addLongitudeValue.value) === "" || lang.trim(this.addLongitudeValue.value) < -180 || lang.trim(this.addLongitudeValue.value) > 180) {
                alert(sharedNls.errorMessages.addLongitudeValue);
                return false;
            }
            if (parseFloat(this.startPointLatitude) === parseFloat(this.addLatitudeValue.value) && parseFloat(this.startPointLongitude) === parseFloat(this.addLongitudeValue.value)) {
                return false;
            }
            return true;
        },

        _relocateInitialPoint: function () {
            var params, geometryService = new GeometryService(dojo.configData.GeometryService);
            this.mapPoint = new Point({ "x": this.startPointLongitude, "y": this.startPointLatitude, "spatialReference": { "wkid": 4326} });
            params = new ProjectParams();
            params.geometries = [this.mapPoint];
            params.outSR = this.map.spatialReference;
            geometryService.project(params, lang.hitch(this, function (geometries) {
                this.map.centerAt(geometries[0]);
                this._locateInitialCoordinatePoint(geometries[0]);
            }));
        },

        _locateInitialCoordinatePoint: function (mapPoint) {
            var normalizedVal, geoLocationPushpin, locatorMarkupSymbol, graphic;
            topic.publish("hideMapTip");
            dojo.hasPushPin = false;
            normalizedVal = webMercatorUtils.xyToLngLat(mapPoint.x, mapPoint.y);
            geoLocationPushpin = dojoConfig.baseURL + dojo.configData.LocatorSettings.DefaultLocatorSymbol;
            locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(geoLocationPushpin, dojo.configData.LocatorSettings.MarkupSymbolSize.width, dojo.configData.LocatorSettings.MarkupSymbolSize.height);
            graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {}, null);
            this._clearAllGraphics();
            this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
            this._setStartPoint(normalizedVal, mapPoint);
            if (this.sliderDistance === 0) {
                domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "none");
                dojo.hasPushPin = true;
            }
        },

        //buffer selected features
        _bufferSelectedFeatures: function () {
            var graphicLayerCollection = this.map.getLayer("hGraphicLayer").graphics, geometryCollection = [], i, graphicGeometry;
            this.map.getLayer("tempBufferLayer").clear();
            for (i = 0; i < graphicLayerCollection.length; i++) {
                graphicGeometry = graphicLayerCollection[i].geometry.type === "extent" ? this._createPolygonGeometry(graphicLayerCollection[i].geometry) : graphicLayerCollection[i].geometry;
                geometryCollection.push(graphicGeometry);
            }
            this._createBuffer(geometryCollection);
        },
        /**
        * convert extent type of geometry to Polygon geometry
        * param {object} geometry extent type of geometry
        * @memberOf widgets/reports/reports
        */
        _createPolygonGeometry: function (geometry) {
            var polygon = new esri.geometry.Polygon(geometry.spatialReference);
            polygon.addRing([[geometry.xmin, geometry.ymin], [geometry.xmin, geometry.ymax], [geometry.xmax, geometry.ymax], [geometry.xmax, geometry.ymin], [geometry.xmin, geometry.ymin]]);
            return polygon;
        },

        //select Feature result query functionality
        _selectFeatureGraphic: function (evt) {
            var index, deferredListResult,
                onMapFeaturArray = [],
                graphicLayer;

            this.counter = 0;
            for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                this._executeQueryTask(index, evt.mapPoint, onMapFeaturArray);
            }
            deferredListResult = new DeferredList(onMapFeaturArray); //passlist of n no of queries for n no of layers
            deferredListResult.then(lang.hitch(this, function (result) { //once n no of queries are resolved it will come here in result
                graphicLayer = this.map.getLayer("hGraphicLayer");
                if (!graphicLayer) {
                    graphicLayer = new GraphicsLayer();
                    graphicLayer.id = "hGraphicLayer";
                    this.map.addLayer(graphicLayer);
                }
                var j, i, geoType, symbol, graphic;
                if (result) {
                    for (j = 0; j < result.length; j++) {
                        if (result[j][0] === true) {
                            if (result[j][1].features.length > 0) {
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
                }
            }), function (err) {
                alert(err.message);
            });
        },

        _createSelectedFeatureSymbol: function (geometryType) {
            var symbol;
            switch (geometryType) {
            case "point":
                symbol = new SimpleMarkerSymbol();
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

        // crate symbol
        _createFeatureSymbol: function (geometryType) {
            var symbol;
            switch (geometryType) {
            case "point":
                symbol = new SimpleMarkerSymbol();
                break;
            case "polyline":
                symbol = new SimpleLineSymbol();
                break;
            case "extent":
                symbol = new SimpleLineSymbol();
                break;
            case "polygon":
                symbol = new SimpleLineSymbol();
                break;
            default:
                symbol = new SimpleFillSymbol();
                break;
            }
            return symbol;
        },
        //extend query
        _executeQueryTask: function (index, mapPoint, onMapFeaturArray) {
            var queryTask, queryParms, queryOnRouteTask;
            queryTask = new esri.tasks.QueryTask(dojo.configData.SearchSettings[index].QueryURL);
            queryParms = new esri.tasks.Query();
            queryParms.outSpatialReference = this.map.spatialReference;
            queryParms.returnGeometry = true;
            //queryParms.maxAllowableOffset = 100;
            queryParms.geometry = this._extentFromPoint(mapPoint);
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

        _extentFromPoint: function (point) {
            var tolerance, screenPoint, pnt1, pnt2, mapPoint1, mapPoint2;
            tolerance = 3;
            screenPoint = this.map.toScreen(point);
            pnt1 = new esri.geometry.Point(screenPoint.x - tolerance, screenPoint.y + tolerance);
            pnt2 = new esri.geometry.Point(screenPoint.x + tolerance, screenPoint.y - tolerance);
            mapPoint1 = this.map.toMap(pnt1);
            mapPoint2 = this.map.toMap(pnt2);
            return new esri.geometry.Extent(mapPoint1.x, mapPoint1.y, mapPoint2.x, mapPoint2.y, this.map.spatialReference);
        },

        _createSelectOption: function () {
            this._setDownloadReportType();
            this._setReportFormatOption();
        },

        _setDownloadReportType: function () {
            array.forEach(dojo.query(".esriCTReportTypelabel", this.downloadReportContainer), lang.hitch(this, function (reportType) {
                on(reportType, 'click', lang.hitch(this, function (evt) {
                    domClass.remove(dojo.query(".esriCTReportTypeSelected", this.downloadReportContainer)[0], "esriCTReportTypeSelected");
                    domClass.add(evt.currentTarget, "esriCTReportTypeSelected");
                    this.report_type = domAttr.get(evt.currentTarget, "data-downloadReportType");
                }));
            }), this);
        },

        _setReportFormatOption: function () {
            array.forEach(dojo.query(".esriCTReportlabel", this.downloadReportContainer), lang.hitch(this, function (reportFormat) {
                on(reportFormat, 'click', lang.hitch(this, function (evt) {
                    if (domClass.contains(evt.currentTarget, "esriCTReportTypeSelected")) {
                        domClass.remove(evt.currentTarget, "esriCTReportTypeSelected");
                        if (this.PDFreportType && domAttr.get(evt.currentTarget, "data-downloadFormatType") === dojo.configData.downloadReportFormat.PDF) {
                            this.PDFreportType = false;
                        } else {
                            this.dataFormatType.splice(this.dataFormatType.indexOf(domAttr.get(evt.currentTarget, "data-downloadFormatType")), 1);
                        }
                    } else {
                        domClass.add(evt.currentTarget, "esriCTReportTypeSelected");
                        if (domAttr.get(evt.currentTarget, "data-downloadFormatType") === dojo.configData.downloadReportFormat.PDF) {
                            this.PDFreportType = true;
                        } else {
                            this.dataFormatType.push(domAttr.get(evt.currentTarget, "data-downloadFormatType"));
                        }
                    }
                }));
            }), this);
        },

        _selectFeature: function (evt) {
            dojo.selectFeatureEnabled = true;
            topic.publish("deactivateToolbar");
            this._oneTimeClearGraphics();
        },
        _oneTimeClearGraphics: function (evt) {
            dojo.hasOnMapClick = true;
        },

        /**
        * store data for dropdown
        * param {array} list of available record
        * @memberOf widgets/reports/reports
        */
        _setSelectionOption: function (arrOption) {
            var k, arrOpt = [];
            for (k = 0; k < arrOption.length; k++) {
                if (arrOption.hasOwnProperty(k)) {
                    arrOpt.push({
                        "label": arrOption[k],
                        "value": arrOption[k]
                    });
                }
            }
            return arrOpt;
        },

        _updateAOIonMap: function () {
            var intialLat, initiallong, AOIAttributesArray, i, initialbearing, initialdistance, distanceUnit, aoiAttributesIndex;
            if (this.AOIAttributes.length > 0) {
                this.flagMultiplePoints = 0;
                this.polyLine = new Polyline(new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
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
                    this.destVincenty(initiallong, intialLat, initialbearing, this._convertDistanceIntoMiles(initialdistance, distanceUnit), false, aoiAttributesIndex);
                }
            }
        },

        _setStartPoint: function (normalizedVal, initialPoint) {
            this.initialPoint = null;
            if (initialPoint) {
                this.initialPoint = initialPoint;
                this.flagMultiplePoints = 0;
            }
            this.addLongitudeValue.value = this.startPointLongitude = parseFloat(normalizedVal[0]).toFixed(5);
            this.addLatitudeValue.value = this.startPointLatitude = parseFloat(normalizedVal[1]).toFixed(5);
            this._updateAOIonMap();
        },

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
        *
        * @class
        * @name widgets/reports/reports
        */
        _showAOITab: function () {
            domStyle.set(this.divChangeUnit, "display", "none");
            if (domStyle.get(this.reportContainer, "display") === "block") {
                domStyle.set(this.reportContainer, "display", "none");
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
        *
        * @class
        * @name widgets/reports/reports
        */
        _showReportsTab: function () {
            try {
                if (domStyle.get(this.reportContainer, "display") === "none") {
                    domStyle.set(this.reportContainer, "display", "block");
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
        * create selection tool and draw point,polygon or polyline
        *
        * @class
        * @name widgets/reports/reports
        */
        _createSelectionTool: function () {
            var divAreaIntContainer, divSelectionContainer, _self, selectedUnitValue, radioContent, i, radioContentDiv, spanRadioContent, selectFeature;
            divAreaIntContainer = domConstruct.create("div", {
                "class": "esriCTAreaIntContainer"
            }, null);
            domConstruct.place(divAreaIntContainer, this.divAOIAddressContent, "after");

            domConstruct.create("div", {
                "innerHTML": sharedNls.messages.drawToolsText,
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
            selectFeature = domConstruct.create("div", {
                "class": "esriCTDrawMultiPoint",
                "title": sharedNls.titles.selectFeatureText
            }, divSelectionContainer);
            this.own(on(selectFeature, "click", lang.hitch(this, this._selectFeature)));
            this.toolbar = new Draw(this.map);
            _self = this;
            array.forEach(query(".esriCTSelectionIcon"), function (value) {
                _self.own(on(value, "click", function () {
                    topic.publish("hideMapTip");
                    _self.activateTool(this.id);
                }));
            });

            this.toolbar.on("draw-end", lang.hitch(this, function (evt) {
                _self.addToMap(evt, _self.sliderUnitValue);
                _self.flagMultiplePoints = 0;
                dojo.destroy(_self.bearingOuterContainer);
                if (evt.geometry.type === "extent" || evt.geometry.type === "point" || evt.geometry.type === "polyline" || evt.geometry.type === "polygon") {
                    if (this.map.getLayer("hGraphicLayer")) {
                        this.map.getLayer("hGraphicLayer").clear();
                    }
                }
                domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
            }));

            this._horizontalSlider = new HorizontalSlider({
                intermediateChanges: true,
                "class": "horizontalSlider"
            }, this.horizontalSliderContainer);

            radioContentDiv = domConstruct.create("div", {
                "class": "esriCTRadioButtonDiv"
            }, this.divRadioButtonContainer);
            for (i = 0; i < dojo.configData.DistanceUnitSettings.length; i++) {
                radioContent = domConstruct.create("div", {
                    "class": "esriCTRadioBtn"
                }, radioContentDiv);
                spanRadioContent = domConstruct.create("span", {
                    "class": "esriCTRadioBtnContent esriCTCursorPointer"
                }, radioContent);
                domAttr.set(spanRadioContent, "index", i);
                domAttr.set(spanRadioContent, "innerHTML", dojo.configData.DistanceUnitSettings[i].DistanceUnitName);
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
                    this.sliderDistance = dojo.configData.DistanceUnitSettings[i].MinimumValue;
                    domAttr.set(this.spanSliderValue, "innerHTML", dojo.configData.DistanceUnitSettings[i].MinimumValue + " " + selectedUnitValue);
                    this.sliderUnitValue = this._sliderStartEndValue(selectedUnitValue, this._horizontalSlider, i, null);
                }
                if (i === (dojo.configData.DistanceUnitSettings.length - 1)) {
                    domClass.add(radioContent, "esriCTLastElement");
                }
                this.own(on(spanRadioContent, "click", lang.hitch(this, this._getSliderValue)));
            }
            this.own(on(this._horizontalSlider, "change", lang.hitch(this, function (value) {
                var sliderText, message, graphics, geometryCollection;
                sliderText = this.spanSliderValue.innerHTML.split(" ");
                message = Math.round(value) + " " + sliderText[1];
                this.spanSliderValue.innerHTML = message;
                this.sliderDistance = Math.round(value);
                clearTimeout(this.stagedBuffer);
                this.stagedBuffer = setTimeout(lang.hitch(this, function () {
                    if (this.pointData !== null) {
                        this.pointData += "|" + this.sliderDistance + "|" + this.sliderUnitValue;
                    }

                    topic.publish("pointDataToShare", this.pointData);

                    var geoLocationBufferDetails = "";
                    geoLocationBufferDetails = this.sliderDistance + "|" + this.sliderUnitValue;
                    topic.publish("geoLocationBufferDetails", geoLocationBufferDetails);

                    if (this.map.getLayer("hGraphicLayer") && this.map.getLayer("hGraphicLayer").graphics.length > 0 && !dojo.selectFeatureEnabled) {
                        this._bufferSelectedFeatures();
                    } else {
                        graphics = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0];
                        if (graphics && graphics.geometry) {
                            geometryCollection = [];
                            geometryCollection.push(graphics.geometry);
                            this.featureGeometryArray = geometryCollection;
                            if (parseInt(this.sliderDistance, 10) === 0) {
                                this.map.getLayer("tempBufferLayer").clear();
                            } else if (!graphics.attributes || (graphics.attributes && graphics.attributes.sourcename !== "aoiSearch")) {
                                topic.publish("createBuffer", this.featureGeometryArray, this.sliderUnitValue);
                            } else {
                                topic.publish("createBuffer", this.featureGeometryArray, this.sliderUnitValue);
                            }
                        }
                    }
                    if (this.sliderDistance === dojo.configData.DistanceUnitSettings[1].MinimumValue) {
                        if (dojo.hasPushPin || dojo.isGeoLocationEnabled) {
                            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "none");
                        } else {
                            dojo.hasPushPin = false;
                        }
                    }
                }), 500);
            })));

            domConstruct.place(this.divRadioButtonContainer, this.divSliderContainer, "after");
            this._createLinkContainer(divAreaIntContainer);
        },

        _highlightSelectedDistanceUnit: function () {
            array.forEach(query(".esriCTRadioBtnContent"), function (item) {
                if (domClass.contains(item, "esriCTSelectedDistanceUnit")) {
                    domClass.remove(item, "esriCTSelectedDistanceUnit");
                }
            });
        },
        /**
        * set buffer slider value
        * param {array} list of slider attributes
        * @class
        * @name widgets/reports/reports
        */
        _getSliderValue: function (value) {
            this.map.getLayer("tempBufferLayer").clear();
            var index;
            array.forEach(query(".esriCTRadioBtnContent"), function (item) {
                if (domClass.contains(item, "esriCTSelectedDistanceUnit")) {
                    domClass.remove(item, "esriCTSelectedDistanceUnit");
                }
            });
            domClass.add(value.target, "esriCTSelectedDistanceUnit");
            index = Number(domAttr.get(value.target, "index"));
            this.sliderUnitValue = this._sliderStartEndValue(value.target.innerHTML, this._horizontalSlider, index, true);
        },

        /**
        * Clears all graphics
        *
        * @class
        * @name widgets/reports/reports
        */
        _clearAllGraphics: function () {
            if (this.map.getLayer("esriGraphicsLayerMapSettings")) {
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            }
            if (this.map.getLayer("tempBufferLayer")) {
                this.map.getLayer("tempBufferLayer").clear();
            }
            if (this.map.getLayer("hGraphicLayer")) {
                this.map.getLayer("hGraphicLayer").clear();
            }
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "none");
        },

        /**
        * Shows SelectedLinkContainer and hide all other containers
        * param {dom} current selected AOi link container DOM
        * @class
        * @name widgets/reports/reports
        */
        _showSelectedLinkContainer: function (selectedLinkContainer) {
            domStyle.set(this.placeNameSearch, "display", "none");
            domStyle.set(this.divAOIAddressContent, "display", "none");
            domStyle.set(this.divFileUploadContainer, "display", "none");
            domStyle.set(this.divBearingContainer, "display", "none");
            domStyle.set(selectedLinkContainer, "display", "block");
        },

        _createLinkContainer: function (divAreaIntContainer) {
            var divLinkUpload, divLinkDrawTool, divLinkCoordinates, divLinkplaceName;
            domConstruct.create("div", {
                "class": "esriCTLinkHeader",
                "innerHTML": sharedNls.messages.aoiOptionsText
            }, this.divLinkContainer);
            divLinkplaceName = domConstruct.create("div", {
                "id": "divLinkplaceName",
                "class": "esriCTAOILink esriCTCursorPointer esriCTAOILinkSelect",
                "innerHTML": sharedNls.titles.placeNameTtile
            }, this.divLinkContainer);
            divLinkDrawTool = domConstruct.create("div", {
                "id": "divLinkDrawTool",
                "class": "esriCTAOILink esriCTCursorPointer",
                "innerHTML": sharedNls.titles.drawingTitle
            }, this.divLinkContainer);
            divLinkUpload = domConstruct.create("div", {
                "id": "divLinkUpload",
                "class": "esriCTAOILink esriCTCursorPointer",
                "innerHTML": sharedNls.titles.uploadShapefileTitle
            }, this.divLinkContainer);
            divLinkCoordinates = domConstruct.create("div", {
                "id": "divLinkCoordinates",
                "class": "esriCTAOILink esriCTCursorPointer esriCTAOICoordinates",
                "innerHTML": sharedNls.titles.coordinatesTitle
            }, this.divLinkContainer);

            domStyle.set(divAreaIntContainer, "display", "none");
            // Place Name Search
            on(divLinkplaceName, "click", lang.hitch(this, function () {
                dojo.innerCoordinateBufferClear = false;
                this._destroyBearingTextBox();
                if (domStyle.get(this.placeNameSearch, "display") === "none") {
                    this.deactivateToolbar();
                    //Clear all graphics on click of link
                    this._clearAllGraphics();
                    //clear the horizontalSlider value
                    this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                    //disable the select Feature
                    dojo.selectFeatureEnabled = false;
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkplaceName"), "esriCTAOILinkSelect");
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.placeNameSearch);
                    domStyle.set(divAreaIntContainer, "display", "none");
                    this.aoiPanelScrollbar.rePositionScrollBar();
                    topic.publish("setDefaultTextboxValue", this.txtplaceName, "defaultPlaceNameSearchAddress", dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress);
                    if (lang.trim(this.txtplaceName.value) === "") {
                        this.txtplaceName.value = dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress;
                    }

                }
            }));

            on(divLinkUpload, "click", lang.hitch(this, function () {
                dojo.innerCoordinateBufferClear = false;
                this._destroyBearingTextBox();
                if (domStyle.get(this.divFileUploadContainer, "display") === "none") {
                    this.deactivateToolbar();
                    //Clear all graphics on click of link
                    this._clearAllGraphics();
                    //clear the horizontalSlider value
                    this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                    //disable select Feature
                    dojo.selectFeatureEnabled = false;
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkUpload"), "esriCTAOILinkSelect");
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.divFileUploadContainer);
                    domStyle.set(divAreaIntContainer, "display", "none");
                    this.aoiPanelScrollbar.rePositionScrollBar();
                    this.settingsDialog.hide();
                }
            }));
            on(divLinkDrawTool, "click", lang.hitch(this, function () {
                var locatorParams;
                dojo.innerCoordinateBufferClear = false;
                this._destroyBearingTextBox();
                if (domStyle.get(this.divAOIAddressContent, "display") === "none") {
                    this.deactivateToolbar();
                    //Clear all graphics on click of link
                    this._clearAllGraphics();
                    //clear the horizontalSlider value
                    this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                    //disable the select Feature
                    dojo.selectFeatureEnabled = false;
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkDrawTool"), "esriCTAOILinkSelect");
                    dojo.initialCoordinates = false;
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.divAOIAddressContent);
                    domStyle.set(divAreaIntContainer, "display", "block");
                    this.aoiPanelScrollbar.rePositionScrollBar();
                    topic.publish("setDefaultTextboxValue", this.txtAOIAddress, "defaultAOIAddress", dojo.configData.LocatorSettings.LocatorDefaultAOIAddress);
                    if (lang.trim(this.txtAOIAddress.value) === "") {
                        this.txtAOIAddress.value = dojo.configData.LocatorSettings.LocatorDefaultAOIAddress;
                    }
                    locatorParams = {
                        divSearch: this.divAOISearch,
                        close: this.clearAOITextbox,
                        imgSearchLoader: this.imgAOISearchLoader,
                        textAddress: this.txtAOIAddress,
                        divResults: this.divAOIAddressResults,
                        divAddressContent: this.divAOIAddressContent,
                        divAddressScrollContent: this.divAOIAddressScrollContent,
                        bufferDistance: this.sliderDistance,
                        isAOISearch: true,
                        isPlacenameSearch: false,
                        isAOIBearingSearch: false
                    };
                    topic.publish("attachLocatorEvents", locatorParams);
                }
                this.settingsDialog.hide();
            }));

            on(divLinkCoordinates, "click", lang.hitch(this, function () {
                dojo.innerCoordinateBufferClear = false;
                this.settingsDialog.hide();
                this._destroyBearingTextBox();
                domAttr.set(this.addDistanceMiles, "maxlength", dojo.configData.BearingDistanceMaxLimit.toString().length + 3);
                if (domStyle.get(this.divBearingContainer, "display") === "none") {
                    this.deactivateToolbar();
                    //Clear all graphics on click of link
                    this._clearAllGraphics();
                    //clear the horizontalSlider value
                    this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                    //disable the select Feature
                    dojo.selectFeatureEnabled = false;
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkCoordinates"), "esriCTAOILinkSelect");
                    domConstruct.place(this.divBearingContainer, this.divBufferDistance, "before");
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.divBearingContainer);
                    domStyle.set(divAreaIntContainer, "display", "none");
                    topic.publish("setDefaultTextboxValue", this.txtAOIBearingAddress, "defaultAOIBearingAddress", dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress);
                    if (lang.trim(this.txtAOIBearingAddress.value) === "") {
                        this.txtAOIBearingAddress.value = dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress;
                    }
                    var locatorParams = {
                        divSearch: this.divAOIBearingSearch,
                        close: this.clearAOIBearingTextbox,
                        imgSearchLoader: this.imgAOIBearingSearchLoader,
                        textAddress: this.txtAOIBearingAddress,
                        divResults: this.divAOIBearingAddressResults,
                        divAddressContent: this.divAOIBearingAddressContent,
                        divAddressScrollContent: this.divAOIBearingAddressScrollContent,
                        isAOIBearingSearch: true,
                        isPlacenameSearch: false,
                        isAOISearch: false
                    };
                    topic.publish("attachLocatorEvents", locatorParams);
                    this.polyLine = new Polyline(new esri.SpatialReference({
                        "wkid": this.map.extent.spatialReference.wkid
                    }));
                    this.aoiPanelScrollbar.rePositionScrollBar();
                }
            }));
        },

        /**
        * set bearing panel height
        *
        * @class
        * @name widgets/reports/reports
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
        * param {string} type of distance unit
        * param {array} list of horizontal slider attributes
        * param {number} current index of slider
        * param {boolean} check radio butoon is clicked
        * @class
        * @name widgets/reports/reports
        */
        _sliderStartEndValue: function (selectedUnitValue, horizontalSlider, index, radioClicked) {
            var sliderStartValue, sliderEndValue;
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
            if (radioClicked) {
                this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[index].MinimumValue);
            }
            domAttr.set(this.spanSliderValue, "innerHTML", dojo.configData.DistanceUnitSettings[index].MinimumValue + " " + selectedUnitValue);
            return this.sliderUnitValue;
        },

        /**
        * activate draw tool
        * param {number} id of the tool bar
        * param {object} supports to create new geometries
        * @class
        * @name widgets/reports/reports
        */
        activateTool: function (id) {
            var tool;
            dojo.activatedDrawTool = true;
            tool = id.toUpperCase();
            this.toolbar.activate(Draw[tool]);
            dojo.selectFeatureEnabled = false;
        },

        /**
        * draw a polygon on the map
        * param {object} object of the current event
        * param {object} object of the toolbar
        * param {number} slider current value
        * @class
        * @name widgets/reports/reports
        */
        addToMap: function (evt) {
            var symbol, graphic, jsonStringGeometry, graphicGeometry, geometryCollection = [];
            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            this.deactivateToolbar();
            graphicGeometry = evt.geometry.type === "extent" ? this._createPolygonGeometry(evt.geometry) : evt.geometry;
            symbol = this._createFeatureSymbol(graphicGeometry.type);
            graphic = new Graphic(graphicGeometry, symbol);
            switch (graphicGeometry.type) {
            case "point":
                this.pointData = "point" + "|" + graphicGeometry.x + "|" + graphicGeometry.y;
                break;
            case "polyline":
                jsonStringGeometry = JSON.stringify(graphicGeometry.paths);
                this.pointData = "polyline" + "|" + jsonStringGeometry;
                break;
            case "polygon":
                jsonStringGeometry = JSON.stringify(graphicGeometry.rings);
                this.pointData = "polygon" + "|" + jsonStringGeometry;
                break;
            }
            this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
            dojo.hasPushPin = false;
            dojo.isGeoLocationEnabled = false;
            geometryCollection.push(graphicGeometry);
            topic.publish("createBuffer", geometryCollection, this.sliderUnitValue);
        },

        deactivateToolbar: function () {
            this.toolbar.deactivate();
        },

        /**
        * clears and create buffer
        * param {object} geometry for creating buffer
        * @class
        * @name widgets/reports/reports
        */
        _clearAndCreateBuffer: function (geometry) {
            this.map.getLayer("tempBufferLayer").clear();
            this._createBuffer(geometry);
        },

        /**
        * create buffer
        * param {object} geometry for creating buffer
        * @class
        * @name widgets/reports/reports
        */
        _createBuffer: function (geometryCollection) {
            var geometryService, params, i, j, k, m, deferredListSimplifyResult, deferredListBufferResult, simplifyRequestArray = [], bufferRequestArray = [], unionBufferArray = [], unionResultArray = [],
                pointGeometryCollection = [], polylineGeometryCollection = [], polygonGeometryCollection = [], pointBufferCollection = [], polylineBufferCollection = [], polygonBufferCollection = [];
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
            if (this.sliderDistance !== 0) {
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
                        for (j = 0; j < pointGeometryCollection.length; j++) {
                            result[0][1].push(pointGeometryCollection[j]);
                        }
                        //create buffer based on geomtery type of simplify result
                        for (k = 0; k < result[0][1].length; k++) {
                            switch (result[0][1][k].type) {
                            case "point":
                                pointBufferCollection.push(result[0][1][k]);
                                break;
                            case "polyline":
                                polylineBufferCollection.push(result[0][1][k]);
                                break;
                            case "polygon":
                                polygonBufferCollection.push(result[0][1][k]);
                                break;
                            }
                        }
                        if (pointBufferCollection.length > 0) {
                            params.geometries = pointBufferCollection;
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
                            geometryService.union(unionBufferArray, lang.hitch(this, function (geometry) {
                                unionResultArray.push(geometry);
                                this.showBuffer(unionResultArray);
                            }));
                        }));
                    }));
                }
                domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
            } else {
                if (this.featureGeometryArray.type !== "polygon" && this.featureGeometryArray.type !== "extent") {
                    this.map.getLayer("tempBufferLayer").clear();
                }
            }
        },

        /**
        * validate the geometries if having geometry type as extent
        * @name widgets/reports/reports
        * @method _validateGeometryType
        * @return isExtent
        */
        _validateGeometryType: function () {
            var i, areAllPoint = true;
            for (i = 0; i < this.featureGeometryArray.length; i++) {
                if (this.featureGeometryArray[i] && this.featureGeometryArray[i].type !== "point") {
                    areAllPoint = false;
                }
            }
            return areAllPoint;
        },

        /**
        * show buffer
        * param {object} geometry for showing buffer
        * @class
        * @name widgets/reports/reports
        */
        showBuffer: function (bufferedGeometries) {
            var _self, symbol, graphic, featureSet, parameterValue, features;
            _self = this;
            symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color([parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.LineSymbolTransparency.split(",")[0], 10)]),
                    2
                ),
                new Color([parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.FillSymbolTransparency.split(",")[0], 10)])
                );
            array.forEach(bufferedGeometries, function (geometry) {
                parameterValue = new ParameterValue();
                parameterValue.dataType = "GPFeatureRecordSetLayer";
                graphic = new Graphic(geometry, symbol);
                featureSet = new FeatureSet();
                features = [];
                features.push(graphic);
                featureSet = new FeatureSet();
                featureSet.features = features;
                featureSet.displayFieldName = "";
                featureSet.geometryType = "esriGeometryPolygon";
                featureSet.spatialReference = _self.map.spatialReference;
                featureSet.fields = [];
                featureSet.exceededTransferLimit = false;
                _self.shapeFileForAnalysis = featureSet;
                if (dojo.innerCoordinateBufferClear) {
                    _self.map.getLayer("tempBufferLayer").clear();
                }
                _self.map.getLayer("tempBufferLayer").clear();
                _self.map.getLayer("tempBufferLayer").add(graphic);
                _self.map.setExtent(graphic.geometry.getExtent().expand(1.6));
            });
        },

        /**
        * get operational layer information
        * param {object} geometry of the created buffer
        * @class
        * @name widgets/reports/reports
        */
        _queryLayers: function (geometry) {
            var _self = this, index, i, j, k, requestHandle, deferredListFeature, deferredListCount, statisticType, statisticTypeValue, standardPointLayerUnit, reportFields, layerName, reportFieldName,
                staticFieldName, count, deferredListInfo, noResultCount = 0, reportFieldsCount = 0, onMapFeaturArray = [], statisticFieldsCount = [], statisticFieldsInfo = [];
            this.counter = 0;
            domConstruct.empty(this.reportScrollContent);
            this._showLoadingIndicatorReports();
            for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                requestHandle = esriRequest({
                    "url": dojo.configData.SearchSettings[index].QueryURL,
                    "content": {
                        "f": "json"
                    },
                    "callbackParamName": "callback"
                });
                requestHandle.then(_self.requestSucceeded, _self.requestFailed);
                onMapFeaturArray.push(requestHandle);
            }
            deferredListFeature = new DeferredList(onMapFeaturArray);
            deferredListFeature.then(lang.hitch(this, function (featureResult) {
                if (featureResult) {
                    for (i = 0; i < dojo.configData.SearchSettings.length; i++) {
                        statisticFieldsCount.push(this._executeQueryTaskForCount(i, geometry));
                    }
                    deferredListCount = new DeferredList(statisticFieldsCount);
                    deferredListCount.then(lang.hitch(this, function (countResult) {
                        for (j = 0; j < countResult.length; j++) {
                            if (countResult[j][1].result > 0) {
                                if (featureResult[j][1].geometryType === "esriGeometryPoint") {
                                    statisticType = "COUNT";
                                    statisticTypeValue = "count";
                                    standardPointLayerUnit = "";
                                    reportFields = dojo.configData.SearchSettings[j].QuickSummaryReportFields;
                                    reportFieldsCount = reportFields.length;
                                    layerName = featureResult[j][1].name;
                                    for (count = 0; count < reportFieldsCount; count++) {
                                        reportFieldName = reportFields[count];
                                        staticFieldName = reportFieldName;
                                        statisticFieldsInfo.push(this._executeQueryTaskPointReport(j, geometry, statisticType, reportFieldName, staticFieldName, statisticTypeValue, standardPointLayerUnit, layerName));
                                    }
                                }
                                if (featureResult[j][1].geometryType === "esriGeometryPolygon") {
                                    statisticType = "SUM";
                                    statisticTypeValue = "area";
                                    reportFields = dojo.configData.SearchSettings[j].QuickSummaryReportFields;
                                    reportFieldsCount = reportFields.length;
                                    layerName = featureResult[j][1].name;
                                    for (count = 0; count < reportFieldsCount; count++) {
                                        reportFieldName = reportFields[count];
                                        staticFieldName = dojo.configData.SearchSettings[j].SummaryStatisticField;
                                        statisticFieldsInfo.push(this._executeQueryTaskPointReport(j, geometry, statisticType, reportFieldName, staticFieldName, statisticTypeValue, sharedNls.titles.areaStandardUnit, layerName));
                                    }
                                }
                            }
                        }
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
                                } else {
                                    dojo.hasAreaStandardUnit = false;
                                    dojo.areaHasRecord = false;
                                    this._createReport();
                                }
                            }
                        }), function (err) {
                            alert(err.messgae);
                        });
                    }), function (err) {
                        alert(err.message);
                    });
                }
            }), function (err) {
                alert(err.message);
            });
        },


        _createReportJson: function (reportJsonArray, k, indx, prev) {
            if (this.convertedUnitType === null) {
                this.convertedUnitType = "Standard";
            }
            var i, fieldValuesArray = [],
                fieldName, fieldNameDisplayText, fieldValue, fieldObj;
            this.summaryFieldsArray = [];
            fieldName = this.queryAllResults[k][1].reportFieldName;
            this.summaryFieldsArray.push({
                fieldName: fieldName,
                fieldValues: fieldValuesArray
            });

            for (i = 0; i < this.queryAllResults[k][1].result.features.length; i++) {
                fieldNameDisplayText = string.substitute("${" + this.queryAllResults[k][1].reportFieldName + "}", this.queryAllResults[k][1].result.features[i].attributes);
                if (this.queryAllResults[k][1].statictypevalue === "count") {
                    fieldValue = this.queryAllResults[k][1].result.features[i].attributes.Total;
                } else if (this.queryAllResults[k][1].statictypevalue === "area") {
                    if (((this.convertedUnitType === null) || (this.convertedUnitType === sharedNls.titles.standardReportUnit)) && (this.initialReportCreated)) {
                        fieldValue = (this.queryAllResults[k][1].result.features[i].attributes.Total * 247.105381);
                        fieldValue = parseInt(fieldValue, 10);
                    } else {
                        fieldValue = (this.queryAllResults[k][1].result.features[i].attributes.Total);
                        fieldValue = parseInt(fieldValue, 10);
                    }
                }
                fieldObj = {};
                fieldObj[fieldNameDisplayText] = fieldValue;
                fieldValuesArray.push(fieldObj);
            }
            reportJsonArray[this.index] = {
                layerName: this.queryAllResults[k][1].layerName,
                summaryType: this.queryAllResults[k][1].statictypevalue,
                summaryUnits: "standard",
                summaryFields: this.summaryFieldsArray
            };
            this.previousIndex = this.index;
            this.index++;
        },

        /**
        * get configured operational layers information
        * param {object} selected field
        * @class
        * @name widgets/reports/reports
        */
        requestSucceeded: function (response, io) {
            var deferred = new Deferred();
            deferred.resolve(response);
        },

        /**
        * failed to get layers information
        * param {object} error
        * param {object} io
        * @class
        * @name widgets/reports/reports
        */
        requestFailed: function (error, io) {
            alert(error.message);
        },

        /**
        * create report for the selected AOI
        * param {object} geometry of the created buffer
        * @class
        * @name widgets/reports/reports
        */
        _createReport: function () {
            var i, index, z;
            this.featureArrayCollection.length = 0;
            for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                this.resultDispalyFields[dojo.configData.SearchSettings[index].QueryURL] = [];

                for (i = 0; i < this.queryAllResults.length; i++) {
                    for (z = 0; z < dojo.configData.SearchSettings[index].QuickSummaryReportFields.length; z++) {
                        if (this.queryAllResults[i][0]) {
                            if (dojo.configData.SearchSettings[index].QuickSummaryReportFields[z] === this.queryAllResults[i][1].reportFieldName) {
                                this.featureArrayCollection.push({
                                    attr: this.queryAllResults[i][1].result.features,
                                    FieldName: this.queryAllResults[i][1].reportFieldName,
                                    FieldTypeValue: this.queryAllResults[i][1].statictypevalue,
                                    unitType: this.queryAllResults[i][1].unit,
                                    layerName: this.queryAllResults[i][1].layerName
                                });
                                this.resultDispalyFields[dojo.configData.SearchSettings[index].QueryURL].push(this.queryAllResults[i][1].reportFieldName);
                            }
                        }
                    }
                }
            }
            this._displayReport(this.featureArrayCollection, false);
        },

        _createReportOnCheckboxClick: function () {
            this._createModifiedReportData();
        },

        _createModifiedReportData: function () {
            var i, j, x, reportDialog;
            reportDialog = document.getElementById("reportDialogId");
            this.featureArrayCollection.length = 0;
            for (i = 0; i < this.queryAllResults.length; i++) {
                for (x in this.resultDispalyFields) {
                    if (this.resultDispalyFields.hasOwnProperty(x)) {
                        for (j = 0; j < this.resultDispalyFields[x].length; j++) {
                            if (this.queryAllResults[i][0]) {
                                if (this.queryAllResults[i][1].reportFieldName === this.resultDispalyFields[x][j]) {
                                    this.featureArrayCollection.push({
                                        attr: this.queryAllResults[i][1].result.features,
                                        FieldName: this.queryAllResults[i][1].reportFieldName,
                                        FieldTypeValue: this.queryAllResults[i][1].statictypevalue,
                                        unitType: this.queryAllResults[i][1].unit,
                                        layerName: this.queryAllResults[i][1].layerName
                                    });
                                }
                            }
                        }
                    }
                }
            }
            this._displayReport(this.featureArrayCollection, true, reportDialog);
        },

        /**
        * display report for the selected AOI
        * param {object} selected featureset inside the buffered geometry
        * @class
        * @name widgets/reports/reports
        */
        _displayReport: function (featureArrayCollection, checkboxFlag, reportDialog) {
            var searchSettingsIndex, reportPanelHeight, createReport;
            domConstruct.empty(this.reportScrollContent);
            domStyle.set(this.divChangeUnit, "display", "block");
            this._hideLoadingIndicatorReports();
            for (searchSettingsIndex = 0; searchSettingsIndex < dojo.configData.SearchSettings.length; searchSettingsIndex++) {
                createReport = true;
                this._createReportPanelContent(searchSettingsIndex, featureArrayCollection, createReport, checkboxFlag, reportDialog);
            }
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
        * param {number} index for the selected feature
        * param {object} selected featureset inside the buffered geometry
        * @class
        * @name widgets/reports/reports
        */
        _createReportPanelContent: function (searchSettingsIndex, featureArrayCollection, createReport, checkboxFlag, reportDialog) {
            var divnoDataAvailable, count, j, target, divReportLayerSettingPanel, divReportLayerPanel, divReportLayersettingIcon, divFieldTypeContent, title, settingsIconId;
            this.changeFeatureSetUnit = [];

            if (featureArrayCollection.length >= 0) {
                this.storeFeatureArrayCollection = featureArrayCollection;
                divReportLayerPanel = domConstruct.create("div", {
                    "class": "esriCTReportLayerPanel"
                }, this.reportScrollContent);
                divReportLayerSettingPanel = domConstruct.create("div", {
                    "class": "esriCTReportSettingPanel"
                }, divReportLayerPanel);
                domConstruct.create("div", {
                    "class": "esriCTDivReportLayerTitle",
                    "innerHTML": dojo.configData.SearchSettings[searchSettingsIndex].SearchDisplayTitle
                }, divReportLayerSettingPanel);
                settingsIconId = dojo.configData.SearchSettings[searchSettingsIndex].QueryURL;
                divReportLayersettingIcon = domConstruct.create("div", {
                    "class": "esriCTSettingsIcon",
                    "displayTitle": dojo.configData.SearchSettings[searchSettingsIndex].SearchDisplayTitle,
                    "id": settingsIconId,
                    "title": sharedNls.tooltips.settingsIconTitle
                }, divReportLayerSettingPanel);

                this.own(on(divReportLayersettingIcon, "click", lang.hitch(this, function (evt) {
                    target = evt.currentTarget || evt.srcElement;
                    title = domAttr.get(target, "displayTitle");
                    this._configureDialogBox(target.id, title);
                })));
                if (this._validateFieldsCount(searchSettingsIndex, featureArrayCollection)) {
                    dojo.hasAreaStandardUnit = false;
                    for (count = 0; count < featureArrayCollection.length; count++) {
                        if (featureArrayCollection[count].layerName === dojo.configData.SearchSettings[searchSettingsIndex].SearchDisplayTitle) {
                            if (createReport && divnoDataAvailable) {
                                //if report is getting created and no result found error message is already appended with that section then we clear it
                                domConstruct.destroy(divnoDataAvailable);
                                domStyle.set(divReportLayersettingIcon, "display", "block");
                            }
                            createReport = false;
                            domConstruct.create("div", {
                                "class": "esriCTReportZoneName",
                                "innerHTML": featureArrayCollection[count].FieldName
                            }, divReportLayerPanel, "last");
                            for (j = 0; j < featureArrayCollection[count].attr.length; j++) {
                                this.value = string.substitute("${" + featureArrayCollection[count].FieldName + "}",
                                                featureArrayCollection[count].attr[j].attributes);
                                this.StatisticTypeValue = string.substitute("${Total}", featureArrayCollection[count].attr[j].attributes);

                                // reports has AreaStandardUnit then we enble the show standard unit
                                if ((featureArrayCollection[count].unitType === sharedNls.titles.areaStandardUnit) || (featureArrayCollection[count].unitType === sharedNls.titles.areaMetricUnit)) {
                                    dojo.hasAreaStandardUnit = true;
                                }
                                if (featureArrayCollection.length > 1) {
                                    if ((featureArrayCollection[count].unitType === sharedNls.titles.areaStandardUnit) && (!this.initialReportCreated)) {
                                        this.StatisticTypeValue = parseFloat(this.StatisticTypeValue);
                                        this.StatisticTypeValue = (this.StatisticTypeValue * 247.105381);
                                    }
                                } else {
                                    searchSettingsIndex = count;
                                }
                                divFieldTypeContent = domConstruct.create("div", {
                                    "class": "esriCTReportZoneList"
                                }, divReportLayerPanel);
                                domConstruct.create("span", {
                                    "class": "esriCTReportZoneField",
                                    "innerHTML": this.value + " "
                                }, divFieldTypeContent);
                                this.StatisticTypeValue = parseInt(this.StatisticTypeValue, 10);
                                if (((featureArrayCollection[count].unitType === sharedNls.titles.areaStandardUnit) || (featureArrayCollection[count].unitType === sharedNls.titles.areaMetricUnit)) && (this.initialReportCreated)) {
                                    this.StatisticTypeValue = dojoNumber.format(this.StatisticTypeValue);
                                }
                                domConstruct.create("span", {
                                    "class": "esriCTReportZoneCount",
                                    "innerHTML": ("(" + featureArrayCollection[count].FieldTypeValue + " " + " - " + this.StatisticTypeValue + (featureArrayCollection[count].unitType === "" ? "" : " ") + featureArrayCollection[count].unitType + ")")
                                }, divFieldTypeContent);
                            }
                        }
                    }
                } else {
                    if (divnoDataAvailable) { //if already no result message is appended in the current structure then remove duplicate,clear it and create new one.
                        domConstruct.destroy(divnoDataAvailable);
                    }
                    divnoDataAvailable = domConstruct.create("div", {
                        "class": "esriCTReportZoneName"
                    }, divReportLayerPanel, "last");
                    if (this._validateResultCount(searchSettingsIndex)) {
                        domAttr.set(divnoDataAvailable, "innerHTML", sharedNls.errorMessages.invalidSearch);
                        if (dojo.configData.SearchSettings[searchSettingsIndex].QueryURL === domAttr.get(divReportLayersettingIcon, "id")) {
                            domStyle.set(divReportLayersettingIcon, "display", "none");
                        }
                    } else {
                        domAttr.set(divnoDataAvailable, "innerHTML", sharedNls.errorMessages.noFieldsSelected);
                    }
                }
            }
            this._createReportData();
            if (dojo.hasAreaStandardUnit) {
                domStyle.set(this.divChangeUnit, "display", "block");
                dojo.areaHasRecord = true;
            } else {
                domStyle.set(this.divChangeUnit, "display", "none");
                dojo.areaHasRecord = false;
            }
        },

        /**
        * validates the checked fields count
        * param {searchSettingsIndex} index for the featureArrayCollection array
        * param {featureArrayCollection} selected featureset
        * @name widgets/reports/reports
        * @method _validateFieldsCount
        * @param {} searchSettingsIndex
        * @param {} featureArrayCollection
        * @return fieldChecked
        */
        _validateFieldsCount: function (searchSettingsIndex, featureArrayCollection) {
            var i, j, fieldChecked = false;
            for (i = 0; i < dojo.configData.SearchSettings[searchSettingsIndex].QuickSummaryReportFields.length; i++) {
                for (j = 0; j < featureArrayCollection.length; j++) {
                    if (dojo.configData.SearchSettings[searchSettingsIndex].QuickSummaryReportFields[i] === featureArrayCollection[j].FieldName) {
                        fieldChecked = true;
                    }
                }
            }
            return fieldChecked;
        },

        /**
        * validates the query result fields count
        * param {searchSettingsIndex} index for the featureArrayCollection array
        * @name widgets/reports/reports
        * @method _validateResultCount
        * @param {} searchSettingsIndex
        * @return fieldNotFound
        */
        _validateResultCount: function (searchSettingsIndex) {
            var j, fieldNotFound = true;
            for (j = 0; j < this.queryAllResults.length; j++) {
                if (this.queryAllResults[j][0] && dojo.configData.SearchSettings[searchSettingsIndex].SearchDisplayTitle === this.queryAllResults[j][1].layerName) {
                    fieldNotFound = false;
                }
            }
            return fieldNotFound;
        },

        /**
        * create layer_JSON_for_Quick_report
        * @class
        * @name widgets/reports/reports
        */
        _createReportData: function () {
            var k, reportJsonArray = [],
                fieldName, fieldValuesArray, fieldObj, fieldNameDisplayText, fieldValue, i;
            this.index = 0;
            this.previousIndex = 0;
            for (k = 0; k < this.queryAllResults.length; k++) {
                if (this.queryAllResults[k][0]) {
                    if (reportJsonArray[this.previousIndex]) {
                        if (reportJsonArray[this.previousIndex].layerName === this.queryAllResults[k][1].layerName) {
                            fieldValuesArray = [];
                            fieldName = this.queryAllResults[k][1].reportFieldName;

                            for (i = 0; i < this.queryAllResults[k][1].result.features.length; i++) {
                                fieldNameDisplayText = string.substitute("${" + this.queryAllResults[k][1].reportFieldName + "}", this.queryAllResults[k][1].result.features[i].attributes);
                                if (this.queryAllResults[k][1].statictypevalue === "count") {
                                    fieldValue = this.queryAllResults[k][1].result.features[i].attributes.Total;
                                } else if (this.queryAllResults[k][1].statictypevalue === "area") {
                                    if (((this.convertedUnitType === null) || (this.convertedUnitType === "Standard")) && (this.initialReportCreated)) {
                                        fieldValue = (this.queryAllResults[k][1].result.features[i].attributes.Total * 247.105381);
                                        fieldValue = parseInt(fieldValue, 10);
                                    } else {
                                        fieldValue = (this.queryAllResults[k][1].result.features[i].attributes.Total);
                                        fieldValue = parseInt(fieldValue, 10);
                                    }

                                    fieldObj = {};
                                    fieldObj[fieldNameDisplayText] = fieldValue;
                                    fieldValuesArray.push(fieldObj);
                                }
                                this.summaryFieldsArray.push({
                                    fieldName: fieldName,
                                    fieldValues: fieldValuesArray
                                });
                            }
                        } else {
                            this._createReportJson(reportJsonArray, k);
                        }
                    } else {
                        this._createReportJson(reportJsonArray, k);
                    }
                }
            }
            this.reportArrayCollection = reportJsonArray;
        },

        /**
        * create dialog box for detailed summary report
        * param {string} selected field
        * @class
        * @name widgets/reports/reports
        */
        _configureDialogBox: function (dialogBoxId, title) {
            var _self = this,
                detailFieldValues,
                createContent,
                i,
                id;
            for (i = 0; i < dojo.configData.SearchSettings.length; i++) {
                id = dojo.configData.SearchSettings[i].QueryURL;
                if (id === dialogBoxId) {
                    detailFieldValues = dojo.configData.SearchSettings[i].QuickSummaryReportFields;
                    createContent = _self.createContent(detailFieldValues, dialogBoxId, dojo.configData.SearchSettings[i].QueryURL);
                    _self.settingsDialog.set("content", createContent);
                    _self.settingsDialog.set("title", title);
                    _self.settingsDialog.show();
                }
            }
        },

        /**
        * get of count of featuresets
        * param {number} index of the configured operational layer
        * param {object} geometry of the buffer
        * @name widgets/reports/reports
        */
        _executeQueryTaskForCount: function (index, geometry) {
            var obj = {},
                queryTask,
                queryLayer,
                deferred;
            queryTask = new esri.tasks.QueryTask(dojo.configData.SearchSettings[index].QueryURL);
            queryLayer = new esri.tasks.Query();
            queryLayer.outSpatialReference = this.map.spatialReference;
            queryLayer.returnGeometry = false;
            queryLayer.geometry = geometry;
            queryLayer.outFields = ["*"];
            //return queryTask.executeForCount(queryLayer);
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
        * param {number} index of the configured operational layer
        * param {object} geometry of the buffer
        * param {string} type of static like count,sum etc
        * param {string} group by filed name
        * param {string} out static field name
        * param {string} unit of the calculated static
        * return{object} return deffered promise
        * @class
        * @name widgets/reports/reports
        */
        _executeQueryTaskPointReport: function (index, geometry, statisticType, reportFieldName, staticFieldName, statisticTypeValue, unit, layerName) {
            var obj = {},
                queryTask,
                queryLayer,
                statDef,
                deferred;
            statDef = new esri.tasks.StatisticDefinition();
            statDef.statisticType = statisticType;
            statDef.onStatisticField = staticFieldName;
            statDef.outStatisticFieldName = "Total";
            queryTask = new esri.tasks.QueryTask(dojo.configData.SearchSettings[index].QueryURL);
            queryLayer = new esri.tasks.Query();
            queryLayer.outSpatialReference = this.map.spatialReference;
            queryLayer.returnGeometry = false;
            queryLayer.geometry = geometry;
            queryLayer.outStatistics = [statDef];
            queryLayer.groupByFieldsForStatistics = [reportFieldName];
            queryLayer.outFields = ["*"];
            deferred = new Deferred();
            queryTask.execute(queryLayer, lang.hitch(this, function (results) {
                obj.result = results;
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
        * resize AOI panel
        *
        * @class
        * @name widgets/reports/reports
        */
        resizeAOIPanel: function () {
            var aoiPanelHeight;
            aoiPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]).h - (dojo.coords(dojo.query(".esriCTRightPanel")[0]).h + dojo.coords(dojo.query(".esriCTLinkContainer")[0]).h) + "px";
            domStyle.set(this.areaOfInterestContainer, "height", aoiPanelHeight);
            if (this.stagedAOIResize) {
                clearTimeout(this.stagedAOIResize);
            }
            this.stagedAOIResize = setTimeout(lang.hitch(this, function () {
                if (this.aoiPanelScrollbar) {
                    domClass.add(this.aoiPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                    this.aoiPanelScrollbar.removeScrollBar();
                }
                this.aoiPanelScrollbar = new ScrollBar({
                    domNode: this.areaOfInterestContainer
                });
                this.aoiPanelScrollbar.setContent(this.areaOfInterestContent);
                this.aoiPanelScrollbar.createScrollBar();
            }), 500);
        },

        /**
        * resize reports panel
        *
        * @class
        * @name widgets/reports/reports
        */
        resizeReportsPanel: function () {
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
        },

        /**
        * show loading indicator for report panel
        *
        * @class
        * @name widgets/reports/reports
        */
        _showLoadingIndicatorReports: function () {
            domStyle.set(this.reportsLoader, "display", "block");
        },

        /**
        * hide loading indicator for report panel
        *
        * @class
        * @name widgets/reports/reports
        */
        _hideLoadingIndicatorReports: function () {
            domStyle.set(this.reportsLoader, "display", "none");
        },

        /**
        *create content to be shown for detail summary report
        * param {object} list of fields to be configured
        * param {string} checked field out of configured field
        * @return{string} return content to be displayed
        * @class
        * @name widgets/reports/reports
        */
        createContent: function (detailFieldValues, dialogBoxId, layerURL) {
            var _self = this,
                detailReportFieldLength,
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

            for (detailReportFieldLength = 0; detailReportFieldLength < detailFieldValues.length; detailReportFieldLength++) {
                this._addReportCheckBox(layerURL, detailReportFieldLength, divCheckboxContainer, detailFieldValues);
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
                _self._createReportOnCheckboxClick();
            });
            return divSettingDialogContainer;
        },

        _addReportCheckBox: function (layerURL, detailReportFieldLength, divCheckboxContainer, detailFieldValues) {
            var addReportCheckBox, divDetailReportField, itemIndex;
            this.divCheckBox = domConstruct.create("div", {
                "class": "esriCTDivCheckboxContent"
            }, divCheckboxContainer);
            if (this.resultDispalyFields[layerURL].indexOf(detailFieldValues[detailReportFieldLength]) === -1) {
                addReportCheckBox = new CheckBox({
                    name: "TypecheckBox",
                    checked: false,
                    "layerURL": layerURL,
                    value: detailFieldValues[detailReportFieldLength]
                });
            } else {
                addReportCheckBox = new CheckBox({
                    name: "TypecheckBox",
                    checked: true,
                    "layerURL": layerURL,
                    value: detailFieldValues[detailReportFieldLength]
                });
            }
            addReportCheckBox.placeAt(this.divCheckBox, "first");
            divDetailReportField = domConstruct.create("div", {
                "class": "esriCTDiv"
            }, this.divCheckBox);
            divDetailReportField.innerHTML = detailFieldValues[detailReportFieldLength];
            self = this;
            self.tempDisplayFields = dojo.clone(self.resultDispalyFields);
            on(addReportCheckBox, "click", function (evt) {
                var st = domAttr.get(this.domNode.lastChild, "aria-checked");
                if (st === "true") {
                    evt.currentTarget.checked = false;
                } else {
                    evt.currentTarget.checked = true;
                }
                if (evt.currentTarget.checked) {
                    if (array.indexOf(self.tempDisplayFields[this.layerURL], evt.currentTarget.value) === -1) {
                        self.tempDisplayFields[this.layerURL].push(evt.currentTarget.value);
                    }
                } else {
                    if (array.indexOf(self.tempDisplayFields[this.layerURL], evt.currentTarget.value) >= 0) {
                        itemIndex = array.indexOf(self.tempDisplayFields[this.layerURL], evt.currentTarget.value);
                        self.tempDisplayFields[this.layerURL].splice(itemIndex, 1);
                    }
                }
            });
        },

        /**
        * hide moving dijit dialog box
        * @class
        * @name widgets/reports/reports
        */
        hideMapTip: function () {
            if (dijit.byId('toolTipDialogues')) {
                dijit.byId('toolTipDialogues').destroy();
            }
        },

        _creatingBuffer: function (geometry, val) {
            topic.publish("createBuffer", params.geometries, val);
        },

        /**
        * add dynamic textbox for entering bearing and distance value
        * @class
        * @name widgets/reports/reports
        */
        _addBearingTextBox: function () {
            var bearingTextBoxContainer, bearingFirstColumn, bearingSecondColumn, bearingThirdColumn, bearingFourthColumn, bearingFifthColumn, distanceUnit,
                inputFirstColumnText, inputSecondClmnTxt, inputThirdClmnTxt, inputFourthClmnTxt, intialLat, initiallong, initialbearing, initialdistance, aoiAttributesIndex;
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
            inputSecondClmnTxt.innerHTML = this.addBearingValue.value;
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
            inputFourthClmnTxt.innerHTML = this.addDistanceMiles.value + " " + dojo.configData.BearingDistanceUnit;
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
                var index;
                aoiAttributesIndex = domAttr.get(evt.currentTarget, "aoiAttributesIndex");
                if (this.AOIAttributes.length > 0) {
                    for (index = 0; index < this.AOIAttributes.length; index++) {
                        if (parseInt(this.AOIAttributes[index].aoiAttributesIndex, 10) === parseInt(aoiAttributesIndex, 10)) {
                            this.AOIAttributes.splice(index, 1);
                            this.polyLine.paths.length = 0;
                            this.aoiPanelScrollbar.rePositionScrollBar();
                            break;
                        }
                    }
                    if (this.AOIAttributes.length === 0) {
                        this.flagMultiplePoints = 0;
                    }
                    dojo.initialCoordinates = false;
                    this._clearAllGraphics();
                    this._updateAOIonMap();
                    dojo.destroy(bearingTextBoxContainer);
                }
            })));

            // use last located point as start point to generate AOI.
            if (this.AOIAttributes.length === 0) {
                initiallong = this.startPointLongitude;
                intialLat = this.startPointLatitude;
            } else {
                this._updateAOIonMap();
                initiallong = this.AOIAttributes[this.AOIAttributes.length - 1].longitude;
                intialLat = this.AOIAttributes[this.AOIAttributes.length - 1].latitude;
            }
            initialbearing = this.addBearingValue.value;
            initialdistance = this.addDistanceMiles.value;
            distanceUnit = dojo.configData.BearingDistanceUnit;
            this.destVincenty(initiallong, intialLat, initialbearing, this._convertDistanceIntoMiles(initialdistance, distanceUnit), false, aoiAttributesIndex);
            this.addBearingValue.value = this.addDistanceMiles.value = "";


            setTimeout(lang.hitch(this, function () {
                this.resizeAOIPanel();
            }), 1000);


        },

        // supported units are feet, meters, miles and kilometers.
        // standard 1 mile = 1.609 kilometers = 5280 feet
        // output distance will be in meters
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

        //calculate destination point given bearing,distance and bearing
        destVincenty: function (lon1, lat1, brng, dist, isRemoved, aoiAttributesIndex) {
            var tmp, lat2, lambda, long2, normalizedVal, polylineSymbol, sinSigma, cosSigma, C, L, geometryCollection = [],
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

            polylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                new Color([parseInt(dojo.configData.AOISymbology.LineSymbolColor.split(",")[0], 10),
                    parseInt(dojo.configData.AOISymbology.LineSymbolColor.split(",")[1], 10),
                    parseInt(dojo.configData.AOISymbology.LineSymbolColor.split(",")[2], 10)
                    ]),
                dojo.configData.AOISymbology.LineSymbolWidth);
            normalizedVal = webMercatorUtils.lngLatToXY(long2, lat2);
            this.mapPoint = new esri.geometry.Point(normalizedVal[0], normalizedVal[1], this.map.spatialReference);
            this.map.setLevel(dojo.configData.ZoomLevel);
            this.map.centerAt(this.mapPoint);
            if (this.flagMultiplePoints === 0) {
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                this.flagMultiplePoints++;
                if (this.AOIAttributes.length === 0) {
                    this.polyLine.addPath([
                        [this.initialPoint.x, this.initialPoint.y]
                    ]);
                    this.polyLine.paths[0].push([this.mapPoint.x, this.mapPoint.y]);
                    dojo.coordinatesPolyLine = true;
                    this.map.getLayer("esriGraphicsLayerMapSettings").add(new Graphic(this.polyLine, polylineSymbol));
                    geometryCollection.push(this.polyLine);
                }
                topic.publish("createBuffer", geometryCollection, null);
            } else {
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                if (this.polyLine && this.polyLine.paths.length > 0) {
                    this.polyLine.paths[0].push([this.mapPoint.x, this.mapPoint.y]);
                } else {
                    this.polyLine.addPath([
                        [this.mapPoint.x, this.mapPoint.y]
                    ]);
                }
                dojo.coordinatesPolyLine = true;
                this.map.getLayer("esriGraphicsLayerMapSettings").add(new Graphic(this.polyLine, polylineSymbol));
                geometryCollection.push(this.polyLine);
                topic.publish("createBuffer", geometryCollection, null);
            }
            // distance is converted into meter so unit will be meter
            this.AOIAttributes.push({
                "longitude": long2,
                "latitude": lat2,
                "bearing": brng,
                "distance": dist,
                "unit": "meters",
                "aoiAttributesIndex": aoiAttributesIndex
            });
        },

        // Validate the numeric text box control
        onlyNumbers: function (evt) {
            var charCode;
            charCode = evt.which || event.keyCode;
            if (charCode > 31 && (charCode < 48 || charCode > 57)) {
                if (charCode === 43 || charCode === 45 || charCode === 46) {
                    return true;
                }
                return false;
            }
            return true;
        },

        //validate dot value
        /**
        * Description
        * @method _validateNumericInputText
        * @return allFieldValid
        */
        _validateNumericInputText: function () {
            var allFieldValid = false,
                BearingValue = this.addBearingValue.value,
                DistanceValue = this.addDistanceMiles.value;
            if ((BearingValue !== "") && (DistanceValue !== "")) {
                if ((!BearingValue.match(/^-?\d+(?:\.\d+)?$/)) && (!DistanceValue.match(/^-?\d+(?:\.\d+)?$/))) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage + " in " + sharedNls.titles.bearingLabel + " and " + sharedNls.titles.distanceLabel);
                } else if ((!BearingValue.match(/^-?\d+(?:\.\d+)?$/)) && (DistanceValue.match(/^-?\d+(?:\.\d+)?$/))) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage + " in " + sharedNls.titles.bearingLabel);
                } else if ((BearingValue.match(/^-?\d+(?:\.\d+)?$/)) && (!DistanceValue.match(/^-?\d+(?:\.\d+)?$/))) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage + " in " + sharedNls.titles.distanceLabel);
                } else {
                    allFieldValid = true;
                    dojo.initialCoordinates = false;
                }
                return allFieldValid;
            }
        },
        //Validate the text box such that mandatory field should not be left empty
        _validateBearingInputText: function () {
            var allFieldValid = false;
            if (lang.trim(this.addLatitudeValue.value) === "" || lang.trim(this.addLatitudeValue.value) < -90 || lang.trim(this.addLatitudeValue.value) > 90) {
                alert(sharedNls.errorMessages.addLatitudeValue);
            } else if (lang.trim(this.addLongitudeValue.value) === "" || lang.trim(this.addLongitudeValue.value) < -180 || lang.trim(this.addLongitudeValue.value) > 180) {
                alert(sharedNls.errorMessages.addLongitudeValue);
            } else if (lang.trim(this.addBearingValue.value) === "" || lang.trim(this.addBearingValue.value) < 0 || lang.trim(this.addBearingValue.value) > 360) {
                alert(sharedNls.errorMessages.addBearingValue);
            } else if (lang.trim(this.addDistanceMiles.value) === "") {
                alert(string.substitute(sharedNls.errorMessages.addDistanceMiles, [dojo.configData.BearingDistanceUnit]));
            } else if (lang.trim(this.addDistanceMiles.value) < 0 || lang.trim(this.addDistanceMiles.value) > dojo.configData.BearingDistanceMaxLimit || parseFloat(this.addDistanceMiles.value) <= 0) {
                alert(string.substitute(sharedNls.errorMessages.distanceMaxLimit, [dojo.configData.BearingDistanceMaxLimit]));
            } else {
                allFieldValid = true;
                dojo.initialCoordinates = false;
            }
            if (this.addLatitudeValue.value !== "" && this.addLongitudeValue.value !== "") {
                this.startPointLatitude = this.addLatitudeValue.value;
                this.startPointLongitude = this.addLongitudeValue.value;
            }
            return allFieldValid;
        },

        _generateFeatureCollection: function (fileName) {
            if (fileName) {
                topic.publish("showProgressIndicator");
                var params, uploadFileUrl, shapefileTOAOIUrl;
                // Set GP service for uploading shapefile
                shapefileTOAOIUrl = dojo.configData.ShapefileTOAOI;
                uploadFileUrl = shapefileTOAOIUrl.substring(0, shapefileTOAOIUrl.lastIndexOf("/") + 1) + "uploads/upload";

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
            } else {
                alert(sharedNls.errorMessages.browseFile);
            }
        },

        errorHandler: function (error) {
            alert(error.message);
            topic.publish("hideProgressIndicator");
        },

        _generateAnalysisFeatureCollection: function (fileName) {
            if (fileName) {
                topic.publish("showProgressIndicator");
                var params, uploadFileUrl, analyseShapefileUrl;
                // Set GP service for uploading analysis
                analyseShapefileUrl = dojo.configData.AnalyseShapefile;
                uploadFileUrl = analyseShapefileUrl.substring(0, analyseShapefileUrl.lastIndexOf("/") + 1) + "uploads/upload";
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
            } else {
                alert(sharedNls.errorMessages.browseFile);
            }
        },

        uploadAnalysisSucceeded: function (response) {
            var gp = new Geoprocessor(dojo.configData.AnalyseShapefile),
                itemID,
                dataFile,
                params,
                anlaysisData;
            itemID = response.item.itemID;
            dataFile = new DataFile();
            dataFile.itemID = itemID;
            this.storeAnalysisShapeFile = dataFile;
            anlaysisData = this.shapeFileForAnalysis;
            params = {
                "Area_of_Interest": anlaysisData,
                "Zip_File_Name": dataFile
            };
            gp.submitJob(params, lang.hitch(this, this.gpAnalysisJobComplete), this.gpAnlysisJobStatus, this.gpAnalysisJobFailed);
        },

        errorAnalysisHandler: function (error) {
            alert(error.message);
            topic.publish("hideProgressIndicator");
        },

        uploadSucceeded: function (response) {
            var gp = new Geoprocessor(dojo.configData.ShapefileTOAOI),
                itemID,
                dataFile,
                bufferDistance,
                params;
            itemID = response.item.itemID;
            dataFile = new DataFile();
            dataFile.itemID = itemID;
            bufferDistance = new LinearUnit();
            bufferDistance.distance = this.sliderDistance;
            bufferDistance.units = this.shapeFileUnitValue;
            params = {
                "Zip_file": dataFile,
                "BufferDistance": bufferDistance
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
            var gp = new Geoprocessor(dojo.configData.ShapefileTOAOI);
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gp.getResultData(jobInfo.jobId, "Output", lang.hitch(this, this._downloadFile));
            }
        },

        gpAnalysisJobComplete: function (jobInfo) {
            var gp = new Geoprocessor(dojo.configData.AnalyseShapefile);
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gp.getResultData(jobInfo.jobId, "SumTable", lang.hitch(this, this._downloadAnalysisFile));
            } else {
                alert(sharedNls.errorMessages.esriJobFailToAnlayse);
                topic.publish("hideProgressIndicator");
            }
        },

        _downloadAnalysisFile: function (SumTable) {
            if (SumTable.value.features.length === 0) {
                alert(sharedNls.errorMessages.noFeaturesInAOI);
                topic.publish("hideProgressIndicator");
                return;
            }
            var fAnalysisInnerArray = [];
            array.forEach(SumTable.value.features, lang.hitch(this, function (item, index) {
                if (index === 0) {
                    fAnalysisInnerArray.push({
                        attr: item.attributes,
                        field: item.attributes.summaryfield
                    });
                } else if (fAnalysisInnerArray[fAnalysisInnerArray.length - 1].field === item.attributes.summaryfield) {
                    fAnalysisInnerArray.push({
                        attr: item.attributes,
                        field: item.attributes.summaryfield
                    });
                } else {
                    this.fAnalysisArray.push(lang.clone(fAnalysisInnerArray));
                    fAnalysisInnerArray.length = 0;
                    fAnalysisInnerArray.push({
                        attr: item.attributes,
                        field: item.attributes.summaryfield
                    });
                }
            }));

            if (this.fAnalysisArray.length === 0 && fAnalysisInnerArray.length === 1) {
                this.fAnalysisArray.push(lang.clone(fAnalysisInnerArray));
            }
            this._displayAnalysisReport(this.fAnalysisArray);
        },

        _displayAnalysisReport: function (shapeAnalysisArray) {
            this.storeShapeAnalysisArray = shapeAnalysisArray;
            this.shapeAreaAnalysisEnable = true;
            this._hideLoadingIndicatorReports();
            var i, j, reportPanelHeight, divFieldTypeContent, uniqueFieldname, uniqueFieldValue,
                displayuniqueFieldValue, divReportLayerSettingPanel;
            if (this.divReportLayerAnalysisPanel) {
                domConstruct.empty(this.divReportLayerAnalysisPanel);
            }

            this.divReportLayerAnalysisPanel = domConstruct.create("div", {
                "class": "esriCTAnalysisReportLayerPanel"
            }, this.reportScrollContent, "first");
            divReportLayerSettingPanel = domConstruct.create("div", {
                "class": "esriCTReportSettingPanel"
            }, this.divReportLayerAnalysisPanel);
            domConstruct.create("div", {
                "class": "esriCTDivReportLayerTitle",
                "innerHTML": "Analyse shape file"
            }, divReportLayerSettingPanel);
            for (i = 0; i < shapeAnalysisArray.length; i++) {
                domConstruct.create("div", {
                    "class": "esriCTReportZoneName",
                    "innerHTML": shapeAnalysisArray[i][0].field
                }, this.divReportLayerAnalysisPanel);
                if (this.initialAnalysisValues === null) {
                    if (shapeAnalysisArray[0][0].attr.area_acres) {
                        this.analysisString = "area";
                        this.geometryTypeAnalysis = "area_acres";
                        this.initialUnit = sharedNls.titles.areaStandardUnit;
                    } else if (shapeAnalysisArray[0][0].attr.length_Km) {
                        this.analysisString = "length";
                        this.geometryTypeAnalysis = "length_Miles";
                        this.initialUnit = sharedNls.titles.lineStandardUnit;
                    } else if (shapeAnalysisArray[0][0].attr.Count) {
                        this.analysisString = "count";
                        this.geometryTypeAnalysis = "Count";
                        this.initialUnit = "";
                    }
                }

                for (j = 0; j < shapeAnalysisArray[i].length; j++) {
                    uniqueFieldname = shapeAnalysisArray[i][j].attr.summaryvalue;
                    uniqueFieldValue = string.substitute("${" + this.geometryTypeAnalysis + "}",
                        shapeAnalysisArray[i][j].attr);
                    if (uniqueFieldValue.indexOf(".") !== -1) {
                        displayuniqueFieldValue = Number(uniqueFieldValue.toString().match(/^\d+(?:\.\d{0,2})?/));
                    } else {
                        displayuniqueFieldValue = uniqueFieldValue;
                    }
                    divFieldTypeContent = domConstruct.create("div", {
                        "class": "esriCTReportZoneList"
                    }, this.divReportLayerAnalysisPanel);
                    domConstruct.create("span", {
                        "class": "esriCTReportZoneField",
                        "innerHTML": uniqueFieldname + " "
                    }, divFieldTypeContent);
                    domConstruct.create("span", {
                        "class": "esriCTReportZoneCount",
                        "innerHTML": ("(" + this.analysisString + " " + " - " + displayuniqueFieldValue + " " + this.initialUnit + " " + ")")
                    }, divFieldTypeContent);
                }
            }
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
            topic.publish("hideProgressIndicator");
        },

        _createAnalysisReportContent: function (featureCollection, featureArrayCollection) {
            this.changeFeatureSetUnit = [];
            this.storeFeatureArrayCollection = featureArrayCollection;
            var count, j, target, divReportLayerSettingPanel, divReportLayerPanel, divReportLayersettingIcon, divFieldTypeContent, title;
            divReportLayerPanel = domConstruct.create("div", {
                "class": "esriCTReportLayerPanel"
            }, this.reportScrollContent);
            divReportLayerSettingPanel = domConstruct.create("div", {
                "class": "esriCTReportSettingPanel"
            }, divReportLayerPanel);
            domConstruct.create("div", {
                "class": "esriCTDivReportLayerTitle",
                "innerHTML": dojo.configData.SearchSettings[featureCollection].SearchDisplayTitle
            }, divReportLayerSettingPanel);
            divReportLayersettingIcon = domConstruct.create("div", {
                "class": "esriCTSettingsIcon",
                "displayTitle": dojo.configData.SearchSettings[featureCollection].SearchDisplayTitle,
                "id": dojo.configData.SearchSettings[featureCollection].QueryLayerId
            }, divReportLayerSettingPanel);

            this.own(on(divReportLayersettingIcon, "click", lang.hitch(this, function (evt) {
                target = evt.currentTarget || evt.srcElement;
                title = domAttr.get(target, "displayTitle");
                this._configureDialogBox(target.id, title);
            })));

            for (count = 0; count < featureArrayCollection.length; count++) {
                domConstruct.create("div", {
                    "class": "esriCTReportZoneName",
                    "innerHTML": featureArrayCollection[count].FieldName
                }, divReportLayerPanel, "last");
                for (j = 0; j < featureArrayCollection[count].attr.length; j++) {
                    this.value = string.substitute("${" + featureArrayCollection[count].FieldName + "}", featureArrayCollection[count].attr[j].attributes);

                    this.StatisticTypeValue = string.substitute("${Total}", featureArrayCollection[count].attr[j].attributes);
                    if (featureArrayCollection[featureCollection].unitType === sharedNls.titles.areaStandardUnit) {
                        this.StatisticTypeValue = parseFloat(this.StatisticTypeValue);
                        this.StatisticTypeValue = (this.StatisticTypeValue * 247.105381);
                    }
                    this.storeFeatureArrayCollection[count].attr[j].attributes.Total = this.StatisticTypeValue;
                    divFieldTypeContent = domConstruct.create("div", {
                        "class": "esriCTReportZoneList"
                    }, divReportLayerPanel);
                    domConstruct.create("span", {
                        "class": "esriCTReportZoneField",
                        "innerHTML": this.value + " "
                    }, divFieldTypeContent);
                    domConstruct.create("span", {
                        "class": "esriCTReportZoneCount",
                        "innerHTML": ("(" + featureArrayCollection[featureCollection].FieldTypeValue + " " + " - " + parseInt(this.StatisticTypeValue, 10) + (featureArrayCollection[featureCollection].unitType === "" ? "" : " ") + featureArrayCollection[featureCollection].unitType + ")")
                    }, divFieldTypeContent);
                }
            }
        },

        _downloadFile: function (output) {
            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            this.map.getLayer("tempBufferLayer").clear();
            var geometryService = new GeometryService(dojo.configData.GeometryService),
                feature = output.value.features[0],
                symbol,
                rendererColor,
                lineColor,
                fillColor,
                graphicObj,
                geometryCollection = [];
            this.shapeFileForAnalysis = output.value;
            this.shapeFilegeometryType = output.value.features[0].geometry.type;
            if (feature && feature.geometry) {
                geometryService.simplify([feature.geometry], lang.hitch(this, function (geometries) {
                    if ((geometries[0] && geometries[0].type === "multipoint") || (geometries[0] && geometries[0].type === "point")) {
                        symbol = new SimpleMarkerSymbol();
                    } else if (geometries[0] && geometries[0].type === "polyline") {
                        symbol = new SimpleLineSymbol();
                    } else {
                        rendererColor = dojo.configData.RendererColor;
                        lineColor = new Color();
                        lineColor.setColor(rendererColor);
                        fillColor = new Color();
                        fillColor.setColor(rendererColor);
                        fillColor.a = 0.25;
                        symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, lineColor, 3), fillColor);
                    }

                    graphicObj = new Graphic(geometries[0], symbol);
                    this.map.getLayer("esriGraphicsLayerMapSettings").add(graphicObj);
                    this.map.setExtent(graphicObj.geometry.getExtent().expand(1.6));
                    geometryCollection.push(feature.geometry);
                    topic.publish("createBuffer", geometryCollection, null);
                    topic.publish("hideProgressIndicator");

                }), lang.hitch(this, function (err) {
                    alert(sharedNls.errorMessages.invalidGeometry);
                }));
            } else {
                alert(sharedNls.errorMessages.noFeaturesFound);
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

        _selectionChangeForUnit: function (value) {
            var resBuilding;
            resBuilding = value;
            if (resBuilding === " Miles") {
                this.getConvertedValue = 1609.34;
                return this.getConvertedValue;
            }
            if (resBuilding === " Feet") {
                this.getConvertedValue = 0.3048;
                return this.getConvertedValue;
            }
            if (resBuilding === " Meters") {
                this.getConvertedValue = 1;
                return this.getConvertedValue;
            }
            if (resBuilding === " Kilometers") {
                this.getConvertedValue = 1000;
                return this.getConvertedValue;
            }
            this.getConvertedValue = 1609.34;
            return this.getConvertedValue;
        },

        _toggleAreaUnit: function () {
            var i;
            if (domStyle.get(this.esriCTchangeStandardUnit, "display") === "block") {
                this.convertedUnitType = "Standard";
                domStyle.set(this.esriCTchangeMetricUnit, "display", "block");
                domStyle.set(this.esriCTchangeStandardUnit, "display", "none");
            } else if (domStyle.get(this.esriCTchangeStandardUnit, "display") === "none") {
                this.convertedUnitType = "Metric";
                domStyle.set(this.esriCTchangeMetricUnit, "display", "none");
                domStyle.set(this.esriCTchangeStandardUnit, "display", "block");
            }

            if (this.queryAllResults) {
                for (i = 0; i < this.queryAllResults.length; i++) {
                    if (this.queryAllResults[i][1].unit.toLowerCase() === sharedNls.titles.areaStandardUnit.toLowerCase()) {
                        this._convertUnit(sharedNls.titles.areaMetricUnit, 0.0040468564300508, i);
                    } else if (this.queryAllResults[i][1].unit.toLowerCase() === sharedNls.titles.areaMetricUnit.toLowerCase()) {
                        this._convertUnit(sharedNls.titles.areaStandardUnit, 247.105381, i);
                    } else if (this.queryAllResults[i][1].unit.toLowerCase() === sharedNls.titles.lineStandardUnit.toLowerCase()) {
                        this._convertUnit(sharedNls.titles.lineMetricUnit, 1.609344497892563, i);
                    } else if (this.queryAllResults[i][1].unit.toLowerCase() === sharedNls.titles.lineMetricUnit.toLowerCase()) {
                        this._convertUnit(sharedNls.titles.lineStandardUnit, 0.621371, i);
                    }
                }
                this._createModifiedReportData();
            }
            if (this.shapeAreaAnalysisEnable) {
                this.initialAnalysisValues = 0;
                this._toggleShapeFileAreaUnit();
            }
        },
        _convertUnit: function (Unit, MultiplyBy, i) {
            var j, valueBeforeUnitChange, valueAfterUnitChange;
            for (j = 0; j < this.queryAllResults[i][1].result.features.length; j++) {
                valueBeforeUnitChange = string.substitute("${Total}", this.queryAllResults[i][1].result.features[j].attributes);
                valueAfterUnitChange = (valueBeforeUnitChange * MultiplyBy);
                this.queryAllResults[i][1].result.features[j].attributes.Total = valueAfterUnitChange;
                this.queryAllResults[i][1].unit = Unit;
            }
        },

        _toggleShapeFileAreaUnit: function () {
            if (this.geometryTypeAnalysis === "area_acres") {
                this.geometryTypeAnalysis = "area_sqkm";
                this.initialUnit = "sq.Km";
            } else if (this.geometryTypeAnalysis === "area_sqkm") {
                this.geometryTypeAnalysis = "area_acres";
                this.initialUnit = "acres";
            } else if (this.geometryTypeAnalysis === "length_Miles") {
                this.geometryTypeAnalysis = "length_Km";
                this.initialUnit = "Km";
            } else if (this.geometryTypeAnalysis === "length_Km") {
                this.geometryTypeAnalysis = "length_Miles";
                this.initialUnit = "miles";
            } else {
                this.geometryTypeAnalysis = "Count";
                this.initialUnit = "";
            }
            this._displayAnalysisReport(this.fAnalysisArray);
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
        //download report in PDF format or data file format
        _downloadReport: function (jsonObject) {
            var gp, params, i, j, k, deferredList, deferredResultDataList, dataTypeReportArray = [];
            if (this.dataFormatType.length === 0 && !this.PDFreportType) {
                alert(sharedNls.errorMessages.reportFormat);
                return;
            }
            if (!this.storeAnalysisShapeFile) {
                this.storeAnalysisShapeFile = "";
            }
            topic.publish("showProgressIndicator");
            params = {
                "Web_Map_as_JSON": JSON.stringify(jsonObject),
                "Report_Type": this.report_type,
                "AOI": this.shapeFileForAnalysis,
                "Include_shapefile_for_analysis": this.storeAnalysisShapeFile,
                "Layer_JSON_for_Detailed_report": JSON.stringify(dojo.configData.LayerJson),
                "Layer_JSON_for_Quick_report": JSON.stringify(this.reportArrayCollection),
                "PDF_Report": this.PDFreportType,
                "Data_Download_Type": "",
                "Report_Units": this.convertedUnitType,
                "PDF_Report_Logo": ""
            };
            for (i = 0; i < this.dataFormatType.length; i++) {
                params.Data_Download_Type = this.dataFormatType[i];
                params.PDF_Report = false;
                gp = new Geoprocessor(dojo.configData.GenerateReport);
                dataTypeReportArray.push(gp.submitJob(params));
            }
            //when only pdf format is selected
            if (this.dataFormatType.length === 0 || this.PDFreportType) {
                params.PDF_Report = this.PDFreportType;
                params.Data_Download_Type = "";
                gp = new Geoprocessor(dojo.configData.GenerateReport);
                dataTypeReportArray.push(gp.submitJob(params));
            }
            deferredList = new DeferredList(dataTypeReportArray);
            deferredList.then(lang.hitch(this, function (result) {
                this.resultDataArray = [];
                for (j = 0; j < result.length; j++) {
                    this.downloadSucceed(result[j][1]);
                }
                deferredResultDataList = new DeferredList(this.resultDataArray);
                deferredResultDataList.then(lang.hitch(this, function (result) {
                    for (k = 0; k < result.length; k++) {
                        if (result[k][1].paramName === "PDF_Report_File") {
                            this._downloadPDFFile(result[k][1]);
                        } else {
                            this._downloadDataFile(result[k][1]);
                        }
                    }
                }), function (err) {
                    alert(err.message);
                    topic.publish("hideProgressIndicator");
                });
            }), function (err) {
                //download report service fails to generate the expected output
                alert(err.message);
                topic.publish("hideProgressIndicator");
            });
        },

        //download report succesfully  generates the url of expected output
        downloadSucceed: function (jobInfo) {
            topic.publish("hideProgressIndicator");
            var gp = new Geoprocessor(dojo.configData.GenerateReport);
            if (jobInfo.jobStatus !== "esriJobFailed") {
                if (this.PDFreportType) {
                    this.resultDataArray.push(gp.getResultData(jobInfo.jobId, "PDF_Report_File"));
                }
                if (this.dataFormatType.length > 0) {
                    this.resultDataArray.push(gp.getResultData(jobInfo.jobId, "Downloaded_data_zip_file"));
                }
            } else {
                alert(sharedNls.errorMessages.esriJobFailToGenerateReport);
                topic.publish("hideProgressIndicator");
            }
        },

        _downloadPDFFile: function (outputFile) {
            window.open(outputFile.value.url);
        },

        _downloadDataFile: function (outputFile) {
            var iframe = document.createElement('iframe');
            iframe.id = 'hiddenReportDownloader';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframe.src = outputFile.value.url;
        },

        _createMapJsonData: function () {
            var printTaskObj = new PrintTask(),
                jsonObject;
            printTaskObj.legendAll = true;
            jsonObject = printTaskObj._getPrintDefinition(this.map);
            if (printTaskObj.allLayerslegend && printTaskObj.allLayerslegend.length > 0) {
                jsonObject.layoutOptions = {};
                jsonObject.layoutOptions.legendOptions = {
                    operationalLayers: printTaskObj.allLayerslegend
                };
            }
            jsonObject.exportOptions = {
                "outputSize": [1366, 412]
            };
            return jsonObject;
        },

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