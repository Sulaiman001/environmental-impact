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
    "esri/tasks/AreasAndLengthsParameters",
    "esri/request",
    "dojo/_base/json",
    "esri/geometry/Point",
    "dojo/string",
    "esri/geometry/webMercatorUtils",
    "esri/geometry/Polyline",
    "esri/tasks/Geoprocessor",
    "esri/tasks/DataFile",
    "dijit/form/ComboBox",
    "dijit/form/Select",
    "esri/tasks/ParameterValue",
    "esri/tasks/LinearUnit",
    "esri/tasks/FeatureSet"

], function (declare, domConstruct, on, topic, lang, array, domStyle, domAttr, dom, query, domClass, domGeom, GeometryService, Dialog, string, html, template, Color, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, TooltipDialog, Place, CheckBox, Button, Graphic, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, GraphicsLayer, Draw, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, RadioButton, ScrollBar, Deferred, DeferredList, Query, QueryTask, AreasAndLengthsParameters, esriRequest, dojoJson, Point, dojoString, webMercatorUtils, Polyline, Geoprocessor, DataFile, ComboBox, SelectList, ParameterValue, LinearUnit, FeatureSet) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        logoContainer: null,
        aoiPanelScrollbar: null,
        reportPanelScrollbar: null,
        stagedBuffer: null,
        featureGeometry: null,
        sliderDistance: null,
        sliderUnitValue: null,
        flagMultiplePoints: null,
        polyLine: null,
        name: null,
        initialCountValue: null,
        initialAnalysisValues: null,
        fAnalysisArray: [],
        shapeFileForAnalysis: null,
        initialReportCreated: null,
        AOIAttributes: [],
        configData: dojo.configData,
        startPointLongitude: null,
        startPointLatitude: null,
        stagedAOIResize: null,

        /**
        * create reports widget
        *
        * @class
        * @name widgets/reports/reports
        */
        postCreate: function () {
            var locatorParams;
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
                            domClass.remove(this.logoContainer, "esriCTMapLogo");
                        }
                    }
                }
            }));
            this.domNode = domConstruct.create("div", { "title": sharedNls.tooltips.reports, "class": "esriCTHeaderIcons esriCTReportsImg" }, null);
            this._showHideContainer();
            topic.subscribe("addPushpinOnMap", lang.hitch(this, this.addPushpinOnMap));
            topic.subscribe("_creatingBuffer", lang.hitch(this, this._creatingBuffer));
            topic.subscribe("resizeAOIPanel", lang.hitch(this, this.resizeAOIPanel));
            topic.subscribe("resizeReportsPanel", lang.hitch(this, this.resizeReportsPanel));
            topic.subscribe("hideMapTip", lang.hitch(this, this.hideMapTip));
            topic.subscribe("createBuffer", lang.hitch(this, this._createBuffer));
            topic.subscribe("setStartPoint", lang.hitch(this, this._setStartPoint));
            topic.subscribe("closeDialogBox", lang.hitch(this, this.closeDialogBox));
            topic.subscribe("resizeDialogBox", lang.hitch(this, this._resizeDialogBox));

            this.divInitialCoordinates.title = sharedNls.tooltips.selectInitialCoordinates;

            /**
            * minimize other open header panel widgets and show AOI panel
            */
            this.applicationReportsContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            this.applicationReportsContainer.appendChild(this.applicationHeaderReportContainer);
            this._showAOITab();

            this.reportHandle = this.own(on(this.domNode, "click", lang.hitch(this, function () {
                topic.publish("toggleWidget", "reports");
                domStyle.set(this.applicationHeaderReportContainer, "display", "block");
                this._showHideContainer();
            })));

            if (this.logoContainer) {
                domClass.add(this.logoContainer, "esriCTMapLogo");
            }

            this.own(on(this.areaOfInterestTab, "click", lang.hitch(this, function () {
                this._showAOITab();
                topic.publish("resizeAOIPanel");
            })));

            this.own(on(this.addBearingTextBox, "click", lang.hitch(this, function () {
                var validRecord = this._validateBearingInputText();
                if (validRecord) {
                    this._addBearingTextBox();
                }
            })));

            this.own(on(this.reportTab, "click", lang.hitch(this, function () {
                var bufferedGraphics = this.map.getLayer("tempBufferLayer").graphics[0],
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
                    alert("Please define AOI to generate the report.");
                }
            })));

            this.addLatitudeValue.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });

            this.addLongitudeValue.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });

            this.addBearingValue.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });

            this.addDistanceMiles.onkeypress = lang.hitch(this, function (evt) {
                return this.onlyNumbers(evt);
            });

            this.own(on(this.addLatitudeValue, "blur", lang.hitch(this, function () {
                if (lang.trim(this.addLatitudeValue.value) === "") {
                    alert(sharedNls.errorMessages.addLongitudeValue);
                } else if (parseFloat(this.startPointLongitude) !== parseFloat(this.addLatitudeValue.value)) {
                    this.startPointLongitude = this.addLatitudeValue.value;
                    this._clearAllGraphics();
                    this._updateAOIonMap();
                }
            })));

            this.own(on(this.addLongitudeValue, "blur", lang.hitch(this, function () {
                if (lang.trim(this.addLongitudeValue.value) === "") {
                    alert(sharedNls.errorMessages.addLattitudeValue);
                } else if (parseFloat(this.startPointLatitude) !== parseFloat(this.addLongitudeValue.value)) {
                    this.startPointLatitude = this.addLongitudeValue.value;
                    this._clearAllGraphics();
                    this._updateAOIonMap();
                }
            })));

            this._createSelectionTool();
            this.flagMultiplePoints = 0;
            topic.publish("resizeAOIPanel");
            topic.publish("resizeReportsPanel");

            this.own(on(dom.byId("uploadForm"), "change", lang.hitch(this, function (event) {
                var fileName = event.target.value.toLowerCase();
                this.name = fileName.split(".");
                this.name = this.name[0].replace("c:\\fakepath\\", "");
                dom.byId('fileName').value = this.name;
            })));

            this.own(on(this.esriCTUploadButton, "click", lang.hitch(this, function (event) {
                var _self = this;
                this._horizontalSlider.setValue(0);
                this._generateFeatureCollection(this.name, _self);
            })));

            this.own(on(this.divInitialCoordinates, "click", lang.hitch(this, function () {
                dojo.initialCoordinates = true;
            })));


            topic.publish("setDefaultTextboxValue", this.txtplaceName, "defaultPlaceNameSearchAddress", dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress);
            this.txtplaceName.value = dojo.configData.LocatorSettings.LocatorDefaultPlaceNameSearchAddress; // domAttr.get(this.txtplaceName, "defaultPlaceNameSearchAddress");
            locatorParams = {
                divSearch: this.divplaceName,
                close: this.clearplaceNameSearchTextbox,
                imgSearchLoader: this.imgplaceName,
                textAddress: this.txtplaceName,
                divResults: this.divplaceNameResults,
                divAddressContent: this.divplaceNameSearchContainer,
                divAddressScrollContent: this.divplaceNameScrollContent,
                divNoResultFound: this.divNoPlaceResultFound,
                bufferDistance: this.sliderDistance,
                isAOISearch: false,
                isPlacenameSearch: true,
                isAOIBearingSearch: false
            };
            topic.publish("attachLocatorEvents", locatorParams);
            this.reportsLoader = domConstruct.create("img", { "class": "esriCTInfoLoader" }, this.reportContent);
            domAttr.set(this.reportsLoader, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            this._hideLoadingIndicatorReports();

            this.myDialog = new Dialog({
                style: "width: 300px",
                "class": "esriDijitDialog"
            });

            this.own(on(this.esriCTchangeUnit, "click", lang.hitch(this, function (evt) {
                this._toggleAreaUnit();
            })));

            this.own(on(dom.byId("uploadAnalysisForm"), "change", lang.hitch(this, function (event) {
                var fileName = event.target.value.toLowerCase();
                this.analysisFileNaame = fileName.split(".");
                this.analysisFileNaame = this.analysisFileNaame[0].replace("c:\\fakepath\\", "");
                dom.byId('analysisFileName').value = this.analysisFileNaame;
            })));

            this.own(on(this.esriCTAnalysisUploadButton, "click", lang.hitch(this, function () {
                this._generateAnalysisFeatureCollection(this.analysisFileNaame);
            })));

            this.map.on("click", lang.hitch(this, function (evt) {
                var geoLocationPushpin, locatorMarkupSymbol, graphic, normalizedVal;
                if (dojo.initialCoordinates) {
                    normalizedVal = webMercatorUtils.xyToLngLat(evt.mapPoint.x, evt.mapPoint.y);
                    geoLocationPushpin = dojoConfig.baseURL + dojo.configData.LocatorSettings.DefaultLocatorSymbol;
                    locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(geoLocationPushpin, dojo.configData.LocatorSettings.MarkupSymbolSize.width, dojo.configData.LocatorSettings.MarkupSymbolSize.height);
                    graphic = new esri.Graphic(evt.mapPoint, locatorMarkupSymbol, {}, null);
                    this._clearAllGraphics();
                    this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                    this._setStartPoint(normalizedVal);
                }
            }));

            this._createSelectOption();
        },

        _createSelectOption: function () {
            var selectFormat, options;
            options = this._setSelectionOption(dojo.configData.DownloadReportFormat.Format.split(","));
            selectFormat = new SelectList({ options: options, id: "selectFormat" }, this.selectFormatDropDown);
            return selectFormat;
        },

        /**
        * create dataprovider for dropdown
        * param {array} list of available record
        * @memberOf widgets/Sitelocator/Sitelocator
        */
        _setSelectionOption: function (arrOption) {
            var k, arrOpt = [];
            for (k = 0; k < arrOption.length; k++) {
                if (arrOption.hasOwnProperty(k)) {
                    arrOpt.push({ "label": arrOption[k], "value": arrOption[k] });
                }
            }
            return arrOpt;
        },


        _updateAOIonMap: function () {
            var intialLat, initiallong, AOIAttributesArray, i, initialbearing, initialdistance, distanceUnit, aoiAttributesIndex;
            if (this.AOIAttributes.length > 0) {
                this.flagMultiplePoints = 0;
                this.polyLine = new Polyline(new esri.SpatialReference({ "wkid": this.map.spatialReference.wkid }));
                AOIAttributesArray = dojo.clone(this.AOIAttributes);
                this.AOIAttributes.length = 0;
                for (i = 0; i < AOIAttributesArray.length; i++) {
                    if (i === 0) {
                        intialLat = this.startPointLongitude;
                        initiallong = this.startPointLatitude;
                    } else {
                        intialLat = this.AOIAttributes[i - 1].longitude;
                        initiallong = this.AOIAttributes[i - 1].latitude;
                    }
                    initialbearing = AOIAttributesArray[i].bearing;
                    initialdistance = AOIAttributesArray[i].distance;
                    distanceUnit = AOIAttributesArray[i].unit;
                    aoiAttributesIndex = AOIAttributesArray[i].aoiAttributesIndex;
                    this.destVincenty(intialLat, initiallong, initialbearing, this._convertDistanceIntoMiles(initialdistance, distanceUnit), false, aoiAttributesIndex);
                }
            }
        },

        _setStartPoint: function (normalizedVal) {
            this.startPointLongitude = normalizedVal[0];
            this.startPointLatitude = normalizedVal[1];
            this.addLatitudeValue.value = parseFloat(normalizedVal[0]).toFixed(5);
            this.addLongitudeValue.value = parseFloat(normalizedVal[1]).toFixed(5);
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
                this.myDialog.hide();
            } else {
                /**
                * when user clicks on share icon in header panel, open the sharing panel if it is closed
                */
                domClass.remove(this.applicationHeaderReportContainer, "esriCTZeroHeight");
                if (this.logoContainer) {
                    domClass.add(this.logoContainer, "esriCTMapLogo");
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
            if (domStyle.get(this.reportContainer, "display") === "block") {
                domStyle.set(this.reportContainer, "display", "none");
                domStyle.set(this.areaOfInterestContainer, "display", "block");
                domClass.replace(this.areaOfInterestTab, "esriCTAreaOfInterestTabSelected", "esriCTAreaOfInterestTab");
                domClass.replace(this.areaOfInterestContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                domClass.replace(this.reportTab, "esriCTReportTabSelected", "esriCTReportTab");
                if (this.myDialog) {
                    this.myDialog.hide();
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
            if (domStyle.get(this.reportContainer, "display") === "none") {
                domStyle.set(this.reportContainer, "display", "block");
                domStyle.set(this.areaOfInterestContainer, "display", "none");
                domClass.replace(this.areaOfInterestTab, "esriCTAreaOfInterestTab", "esriCTAreaOfInterestTabSelected");
                domClass.replace(this.reportTab, "esriCTReportTab", "esriCTReportTabSelected");
                if (domStyle.get(this.uploadAOIContainer, "display") === "none") {
                    domStyle.set(this.uploadAOIContainer, "display", "block");
                }
            }
        },

        /**
        * create selection tool and draw point,polygon or polyline
        *
        * @class
        * @name widgets/reports/reports
        */
        _createSelectionTool: function () {
            var divAreaIntContainer, divSelectionContainer, toolbar, _self, radioBtnValue, radioContent, divRadioBtn, index, i, radioButton, radioLabel;
            divAreaIntContainer = domConstruct.create("div", { "class": "esriCTAreaIntContainer" }, null);
            domConstruct.place(divAreaIntContainer, this.divAOIAddressContent, "after");

            domConstruct.create("div", { "innerHTML": sharedNls.messages.drawToolsText, "class": "esriCTAOIlabel" }, divAreaIntContainer);
            divSelectionContainer = domConstruct.create("div", { "class": "esriCTdrawingTools" }, divAreaIntContainer);

            domConstruct.create("div", { "class": "drawPoint esriCTSelectionIcon", "id": "point", "title": sharedNls.titles.pointToolText }, divSelectionContainer);
            domConstruct.create("div", { "class": "drawDrawing esriCTSelectionIcon", "id": "polyline", "title": sharedNls.titles.lineToolText }, divSelectionContainer);
            domConstruct.create("div", { "class": "drawRectangle esriCTSelectionIcon", "id": "extent", "title": sharedNls.titles.rectangleToolText }, divSelectionContainer);
            domConstruct.create("div", { "class": "drawPolygon esriCTSelectionIcon", "id": "polygon", "title": sharedNls.titles.polygonToolText }, divSelectionContainer);
            domConstruct.create("div", { "class": "select-on-map esriCTSelectionIcon", "id": "multi_point", "title": sharedNls.titles.selectFeatureText }, divSelectionContainer);

            toolbar = new Draw(this.map);
            _self = this;
            array.forEach(query(".esriCTSelectionIcon"), function (value) {
                _self.own(on(value, "click", function () {
                    _self.activateTool(this.id, toolbar);
                }));
            });

            toolbar.on("draw-end", function (evt) {
                _self.addToMap(evt, toolbar, _self.sliderUnitValue);
                _self.flagMultiplePoints = 0;
                dojo.destroy(_self.bearingOuterContainer);
            });

            this._horizontalSlider = new HorizontalSlider({
                value: dojo.configData.BufferSliderSettings.defaultValue,
                minimum: dojo.configData.BufferSliderSettings.minValue,
                maximum: dojo.configData.BufferSliderSettings.maxValue,
                intermediateChanges: dojo.configData.BufferSliderSettings.intermediateChanges,
                showButtons: dojo.configData.BufferSliderSettings.showButtons,
                "class": "horizontalSlider"
            }, this.horizontalSliderContainer);

            this.sliderDistance = dojo.configData.BufferSliderSettings.defaultValue;

            for (i = 0; i < dojo.configData.DistanceUnitSettings.length; i++) {
                radioContent = domConstruct.create("div", { "class": "esriCTRadioBtn esriCTRadioButtonDiv" }, this.divRadioButtonContainer);
                divRadioBtn = domConstruct.create("div", { "class": "esriCTRadioBtn esriCTRadioButtonDiv" }, radioContent);
                radioButton = new RadioButton({
                    checked: dojo.configData.DistanceUnitSettings[i].Checked,
                    value: dojo.configData.DistanceUnitSettings[i].DistanceUnitName,
                    name: "distance",
                    id: "radio" + dojo.configData.DistanceUnitSettings[i].DistanceUnitName
                }, divRadioBtn);
                domAttr.set(dom.byId(radioButton.id), "index", i);
                radioLabel = domConstruct.create("label", {}, radioContent);
                domAttr.set(radioLabel, "for", radioButton.id);
                domAttr.set(radioLabel, "innerHTML", dojo.configData.DistanceUnitSettings[i].DistanceUnitName);
                this.own(on(dom.byId(radioButton.id), "change", lang.hitch(this, this._getSliderValue)));
            }

            radioBtnValue = query("input:checked")[0].value;
            index = Number(domAttr.get(dom.byId(query("input:checked")[0].id), "index"));
            this.sliderUnitValue = this._sliderStartEndValue(radioBtnValue, this._horizontalSlider, index, null);

            domAttr.set(this.sliderMessage, "innerHTML", string.substitute(sharedNls.messages.sliderDisplayText, { defaultDistance: dojo.configData.BufferSliderSettings.defaultValue }) + " " + radioBtnValue);

            this.own(on(this._horizontalSlider, "change", lang.hitch(this, function (value) {
                var sliderText, message, graphics;
                sliderText = this.sliderMessage.innerHTML.split(/\d+/g);
                message = sliderText[0] + " " + Math.round(value) + " " + sliderText[1];
                this.sliderMessage.innerHTML = message;
                this.sliderDistance = Math.round(value);
                graphics = this.map.getLayer("esriGraphicsLayerMapSettings").graphics[0];
                if (graphics && graphics.geometry) {
                    this.featureGeometry = graphics.geometry;
                    clearTimeout(this.stagedBuffer);
                    this.stagedBuffer = setTimeout(lang.hitch(this, function () {
                        if (parseInt(this.sliderDistance, 10) === 0) {
                            this.map.getLayer("tempBufferLayer").clear();
                        } else if (!graphics.attributes || (graphics.attributes && graphics.attributes.sourcename !== "aoiSearch")) {
                            topic.publish("createBuffer", this.featureGeometry, this.sliderUnitValue);
                        }
                    }), 500);
                }
            })));

            domConstruct.place(this.divRadioButtonContainer, this.divSliderContainer, "after");
            this._createLinkContainer(divAreaIntContainer);
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
            index = Number(domAttr.get(value.target, "index"));
            this.sliderUnitValue = this._sliderStartEndValue(value.target.value, this._horizontalSlider, index, true);
        },

        /**
        * Create container for radio button
        *
        * @class
        * @name widgets/reports/reports
        */
        _createRadioButtonContainer: function (i, horizontalSlider) {
            var radioContent, divRadioBtn, radioButton, radioLabel, index;
            radioContent = domConstruct.create("div", { "class": "esriCTRadioBtn esriCTRadioButtonDiv" }, this.divRadioButtonContainer);
            divRadioBtn = domConstruct.create("div", { "class": "esriCTRadioBtn esriCTRadioButtonDiv" }, radioContent);
            radioButton = new RadioButton({
                checked: dojo.configData.DistanceUnitSettings[i].Checked,
                value: dojo.configData.DistanceUnitSettings[i].DistanceUnitName,
                name: "distance",
                id: "radio" + dojo.configData.DistanceUnitSettings[i].DistanceUnitName
            }, divRadioBtn);
            domAttr.set(dom.byId(radioButton.id), "index", i);
            radioLabel = domConstruct.create("label", {}, radioContent);
            domAttr.set(radioLabel, "for", radioButton.id);
            domAttr.set(radioLabel, "innerHTML", dojo.configData.DistanceUnitSettings[i].DistanceUnitName);
            this.own(on(dom.byId(radioButton.id), "change", lang.hitch(this, function (value) {
                index = Number(domAttr.get(value.target, "index"));
                this.sliderUnitValue = this._sliderStartEndValue(value.target.value, horizontalSlider, index, true);
            })));
        },

        /**
        * Clears all graphics
        *
        * @class
        * @name widgets/reports/reports
        */
        _clearAllGraphics: function () {
            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            this.map.getLayer("tempBufferLayer").clear();
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
            var divLinkUpload, divLinkDrawTool, divLinkCoordinates, divLinkplaceName, spanLinkPlaceName, spanLinkDrawTool, spanLinkUpload, spanLinkCoordinates;
            domConstruct.create("div", { "class": "esriCTLinkHeader", "innerHTML": sharedNls.messages.aoiOptionsText }, this.divLinkContainer);
            divLinkplaceName = domConstruct.create("div", { "id": "divLinkplaceName", "class": "esriCTAOILink esriCTAOILinkSelect" }, this.divLinkContainer);
            spanLinkPlaceName = domConstruct.create("span", { "class": "esriCTCursorPointer", "innerHTML": sharedNls.titles.placeNameTtile }, divLinkplaceName);
            divLinkDrawTool = domConstruct.create("div", { "id": "divLinkDrawTool", "class": "esriCTAOILink" }, this.divLinkContainer);
            spanLinkDrawTool = domConstruct.create("span", { "class": "esriCTCursorPointer", "innerHTML": sharedNls.titles.drawingTitle }, divLinkDrawTool);
            divLinkUpload = domConstruct.create("div", { "id": "divLinkUpload", "class": "esriCTAOILink" }, this.divLinkContainer);
            spanLinkUpload = domConstruct.create("span", { "class": "esriCTCursorPointer", "innerHTML": sharedNls.titles.uploadShapefileTitle }, divLinkUpload);
            divLinkCoordinates = domConstruct.create("div", { "id": "divLinkCoordinates", "class": "esriCTAOILink" }, this.divLinkContainer);
            spanLinkCoordinates = domConstruct.create("span", { "class": "esriCTCursorPointer", "innerHTML": sharedNls.titles.coordinatesTitle }, divLinkCoordinates);

            domStyle.set(divAreaIntContainer, "display", "none");
            // placeNameSearch
            on(spanLinkPlaceName, "click", lang.hitch(this, function () {
                if (domStyle.get(this.placeNameSearch, "display") === "none") {
                    //Clear all Graphics on link change
                    this._clearAllGraphics();
                    //Clear PrevLink and Select new Link
                    domClass.replace(dojo.query(".esriCTAOILinkSelect")[0], "", "esriCTAOILinkSelect");
                    domClass.replace(dom.byId("divLinkplaceName"), "esriCTAOILinkSelect", "");
                    //Hide Prev div And Show new div
                    this._showSelectedLinkContainer(this.placeNameSearch);
                    domStyle.set(divAreaIntContainer, "display", "none");
                    this.aoiPanelScrollbar.rePositionScrollBar();
                }
            }));


            on(spanLinkUpload, "click", lang.hitch(this, function () {
                if (domStyle.get(this.divFileUploadContainer, "display") === "none") {
                    //Clear all Graphics on link change
                    this._clearAllGraphics();
                    //Clear PrevLink and Select new Link
                    domClass.replace(dojo.query(".esriCTAOILinkSelect")[0], "", "esriCTAOILinkSelect");
                    domClass.replace(dom.byId("divLinkUpload"), "esriCTAOILinkSelect", "");
                    //Hide Prev div And Show new div
                    this._showSelectedLinkContainer(this.divFileUploadContainer);
                    domStyle.set(divAreaIntContainer, "display", "none");
                    this.aoiPanelScrollbar.rePositionScrollBar();
                    this.myDialog.hide();
                }
            }));

            on(spanLinkDrawTool, "click", lang.hitch(this, function () {
                var locatorParams;
                if (domStyle.get(this.divAOIAddressContent, "display") === "none") {
                    //Clear all Graphics on link change
                    this._clearAllGraphics();
                    //Clear PrevLink and Select new Link
                    domClass.replace(dojo.query(".esriCTAOILinkSelect")[0], "", "esriCTAOILinkSelect");
                    domClass.replace(dom.byId("divLinkDrawTool"), "esriCTAOILinkSelect", "");
                    dojo.initialCoordinates = false;
                    //Hide Prev div And Show new div
                    this._showSelectedLinkContainer(this.divAOIAddressContent);
                    domStyle.set(divAreaIntContainer, "display", "block");
                    this.aoiPanelScrollbar.rePositionScrollBar();
                    topic.publish("setDefaultTextboxValue", this.txtAOIAddress, "defaultAOIAddress", dojo.configData.LocatorSettings.LocatorDefaultAOIAddress);
                    this.txtAOIAddress.value = dojo.configData.LocatorSettings.LocatorDefaultAOIAddress;
                    locatorParams = {
                        divSearch: this.divAOISearch,
                        close: this.clearAOITextbox,
                        imgSearchLoader: this.imgAOISearchLoader,
                        textAddress: this.txtAOIAddress,
                        divResults: this.divAOIAddressResults,
                        divAddressContent: this.divAOIAddressContent,
                        divAddressScrollContent: this.divAOIAddressScrollContent,
                        divNoResultFound: this.divNoAOIResultFound,
                        bufferDistance: this.sliderDistance,
                        isAOISearch: true,
                        isPlacenameSearch: false,
                        isAOIBearingSearch: false
                    };
                    topic.publish("attachLocatorEvents", locatorParams);
                }
                this.myDialog.hide();
            }));

            on(spanLinkCoordinates, "click", lang.hitch(this, function () {
                this.myDialog.hide();
                if (domStyle.get(this.divBearingContainer, "display") === "none") {
                    //Clear all Graphics on link change
                    this._clearAllGraphics();
                    //Clear PrevLink and Select new Link
                    domClass.replace(dojo.query(".esriCTAOILinkSelect")[0], "", "esriCTAOILinkSelect");
                    domClass.replace(dom.byId("divLinkCoordinates"), "esriCTAOILinkSelect", "");

                    domConstruct.place(this.divBearingContainer, this.divBufferDistance, "before");
                    //Hide Prev div And Show new div
                    this._showSelectedLinkContainer(this.divBearingContainer);
                    domStyle.set(divAreaIntContainer, "display", "none");

                    topic.publish("setDefaultTextboxValue", this.txtAOIBearingAddress, "defaultAOIBearingAddress", dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress);
                    this.txtAOIBearingAddress.value = dojo.configData.LocatorSettings.LocatorDefaultAOIBearingAddress;
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
                    this.polyLine = new Polyline(new esri.SpatialReference({ "wkid": this.map.extent.spatialReference.wkid }));
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
            this.bearingPanelScrollbar = new ScrollBar({ domNode: this.divBearingDisplayContent });
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
        _sliderStartEndValue: function (radioBtnValue, horizontalSlider, index, radioClicked) {
            var sliderStartValue, sliderEndValue;
            switch (radioBtnValue) {
            case "Miles":
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_STATUTE_MILE";
                this.shapeFileUnitValue = "esriMiles";
                break;
            case "Feet":
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_FOOT";
                this.shapeFileUnitValue = "esriFeet";
                break;
            case "Meters":
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_METER";
                this.shapeFileUnitValue = "esriMeters";
                break;
            case "Kilometers":
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_KILOMETER";
                this.shapeFileUnitValue = "esriKilometers";
                break;
            default:
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_STATUTE_MILE";
                this.shapeFileUnitValue = "esriMiles";
                break;
            }
            domAttr.set(query(".dijitRuleLabel")[0], "innerHTML", sliderStartValue);
            domAttr.set(query(".dijitRuleLabel")[1], "innerHTML", sliderEndValue);

            this._horizontalSlider.minimum = sliderStartValue;
            this._horizontalSlider.maximum = sliderEndValue;
            if (radioClicked) {
                this._horizontalSlider.setValue(0);
            }
            domAttr.set(this.sliderMessage, "innerHTML", string.substitute(sharedNls.messages.sliderDisplayText, { defaultDistance: dojo.configData.BufferSliderSettings.defaultValue }) + " " + radioBtnValue);
            return this.sliderUnitValue;
        },

        /**
        * activate draw tool
        * param {number} id of the tool bar
        * param {object} supports to create new geometries
        * @class
        * @name widgets/reports/reports
        */
        activateTool: function (id, toolbar) {
            var tool;
            dojo.activatedDrawTool = true;
            //tool = id.toUpperCase().replace(/ /g, "_");
            tool = id.toUpperCase();
            toolbar.activate(Draw[tool]);
        },

        /**
        * draw a polygon on the map
        * param {object} object of the current event
        * param {object} object of the toolbar
        * param {number} slider current value
        * @class
        * @name widgets/reports/reports
        */
        addToMap: function (evt, toolbar) {
            var symbol, graphic;
            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            toolbar.deactivate();
            switch (evt.geometry.type) {
            case "point":
            case "multipoint":
                symbol = new SimpleMarkerSymbol(SimpleMarkerSymbol.STYLE_CIRCLE, 12,
                        new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color(dojo.configData.AOISymbology.PointSymbolBorder), dojo.configData.AOISymbology.PointSymbolBorderWidth),
                        new Color(dojo.configData.AOISymbology.PointFillSymbolColor));
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
            graphic = new Graphic(evt.geometry, symbol);
            this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
            topic.publish("createBuffer", evt.geometry, this.sliderUnitValue);
        },

        /**
        * create buffer
        * param {object} geometry for creating buffer
        * @class
        * @name widgets/reports/reports
        */
        _createBuffer: function (geometry) {
            var geometryService, params;
            domConstruct.empty(this.reportScrollContent);
            this._showLoadingIndicatorReports();
            geometryService = new GeometryService(dojo.configData.GeometryService);
            this.featureGeometry = geometry;
            dojo.activatedDrawTool = false;
            //setup the buffer parameters
            params = new BufferParameters();
            params.distances = [this.sliderDistance];
            params.bufferSpatialReference = new esri.SpatialReference({ "wkid": this.map.spatialReference.wkid });
            params.outSpatialReference = this.map.spatialReference;
            params.unit = GeometryService[this.sliderUnitValue];
            if (this.sliderDistance !== 0) {
                if (this.featureGeometry.type === "polygon") {
                    //if geometry is a polygon then simplify polygon.  This will make the user drawn polygon topologically correct.
                    geometryService.simplify([this.featureGeometry], lang.hitch(this, function (geometries) {
                        params.geometries = geometries;
                        geometryService.buffer(params, lang.hitch(this, function (geometries) {
                            this.showBuffer(geometries);
                        }));
                    }));
                } else if (this.featureGeometry.type === "polyline") {
                    //if geometry is a polygon then simplify polygon.  This will make the user drawn polygon topologically correct.
                    geometryService.simplify([this.featureGeometry], lang.hitch(this, function (geometries) {
                        params.geometries = geometries;
                        geometryService.buffer(params, lang.hitch(this, function (geometries) {
                            this.showBuffer(geometries);
                        }));
                    }));
                } else {
                    params.geometries = [this.featureGeometry];
                    geometryService.buffer(params, lang.hitch(this, function (geometries) {
                        this.showBuffer(geometries);
                    }));
                }
            } else {
                if (this.featureGeometry.type !== "polygon" && this.featureGeometry.type !== "extent") {
                    this.map.getLayer("tempBufferLayer").clear();
                }
            }
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
            var _self = this, statisticResultArray = [], layerFieldCount = [], reportFields, staticFieldName, reportFieldName, staticTypeValue,
                index, k,
                deferredListResult, requestHandle,
                onMapFeaturArray = [];
            this.counter = 0;
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
            deferredListResult = new DeferredList(onMapFeaturArray);
            deferredListResult.then(lang.hitch(this, function (result) {
                var i, statisticType, layerInfoCollection = [], reportFieldsCount = 0, count, standardPointLayerUnit, resultCount = 0;
                layerInfoCollection.push(result);
                if (result) {
                    for (i = 0; i < dojo.configData.SearchSettings.length; i++) {
                        if (result[i][1].geometryType === "esriGeometryPoint") {
                            statisticType = "COUNT";
                            staticTypeValue = "count";
                            standardPointLayerUnit = "";
                            reportFields = (dojo.configData.SearchSettings[i].QuickSummaryReportFields + "," + dojo.configData.SearchSettings[i].DetailSummaryReportFields).split(",");
                            reportFieldsCount = reportFields.length;
                            layerFieldCount.push(reportFieldsCount);
                            for (count = 0; count < reportFieldsCount; count++) {
                                reportFieldName = reportFields[count];
                                staticFieldName = reportFieldName;
                                statisticResultArray.push(this._executeQueryTaskPointReport(i, geometry, statisticType, reportFieldName, staticFieldName, staticTypeValue, standardPointLayerUnit));
                            }
                        }

                        if (result[i][1].geometryType === "esriGeometryPolygon") {
                            statisticType = "SUM";
                            staticTypeValue = "area";
                            reportFields = (dojo.configData.SearchSettings[i].GroupByField + "," + dojo.configData.SearchSettings[i].DetailSummaryReportFields).split(",");
                            reportFieldsCount = reportFields.length;
                            layerFieldCount.push(reportFieldsCount);
                            for (count = 0; count < reportFieldsCount; count++) {
                                reportFieldName = reportFields[count];
                                staticFieldName = dojo.configData.SearchSettings[i].QuickSummaryReportFields;
                                statisticResultArray.push(this._executeQueryTaskPointReport(i, geometry, statisticType, reportFieldName, staticFieldName, staticTypeValue, sharedNls.titles.areaStandardUnit));
                            }
                        }
                    }
                    deferredListResult = new DeferredList(statisticResultArray);
                    deferredListResult.then(lang.hitch(this, function (result) {
                        this.queryAllResults = result;
                        if (result) {
                            for (k = 0; k < result.length; k++) {
                                if (result[k][0] === false) {
                                    resultCount++;
                                }
                            }
                            if (resultCount === result.length) {
                                alert(sharedNls.errorMessages.errorPerfomingQuery);
                                this._hideLoadingIndicatorReports();
                            } else {
                                this._createReport();
                            }
                        }
                    }), function (err) {
                        alert(err.messgae);
                    });
                }
            }), function (err) {
                alert(err.message);
            });
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
        _createReport: function (DialogBoxId) {
            this.featureArrayCollection = [];
            var isFieldAdded = true, i, index;
            this.featureArrayCollection.length = 0;
            for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                for (i = 0; i < this.queryAllResults.length; i++) {
                    if (this.queryAllResults[i][0]) {
                        if ((dojo.configData.SearchSettings[index].QuickSummaryReportFields === this.queryAllResults[i][1].reportFieldName) || (dojo.configData.SearchSettings[index].GroupByField === this.queryAllResults[i][1].reportFieldName)) {
                            this.featureArrayCollection.push({
                                attr: this.queryAllResults[i][1].result.features,
                                FieldName: this.queryAllResults[i][1].reportFieldName,
                                FieldTypeValue: this.queryAllResults[i][1].statictypevalue,
                                unitType: this.queryAllResults[i][1].unit
                            });
                        }
                        if (this.dialogBoxTrue && isFieldAdded) {
                            if (this.queryAllResults[i][1].reportFieldName === DialogBoxId) {
                                isFieldAdded = false;
                                this.featureArrayCollection.push({
                                    attr: this.queryAllResults[i][1].result.features,
                                    FieldName: this.queryAllResults[i][1].reportFieldName,
                                    FieldTypeValue: this.queryAllResults[i][1].statictypevalue,
                                    unitType: this.queryAllResults[i][1].unit
                                });
                            }
                        }
                    }
                }
            }
            this._displayReport(this.featureArrayCollection);
        },

        /**
        * display report for the selected AOI
        * param {object} selected featureset inside the buffered geometry
        * @class
        * @name widgets/reports/reports
        */
        _displayReport: function (featureArrayCollection) {
            var featureCollection, reportPanelHeight, createreport;
            domConstruct.empty(this.reportScrollContent);
            this._hideLoadingIndicatorReports();
            for (featureCollection = 0; featureCollection < dojo.configData.SearchSettings.length; featureCollection++) {
                createreport = true;
                this._createReportPanelContent(featureCollection, featureArrayCollection, createreport);
            }
            if (this.reportPanelScrollbar) {
                domClass.add(this.reportPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.reportPanelScrollbar.removeScrollBar();
            }
            reportPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]).h - (dojo.coords(this.uploadAOIContainer).h + dojo.coords(this.downloadReportContainer).h + dojo.coords(dojo.query(".esriCTRightPanel")[0]).h + 100) + "px";
            domStyle.set(this.reportContent, "height", reportPanelHeight);
            this.reportPanelScrollbar = new ScrollBar({ domNode: this.reportContent });
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
        _createReportPanelContent: function (featureCollection, featureArrayCollection, createreport, divnoDataAvailable) {
            this.changeFeatureSetUnit = [];
            if (featureArrayCollection.length >= 0) {
                this.storeFeatureArrayCollection = featureArrayCollection;
                var count, j, target, divReportLayerSettingPanel, divReportLayerPanel, divReportLayersettingIcon, divFieldTypeContent, title;
                divReportLayerPanel = domConstruct.create("div", { "class": "esriCTReportLayerPanel" }, this.reportScrollContent);
                divReportLayerSettingPanel = domConstruct.create("div", { "class": "esriCTReportSettingPanel" }, divReportLayerPanel);
                domConstruct.create("div", { "class": "divReportLayerTitle", "innerHTML": dojo.configData.SearchSettings[featureCollection].SearchDisplayTitle }, divReportLayerSettingPanel);
                divReportLayersettingIcon = domConstruct.create("div", { "class": "esriCTsettingIcon", "displaytitle": dojo.configData.SearchSettings[featureCollection].SearchDisplayTitle, "id": dojo.configData.SearchSettings[featureCollection].QueryLayerId, "title": sharedNls.tooltips.settingsIconTitle }, divReportLayerSettingPanel);

                this.own(on(divReportLayersettingIcon, "click", lang.hitch(this, function (evt) {
                    target = evt.currentTarget || evt.srcElement;
                    title = domAttr.get(target, "displaytitle");
                    this._configureDialogBox(target.id, title);
                })));

                for (count = 0; count < featureArrayCollection.length; count++) {
                    if ((featureArrayCollection[count].FieldName === dojo.configData.SearchSettings[featureCollection].QuickSummaryReportFields) ||
                            (featureArrayCollection[count].FieldName === dojo.configData.SearchSettings[featureCollection].GroupByField) ||
                            (featureArrayCollection[count].FieldName === dojo.configData.SearchSettings[featureCollection].DetailSummaryReportFields[0])) {
                        if (createreport && divnoDataAvailable) {
                            //if report is getting created and no result found error message is already appended with that section then we clear it
                            domConstruct.destroy(divnoDataAvailable);
                        }
                        createreport = false;
                        domConstruct.create("div", { "class": "esriCTReportZoneName", "innerHTML": featureArrayCollection[count].FieldName }, divReportLayerPanel, "last");
                        for (j = 0; j < featureArrayCollection[count].attr.length; j++) {
                            this.value = string.substitute("${" + featureArrayCollection[count].FieldName + "}",
                                 featureArrayCollection[count].attr[j].attributes);

                            this.StatisticTypeValue = string.substitute("${Total}", featureArrayCollection[count].attr[j].attributes);
                            if (featureArrayCollection.length > 1) {
                                if ((featureArrayCollection[featureCollection].unitType === sharedNls.titles.areaStandardUnit) && this.initialCountValue !== 0 && (this.initialReportCreated)) {
                                    this.StatisticTypeValue = parseFloat(this.StatisticTypeValue);
                                    this.StatisticTypeValue = (this.StatisticTypeValue * 247.105);
                                }
                            } else if ((featureArrayCollection[count].unitType === sharedNls.titles.areaStandardUnit) && this.initialCountValue !== 0 && (this.initialReportCreated)) {
                                featureCollection = count;
                                this.StatisticTypeValue = parseFloat(this.StatisticTypeValue);
                                this.StatisticTypeValue = (this.StatisticTypeValue * 247.105);
                            } else {
                                featureCollection = count;
                            }

                            this.storeFeatureArrayCollection[count].attr[j].attributes.Total = this.StatisticTypeValue;
                            divFieldTypeContent = domConstruct.create("div", { "class": "esriCTReportZoneList" }, divReportLayerPanel);
                            domConstruct.create("span", { "class": "esriCTReportZoneField", "innerHTML": this.value + " " }, divFieldTypeContent);
                            domConstruct.create("span", { "class": "esriCTReportZoneCount", "innerHTML": ("(" + featureArrayCollection[featureCollection].FieldTypeValue + " " + " - " + parseInt(this.StatisticTypeValue, 10) + (featureArrayCollection[featureCollection].unitType === "" ? "" : " ") + featureArrayCollection[featureCollection].unitType + ")") }, divFieldTypeContent);
                        }
                    } else {
                        if (createreport) { // if no report is created yet then only proceed
                            if (divnoDataAvailable) { //if already no result message is appendedin in the current structure then remove duplicacy,clear it and create new one.
                                domConstruct.destroy(divnoDataAvailable);
                            }
                            divnoDataAvailable = domConstruct.create("div", { "class": "esriCTReportZoneName", "innerHTML": "no result found" }, divReportLayerPanel, "last");
                        }
                    }
                }
            }


        },

        /**
        * create dialog box for deatiled summary report
        * param {string} selected field
        * @class
        * @name widgets/reports/reports
        */
        _configureDialogBox: function (dialogBoxId, title) {
            var _self = this, DetailFieldValues, createContent, i;
            for (i = 0; i < dojo.configData.SearchSettings.length; i++) {
                if (dojo.configData.SearchSettings[i].QueryLayerId === dialogBoxId) {
                    DetailFieldValues = dojo.configData.SearchSettings[i].DetailSummaryReportFields;
                    createContent = _self.createContent(DetailFieldValues, dialogBoxId);
                    _self.myDialog.set("content", createContent);
                    _self.myDialog.set("title", title);
                    _self.myDialog.show();
                }
            }
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
        _executeQueryTaskPointReport: function (index, geometry, statisticType, reportFieldName, staticFieldName, staticTypeValue, unit) {
            var obj = {}, queryTask, queryLayer, statDef, deferred;
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
                obj.statictypevalue = staticTypeValue;
                obj.unit = unit;
                deferred.resolve(obj);
            }), function (err) {
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
            if (this.aoiPanelScrollbar) {
                domClass.add(this.aoiPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.aoiPanelScrollbar.removeScrollBar();
            }
            aoiPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]).h - (dojo.coords(dojo.query(".esriCTRightPanel")[0]).h + 50) + "px";
            domStyle.set(this.areaOfInterestContainer, "height", aoiPanelHeight);
            if (this.stagedAOIResize) {
                clearTimeout(this.stagedAOIResize);
            }
            this.stagedAOIResize = setTimeout(lang.hitch(this, function () {
                this.aoiPanelScrollbar = new ScrollBar({ domNode: this.areaOfInterestContainer });
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
            this.reportPanelScrollbar = new ScrollBar({ domNode: this.reportContent });
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
        createContent: function (DetailFieldValues, dialogBoxId) {
            var _self = this, detailReportFieldLength, addReportCheckBox, customButton;
            this.div1 = domConstruct.create("div", { "class": "settingDilogContainer" }, null);
            this.div3 = domConstruct.create("div", { "class": "esriCTReportFieldshead", "innerHTML": "Select Report Fields" }, this.div1);
            this.div2 = domConstruct.create("div", { "class": "esriCTCheckboxContainer" }, this.div1);

            for (detailReportFieldLength = 0; detailReportFieldLength < DetailFieldValues.length; detailReportFieldLength++) {
                this.divCheckBox = domConstruct.create("div", {}, this.div2);
                addReportCheckBox = new CheckBox({
                    name: "TypecheckBox",
                    checked: false,
                    "class": "inputValues",
                    value: DetailFieldValues[detailReportFieldLength]
                });
                addReportCheckBox.placeAt(this.divCheckBox, "first");
                this.divDetailReportField = domConstruct.create("div", { "class": "esriCTDiv" }, this.divCheckBox);
                this.divDetailReportField.innerHTML = DetailFieldValues[detailReportFieldLength];
            }

            this.dijitDialogPaneActionControl = domConstruct.create("div", {}, this.div1);
            this.spanDialogBox = domConstruct.create("span", { "class": "esriCTspanDialogBox" }, this.dijitDialogPaneActionControl);
            customButton = new Button({
                label: "OK"
            }, this.spanDialogBox);

            on(customButton, "click", function () {
                _self.myDialog.hide();
                _self._findSelectedCheckBox(_self.divCheckBox, dialogBoxId);
            });
            return this.div1;

        },

        /**
        *get selected checkbox in detail summary report dialog box
        *
        * @class
        * @name widgets/reports/reports
        */
        _findSelectedCheckBox: function () {
            var value, t, i;
            this.dialogBoxTrue = true;
            this.initialReportCreated = false;
            t = query(".inputValues");
            for (i = 0; i < t.length; i++) {
                if (t[i].childNodes[i].checked) {
                    value = t[i].childNodes[i].value;
                    this._createReport(value);
                }

            }
        },

        /**
        *hide moving dijit dialog box
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
        *add dynamic textbox for entering bearing and distance value
        * @class
        * @name widgets/reports/reports
        */
        _addBearingTextBox: function () {
            var bearingTextBoxContainer, bearingFirstColumn, bearingSecondColumn, bearingThirdColumn, bearingFourthColumn, bearingFifthColumn, distanceUnit,
                inputFirstColumnText, inputSecondClmnTxt, inputThirdClmnTxt, inputFourthClmnTxt, intialLat, initiallong, initialbearing, initialdistance, aoiAttributesIndex;
            this.bearingOuterContainer = domConstruct.create("div", {}, this.divBearingTextboxContainer);
            bearingTextBoxContainer = domConstruct.create("div", { "class": "esriCTBearingTextbox" }, this.bearingOuterContainer, "last");

            bearingFirstColumn = domConstruct.create("div", { "class": "esriCTBearingFirstColumn" }, bearingTextBoxContainer);
            inputFirstColumnText = document.createElement("label");
            inputFirstColumnText.type = "text";
            inputFirstColumnText.innerHTML = "Bearing";
            bearingFirstColumn.appendChild(inputFirstColumnText);

            bearingSecondColumn = domConstruct.create("div", { "class": "esriCTBearingSecondColumn esriCTLabelAlignment" }, bearingTextBoxContainer);
            inputSecondClmnTxt = document.createElement("label");
            inputSecondClmnTxt.type = "text";
            inputSecondClmnTxt.innerHTML = this.addBearingValue.value;
            bearingSecondColumn.appendChild(inputSecondClmnTxt);

            bearingThirdColumn = domConstruct.create("div", { "class": "esriCTBearingThirdColumn" }, bearingTextBoxContainer);
            inputThirdClmnTxt = document.createElement("label");
            inputThirdClmnTxt.type = "text";
            inputThirdClmnTxt.innerHTML = "Distance";
            bearingThirdColumn.appendChild(inputThirdClmnTxt);

            bearingFourthColumn = domConstruct.create("div", { "class": "esriCTBearingFourthColumn esriCTLabelAlignment" }, bearingTextBoxContainer);
            inputFourthClmnTxt = document.createElement("label");
            inputFourthClmnTxt.type = "text";
            // distance parameter in configurable
            inputFourthClmnTxt.innerHTML = this.addDistanceMiles.value + " " + dojo.configData.BearingDistanceUnit;
            bearingFourthColumn.appendChild(inputFourthClmnTxt);
            aoiAttributesIndex = this._getAOIAttrubutesIndex();
            bearingFifthColumn = domConstruct.create("div", { "class": "esriCTBearingFifthColumn" }, bearingTextBoxContainer);
            this.destroyTxtBox = domConstruct.create("div", { "class": "esriCTCloseIcon esriCTCloseButtonAlignment", "aoiAttributesIndex": aoiAttributesIndex }, bearingFifthColumn);

            this.own(on(this.destroyTxtBox, "click", lang.hitch(this, function (evt) {
                var index;
                aoiAttributesIndex = domAttr.get(evt.currentTarget, "aoiAttributesIndex");
                if (this.AOIAttributes.length > 0) {
                    for (index = 0; index < this.AOIAttributes.length; index++) {
                        if (parseInt(this.AOIAttributes[index].aoiAttributesIndex, 10) === parseInt(aoiAttributesIndex, 10)) {
                            this.AOIAttributes.splice(index, 1);
                            break;
                        }
                    }
                    this._clearAllGraphics();
                    this._updateAOIonMap();
                    dojo.destroy(bearingTextBoxContainer);
                }
            })));

            // use last located point as start point to generate AOI.
            if (this.AOIAttributes.length === 0) {
                intialLat = this.startPointLongitude;
                initiallong = this.startPointLatitude;
            } else {
                intialLat = this.AOIAttributes[this.AOIAttributes.length - 1].longitude;
                initiallong = this.AOIAttributes[this.AOIAttributes.length - 1].latitude;
            }
            initialbearing = this.addBearingValue.value;
            initialdistance = this.addDistanceMiles.value;
            distanceUnit = dojo.configData.BearingDistanceUnit;
            this.destVincenty(intialLat, initiallong, initialbearing, this._convertDistanceIntoMiles(initialdistance, distanceUnit), false, aoiAttributesIndex);
            this.addBearingValue.value = this.addDistanceMiles.value = "";
            this.resizeAOIPanel();
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
            var tmp, lat2, lambda, long2, normalizedVal, polylineSymbol, graphic, sinSigma, cosSigma, C, L,
                a = 6378137, deltaSigma, locatorMarkupSymbol,
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

            locatorMarkupSymbol = new SimpleMarkerSymbol(
                SimpleMarkerSymbol.STYLE_CIRCLE,
                12,
                new SimpleLineSymbol(
                    SimpleLineSymbol.STYLE_SOLID,
                    new Color(dojo.configData.AOISymbology.PointSymbolBorder),
                    dojo.configData.AOISymbology.PointSymbolBorderWidth
                ),
                new Color(dojo.configData.AOISymbology.PointFillSymbolColor)
            );
            polylineSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                        new Color([255, 0, 0]), 3);
            normalizedVal = webMercatorUtils.lngLatToXY(long2, lat2);
            this.mapPoint = new esri.geometry.Point(normalizedVal[0], normalizedVal[1], this.map.spatialReference);
            graphic = new esri.Graphic(this.mapPoint, locatorMarkupSymbol, {}, null);

            this.map.setLevel(dojo.configData.ZoomLevel);
            this.map.centerAt(this.mapPoint);
            if (this.flagMultiplePoints === 0) {
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                this.polyLine.addPath([[this.mapPoint.x, this.mapPoint.y]]);
                this.flagMultiplePoints++;
                this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                topic.publish("createBuffer", this.mapPoint, null);
            } else {
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                if (this.polyLine.paths.length > 0) {
                    this.polyLine.paths[0].push([this.mapPoint.x, this.mapPoint.y]);
                } else {
                    this.polyLine.addPath([[this.mapPoint.x, this.mapPoint.y]]);
                }
                // this.map.graphics.add(new Graphic(this.polyLine, polylineSymbol));
                this.map.getLayer("esriGraphicsLayerMapSettings").add(new Graphic(this.polyLine, polylineSymbol));
                topic.publish("createBuffer", this.polyLine, null);
            }
            // distance is converted into meter so unit will be meter
            this.AOIAttributes.push({ "longitude": long2, "latitude": lat2, "bearing": brng, "distance": dist, "unit": "meters", "aoiAttributesIndex": aoiAttributesIndex });
        },

        //Validate the numeric text box control
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

        //Validate the text box such that mandatory field should not be left empty
        _validateBearingInputText: function () {
            var allFieldValid = false;
            if (lang.trim(this.addLatitudeValue.value) === "" || lang.trim(this.addLatitudeValue.value) < -180 || lang.trim(this.addLatitudeValue.value) > 180) {
                alert(sharedNls.errorMessages.addLongitudeValue);
            } else if (lang.trim(this.addLongitudeValue.value) === "" || lang.trim(this.addLongitudeValue.value) < -90 || lang.trim(this.addLongitudeValue.value) > 90) {
                alert(sharedNls.errorMessages.addLattitudeValue);
            } else if (lang.trim(this.addBearingValue.value) === "" || lang.trim(this.addBearingValue.value) < 0 || lang.trim(this.addBearingValue.value) > 360) {
                alert(sharedNls.errorMessages.addBearingValue);
            } else if (lang.trim(this.addDistanceMiles.value) === "") {
                alert(string.substitute(sharedNls.errorMessages.addDistanceMiles, [dojo.configData.BearingDistanceUnit]));
            } else if (lang.trim(this.addDistanceMiles.value) < 0 || lang.trim(this.addDistanceMiles.value) > dojo.configData.BearingDistanceMaxLimit) {
                alert(string.substitute(sharedNls.errorMessages.distanceMaxLimit, [dojo.configData.BearingDistanceMaxLimit]));
            } else {
                allFieldValid = true;
            }
            return allFieldValid;
        },

        _generateFeatureCollection: function (fileName) {
            if (fileName) {
                topic.publish("showProgressIndicator");
                self = this;
                var params, uploadFileUrl;
                uploadFileUrl = dojo.configData.UploadFileUrl;
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
                alert("Please browse a file.");
            }
        },

        errorHandler: function (error) {
            alert(error.message);
            topic.publish("hideProgressIndicator");
        },

        _generateAnalysisFeatureCollection: function (fileName) {
            if (fileName) {
                topic.publish("showProgressIndicator");
                var params, uploadFileUrl;
                uploadFileUrl = dojo.configData.UploadFileUrl;
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
                alert("Please browse a file.");
            }
        },

        uploadAnalysisSucceeded: function (response) {
            var gp = new Geoprocessor(dojo.configData.AnalyseShapefile), itemID, dataFile, params, anlaysisData;
            itemID = response.item.itemID;
            dataFile = new DataFile();
            dataFile.itemID = itemID;
            anlaysisData = this.shapeFileForAnalysis;
            params = { "Area_of_Interest": anlaysisData, "Zip_File_Name": dataFile };
            gp.submitJob(params, lang.hitch(this, this.gpAnalysisJobComplete), this.gpAnlysisJobStatus, this.gpAnalysisJobFailed);

        },


        errorAnalysisHandler: function (error) {
            alert(error.message);
            topic.publish("hideProgressIndicator");
        },

        uploadSucceeded: function (response) {
            var gp = new Geoprocessor(dojo.configData.ShapefileTOAOI), itemID, dataFile, bufferDistance, params;
            itemID = response.item.itemID;
            dataFile = new DataFile();
            dataFile.itemID = itemID;
            bufferDistance = new LinearUnit();
            bufferDistance.distance = this.sliderDistance;
            bufferDistance.units = this.shapeFileUnitValue;
            params = { "Zip_file": dataFile, "BufferDistance": bufferDistance };
            gp.outSpatialReference = this.map.spatialReference;
            gp.outputSpatialReference = this.map.spatialReference;

            gp.submitJob(params, lang.hitch(this, this.gpJobComplete), this.gpJobStatus, this.gpJobFailed);
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
                alert("Failed to execute (AnalyseShapefile)");
                topic.publish("hideProgressIndicator");
            }

        },

        _downloadAnalysisFile: function (SumTable) {
            if (SumTable.value.features.length === 0) {
                alert("No features are available in AOI");
                topic.publish("hideProgressIndicator");
                return;
            }
            var fAnalysisInnerArray = [];
            array.forEach(SumTable.value.features, function (item, index) {
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
            });

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

            this.divReportLayerAnalysisPanel = domConstruct.create("div", { "class": "esriCTAnalysisReportLayerPanel" }, this.reportScrollContent, "first");
            divReportLayerSettingPanel = domConstruct.create("div", { "class": "esriCTReportSettingPanel" }, this.divReportLayerAnalysisPanel);
            domConstruct.create("div", { "class": "divReportLayerTitle", "innerHTML": "Analyse shape file" }, divReportLayerSettingPanel);
            domConstruct.create("div", { "class": "esriCTsettingIcon" }, divReportLayerSettingPanel);
            for (i = 0; i < shapeAnalysisArray.length; i++) {
                domConstruct.create("div", { "class": "esriCTReportZoneName", "innerHTML": shapeAnalysisArray[i][0].field }, this.divReportLayerAnalysisPanel);
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
                    divFieldTypeContent = domConstruct.create("div", { "class": "esriCTReportZoneList" }, this.divReportLayerAnalysisPanel);
                    domConstruct.create("span", { "class": "esriCTReportZoneField", "innerHTML": uniqueFieldname + " " }, divFieldTypeContent);
                    domConstruct.create("span", { "class": "esriCTReportZoneCount", "innerHTML": ("(" + this.analysisString + " " + " - " + displayuniqueFieldValue + " " + this.initialUnit + " " + ")") }, divFieldTypeContent);
                }

            }
            if (this.reportPanelScrollbar) {
                domClass.add(this.reportPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.reportPanelScrollbar.removeScrollBar();
            }
            reportPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]).h - (dojo.coords(this.uploadAOIContainer).h + dojo.coords(this.downloadReportContainer).h + dojo.coords(dojo.query(".esriCTRightPanel")[0]).h + 100) + "px";
            domStyle.set(this.reportContent, "height", reportPanelHeight);
            this.reportPanelScrollbar = new ScrollBar({ domNode: this.reportContent });
            this.reportPanelScrollbar.setContent(this.reportScrollContent);
            this.reportPanelScrollbar.createScrollBar();
            topic.publish("hideProgressIndicator");
        },

        _createAnalysisReportContent: function (featureCollection, featureArrayCollection) {
            this.changeFeatureSetUnit = [];
            this.storeFeatureArrayCollection = featureArrayCollection;
            var count, j, target, divReportLayerSettingPanel, divReportLayerPanel, divReportLayersettingIcon, divFieldTypeContent, title;
            divReportLayerPanel = domConstruct.create("div", { "class": "esriCTReportLayerPanel" }, this.reportScrollContent);
            divReportLayerSettingPanel = domConstruct.create("div", { "class": "esriCTReportSettingPanel" }, divReportLayerPanel);
            domConstruct.create("div", { "class": "divReportLayerTitle", "innerHTML": dojo.configData.SearchSettings[featureCollection].SearchDisplayTitle }, divReportLayerSettingPanel);
            divReportLayersettingIcon = domConstruct.create("div", { "class": "esriCTsettingIcon", "displaytitle": dojo.configData.SearchSettings[featureCollection].SearchDisplayTitle, "id": dojo.configData.SearchSettings[featureCollection].QueryLayerId }, divReportLayerSettingPanel);

            this.own(on(divReportLayersettingIcon, "click", lang.hitch(this, function (evt) {
                target = evt.currentTarget || evt.srcElement;
                title = domAttr.get(target, "displaytitle");
                this._configureDialogBox(target.id, title);
            })));

            for (count = 0; count < featureArrayCollection.length; count++) {
                domConstruct.create("div", { "class": "esriCTReportZoneName", "innerHTML": featureArrayCollection[count].FieldName }, divReportLayerPanel, "last");
                for (j = 0; j < featureArrayCollection[count].attr.length; j++) {
                    this.value = string.substitute("${" + featureArrayCollection[count].FieldName + "}", featureArrayCollection[count].attr[j].attributes);

                    this.StatisticTypeValue = string.substitute("${Total}", featureArrayCollection[count].attr[j].attributes);
                    if (featureArrayCollection[featureCollection].unitType === sharedNls.titles.areaStandardUnit && this.initialCountValue !== 0) {
                        this.StatisticTypeValue = parseFloat(this.StatisticTypeValue);
                        this.StatisticTypeValue = (this.StatisticTypeValue * 247.105);
                    }
                    this.storeFeatureArrayCollection[count].attr[j].attributes.Total = this.StatisticTypeValue;
                    divFieldTypeContent = domConstruct.create("div", { "class": "esriCTReportZoneList" }, divReportLayerPanel);
                    domConstruct.create("span", { "class": "esriCTReportZoneField", "innerHTML": this.value + " " }, divFieldTypeContent);
                    domConstruct.create("span", { "class": "esriCTReportZoneCount", "innerHTML": ("(" + featureArrayCollection[featureCollection].FieldTypeValue + " " + " - " + parseInt(this.StatisticTypeValue, 10) + (featureArrayCollection[featureCollection].unitType === "" ? "" : " ") + featureArrayCollection[featureCollection].unitType + ")") }, divFieldTypeContent);
                }
            }
        },

        _downloadFile: function (output) {
            this.map.getLayer("esriGraphicsLayerMapSettings").clear();
            this.map.getLayer("tempBufferLayer").clear();
            var geometryService = new GeometryService(dojo.configData.GeometryService), feature = output.value.features[0], symbol, rendererColor, lineColor, fillColor, graphicObj;
            this.shapeFileForAnalysis = output.value;
            this.shapeFilegeometryType = output.value.features[0].geometry.type;
            if (feature && feature.geometry) {
                geometryService.simplify([feature.geometry], lang.hitch(this, function (geometries) {
                    if ((geometries[0] && geometries[0].type === "multipoint") || (geometries[0] && geometries[0].type === "point")) {
                        symbol = new SimpleMarkerSymbol();
                    } else if (geometries[0] && geometries[0].type === "polyline") {
                        symbol = new SimpleLineSymbol();
                    } else {
                        rendererColor = dojo.configData.rendererColor;
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
                    topic.publish("hideProgressIndicator");

                }), lang.hitch(this, function () {
                    alert("Geometry not valid");
                }));
            } else {
                alert("Features not found.");
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
            this.initialCountValue = 0;
            if (domStyle.get(this.esriCTchangeStandardUnit, "display") === "block") {
                domStyle.set(this.esriCTchangeMetricUnit, "display", "block");
                domStyle.set(this.esriCTchangeStandardUnit, "display", "none");
            } else if (domStyle.get(this.esriCTchangeStandardUnit, "display") === "none") {
                domStyle.set(this.esriCTchangeMetricUnit, "display", "none");
                domStyle.set(this.esriCTchangeStandardUnit, "display", "block");
            }

            if (this.storeFeatureArrayCollection) {
                for (i = 0; i < this.storeFeatureArrayCollection.length; i++) {

                    if (this.storeFeatureArrayCollection[i].unitType === sharedNls.titles.areaStandardUnit) {
                        this._convertUnit(sharedNls.titles.areaMetricUnit, 0.0040468564300508, i);
                    } else if (this.storeFeatureArrayCollection[i].unitType === sharedNls.titles.areaMetricUnit) {
                        this._convertUnit(sharedNls.titles.areaStandardUnit, 247.105381, i);
                    } else if (this.storeFeatureArrayCollection[i].unitType === sharedNls.titles.lineStandardUnit) {
                        this._convertUnit(sharedNls.titles.lineMetricUnit, 1.609344497892563, i);
                    } else if (this.storeFeatureArrayCollection[i].unitType === sharedNls.titles.lineMetricUnit) {
                        this._convertUnit(sharedNls.titles.lineStandardUnit, 0.621371, i);
                    }
                }
                this._displayReport(this.storeFeatureArrayCollection);
            }

            if (this.shapeAreaAnalysisEnable) {
                this.initialAnalysisValues = 0;
                this._toggleShapeFileAreaUnit(this.analysisString, this.geometryTypeAnalysis, this.initialUnit);
            }
        },

        _convertUnit: function (Unit, MultiplyBy, i) {
            var j, valueBeforeUnitChange, valueAfterUnitChange;
            for (j = 0; j < this.storeFeatureArrayCollection[i].attr.length; j++) {
                valueBeforeUnitChange = string.substitute("${Total}", this.storeFeatureArrayCollection[i].attr[j].attributes);
                valueAfterUnitChange = (valueBeforeUnitChange * MultiplyBy);
                this.storeFeatureArrayCollection[i].attr[j].attributes.Total = valueAfterUnitChange;
                this.storeFeatureArrayCollection[i].unitType = Unit;
            }
        },

        _toggleShapeFileAreaUnit: function (analysisString, geometryTypeAnalysis) {
            if (geometryTypeAnalysis === "area_acres") {
                this.geometryTypeAnalysis = "area_sqkm";
                this.initialUnit = "sq.Km";
            } else if (geometryTypeAnalysis === "area_sqkm") {
                this.geometryTypeAnalysis = "area_acres";
                this.initialUnit = "acres";
            } else if (geometryTypeAnalysis === "length_Miles") {
                this.geometryTypeAnalysis = "length_Km";
                this.initialUnit = "Km";
            } else if (geometryTypeAnalysis === "length_Km") {
                this.geometryTypeAnalysis = "length_Miles";
                this.initialUnit = "miles";
            } else {
                this.geometryTypeAnalysis = "Count";
                this.initialUnit = "";
            }
            this._displayAnalysisReport(this.fAnalysisArray);
        },

        closeDialogBox: function () {
            this.myDialog.hide();
        },

        _resizeDialogBox: function () {
            if (domStyle.get(this.myDialog.domNode, "display") === "block") {
                this.myDialog.hide();
                setTimeout(lang.hitch(this, function () {
                    this.myDialog.show();
                }), 500);
            }
        }

    });
});
