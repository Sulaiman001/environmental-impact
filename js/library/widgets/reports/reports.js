/*global define,dojo,dojoConfig,esri,esriConfig,alert,dijit,params,dialog:true*/
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
    "dojo/i18n!application/nls/localizedStrings",
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
    "esri/geometry/Polyline"


], function (declare, domConstruct, on, topic, lang, array, domStyle, domAttr, dom, query, domClass, domGeom, GeometryService, Dialog, string, html, template, Color, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, TooltipDialog, Place, CheckBox, Button, Graphic, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, appNls, GraphicsLayer, Draw, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, RadioButton, ScrollBar, Deferred, DeferredList, Query, QueryTask, AreasAndLengthsParameters, esriRequest, dojoJson, Point, dojoString, webMercatorUtils, Polyline) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        appNls: appNls,
        logoContainer: null,
        aoiPanelScrollbar: null,
        reportPanelScrollbar: null,
        stagedBuffer: null,
        featureGeometry: null,
        sliderDistance: null,
        sliderUnitValue: null,
        flagMultiplePoints: null,
        polyLine: null,
        mapArrayPoint: [],

        /**
        * create reports widget
        *
        * @class
        * @name widgets/reports/reports
        */
        postCreate: function () {
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
            topic.subscribe("showMapTipForRoad", lang.hitch(this, this.showMapTipForRoad));
            topic.subscribe("hideMapTip", lang.hitch(this, this.hideMapTip));
            topic.subscribe("createBuffer", lang.hitch(this, this._createBuffer));
            topic.subscribe("destVincenty", lang.hitch(this, this.destVincenty));
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
            })));
            this.own(on(this.addBearingTextBox, "click", lang.hitch(this, function () {
                this._validateBearingInputText();
            })));

            this.own(on(this.reportTab, "click", lang.hitch(this, function () {
                this._showReportsTab();
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

            this._createSelectionTool();
            this.flagMultiplePoints = 0;
            topic.publish("resizeAOIPanel");
            topic.publish("resizeReportsPanel");

            this.own(on(dom.byId("selectonmap"), "click", lang.hitch(this, function () {
                dojo.addPushPin = true;
                if (dojo.mouseMoveHandle) {
                    dojo.mouseMoveHandle.remove();
                }
                dojo.mouseMoveHandle = this.map.on("mouse-move", lang.hitch(this, function (evt) {
                    topic.publish("showMapTipForRoad", evt);
                }));
            })));

            this.own(on(this.divInitialCoordinates, "click", lang.hitch(this, function () {
                dojo.initialCoordinates = true;
            })));


            topic.publish("setDefaultTextboxValue", this.txtAOIAddress, "defaultAOIAddress", dojo.configData.LocatorSettings.LocatorDefaultAOIAddress);
            this.txtAOIAddress.value = domAttr.get(this.txtAOIAddress, "defaultAOIAddress");
            var locatorParams = {
                divSearch: this.divAOISearch,
                close: this.clearAOITextbox,
                imgSearchLoader: this.imgAOISearchLoader,
                textAddress: this.txtAOIAddress,
                divResults: this.divAOIAddressResults,
                divAddressContent: this.divAOIAddressContent,
                divAddressScrollContent: this.divAOIAddressScrollContent,
                isAOISearch: true,
                isAOIBearingSearch: false
            };
            topic.publish("attachLocatorEvents", locatorParams);
            this.reportsLoader = domConstruct.create("img", { "class": "esriCTInfoLoader" }, this.reportContent);
            domAttr.set(this.reportsLoader, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            this._hideLoadingIndicatorReports();

            this.myDialog = new Dialog({
                style: "width: 400px",
                title: "Managed Lands",
                "class": "esriDijitDialog"
            });
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

        _showAOITab: function () {
            if (domStyle.get(this.reportContainer, "display") === "block") {
                domStyle.set(this.reportContainer, "display", "none");
                domStyle.set(this.areaOfInterestContainer, "display", "block");
                domClass.replace(this.areaOfInterestTab, "esriCTAreaOfInterestTabSelected", "esriCTAreaOfInterestTab");
                domClass.replace(this.areaOfInterestContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                domClass.replace(this.reportTab, "esriCTReportTabSelected", "esriCTReportTab");
            }
        },

        _showReportsTab: function () {
            if (domStyle.get(this.reportContainer, "display") === "none") {
                domStyle.set(this.reportContainer, "display", "block");
                domStyle.set(this.areaOfInterestContainer, "display", "none");
                domClass.replace(this.areaOfInterestTab, "esriCTAreaOfInterestTab", "esriCTAreaOfInterestTabSelected");
                domClass.replace(this.reportTab, "esriCTReportTab", "esriCTReportTabSelected");
            }
        },

        _createSelectionTool: function () {
            var divAreaIntContainer, divSelectionContainer, toolbar, _self, radioBtnValue, radioContent, divRadioBtn, index, i, radioButton, radioLabel;
            divAreaIntContainer = domConstruct.create("div", { "class": "esriCTAreaIntContainer" }, null);
            domConstruct.place(divAreaIntContainer, this.divAOIAddressContent, "before");

            domConstruct.create("div", { "innerHTML": sharedNls.messages.drawToolsText, "class": "esriCTAOIlabel" }, divAreaIntContainer);
            divSelectionContainer = domConstruct.create("div", { "class": "esriCTdrawingTools" }, divAreaIntContainer);

            domConstruct.create("div", { "class": "drawPoint esriCTSelectionIcon", "id": "point", "title": sharedNls.titles.pointToolText }, divSelectionContainer);
            domConstruct.create("div", { "class": "drawDrawing esriCTSelectionIcon", "id": "line", "title": sharedNls.titles.lineToolText }, divSelectionContainer);
            domConstruct.create("div", { "class": "drawRectangle esriCTSelectionIcon", "id": "extent", "title": sharedNls.titles.rectangleToolText }, divSelectionContainer);
            domConstruct.create("div", { "class": "drawPolygon esriCTSelectionIcon", "id": "polygon", "title": sharedNls.titles.polygonToolText }, divSelectionContainer);
            domConstruct.create("div", { "class": "select-on-map esriCTSelectionIcon", "id": "selectonmap", "title": sharedNls.titles.selectFeatureText }, divSelectionContainer);

            toolbar = new Draw(this.map);
            _self = this;
            array.forEach(query(".esriCTSelectionIcon"), function (value) {
                _self.own(on(value, "click", function () {
                    _self.activateTool(this.id, toolbar);
                }));
            });

            toolbar.on("draw-end", function (evt) {
                _self.addToMap(evt, toolbar, this.sliderUnitValue);
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
                var sliderText, message;
                sliderText = this.sliderMessage.innerHTML.split(/\d+/g);
                message = sliderText[0] + " " + Math.round(value) + " " + sliderText[1];
                this.sliderMessage.innerHTML = message;
                this.sliderDistance = Math.round(value);
                if (this.map.graphics.graphics[0].symbol) {
                    clearTimeout(this.stagedBuffer);
                    this.stagedBuffer = setTimeout(lang.hitch(this, function () {
                        topic.publish("createBuffer", this.featureGeometry, this.sliderUnitValue);
                    }), 500);
                }
            })));

            domConstruct.place(this.divRadioButtonContainer, this.divSliderContainer, "after");
            this._createLinkContainer(divAreaIntContainer);
        },

        _getSliderValue: function (value) {
            var index;
            index = Number(domAttr.get(value.target, "index"));
            this.sliderUnitValue = this._sliderStartEndValue(value.target.value, this._horizontalSlider, index, true);
        },

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


        _createLinkContainer: function (divAreaIntContainer) {
            var divLinkContainer, divLinkUpload, divLinkDrawTool, divLinkCoordinates;
            divLinkContainer = domConstruct.create("div", { "class": "esriCTLinkContainer" }, this.areaOfInterestDrawTools);
            domConstruct.create("div", { "class": "esriCTLinkHeader", "innerHTML": sharedNls.messages.aoiOptionsText }, divLinkContainer);
            divLinkUpload = domConstruct.create("div", { "class": "esriCTAOILink", "innerHTML": sharedNls.messages.uploadShapefileText }, divLinkContainer);
            divLinkDrawTool = domConstruct.create("div", { "class": "esriCTAOILink", "innerHTML": sharedNls.messages.drawToolsText }, divLinkContainer);
            domStyle.set(divLinkDrawTool, "display", "none");
            divLinkCoordinates = domConstruct.create("div", { "class": "esriCTAOILink", "innerHTML": sharedNls.messages.coordinatesText }, divLinkContainer);
            on(divLinkUpload, "click", lang.hitch(this, function () {
                this._showFileUploadContainer(divAreaIntContainer, divLinkUpload, divLinkDrawTool, divLinkCoordinates);
            }));

            on(divLinkDrawTool, "click", lang.hitch(this, function () {
                this._showDrawContainer(divAreaIntContainer, divLinkUpload, divLinkDrawTool, divLinkCoordinates);
            }));

            on(divLinkCoordinates, "click", lang.hitch(this, function () {
                this._showBearingContainer(divAreaIntContainer, divLinkUpload, divLinkDrawTool, divLinkCoordinates);
                topic.publish("setDefaultTextboxValue", this.txtAOIBearingAddress, "defaultAOIBearingAddress", dojo.configData.LocatorSettings.LocatorDefaultAOIAddress);
                this.txtAOIBearingAddress.value = domAttr.get(this.txtAOIBearingAddress, "defaultAOIBearingAddress");
                var locatorParams = {
                    divSearch: this.divAOIBearingSearch,
                    close: this.clearAOIBearingTextbox,
                    imgSearchLoader: this.imgAOIBearingSearchLoader,
                    textAddress: this.txtAOIBearingAddress,
                    divResults: this.divAOIBearingAddressResults,
                    divAddressContent: this.divAOIBearingAddressContent,
                    divAddressScrollContent: this.divAOIBearingAddressScrollContent,
                    isAOIBearingSearch: true,
                    isAOISearch: false
                };

                topic.publish("attachLocatorEvents", locatorParams);
                this.polyLine = new Polyline(new esri.SpatialReference({ "wkid": this.map.spatialReference.wkid }));
            }));
        },

        _showBearingHeight: function () {
            var bearingPanelHeight;
            if (this.bearingPanelScrollbar) {
                domClass.add(this.bearingPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.bearingPanelScrollbar.removeScrollBar();
            }
            bearingPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]) - 138 + "px";
            domStyle.set(this.divBearingDisplayContent, "height", bearingPanelHeight);
            this.bearingPanelScrollbar = new ScrollBar({ domNode: this.divBearingDisplayContent });
            this.bearingPanelScrollbar.setContent(this.divBearingScrollContent);
            this.bearingPanelScrollbar.createScrollBar();

        },

        _showFileUploadContainer: function (divAreaIntContainer, divLinkUpload, divLinkDrawTool, divLinkCoordinates) {
            domStyle.set(divAreaIntContainer, "display", "none");
            domStyle.set(this.divAOIAddressContent, "display", "none");
            domStyle.set(this.divFileUploadContainer, "display", "block");
            domStyle.set(this.divBearingContainer, "display", "none");
            domStyle.set(divLinkUpload, "display", "none");
            domStyle.set(divLinkDrawTool, "display", "block");
            domStyle.set(divLinkCoordinates, "display", "block");
        },

        _showDrawContainer: function (divAreaIntContainer, divLinkUpload, divLinkDrawTool, divLinkCoordinates) {
            domStyle.set(divAreaIntContainer, "display", "block");
            domStyle.set(this.divAOIAddressContent, "display", "block");
            domStyle.set(this.divFileUploadContainer, "display", "none");
            domStyle.set(this.divBearingContainer, "display", "none");
            domStyle.set(divLinkUpload, "display", "block");
            domStyle.set(divLinkDrawTool, "display", "none");
            domStyle.set(divLinkCoordinates, "display", "block");
        },

        _showBearingContainer: function (divAreaIntContainer, divLinkUpload, divLinkDrawTool, divLinkCoordinates) {
            domConstruct.place(this.divBearingContainer, this.divBufferDistance, "before");
            domStyle.set(divAreaIntContainer, "display", "none");
            domStyle.set(this.divAOIAddressContent, "display", "none");
            domStyle.set(this.divFileUploadContainer, "display", "none");
            domStyle.set(this.divBearingContainer, "display", "block");
            domStyle.set(divLinkUpload, "display", "block");
            domStyle.set(divLinkDrawTool, "display", "block");
            domStyle.set(divLinkCoordinates, "display", "none");
        },

        _sliderStartEndValue: function (radioBtnValue, horizontalSlider, index, radioClicked) {
            var sliderStartValue, sliderEndValue;
            switch (radioBtnValue) {
            case "Miles":
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_STATUTE_MILE";
                break;
            case "Feet":
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_FOOT";
                break;
            case "Meters":
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_METER";
                break;
            case "Kilometers":
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_KILOMETER";
                break;
            default:
                sliderStartValue = dojo.configData.DistanceUnitSettings[index].MinimumValue;
                sliderEndValue = dojo.configData.DistanceUnitSettings[index].MaximumValue;
                this.sliderUnitValue = "UNIT_STATUTE_MILE";
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

        activateTool: function (id, toolbar) {
            var tool;
            dojo.activatedDrawTool = true;
            tool = id.toUpperCase().replace(/ /g, "_");
            toolbar.activate(Draw[tool]);
        },

        addToMap: function (evt, toolbar, sliderUnitValue) {
            var symbol, graphic, geometry;
            this.map.graphics.clear();
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
                geometry = evt.geometry;
                symbol = new esri.geometry.Polygon(geometry.spatialReference);
                symbol.addRing([[geometry.xmin, geometry.ymin], [geometry.xmin, geometry.ymax], [geometry.xmax, geometry.ymax], [geometry.xmax, geometry.ymin], [geometry.xmin, geometry.ymin]]);
                break;
            case "polygon":
                symbol = new SimpleLineSymbol();
                break;
            default:
                symbol = new SimpleFillSymbol();
                break;
            }
            graphic = new Graphic(evt.geometry, symbol);
            this.map.graphics.add(graphic);
            topic.publish("createBuffer", evt.geometry, this.sliderUnitValue);
        },

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
                            this._showReportsTab();
                        }));
                    }));
                }
                if (this.featureGeometry.type === "polyline") {
                    //if geometry is a polygon then simplify polygon.  This will make the user drawn polygon topologically correct.
                    geometryService.simplify([this.featureGeometry], lang.hitch(this, function (geometries) {
                        params.geometries = geometries;
                        geometryService.buffer(params, lang.hitch(this, function (geometries) {
                            this.showBuffer(geometries);
                            this._showReportsTab();
                        }));
                    }));
                } else {
                    params.geometries = [this.featureGeometry];
                    geometryService.buffer(params, lang.hitch(this, function (geometries) {
                        this.showBuffer(geometries);
                        this._showReportsTab();
                    }));
                }
            } else {
                if (this.featureGeometry.type === "polygon") {
                    this._showReportsTab();
                    //if geometry is a polygon and buffer is not drawn, then also query the layers
                    this._queryLayers(this.featureGeometry);
                    this._showReportsTab();
                } else {
                    alert(sharedNls.errorMessages.bufferSliderValue);
                }
            }
        },


        showBuffer: function (bufferedGeometries) {
            var _self, symbol;
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
                var graphic = new Graphic(geometry, symbol);
                _self.map.getLayer("tempBufferLayer").clear();
                _self.map.getLayer("tempBufferLayer").add(graphic);
                _self.map.setExtent(graphic.geometry.getExtent().expand(1.6));
                _self._queryLayers(geometry);
            });
        },

        _queryLayers: function (geometry) {
            var _self = this, statisticResultArray = [], layerFieldCount = [], reportFields, staticFieldName, reportFieldName, staticTypeValue,
                index,
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
                var i, statisticType, layerInfoCollection = [], reportFieldsCount = 0, count, standardPointLayerUnit;
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
                            this._createReport();
                        }
                    }));
                }
            }), function (err) {
                alert(err.message);
            });
        },

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

        _displayReport: function (featureArrayCollection) {
            var featureCollection, reportPanelHeight;
            domConstruct.empty(this.reportScrollContent);
            this._hideLoadingIndicatorReports();
            for (featureCollection = 0; featureCollection < dojo.configData.SearchSettings.length; featureCollection++) {
                this._createReportPanelContent(featureCollection, featureArrayCollection);
            }
            if (this.reportPanelScrollbar) {
                domClass.add(this.reportPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.reportPanelScrollbar.removeScrollBar();
            }
            reportPanelHeight = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]) - 138 + "px";
            domStyle.set(this.reportContent, "height", reportPanelHeight);
            this.reportPanelScrollbar = new ScrollBar({ domNode: this.reportContent });
            this.reportPanelScrollbar.setContent(this.reportScrollContent);
            this.reportPanelScrollbar.createScrollBar();

        },

        _createReportPanelContent: function (featureCollection, featureArrayCollection) {
            var count, j, target, divReportLayerSettingPanel, divReportLayerPanel, divReportLayersettingIcon, divFieldTypeContent;
            divReportLayerPanel = domConstruct.create("div", { "class": "esriCTReportLayerPanel" }, this.reportScrollContent);
            divReportLayerSettingPanel = domConstruct.create("div", { "class": "esriCTReportSettingPanel" }, divReportLayerPanel);
            domConstruct.create("div", { "class": "divReportLayerTitle", "innerHTML": dojo.configData.SearchSettings[featureCollection].SearchDisplayTitle }, divReportLayerSettingPanel);
            divReportLayersettingIcon = domConstruct.create("div", { "class": "esriCTsettingIcon", "id": dojo.configData.SearchSettings[featureCollection].QueryLayerId }, divReportLayerSettingPanel);

            this.own(on(divReportLayersettingIcon, "click", lang.hitch(this, function (evt) {
                target = evt.currentTarget || evt.srcElement;
                this._configureDialogBox(target.id);
            })));
            for (count = 0; count < featureArrayCollection.length; count++) {
                if ((featureArrayCollection[count].FieldName === dojo.configData.SearchSettings[featureCollection].QuickSummaryReportFields) ||
                        (featureArrayCollection[count].FieldName === dojo.configData.SearchSettings[featureCollection].GroupByField) ||
                        (featureArrayCollection[count].FieldName === dojo.configData.SearchSettings[featureCollection].DetailSummaryReportFields[0])) {
                    domConstruct.create("div", { "class": "esriCTReportZoneName", "innerHTML": featureArrayCollection[count].FieldName }, divReportLayerPanel, "last");
                    for (j = 0; j < featureArrayCollection[count].attr.length; j++) {
                        this.value = string.substitute("${" + featureArrayCollection[count].FieldName + "}",
                            featureArrayCollection[count].attr[j].attributes);
                        this.StatisticTypeValue = string.substitute("${Total}", featureArrayCollection[count].attr[j].attributes);
                        if (typeof (featureArrayCollection[count].attr[j].attributes.Total) === "number" && this.StatisticTypeValue.indexOf(".") !== -1) {
                            this.StatisticTypeValue = parseFloat(this.StatisticTypeValue);
                            this.StatisticTypeValue = (this.StatisticTypeValue * 0.00024711);
                        }
                        divFieldTypeContent = domConstruct.create("div", { "class": "esriCTReportZoneList" }, divReportLayerPanel);
                        domConstruct.create("span", { "class": "esriCTReportZoneField", "innerHTML": this.value + " " }, divFieldTypeContent);
                        domConstruct.create("span", { "class": "esriCTReportZoneCount", "innerHTML": ("(" + featureArrayCollection[featureCollection].FieldTypeValue + " " + " - " + parseInt(this.StatisticTypeValue, 10) + (featureArrayCollection[featureCollection].unitType === "" ? "" : " ") + featureArrayCollection[featureCollection].unitType + ")") }, divFieldTypeContent);
                    }
                }
            }
        },


        _configureDialogBox: function (dialogBoxId) {
            var _self = this, DetailFieldValues, createContent, i;
            for (i = 0; i < dojo.configData.SearchSettings.length; i++) {
                if (dojo.configData.SearchSettings[i].QueryLayerId === dialogBoxId) {
                    DetailFieldValues = dojo.configData.SearchSettings[i].DetailSummaryReportFields;
                    createContent = _self.createContent(DetailFieldValues, dialogBoxId);
                    _self.myDialog.set("content", createContent);
                    _self.myDialog.show();
                }
            }
        },

        requestSucceeded: function (response, io) {
            var deferred = new Deferred();
            deferred.resolve(response);
        },

        requestFailed: function (error, io) {
            alert(error.message);
        },

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


        resizeAOIPanel: function () {
            var aoiPanelHeight, coords;
            if (this.aoiPanelScrollbar) {
                domClass.add(this.aoiPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.aoiPanelScrollbar.removeScrollBar();
            }
            coords = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]);
            this.calculateHeight = coords.h;
            aoiPanelHeight = this.calculateHeight - 130 + "px";
            domStyle.set(this.areaOfInterestContainer, "height", aoiPanelHeight);
            setTimeout(lang.hitch(this, function () {
                this.aoiPanelScrollbar = new ScrollBar({ domNode: this.areaOfInterestContainer });
                this.aoiPanelScrollbar.setContent(this.areaOfInterestContent);
                this.aoiPanelScrollbar.createScrollBar();
            }), 500);
        },

        resizeReportsPanel: function () {
            var reportPanelHeight, coords;
            if (this.reportPanelScrollbar) {
                domClass.add(this.reportPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.reportPanelScrollbar.removeScrollBar();
            }
            coords = dojo.coords(dojo.query(dom.byId("esriCTParentDivContainer"))[0]);
            this.calculatePanelHeight = coords.h;
            reportPanelHeight = this.calculatePanelHeight - 138 + "px";
            domStyle.set(this.reportContent, "height", reportPanelHeight);
            setTimeout(lang.hitch(this, function () {
                this.reportPanelScrollbar = new ScrollBar({ domNode: this.reportContent });
                this.reportPanelScrollbar.setContent(this.reportScrollContent);
                this.reportPanelScrollbar.createScrollBar();
            }), 500);
        },

        _showLoadingIndicatorReports: function () {
            domStyle.set(this.reportsLoader, "display", "block");
        },

        _hideLoadingIndicatorReports: function () {
            domStyle.set(this.reportsLoader, "display", "none");
        },

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
            customButton = new Button({
                label: "OK"
            }, this.dijitDialogPaneActionControl);

            on(customButton, "click", function () {
                _self.myDialog.hide();
                _self._findSelectedCheckBox(_self.divCheckBox, dialogBoxId);
            });
            return this.div1;

        },

        _findSelectedCheckBox: function (addReportCheckBox, dialogBoxId) {
            var value, t, i;
            this.dialogBoxTrue = true;
            t = query(".inputValues");
            for (i = 0; i < t.length; i++) {
                if (t[i].childNodes[i].checked) {
                    value = t[i].childNodes[i].value;
                    this._createReport(value);
                }

            }
        },

        showMapTipForRoad: function (evt) {
            topic.publish("hideMapTip");
            dialog = new TooltipDialog({
                content: "Press double click to stop",
                id: "toolTipDialogues",
                style: "position: absolute; z-index:1000;"
            });
            dialog.startup();
            domStyle.set(dialog.domNode, "opacity", 0.80);
            Place.at(dialog.domNode, { x: evt.pageX, y: evt.pageY }, ["TL", "TR"], { x: 5, y: 5 });
        },

        hideMapTip: function () {
            if (dijit.byId('toolTipDialogues')) {
                dijit.byId('toolTipDialogues').destroy();
            }
        },

        _creatingBuffer: function (geometry, val) {
            topic.publish("createBuffer", params.geometries, val);
        },

        _addBearingTextBox: function () {
            var bearingTextBoxContainer, bearingFirstColumn, bearingSecondColumn, bearingThirdColumn, bearingFourthColumn, bearingFifthColumn,
                inputFirstColumnText, inputSecondClmnTxt, inputThirdClmnTxt, inputFourthClmnTxt, intialLat, initiallong, initialbearing, initialdistance;
            bearingTextBoxContainer = domConstruct.create("div", { "class": "esriCTBearingTextbox" }, this.divBearingTextboxContainer, "last");

            bearingFirstColumn = domConstruct.create("div", { "class": "esriCTBearingFirstColumn" }, bearingTextBoxContainer);
            inputFirstColumnText = document.createElement("input");
            inputFirstColumnText.type = "text";
            inputFirstColumnText.value = this.addLatitudeValue.value;
            bearingFirstColumn.appendChild(inputFirstColumnText);

            bearingSecondColumn = domConstruct.create("div", { "class": "esriCTBearingSecondColumn" }, bearingTextBoxContainer);
            inputSecondClmnTxt = document.createElement("input");
            inputSecondClmnTxt.type = "text";
            inputSecondClmnTxt.value = this.addLongitudeValue.value;
            bearingSecondColumn.appendChild(inputSecondClmnTxt);

            bearingThirdColumn = domConstruct.create("div", { "class": "esriCTBearingThirdColumn" }, bearingTextBoxContainer);
            inputThirdClmnTxt = document.createElement("input");
            inputThirdClmnTxt.type = "text";
            inputThirdClmnTxt.value = this.addBearingValue.value;
            bearingThirdColumn.appendChild(inputThirdClmnTxt);

            bearingFourthColumn = domConstruct.create("div", { "class": "esriCTBearingFourthColumn" }, bearingTextBoxContainer);
            inputFourthClmnTxt = document.createElement("input");
            inputFourthClmnTxt.type = "text";
            inputFourthClmnTxt.value = this.addDistanceMiles.value;
            bearingFourthColumn.appendChild(inputFourthClmnTxt);

            bearingFifthColumn = domConstruct.create("div", { "class": "esriCTBearingFifthColumn" }, bearingTextBoxContainer);
            this.destroyTxtBox = domConstruct.create("div", { "class": "esriCTCloseIcon" }, bearingFifthColumn);
            intialLat = this.addLatitudeValue.value;
            initiallong = this.addLongitudeValue.value;
            initialbearing = this.addBearingValue.value;
            initialdistance = this.addDistanceMiles.value;



            this.own(on(this.destroyTxtBox, "click", lang.hitch(this, function () {
                intialLat = bearingTextBoxContainer.childNodes[0].childNodes[0].value;
                initiallong = bearingTextBoxContainer.childNodes[1].childNodes[0].value;
                initialbearing = bearingTextBoxContainer.childNodes[2].childNodes[0].value;
                initialdistance = bearingTextBoxContainer.childNodes[3].childNodes[0].value;
                topic.publish("destVincenty", intialLat, initiallong, initialbearing, initialdistance, true);
                dojo.destroy(bearingTextBoxContainer);
            })));

            topic.publish("destVincenty", intialLat, initiallong, initialbearing, initialdistance);
            this.addLatitudeValue.value = this.addLongitudeValue.value = this.addBearingValue.value = this.addDistanceMiles.value = "";
        },

        toRad: function (n) {
            return n * Math.PI / 180;
        },

        toDeg: function (n) {
            return n * 180 / Math.PI;
        },

        destVincenty: function (lon1, lat1, brng, dist, isRemoved) {
            var tmp, lat2, lambda, lan2, normalizedVal, polylineSymbol, graphic, graphicsLayer, sinSigma, cosSigma, C, L, pathPoint,
                a = 6378137, deltaSigma, locatorMarkupSymbol, i,
                cos2SigmaM,
                b = 6356752.3142,
                f = 1 / 298.257223563, // WGS-84 ellipsiod
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
            lan2 = parseFloat(lon1) + this.toDeg(L);

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
            if (!isRemoved) {
                normalizedVal = webMercatorUtils.lngLatToXY(lan2, lat2);
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
                    if (this.polyLine.paths.length > 0) {
                        this.polyLine.paths[0].push([this.mapPoint.x, this.mapPoint.y]);
                    } else {
                        this.polyLine.addPath([[this.mapPoint.x, this.mapPoint.y]]);
                    }
                    this.map.graphics.add(new Graphic(this.polyLine, polylineSymbol));
                    this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
                    topic.publish("createBuffer", this.polyLine, null);
                }
            } else {
                normalizedVal = webMercatorUtils.lngLatToXY(lan2, lat2);
                this.mapPoint = new esri.geometry.Point(normalizedVal[0], normalizedVal[1], this.map.spatialReference);
                graphic = new esri.Graphic(this.mapPoint, locatorMarkupSymbol, {}, null);
                graphicsLayer = this.map.getLayer("esriGraphicsLayerMapSettings");
                for (i = 0; i < graphicsLayer.graphics.length; i++) {
                    if (graphicsLayer.graphics[i].geometry.x === normalizedVal[0] && graphicsLayer.graphics[i].geometry.y === normalizedVal[1]) {
                        graphicsLayer.remove(graphicsLayer.graphics[i]);
                        break;
                    }
                }
                if (graphicsLayer.graphics.length > 1) {
                    this.polyLine = new Polyline(new esri.SpatialReference({ "wkid": this.map.spatialReference.wkid }));
                    pathPoint = [];
                    for (i = 0; i < graphicsLayer.graphics.length; i++) {
                        pathPoint.push([graphicsLayer.graphics[i].geometry.x, graphicsLayer.graphics[i].geometry.y]);
                    }
                    this.polyLine.addPath(pathPoint);
                    this.map.graphics.clear();
                    this.map.graphics.add(new Graphic(this.polyLine, polylineSymbol));
                    topic.publish("createBuffer", this.polyLine, null);
                } else if (graphicsLayer.graphics.length === 1) {
                    this.map.graphics.clear();
                    this.mapPoint = graphicsLayer.graphics[0].geometry;
                    topic.publish("createBuffer", this.mapPoint, null);
                } else {
                    this.map.graphics.clear();
                    this.mapPoint = null;
                    this.flagMultiplePoints = 0;
                }

            }
        },

        //Validate the numeric text box control
        onlyNumbers: function (evt) {
            var charCode;
            charCode = evt.which || event.keyCode;
            if (charCode > 31 && (charCode < 48 || charCode > 57)) {
                return false;
            }
            return true;
        },

        _validateBearingInputText: function () {
            if (this.addLatitudeValue.value === "") {
                alert(sharedNls.errorMessages.addLattitudeValue);
            } else if (this.addLongitudeValue.value === "") {
                alert(sharedNls.errorMessages.addLongitudeValue);
            } else if (this.addBearingValue.value === "") {
                alert(sharedNls.errorMessages.addBearingValue);
            } else if (this.addDistanceMiles.value === "") {
                alert(sharedNls.errorMessages.addDistanceMiles);
            } else {
                this._addBearingTextBox();
            }
        }
    });
});
