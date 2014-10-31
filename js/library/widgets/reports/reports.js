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
    "esri/tasks/ProjectParameters",
    "esri/SpatialReference",
    "widgets/locator/locator"

], function (declare, domConstruct, on, topic, lang, array, domStyle, domAttr, dom, query, domClass, domGeom, GeometryService, Dialog, string, html, template, Color, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, TooltipDialog, Place, CheckBox, Button, Graphic, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, GraphicsLayer, Draw, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, RadioButton, ScrollBar, Deferred, DeferredList, Query, QueryTask, esriRequest, dojoJson, Point, dojoString, dojoNumber, Polyline, Geoprocessor, DataFile, SelectList, ParameterValue, LinearUnit, FeatureSet, Print, PrintParameters, PrintTask, ProjectParams, SpatialReference, LocatorTool) {

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
        shapeFileForAnalysis: null,
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
        _previousGraphics: null,
        emailSharingData: null,
        barringArr: [],
        selectFeatureMapPointArr: [],
        _sharingBearingValue: null,
        _sharingBearingDistance: null,
        sharedExecution: false,
        hasAreaStandardUnit: false,
        isCoordinateTab: false,
        shapeFileUploaded: false,

        /**
        * create reports widget
        * @class
        * @name widgets/reports/reports
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
                                domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (document.body.clientWidth + 4) + 'px');
                                domClass.remove(this.logoContainer, "esriCTMapLogo");
                                domClass.add(this.logoContainer, "esriCTMapLogoBottom");
                            }
                        }
                    }
                } else {
                    dojo.setLegnedWidth = false;
                    LegendWidthChange = document.body.clientWidth - parseInt(document.getElementById('esriCTAOIContainer').clientWidth, 10);
                    if (dojo.query('.esriCTdivLegendbox').length > 0) {
                        domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (LegendWidthChange + 2) + 'px');
                    }
                    if (domStyle.get(this.reportContainer, "display") === "block") {
                        this._resetReportTab();
                        this._showAOITab();
                    }
		    //set Default text
                    if (this.placeNameAddressSearch.lastSearchString === "") {
                        topic.publish("setDefaultTextboxValue", this.placeNameAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress);
                    }
                    if (this.drawTabAddressSearch && this.drawTabAddressSearch.lastSearchString === "") {
                        topic.publish("setDefaultTextboxValue", this.drawTabAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIAddress);
                    }
                    if (this.bearingAddressSearch && this.bearingAddressSearch.lastSearchString === "") {
                        topic.publish("setDefaultTextboxValue", this.bearingAddressSearch.txtAddress, "value", dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress);
                    }
                }
                topic.publish("deactivateToolbar");
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

            topic.subscribe("addPushpinOnMap", lang.hitch(this, this.addPushpinOnMap));
            topic.subscribe("resizeAOIPanel", lang.hitch(this, this.resizeAOIPanel));
            topic.subscribe("resizeReportsPanel", lang.hitch(this, this.resizeReportsPanel));
            topic.subscribe("hideMapTip", lang.hitch(this, this.hideMapTip));
            topic.subscribe("createBuffer", lang.hitch(this, this._clearAndCreateBuffer));
            topic.subscribe("setStartPoint", lang.hitch(this, this._setStartPoint));
            topic.subscribe("normalizeStartPoint", lang.hitch(this, this._normalizeStartPoint));
            topic.subscribe("closeDialogBox", lang.hitch(this, this.closeDialogBox));
            topic.subscribe("resizeDialogBox", lang.hitch(this, this._resizeDialogBox));
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

            topic.subscribe("sharedUrlBufferStatus", lang.hitch(this, this._sharedUrlBufferStatus));

            topic.subscribe("fillBearingArr", lang.hitch(this, this._fillBearingArr));

            topic.subscribe("showDrawPanel", lang.hitch(this, this._showDrawPanel));

            topic.subscribe("shareDataThroughEmail", lang.hitch(this, function (emailSharingData) {
                this.emailSharingData = emailSharingData;
            }));

            topic.subscribe("showClearGraphicsIcon", lang.hitch(this, function () {
                domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
            }));



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
                    this.resizeAOIPanel();
                }
            })));
            this.own(on(this.esriCTClearAOIButton, "click", lang.hitch(this, function () {
                var i, BearingTextboxLength = dojo.query('.esriCTBearingTextbox');
                domAttr.set(this.addLatitudeValue, "value", "");
                domAttr.set(this.addLongitudeValue, "value", "");
                dom.byId("fileUploadContainer").value = "";
                dom.byId("analysisFileUploadContainer").value = "";
                dom.byId("fileName").value = "";
                dom.byId("analysisFileName").value = "";
                this.previousAnalysisFileName = "";
                this.previousFileName = "";
                this.shapeFileUploaded = false;
                this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[1].MinimumValue);
                for (i = 0; i < BearingTextboxLength.length; i++) {
                    this._destroyBearingTextBox();
                }
                //disable coordinates tab valus
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
                    this._initializeReportCreation();
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
            this.resizeAOIPanel(500);
            this._createDownloadOption();
            this.own(on(dom.byId("fileUploadContainer"), "change", lang.hitch(this, function (event) {
                if (event.target.value !== "") {
                    var fileName = event.target.value,
                        fileNameArray = fileName.split(".")[0].split("\\");
                    this.name = fileNameArray[fileNameArray.length - 1];
                    dom.byId('fileName').value = this.name;
                }
            })));
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
                if (graphic.attributes.location) {
                    this.addrValue = graphic.name;
                    topic.publish("createBuffer", [this.placeNameAddressSearch.mapPoint], null);
                } else {
                    this._showFeatureResult(graphic);
                }
            });

            //Create webMap_JSON on onclick event of download button
            this.own(on(this.esriCTDownloadButton, "click", lang.hitch(this, function () {
                var webMapJsonData = this._createMapJsonData();
                if (this.shapeFileForAnalysis.features[0].geometry) {
                    webMapJsonData.mapOptions.extent = this.shapeFileForAnalysis.features[0].geometry.getExtent().expand(1.2);
                } else {
                    webMapJsonData.mapOptions.extent = this.shapeFileForAnalysis.features[0].getExtent().expand(1.2);
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
            this.own(on(dom.byId("analysisFileUploadContainer"), "change", lang.hitch(this, function (event) {
                if (event.target.value !== "") {
                    var fileName = event.target.value,
                        fileNameArray = fileName.split(".")[0].split("\\");
                    this.analysisFileName = fileNameArray[fileNameArray.length - 1];
                    dom.byId('analysisFileName').value = this.analysisFileName;
                }
            })));
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
                if (dojo.locateInitialCoordinates && this.isCoordinateTab) {
                    this._locateInitialCoordinatePoint(evt.mapPoint);
                }
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
                            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                            this._selectFeatureGraphic(evt);
                        }
                    }), 500);
                }
            }));
            //map double click  for disable the select Feature function
            this.map.on("dbl-click", lang.hitch(this, function (evt) {
                try {
                    if (dojo.selectFeatureEnabled) {
                        var sd, uv, i, tabName, geomString;
                        sd = this.sliderDistance;
                        uv = this.sliderUnitValue;
                        topic.publish("hideMapTip");
                        this._isDblClick = true;
                        dojo.selectFeatureEnabled = false;
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
                if (dojo.selectFeatureEnabled) {
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

        _sharedUrlDisplayBufferStatus: true,

        _fillBearingArr: function (bearingArrValue) {
            try {
                this.barringArr = [];
                this.barringArr = bearingArrValue.split(",");
            } catch (err) {
                alert(err.message);
            }
        },

        _sharedUrlBufferStatus: function (value) {
            try {
                this._sharedUrlDisplayBufferStatus = value;
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
            if (this._validateLocateValue() && ((lang.trim(this.addLatitudeValue.value) === "" || parseFloat(this.addLatitudeValue.value) <= -90 || parseFloat(this.addLatitudeValue.value) >= 90)) && ((lang.trim(this.addLongitudeValue.value) === "" || parseFloat(this.addLongitudeValue.value) <= -180 || parseFloat(this.addLongitudeValue.value) >= 180))) {
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
        * @memberOf widgets/reports/reports
        */
        _relocateInitialPoint: function () {
            var params, geometryService = new GeometryService(dojo.configData.GeometryService);
            this.mapPoint = new Point({
                "x": this.startPointLongitude,
                "y": this.startPointLatitude,
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
        * normalize and set start point map point of coordinates tab in case of shared url
        * param {object} mapPoint selected start point on map
        * @memberOf widgets/reports/reports
        */
        _normalizeStartPoint: function (mapPoint) {
            var params, latLongPoint, geometryService = new GeometryService(dojo.configData.GeometryService);
            this._coordinatesMapPoint = mapPoint;
            latLongPoint = new Point({
                "x": mapPoint.x,
                "y": mapPoint.y,
                "spatialReference": this.map.spatialReference
            });
            params = new ProjectParams();
            params.geometries = [latLongPoint];
            params.outSR = new SpatialReference({ wkid: 4326 });
            geometryService.project(params, lang.hitch(this, function (geometries) {
                this._setStartPoint(geometries[0]);
            }));
        },

        /**
        * set slider distance unit and value in case of shared url
        * param {object} sd slider distance
        * param {object} uv slider distance unit value
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

        _coordinatesMapPoint: null,
        /**
        * set polyline values iof coordinates tab in case of shared url
        * param {object} polyline polyline data
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
        * param {object} mapPoint point geometry on map
        * @memberOf widgets/reports/reports
        */
        _locateInitialCoordinatePoint: function (mapPoint) {
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
            latLongPoint = new Point({
                "x": mapPoint.x,
                "y": mapPoint.y,
                "spatialReference": this.map.spatialReference
            });
            params = new ProjectParams();
            params.geometries = [latLongPoint];
            params.outSR = new SpatialReference({ wkid: 4326 });
            geometryService.project(params, lang.hitch(this, function (geometries) {
                this._setStartPoint(geometries[0], mapPoint);
            }));
            if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length > 0) {
                try {
                    tabName = dojo.query(".esriCTAOILinkSelect")[0].innerHTML;
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
        * param {object} geometry extent type of geometry
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
        * param {object} sliderVal slider unit value
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
        * param {object} evt map onClick event
        * @memberOf widgets/reports/reports
        */
        _selectFeatureGraphic: function (evt) {
            try {
                var index, deferredListResult, queryGeometry,
                    onMapFeaturArray = [];
                queryGeometry = this._extentFromPoint(evt.mapPoint);
                this.selectFeatureMapPointArr.push(queryGeometry);
                for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                    this._executeQueryTask(index, queryGeometry, onMapFeaturArray);
                }
                deferredListResult = new DeferredList(onMapFeaturArray); //passlist of n no of queries for n no of layers
                deferredListResult.then(lang.hitch(this, this._highlightSelectedFeatures), function (err) {
                    alert(err.message);
                });
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * highlight the Feature result on map
        * param {object} result query result
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
        },

        /**
        * create symbol for selected feature in draw tab
        * param {object} geometryType geometryType of selected feature
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
        * param {object} geometryType geometryType of drawn tool
        * @memberOf widgets/reports/reports
        */
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
        * param {object} index
        * param {object} queryGeometry
        * param {array} onMapFeaturArray
        * @memberOf widgets/reports/reports
        */
        _executeQueryTask: function (index, queryGeometry, onMapFeaturArray) {
            var queryTask, queryParms, queryOnRouteTask;
            queryTask = new esri.tasks.QueryTask(dojo.configData.SearchSettings[index].QueryURL);
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
        * param {object} point selected map point
        * @memberOf widgets/reports/reports
        */
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

        /**
        * create download report select options
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
        * param {normalizedVal} normalized value of map point
        * param {initialPoint} map point
        * @memberOf widgets/reports/reports
        */
        _setStartPoint: function (latLongPoint, initialPoint) {
            if (initialPoint) {
                this.initialPoint = initialPoint;
            }
            this.addLongitudeValue.value = this.startPointLongitude = parseFloat(latLongPoint.x).toFixed(5);
            this.addLatitudeValue.value = this.startPointLatitude = parseFloat(latLongPoint.y).toFixed(5);
            if (this.AOIAttributes.length > 0) {
                this._reDrawCoordinateValues();
            } else {
                this.polyLine = new Polyline(new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
                this._addCoordinatePolyLineValues(initialPoint);
            }
        },

        /**
        * add polyline values of coordinates tab
        * param {initialPoint} map point
        * @memberOf widgets/reports/reports
        */
        _addCoordinatePolyLineValues: function (initialPoint) {
            if (this.polyLine.paths.length === 0) {
                if (initialPoint) {
                    this.polyLine.addPath([
                        [initialPoint.x, initialPoint.y]
                    ]);
                }
            } else if (this.polyLine.paths[0].length > 0) {
                this._updateBearingDistList();
            }
        },

        /**
        * redraw polyline values of coordinates tab
        * @memberOf widgets/reports/reports
        */
        _reDrawCoordinateValues: function () {
            var intialLat, initiallong, AOIAttributesArray, i, j, initialbearing, initialdistance, distanceUnit, aoiAttributesIndex, mapPointsArray = [], deferredList, array;
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
                this.polyLine = new Polyline(new esri.SpatialReference({
                    "wkid": this.map.spatialReference.wkid
                }));
                array = [];
                array.push([this.initialPoint.x, this.initialPoint.y]);
                for (j = 0; j < result.length; j++) {
                    array.push([result[j][1][0].x, result[j][1][0].y]);
                }
                this.polyLine.addPath(array);
                this._updateAOIOnMap();
            }));
        },

        /**
        * update bearing and distance value pair to the list polyline values
        * @memberOf widgets/reports/reports
        */
        _updateBearingDistList: function () {
            var j, intialLat, initiallong, initialbearing, initialdistance, distanceUnit, aoiAttributesIndex, bearingDistDeferred, array;
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
            bearingDistDeferred = this.destVincenty(initiallong, intialLat, initialbearing, this._convertDistanceIntoMiles(initialdistance, distanceUnit), false, aoiAttributesIndex);
            bearingDistDeferred.then(lang.hitch(this, function (bearingDistValue) {
                array = [];
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
            topic.publish("createBuffer", this._getGeometryCollection("esriGraphicsLayerMapSettings"), null);
            this.map.setExtent(this.polyLine.getExtent().expand(1.6));
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
        },

        /**
        * draw the polyline of coordinates tab on map
        * param {object} layerId layer name of the geometry
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
        * @memberOf widgets/reports/reports
        */
        _createSelectionTool: function () {
            var divAreaIntContainer, divSelectionContainer, _self, selectedUnitValue, radioContent, i, radioContentDiv, spanRadioContent, selectFeature;
            divAreaIntContainer = domConstruct.create("div", {
                "class": "esriCTAreaIntContainer",
                "id": "esriCTAreaIntContainer"
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
                this.selectFeatureMapPointArr = [];
                _self.addToMap(evt, _self.sliderUnitValue);
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
                if (this._sharedUrlDisplayBufferStatus) {
                    this._changeSliderValue();
                } else {
                    this._sharedUrlDisplayBufferStatus = true;
                }

            })));

            this.own(on(this.spanSliderValueTextBox, "keyup", lang.hitch(this, function (evt) {
                var changedValue = this._validateInputSpanValue(evt.currentTarget.value);
                if (changedValue !== "" && changedValue <= this._horizontalSlider.maximum) {
                    this._horizontalSlider._setValueAttr(changedValue);
                    this.sliderDistance = changedValue;
                    this._changeSliderValue();
                } else if (changedValue === "" || changedValue > this._horizontalSlider.maximum) {
                    alert(sharedNls.errorMessages.inValideNumericErrorMessage);
                    domAttr.set(this.spanSliderValueTextBox, "value", this.sliderDistance);
                }
            })));

            this.own(on(this.spanSliderValueTextBox, "blur", lang.hitch(this, function () {
                if (this.spanSliderValueTextBox.value === "") {
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
            this._createLinkContainer(divAreaIntContainer);
        },

        /**
        * validate the input value of buffer slider text box
        * param {value} input value of the textbox
        * @memberOf widgets/reports/reports
        */
        _validateInputSpanValue: function (value) {
            var validValue = "";
            if (value.indexOf(".") === -1 || (value.indexOf(".") > -1 && this._validateDecimalCount(value) === 1 && (value.split(".", 2)[1] === "" || value.split(".", 2)[1].length <= 2))) {
                validValue = parseFloat(value);
            }
            return validValue;
        },

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
            var graphics, geometryCollection;
            clearTimeout(this.stagedBuffer);
            this.stagedBuffer = setTimeout(lang.hitch(this, function () {
                try {
                    if (this.map.getLayer("hGraphicLayer") && this.map.getLayer("hGraphicLayer").graphics.length > 0 && !dojo.selectFeatureEnabled) {
                        this._bufferSelectedFeatures();
                    } else {
                        graphics = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0];
                        if (graphics && graphics.geometry) {
                            geometryCollection = [];
                            geometryCollection.push(graphics.geometry);
                            this.featureGeometry = geometryCollection;
                            this.map.getLayer("tempBufferLayer").clear();
                            if (this.sliderDistance !== 0 && this._validateGraphicSource(graphics)) {
                                topic.publish("createBuffer", this.featureGeometry, this.sliderUnitValue);
                            }
                        }
                    }
                    if ((this.map.getLayer("esriGraphicsLayerMapSettings") && this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length === 0) &&
                            (this.map.getLayer("hGraphicLayer") && this.map.getLayer("hGraphicLayer").graphics.length === 0)) {
                        topic.publish("shareDataThroughEmail", null);
                    }
                } catch (err) {
                    alert(err.message);
                }
            }), 500);
        },

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
        * param {object} tab selected AOI tab
        * @memberOf widgets/reports/reports
        */
        _getAddressValue: function (tab) {
            try {
                switch (tab) {
                case "Placename":
                    return dom.byId("txtplaceName").value;
                case "Draw":
                    return dom.byId("txtAOIAddress").value;
                case "Coordinates":
                    return dom.byId("txtAOIBearingAddress").value;
                default:
                    return null;
                }
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * create data for email sharing
        * param {object} geometry selected geometry
        * @memberOf widgets/reports/reports
        */
        _createDataForEmailSharing: function (geometry, showBuffer, locatorAddr) {
            try {
                var style, xmin, xmax, ymin, ymax, bearingArr, geometryType, jsonData, tabName = dojo.query(".esriCTAOILinkSelect")[0].innerHTML,
                    lat = dom.byId("addLatitudeValue").value,
                    long = dom.byId("addLongitudeValue").value,
                    sd = this.sliderDistance,
                    uv = this.sliderUnitValue,
                    x = null,
                    y = null,
                    coordinatex,
                    coordinatey,
                    sourceName,
                    geomString,
                    i,
                    color,
                    outline,
                    size;
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
                    style = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.style;
                    color = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.color.r + "," + this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.color.g + "," + this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.color.b + "," + this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.color.a;
                    if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.outline) {
                        outline = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.outline.color.r + "," + this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.outline.color.g + "," + this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.outline.color.b + "," + this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.outline.color.a + "," + this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.outline.width;
                    }
                    if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.size) {
                        size = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].symbol.size;
                    }
                    if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes) {
                        if (this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes.sourcename) {
                            sourceName = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes.sourcename;
                        }
                    }
                }
                geometryType = null;
                if (dom.byId("reportsHeaderIcon").className.indexOf("esriCTReportsImgSelected") > -1) {
                    geometryType = geometry[0].type;
                } else {
                    geometryType = "locator";
                    tabName = "locator";
                }

                switch (geometryType) {
                case "locator":
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + locatorAddr + "$" + "X:" + x + "$" + "Y:" + y + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "DT:" + this._isDrawTab + "$" + "SB:" + false;
                    break;
                case "polygon":
                    jsonData = JSON.stringify(geometry[0].rings);
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "STYLE:" + style + "$" + "GEOM:" + jsonData + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "polygon" + "$" + "COLOR:" + color + "$" + "OUTLINE:" + outline;
                    break;
                case "polyline":
                    jsonData = JSON.stringify(geometry[0].paths);
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "BEARING:" + bearingArr + "$" + "LAT:" + lat + "$" + "LONG:" + long + "$" + "GEOM:" + jsonData + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "polyline" + "$" + "CX:" + coordinatex + "$" + "CY:" + coordinatey;
                    break;
                case "extent":
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "XMIN:" + xmin + "$" + "YMIN:" + ymin + "$" + "XMAX:" + xmax + "$" + "YMAX:" + ymax + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "extent";
                    break;
                case "point":
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "STYLE:" + style + "$" + "LAT:" + lat + "$" + "LONG:" + long + "$" + "BEARING:" + bearingArr + "$" + "X:" + x + "$" + "Y:" + y + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "point" + "$" + "SB:" + showBuffer + "$" + "SN:" + sourceName + "$" + "COLOR:" + color + "$" + "OUTLINE:" + outline + "$" + "SIZE:" + size;
                    break;
                case "multipoint":
                    jsonData = JSON.stringify(geometry[0].points);
                    this.emailSharingData = "TAB:" + tabName + "$" + "ADDR:" + this.addrValue + "$" + "GEOM:" + jsonData + "$" + "SD:" + sd + "$" + "UV:" + uv + "$" + "GeomType:" + "multipoint";
                    break;
                }

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
        * param {array} list of slider attributes
        * @memberOf widgets/reports/reports
        */
        _getSliderValue: function (value) {
            var index, startIndexUnitValue, endIndexUnitValue, actualUnitValue, startIndexSliderDistance, endIndexSliderDistance, actualSliderDistance;
            array.forEach(query(".esriCTRadioBtnContent"), function (item) {
                if (domClass.contains(item, "esriCTSelectedDistanceUnit")) {
                    domClass.remove(item, "esriCTSelectedDistanceUnit");
                }
            });
            domClass.add(value.target, "esriCTSelectedDistanceUnit");
            index = Number(domAttr.get(value.target, "index"));
            this.sliderUnitValue = this._sliderStartEndValue(value.target.innerHTML, this._horizontalSlider, index, true);
            if (this.emailSharingData) {
                startIndexSliderDistance = this.emailSharingData.indexOf("SD:");
                endIndexSliderDistance = this.emailSharingData.indexOf("$", startIndexSliderDistance);
                actualSliderDistance = this.emailSharingData.slice(startIndexSliderDistance + 3, endIndexSliderDistance);
                this.emailSharingData = this.emailSharingData.replace(actualSliderDistance, 0);
                startIndexUnitValue = this.emailSharingData.indexOf("UV:");
                endIndexUnitValue = this.emailSharingData.indexOf("$", startIndexUnitValue);
                actualUnitValue = this.emailSharingData.slice(startIndexUnitValue + 3, endIndexUnitValue);
                this.emailSharingData = this.emailSharingData.replace(actualUnitValue, this.sliderUnitValue);
                topic.publish("shareDataThroughEmail", this.emailSharingData);
            }
        },

        _searchAddressSelected: function () {
            this._clearAllGraphics();
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "block");
        },

        /**
        * Clears all graphics
        * @memberOf widgets/reports/reports
        */
        _clearAllGraphics: function () {
            this._clearAllLayerGraphics();
            domStyle.set(dojo.query('.esriCTClearAOIButton')[0], "display", "none");
            this.selectFeatureMapPointArr = [];
            this._layerNameArray = [];
            this.resultDispalyFields = [];
            this.emailSharingData = null;
            topic.publish("shareDataThroughEmail", this.emailSharingData);
        },

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
        },
        /**
        * Shows SelectedLinkContainer and hide all other containers
        * param {dom} current selected AOi link container DOM
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
        * param {dom} divAreaIntContainer
        * @memberOf widgets/reports/reports
        */
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
                    //disable coordinates tab flags
                    dojo.locateInitialCoordinates = false;
                    this.isCoordinateTab = false;
                    this.addBearingValue.value = "";
                    this.addDistanceMiles.value = "";
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkplaceName"), "esriCTAOILinkSelect");
                    //clear upload file url
                    dom.byId("fileUploadContainer").value = "";
                    dom.byId('fileName').value = "";
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.placeNameSearch);
                    domStyle.set(divAreaIntContainer, "display", "none");
                    if (this.placeNameAddressSearch.lastSearchString === "") {
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
                var locatorParams;
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
                    //disable coordinates tab flags
                    dojo.locateInitialCoordinates = false;
                    this.isCoordinateTab = false;
                    this.addBearingValue.value = "";
                    this.addDistanceMiles.value = "";
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkDrawTool"), "esriCTAOILinkSelect");
                    //clear upload file url
                    dom.byId("fileUploadContainer").value = "";
                    dom.byId('fileName').value = "";
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.divAOIAddressContent);
                    domStyle.set(dom.byId("esriCTAreaIntContainer"), "display", "block");
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
                }
                this.settingsDialog.hide();
            } catch (err) {
                alert(err.message);
            }
        },

        _setSelectedPoint: function (locator, isCoordinateTab, graphic) {
            var latLongPoint, geometryService, params;
            this.resizeAOIPanel();
            this.addrValue = graphic.name;
            this.isCoordinateTab = isCoordinateTab;
            if (graphic.attributes.location) {
                locator.selectedGraphic.attributes.sourcename = "aOISearch";
                if (this.isCoordinateTab) {
                    dojo.locateInitialCoordinates = false;
                    geometryService = new GeometryService(dojo.configData.GeometryService);
                    latLongPoint = new Point({
                        "x": locator.mapPoint.x,
                        "y": locator.mapPoint.y,
                        "spatialReference": this.map.spatialReference
                    });
                    params = new ProjectParams();
                    params.geometries = [latLongPoint];
                    params.outSR = new SpatialReference({ wkid: 4326 });
                    geometryService.project(params, lang.hitch(locator, function (geometries) {
                        topic.publish("setStartPoint", geometries[0], locator.mapPoint);
                    }));
                }
            } else {
                this._showFeatureResult(graphic);
            }
        },

        _showFeatureResult: function (graphic) {
            var latLongPoint, highlightSymbol, highlightGraphic, geometryService, params;
            this._clearAllLayerGraphics();
            if (graphic.geometry.type === "point") {
                this.map.centerAt(graphic.geometry);
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
                highlightGraphic = new Graphic(graphic.geometry, highlightSymbol);
                this.map.getLayer("esriGraphicsLayerMapSettings").add(highlightGraphic);
                if (this.isCoordinateTab) {
                    geometryService = new GeometryService(dojo.configData.GeometryService);
                    latLongPoint = new Point({
                        "x": graphic.geometry.x,
                        "y": graphic.geometry.y,
                        "spatialReference": this.map.spatialReference
                    });
                    params = new ProjectParams();
                    params.geometries = [latLongPoint];
                    params.outSR = new SpatialReference({ wkid: 4326 });
                    geometryService.project(params, lang.hitch(this, function (geometries) {
                        topic.publish("setStartPoint", geometries[0], graphic.geometry);
                    }));
                } else if (!this._isDrawTab) {
                    topic.publish("createBuffer", [graphic.geometry], null);
                }
            } else {
                this.addLongitudeValue.value = "";
                this.addLatitudeValue.value = "";
                this.map.setExtent(graphic.geometry.getExtent());
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
                highlightGraphic = new Graphic(graphic.geometry, highlightSymbol);
                this.map.getLayer("esriGraphicsLayerMapSettings").add(highlightGraphic);
                if (!this._isDrawTab && !this.isCoordinateTab) {
                    topic.publish("createBuffer", [graphic.geometry], null);
                }
            }
            if (!highlightGraphic.attributes) {
                highlightGraphic.attributes = {};
            }
            highlightGraphic.attributes.sourcename = "aOISearch";
            this._createDataForEmailSharing([highlightGraphic.geometry], false, null);
            topic.publish("hideProgressIndicator");
        },

        /**
        * This function is used to show coordinates panel
        * param {dom} rePositionScrollBar
        * @memberOf widgets/reports/reports
        */
        _showCoordinatesPanel: function (rePositionScrollBar) {
            try {
                var locatorParams;
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
                    dojo.locateInitialCoordinates = false;
                    this.isCoordinateTab = true;
                    //Clear previous link and select new Link
                    domClass.remove(dojo.query(".esriCTAOILinkSelect")[0], "esriCTAOILinkSelect");
                    domClass.add(dom.byId("divLinkCoordinates"), "esriCTAOILinkSelect");
                    domConstruct.place(this.divBearingContainer, this.divBufferDistance, "before");
                    //clear upload file url
                    dom.byId("fileUploadContainer").value = "";
                    dom.byId('fileName').value = "";
                    //Hide previous div and show new div
                    this._showSelectedLinkContainer(this.divBearingContainer);
                    domStyle.set(dom.byId("esriCTAreaIntContainer"), "display", "none");
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
        * param {string} type of distance unit
        * param {array} list of horizontal slider attributes
        * param {number} current index of slider
        * param {boolean} check radio butoon is clicked
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
                this._horizontalSlider.setValue(dojo.configData.DistanceUnitSettings[index].MinimumValue);
            }
            domAttr.set(this.spanSliderUnitValue, "innerHTML", selectedUnitValue);
            return this.sliderUnitValue;
        },
        /**
        * activate draw tool
        * param {number} id of the tool bar
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
        * draw a polygon on the map
        * param {object} object of the current event
        * @memberOf widgets/reports/reports
        */
        addToMap: function (evt) {
            var symbol, graphic, graphicGeometry, geometryCollection = [];
            this._clearAllLayerGraphics();
            this.deactivateToolbar();
            graphicGeometry = evt.geometry.type === "extent" ? this._createPolygonFromExtent(evt.geometry) : evt.geometry;
            symbol = this._createFeatureSymbol(graphicGeometry.type);
            graphic = new Graphic(graphicGeometry, symbol);
            this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
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
        * @memberOf widgets/reports/reports
        */
        _clearAndCreateBuffer: function (geometry) {
            this.map.getLayer("tempBufferLayer").clear();
            this._createBuffer(geometry);
        },
        /**
        * create buffer
        * param {object} geometry for creating buffer
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
            this._createDataForEmailSharing(geometryCollection, true, null);
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
        * param {object} geometry for showing buffer
        * @memberOf widgets/reports/reports
        */
        showBuffer: function (bufferedGeometries) {
            var symbol, graphic, parameterValue;
            symbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.LineSymbolTransparency.split(",")[0], 10)]), 2), new Color([parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.FillSymbolTransparency.split(",")[0], 10)]));
            array.forEach(bufferedGeometries, function (geometry) {
                parameterValue = new ParameterValue();
                parameterValue.dataType = "GPFeatureRecordSetLayer";
                graphic = new Graphic(geometry, symbol);
                if (!this.isCoordinateTab) {
                    this.map.getLayer("tempBufferLayer").clear();
                    this.map.getLayer("tempBufferLayer").add(graphic);
                    this.map.setExtent(graphic.geometry.getExtent().expand(1.6));
                } else if (this.polyLine && this.polyLine.paths[0].length > 1) {
                    //show buffer only when bearing and distance values are available in coordinates tab
                    this.map.getLayer("tempBufferLayer").clear();
                    this.map.getLayer("tempBufferLayer").add(graphic);
                    this.map.setExtent(graphic.geometry.getExtent().expand(1.6));
                }
            }, this);
        },
        /**
        * get operational layer information
        * param {object} geometry of the created buffer
        * @name widgets/reports/reports
        */
        _queryLayers: function (geometry) {
            var _self = this,
                index,
                i,
                j,
                k,
                requestHandle,
                deferredListFeature,
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
                                if (featureResult[j][1].geometryType === "esriGeometryPolyline") {
                                    statisticType = "SUM";
                                    statisticTypeValue = "length";
                                    reportFields = dojo.configData.SearchSettings[j].QuickSummaryReportFields;
                                    reportFieldsCount = reportFields.length;
                                    layerName = featureResult[j][1].name;
                                    for (count = 0; count < reportFieldsCount; count++) {
                                        reportFieldName = reportFields[count];
                                        staticFieldName = dojo.configData.SearchSettings[j].SummaryStatisticField;
                                        statisticFieldsInfo.push(this._executeQueryTaskPointReport(j, geometry, statisticType, reportFieldName, staticFieldName, statisticTypeValue, sharedNls.titles.lengthStandardUnit, layerName));
                                    }
                                }
                            } else {
                                reportFields = dojo.configData.SearchSettings[j].QuickSummaryReportFields;
                                reportFieldsCount = reportFields.length;
                                for (count = 0; count < reportFieldsCount; count++) {
                                    this._unQueriedLayers.push({ index: statisticFieldsInfo.length + this._unQueriedLayers.length, data: [true, { layerName: dojo.configData.SearchSettings[j].SearchDisplayTitle, result: { features: []}}] });
                                    this._layerNameArray.push(dojo.configData.SearchSettings[j].SearchDisplayTitle);
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
                }
            }), function (err) {
                alert(err.message);
            });
        },

        _mergeResults: function () {
            var i;
            for (i = 0; i < this._unQueriedLayers.length; i++) {
                this.queryAllResults.splice(this._unQueriedLayers[i].index, 0, this._unQueriedLayers[i].data);
            }
        },

        /**
        * get configured operational layers information
        * param {object} selected field
        * @name widgets/reports/reports
        */
        requestSucceeded: function (response) {
            var deferred = new Deferred();
            deferred.resolve(response);
        },

        /**
        * failed to get layers information
        * param {object} error
        * @name widgets/reports/reports
        */
        requestFailed: function (error) {
            alert(error.message);
        },
        /**
        * create report for the selected AOI
        * @class
        * @name widgets/reports/reports
        */
        _createReport: function () {
            var i, j, k, z, fieldValuesArray, layerNameIndex;
            this.featureArrayCollection.length = 0;

            for (j = 0; j < dojo.configData.SearchSettings.length; j++) {
                this.featureArrayCollection.push({
                    layerName: dojo.configData.SearchSettings[j].SearchDisplayTitle,
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
                        this.featureArrayCollection[layerNameIndex].reportFields.push({
                            name: this.queryAllResults[i][1].reportFieldName,
                            fieldValues: fieldValuesArray
                        });
                    }

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
        * @name widgets/reports/reports
        */
        _createModifiedReportData: function () {
            var i, j, k, m, x, layerNameIndex, fieldValuesArray, featureArrayCollection = [];
            //reset standard unit display
            this.hasAreaStandardUnit = false;
            for (i = 0; i < this.featureArrayCollection.length; i++) {
                for (x in this.resultDispalyFields) {
                    if (this.resultDispalyFields.hasOwnProperty(x)) {
                        layerNameIndex = this._validateFeatureArrayLayerName(i, featureArrayCollection);
                        if (layerNameIndex === -1) {
                            featureArrayCollection.push({
                                layerName: this.featureArrayCollection[i].layerName,
                                statisticsTypeValue: this.featureArrayCollection[i].statisticsTypeValue,
                                reportFields: []
                            });
                            layerNameIndex = featureArrayCollection.length - 1;
                        }

                        for (j = 0; j < this.resultDispalyFields[x].length; j++) {
                            for (k = 0; k < this.featureArrayCollection[i].reportFields.length; k++) {
                                if (this.featureArrayCollection[i].reportFields[k].name === this.resultDispalyFields[x][j]) {
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
        * populate an array of values of a report field
        * param {object} reportField report field
        * param {array} fieldValuesArray array which needs to be populated with values of field
        * @name widgets/reports/reports
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
        * param {index} index index of layer
        * param {array} array featureArrayCollection
        * @name widgets/reports/reports
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
        * param {index} index index of layer
        * param {array} array featureArrayCollection
        * @name widgets/reports/reports
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
        * param {object} selected featureset inside the buffered geometry
        * param {dom} reportDialog
        * @name widgets/reports/reports
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
        * param {number} index for the selected feature
        * param {array} selected featureset inside the buffered geometry
        * param {flag} createReport flag
        * param {dom} reportDialog
        * @class
        * @name widgets/reports/reports
        */
        _createReportPanelContent: function (index, layerResult, createReport) {
            var divnoDataAvailable, i, j, divReportLayerSettingPanel, divReportLayerPanel, divReportLayersettingIcon, divFieldTypeContent, resultValue, resultUnit, title, target;
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
                    //when layer has no reportfields
                    domAttr.set(divnoDataAvailable, "innerHTML", sharedNls.errorMessages.invalidSearch);
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
                    domConstruct.create("div", {
                        "class": "esriCTReportZoneName",
                        "innerHTML": layerResult.reportFields[i].name
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
                            "innerHTML": ("(" + layerResult.statisticsTypeValue + " " + " - " + dojoNumber.format(parseFloat(resultValue)) + resultUnit + ")")
                        }, divFieldTypeContent);
                    }
                }

            }
            if (this.hasAreaStandardUnit) {
                domStyle.set(this.divChangeUnit, "display", "block");
            }
        },

        /**
        * create layer_JSON_for_Quick_report
        * @class
        * @name widgets/reports/reports
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
                this.convertedUnitType = summaryUnits;
            }
            this.reportArrayCollection = reportJsonArray;
        },

        /**
        * create dialog box for detailed summary report
        * param {string} selected field
        * param {string} selected field title
        * @class
        * @name widgets/reports/reports
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
            this._layerNameArray.push(dojo.configData.SearchSettings[index].SearchDisplayTitle);
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
        * @name widgets/reports/reports
        */
        resizeAOIPanel: function (duration) {
            var aoiPanelHeight;
            aoiPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]).h - (dojo.coords(dojo.query(".esriCTRightPanel")[0]).h + dojo.coords(dojo.query(".esriCTLinkContainer")[0]).h) - 20 + "px";
            domStyle.set(this.areaOfInterestContainer, "height", aoiPanelHeight);
            if (duration) {
                setTimeout(lang.hitch(this, function () {
                    this._createAOIPanelScrollBar();
                }), duration);
            } else {
                this._createAOIPanelScrollBar();
            }
        },

        _createAOIPanelScrollBar: function () {
            if (this.aoiPanelScrollbar) {
                domClass.add(this.aoiPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.aoiPanelScrollbar.removeScrollBar();
            }
            this.aoiPanelScrollbar = new ScrollBar({
                domNode: this.areaOfInterestContainer
            });
            this.aoiPanelScrollbar.setContent(this.areaOfInterestContent);
            this.aoiPanelScrollbar.createScrollBar();
        },
        /**
        * resize reports panel
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
        * @name widgets/reports/reports
        */
        _showLoadingIndicatorReports: function () {
            domStyle.set(this.reportsLoader, "display", "block");
        },

        /**
        * hide loading indicator for report panel
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

        _selectSharedFeatures: function (pointExtent) {
            var index, deferredListResult,
                onMapFeaturArray = [];
            this.selectFeatureMapPointArr = [];
            this.sharedExecution = true;
            this.selectFeatureMapPointArr.push(pointExtent);
            for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                this._executeQueryTask(index, pointExtent, onMapFeaturArray);
            }
            this.sharedExecution = false;
            try {
                deferredListResult = new DeferredList(onMapFeaturArray); //passlist of n no of queries for n no of layers
                deferredListResult.then(lang.hitch(this, this._highlightSelectedFeatures), function (err) {
                    alert(err.message);
                });
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * create report tab checkbox
        * @name widgets/reports/reports
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
        * @name widgets/reports/reports
        */
        hideMapTip: function () {
            if (dijit.byId('toolTipDialogues')) {
                dijit.byId('toolTipDialogues').destroy();
            }
        },

        /**
        * add dynamic textbox for entering bearing and distance value
        * @class
        * @name widgets/reports/reports
        */
        _addBearingTextBox: function (value, clearValue) {
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

        /**
        * get current index of object from AOIAttributes array
        * @class
        * @name widgets/reports/reports
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
        * @class
        * @name widgets/reports/reports
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
                "x": long2,
                "y": lat2,
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
        * @class
        * @name widgets/reports/reports
        */
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

        /**
        * validate input textBox values for only numeric inputs and dot values
        * @class
        * @name widgets/reports/reports
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
        * @class
        * @name widgets/reports/reports
        */
        _validateBearingInputText: function () {
            var allFieldValid = false;
            if (lang.trim(this.addLatitudeValue.value) === "" || parseFloat(this.addLatitudeValue.value) <= -90 || parseFloat(this.addLatitudeValue.value) >= 90) {
                alert(sharedNls.errorMessages.addLatitudeValue);
            } else if (lang.trim(this.addLongitudeValue.value) === "" || parseFloat(this.addLongitudeValue.value) <= -180 || parseFloat(this.addLongitudeValue.value) >= 180) {
                alert(sharedNls.errorMessages.addLongitudeValue);
            } else if (lang.trim(this.addBearingValue.value) === "" || parseFloat(this.addBearingValue.value) <= 0 || parseFloat(this.addBearingValue.value) > 360) {
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
        * param {string} uploaded shapefile name
        * @class
        * @name widgets/reports/reports
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
        * param {string} uploaded shapefile name
        * @class
        * @name widgets/reports/reports
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
        * param {object} repsonse
        * @class
        * @name widgets/reports/reports
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
                "Area_of_Interest": this.shapeFileForAnalysis,
                "Zip_File_URL": this.storeAnalysisShapeFile
            };
            gp.submitJob(params, lang.hitch(this, this.gpAnalysisJobComplete), this.gpAnlysisJobStatus, this.gpAnalysisJobFailed);
        },
        errorAnalysisHandler: function (error) {
            alert(error.message);
            topic.publish("hideProgressIndicator");
        },
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
                gp.getResultData(jobInfo.jobId, "Output_AOI", lang.hitch(this, this._downloadFile));
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

        _downloadAnalysisFile: function (SumTable) {
            var elementsTobeRemoved, statisticType = "Count";
            if (SumTable.value.features.length === 0) {
                alert(sharedNls.errorMessages.noFeaturesInAOI);
                if (this.shapeFileUploaded) {
                    this.shapeFileUploaded = false;
                    this.storeAnalysisShapeFile = "";
                    this._previousShapeFile = null;
                    this.featureArrayCollection.splice(0, 1);
                    this._layerNameArray.splice(0, 1);
                    this.resultDispalyFields.splice(0, 1);
                    this._createModifiedReportData();
                }
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

        _previousShapeFile: null,
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

        _createAnalysisReportFieldValues: function (item) {
            var fieldIndex, standardResults, metricResults, fieldValuesArray = [];
            if (item.attributes.area_acres) {
                standardResults = {
                    value: item.attributes.area_acres,
                    unit: sharedNls.titles.areaStandardUnit
                };
                metricResults = {
                    value: item.attributes.area_sqkm,
                    unit: sharedNls.titles.areaMetricUnit
                };
            } else if (item.attributes.length_Miles) {
                standardResults = {
                    value: item.attributes.length_Miles,
                    unit: sharedNls.titles.lengthStandardUnit
                };
                metricResults = {
                    value: item.attributes.length_Km,
                    unit: sharedNls.titles.lengthMetricUnit
                };
            } else {
                //statistics type is COUNT
                standardResults = {
                    value: item.attributes.Count,
                    unit: ""
                };
                metricResults = {
                    value: item.attributes.Count,
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

        _downloadFile: function (output) {
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
                    // this.shapeFileForAnalysis = output.value;
                    this.shapeFilegeometryType = output.value.features[0].geometry.type;
                } else {
                    feature = {};
                    feature.geometry = output;
                }

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
                        topic.publish("hideProgressIndicator");
                    }));
                } else {
                    alert(sharedNls.errorMessages.noFeaturesFound);
                    topic.publish("hideProgressIndicator");
                }
            } catch (err) {
                alert(err.message);
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
        * @name widgets/reports/reports
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
        * param {object} jsonObject webMapJSON object for download
        * @name widgets/reports/reports
        */
        _downloadReport: function (jsonObject) {
            var gp, params, i, j, layersArray = [];
            this.downloadWindow = window.open('', "_blank");
            topic.publish("showProgressIndicator");
            params = {
                "Web_Map_as_JSON": JSON.stringify(jsonObject),
                "Report_Type": this.report_type,
                "AOI": this.shapeFileForAnalysis,
                "Report_Units": this.convertedUnitType,
                "Logo_URL": ""
            };
            if (this.report_type === "Detailed") {
                this._initiateDetailedReport(params);
            } else {
                params.Quickreport_Data = JSON.stringify(this.reportArrayCollection);
                gp = new Geoprocessor(dojo.configData.ReportDownloadSettings.GPServiceURL);
                gp.submitJob(params, lang.hitch(this, this._gpPDFSubmitJobComplete));
            }
            if (this.dataFormatType.length > 0) {
                for (j = 0; j < this.reportArrayCollection.length; j++) {
                    layersArray.push(this.reportArrayCollection[j].layerName);
                }
                for (i = 0; i < this.dataFormatType.length; i++) {
                    if (domAttr.get(this.dataFormatType[i], "format") === "Excel") {
                        params = {
                            "Layers_to_Clip": layersArray,
                            "Area_Of_Interest": this.shapeFileForAnalysis
                        };
                        gp = new Geoprocessor(domAttr.get(this.dataFormatType[i], "serviceURL"));
                        gp.submitJob(params, lang.hitch(this, this._gpSubmitJobComplete, domAttr.get(this.dataFormatType[i], "serviceURL"), "OutputZipFile"));
                    }
                    if (domAttr.get(this.dataFormatType[i], "format") === "Shapefile - SHP - .shp" || domAttr.get(this.dataFormatType[i], "format") === "File Geodatabase - GDB - .gdb") {
                        params = {
                            "Layers_to_Clip": layersArray,
                            "Area_Of_Interest": this.shapeFileForAnalysis,
                            "Feature_Format": domAttr.get(this.dataFormatType[i], "format")
                        };
                        gp = new Geoprocessor(domAttr.get(this.dataFormatType[i], "serviceURL"));
                        gp.submitJob(params, lang.hitch(this, this._gpSubmitJobComplete, domAttr.get(this.dataFormatType[i], "serviceURL"), "Output_Zip_File"));
                    }
                }
            }
        },

        /**
        * create PDF detailed summary report
        * param {object} params parameters for GP servcie
        * @name widgets/reports/reports
        */
        _initiateDetailedReport: function (params) {
            var index, k, gp, layerName, deferredList, requestHandle, layerFields = {}, layerNameArray = [];
            params.Report_Units = this.convertedUnitType === "" ? "Standard" : this.convertedUnitType;
            for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                requestHandle = esriRequest({
                    "url": dojo.configData.SearchSettings[index].QueryURL,
                    "content": {
                        "f": "json"
                    }
                });
                layerNameArray.push(requestHandle);
            }
            deferredList = new DeferredList(layerNameArray);
            deferredList.then(lang.hitch(this, function (response) {
                for (k = 0; k < dojo.configData.SearchSettings.length; k++) {
                    layerName = response[k][1].name;
                    layerFields[layerName] = dojo.configData.SearchSettings[k].DetailSummaryReportFields;
                    params.Report_Fields = JSON.stringify(layerFields);
                    if (this.storeAnalysisShapeFile) {
                        params.Shapefile_Analysis = this.storeAnalysisShapeFile;
                    }
                }
                gp = new Geoprocessor(dojo.configData.ReportDownloadSettings.GPServiceURL);
                gp.submitJob(params, lang.hitch(this, this._gpPDFSubmitJobComplete));
            }));
        },

        _gpSubmitJobComplete: function (serviceURL, outputParam, jobInfo) {
            var gp = new Geoprocessor(serviceURL);
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gp.getResultData(jobInfo.jobId, outputParam, lang.hitch(this, this._gpGetResultJobComplete));
            } else {
                alert(sharedNls.errorMessages.esriJobFailToGenerateReport);
                topic.publish("hideProgressIndicator");
            }
        },

        _gpPDFSubmitJobComplete: function (jobInfo) {
            var gp = new Geoprocessor(dojo.configData.ReportDownloadSettings.GPServiceURL);
            if (jobInfo.jobStatus !== "esriJobFailed") {
                gp.getResultData(jobInfo.jobId, "Output_PDF", lang.hitch(this, this._gpPDFGetResultJobComplete));
            } else {
                alert(sharedNls.errorMessages.esriJobFailToGenerateReport);
                topic.publish("hideProgressIndicator");
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
        * param {url} outputFileUrl file url for download
        * @name widgets/reports/reports
        */
        _downloadPDFFile: function (outputFileUrl) {
            this.downloadWindow.location = outputFileUrl;
            topic.publish("hideProgressIndicator");
        },

        /**
        * download report format file
        * param {url} outputFileUrl file url for download
        * @name widgets/reports/reports
        */
        _downloadDataFile: function (outputFileUrl) {
            var iframe = document.createElement('iframe');
            iframe.id = 'hiddenReportDownloader';
            iframe.style.display = 'none';
            document.body.appendChild(iframe);
            iframe.src = outputFileUrl;
            topic.publish("hideProgressIndicator");
        },

        /**
        * create JSON data for download report
        * @name widgets/reports/reports
        */
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

        /**
        * initialize report creation data
        * @name widgets/reports/reports
        */
        _initializeReportCreation: function () {
            var bufferedGraphics,
                geometryService = new GeometryService(dojo.configData.GeometryService);
            if (this._previousGraphics && this._validatePreviousGraphic()) {
                this._showReportsTab();
                if (this.hasAreaStandardUnit) {
                    domStyle.set(this.divChangeUnit, "display", "block");
                }
                topic.publish("resizeReportsPanel");
                return;
            }
            if (this.map.getLayer("tempBufferLayer") && this.map.getLayer("tempBufferLayer").graphics.length > 0) {
                this._previousGraphics = this.map.getLayer("tempBufferLayer").graphics[0];
                bufferedGraphics = this._getGeometryCollection("tempBufferLayer");
                this._showReportsTab();
                this._resetReportTab();
                this._queryLayers(bufferedGraphics[0]);
                this._createDownloadAOI(bufferedGraphics[0]);
                topic.publish("resizeReportsPanel");
            } else if (this.map.getLayer("hGraphicLayer") && this.map.getLayer("hGraphicLayer").graphics.length > 0) {
                if (this._validateQueryGeometries("hGraphicLayer")) {
                    this._previousGraphics = this.map.getLayer("hGraphicLayer").graphics[0];
                    bufferedGraphics = this._getGeometryCollection("hGraphicLayer");
                    this._showReportsTab();
                    this._resetReportTab();
                    geometryService.union(bufferedGraphics, lang.hitch(this, function (unionGeometry) {
                        this._queryLayers(unionGeometry);
                        this._createDownloadAOI(unionGeometry);
                    }));
                    topic.publish("resizeReportsPanel");
                } else {
                    alert(sharedNls.errorMessages.bufferSliderValue);
                }
            } else if (this.map.getLayer("esriGraphicsLayerMapSettings") && this.map.getLayer("esriGraphicsLayerMapSettings").graphics.length > 0) {
                if (this._validateQueryGeometries("esriGraphicsLayerMapSettings")) {
                    this._previousGraphics = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0];
                    bufferedGraphics = this._getGeometryCollection("esriGraphicsLayerMapSettings");
                    this._showReportsTab();
                    this._resetReportTab();
                    geometryService.union(bufferedGraphics, lang.hitch(this, function (unionGeometry) {
                        this._queryLayers(unionGeometry);
                        this._createDownloadAOI(unionGeometry);
                    }));
                    topic.publish("resizeReportsPanel");
                } else {
                    if (!this._validateAOI()) {
                        alert(sharedNls.errorMessages.defineAOI);
                    } else if (this.sliderDistance === 0) {
                        alert(sharedNls.errorMessages.bufferSliderValue);
                    }
                }
            } else {
                alert(sharedNls.errorMessages.defineAOI);
            }
        },

        _validatePreviousGraphic: function () {
            var isPrevious = false;
            if (this.map.getLayer("tempBufferLayer") && this._previousGraphics === this.map.getLayer("tempBufferLayer").graphics[0]) {
                isPrevious = true;
            }
            if (this.map.getLayer("hGraphicLayer") && this._previousGraphics === this.map.getLayer("hGraphicLayer").graphics[0]) {
                isPrevious = true;
            }
            if (this.map.getLayer("esriGraphicsLayerMapSettings") && this._previousGraphics === this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0]) {
                isPrevious = true;
            }
            return isPrevious;
        },

        _validateAOI: function () {
            var isValidAOI = true;
            if ((this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes && this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0].attributes.sourcename === "geoLocationSearch")
                    || this._isDrawTab || this.isCoordinateTab || this.map.getLayer("locatorGraphicsLayer").graphics.length > 0) {
                isValidAOI = false;
            }
            return isValidAOI;
        },

        /**
        * validate AOI geometries for all polygon or extent
        * @name widgets/reports/reports
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

        _resetReportTab: function () {
            this._resetDownloadOptions();
            dom.byId("analysisFileName").value = "";
            dom.byId("analysisFileUploadContainer").value = "";
            this.previousAnalysisFileName = "";
            this.shapeFileUploaded = false;
            this.storeAnalysisShapeFile = "";
            this._previousShapeFile = null;
            //reset standard unit display
            this.hasAreaStandardUnit = false;
            if (this.esriCTchangeStandardUnit) {
                domStyle.set(this.esriCTchangeStandardUnit, "display", "none");
            }
            if (this.esriCTchangeMetricUnit) {
                domStyle.set(this.esriCTchangeMetricUnit, "display", "block");
            }
        },

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
            this.shapeFileForAnalysis = featureSet;
        },

        /**
        * destroy distance and bearing textboxes
        * @name widgets/reports/reports
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