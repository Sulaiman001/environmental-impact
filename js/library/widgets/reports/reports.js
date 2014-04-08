/*global define,dojo,dojoConfig,esri,esriConfig,alert,window,setTimeout,clearTimeout */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true */
/** @license
| Version 10.2
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
    "dojo/string",
    "dojo/_base/html",
    "dojo/text!./templates/reportsTemplate.html",
    "dojo/_base/Color",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/PictureMarkerSymbol",
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
    "esri/tasks/QueryTask"

], function (declare, domConstruct, on, topic, lang, array, domStyle, domAttr, dom, query, domClass, domGeom, GeometryService, string, html, template, Color, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, PictureMarkerSymbol, Graphic, BufferParameters, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, appNls, GraphicsLayer, Draw, HorizontalSlider, HorizontalRule, HorizontalRuleLabels, RadioButton, ScrollBar, Deferred, DeferredList, Query, QueryTask) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        appNls: appNls,
        logoContainer: null,
        aoiPanelScrollbar: null,
        reportPanelScrollbar: null,
        featureGeometry: null,
        sliderDistance: null,
        sliderUnitValue: null,

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
            topic.subscribe("resizeAOIPanel", lang.hitch(this, this.resizeAOIPanel));
            topic.subscribe("resizeReportsPanel", lang.hitch(this, this.resizeReportsPanel));
            topic.subscribe("createBuffer", lang.hitch(this, this._createBuffer));
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

            this.own(on(this.reportTab, "click", lang.hitch(this, function () {
                this._showReportsTab();
            })));

            this._createSelectionTool();

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
                isAOISearch: true
            };
            topic.publish("attachLocatorEvents", locatorParams);
            this.reportsLoader = domConstruct.create("img", { "class": "esriCTInfoLoader" }, this.reportContent);
            domAttr.set(this.reportsLoader, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            this._hideLoadingIndicatorReports();
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
            var divAreaIntContainer, divSelectionContainer, toolbar, _self, horizontalSlider, radioBtnValue, radioContent, divRadioBtn, index, i, radioButton, radioLabel;
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
                _self.addToMap(evt, toolbar);
            });

            horizontalSlider = new HorizontalSlider({
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
                this.own(on(dom.byId(radioButton.id), "change", lang.hitch(this, function (value) {
                    index = Number(domAttr.get(value.target, "index"));
                    this.sliderUnitValue = this._sliderStartEndValue(value.target.value, horizontalSlider, index, true);
                })));
            }

            radioBtnValue = query("input:checked")[0].value;
            index = Number(domAttr.get(dom.byId(query("input:checked")[0].id), "index"));
            this.sliderUnitValue = this._sliderStartEndValue(radioBtnValue, horizontalSlider, index, null);

            domAttr.set(this.sliderMessage, "innerHTML", string.substitute(sharedNls.messages.sliderDisplayText, { defaultDistance: dojo.configData.BufferSliderSettings.defaultValue }) + " " + radioBtnValue);

            this.own(on(horizontalSlider, "change", lang.hitch(this, function (value) {
                var sliderText, message;
                sliderText = this.sliderMessage.innerHTML.split(/\d+/g);
                message = sliderText[0] + " " + Math.round(value) + " " + sliderText[1];
                this.sliderMessage.innerHTML = message;
                this.sliderDistance = Math.round(value);
                if (this.map.graphics.graphics[0].symbol) {
                    setTimeout(lang.hitch(this, function () {
                        this._createBuffer(this.featureGeometry);
                    }), 500);
                }
            })));

            domConstruct.place(this.divRadioButtonContainer, this.divSliderContainer, "after");
            this._createLinkContainer(divAreaIntContainer);
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
            }));
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

            horizontalSlider.minimum = sliderStartValue;
            horizontalSlider.maximum = sliderEndValue;
            if (radioClicked) {
                horizontalSlider.setValue(0);
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

        addToMap: function (evt, toolbar) {
            var symbol, graphic, geometry;
            this.map.graphics.clear();
            toolbar.deactivate();
            switch (evt.geometry.type) {
                case "point":
                case "multipoint":
                    symbol = new SimpleMarkerSymbol();
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
            this._createBuffer(evt.geometry);
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
                    //if geometry is a polygon then simplify polygon. This will make the user drawn polygon topologically correct.
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
                if (this.featureGeometry.type === "polygon") {
                    this._showReportsTab();
                    //if geometry is a polygon and buffer is not drawn, then also query the layers
                    this._queryLayers(this.featureGeometry);
                } else {
                    alert(sharedNls.errorMessages.bufferSliderValue);
                }
            }
        },

        showBuffer: function (bufferedGeometries) {
            this._showReportsTab();
            var _self, symbol;
            _self = this;
            symbol = new SimpleFillSymbol(
                    SimpleFillSymbol.STYLE_SOLID,
                    new SimpleLineSymbol(
                      SimpleLineSymbol.STYLE_SOLID,
                      new Color([parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.LineSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.LineSymbolTransparency.split(",")[0], 10)]), 2
                    ),
                    new Color([parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[0], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[1], 10), parseInt(dojo.configData.BufferSymbology.FillSymbolColor.split(",")[2], 10), parseFloat(dojo.configData.BufferSymbology.FillSymbolTransparency.split(",")[0], 10)])
                  );
            array.forEach(bufferedGeometries, function (geometry) {
                var graphic = new Graphic(geometry, symbol);
                _self.map.graphics.add(graphic);
                _self._queryLayers(geometry);
            });
        },

        _queryLayers: function (geometry) {
            var index,
                deferredListResult,
                onMapFeaturArray = [],
                featureArrayCollection = [],
                featureArray = [];
            this.counter = 0;
            for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                this._executeQueryTaskReport(index, geometry, onMapFeaturArray);
            }
            deferredListResult = new DeferredList(onMapFeaturArray);
            deferredListResult.then(lang.hitch(this, function (result) {
                var j, i;

                if (result) {
                    for (j = 0; j < result.length; j++) {
                        if (result[j][0] === true) {
                            if (result[j][1].features.length > 0) {
                                featureArrayCollection = [];
                                for (i = 0; i < result[j][1].features.length; i++) {
                                    featureArrayCollection.push({
                                        attr: result[j][1].features[i],
                                        layerId: j,
                                        fields: result[j][1].fields
                                    });

                                }
                                featureArray.push({
                                    layer: j,
                                    features: featureArrayCollection
                                });
                            }
                        }
                    }
                    this._fetchBufferResults(featureArray, geometry);
                }
            }), function (err) {
                alert(err.message);
            });
        },

        _executeQueryTaskReport: function (index, geometry, onMapFeaturArray) {
            var queryTask, queryLayer, queryOnReportTask, statDef, deferred, self;
            self = this;
            deferred = new Deferred();
            statDef = new esri.tasks.StatisticDefinition();
            statDef.statisticType = "count";
            statDef.onStatisticField = dojo.configData.SearchSettings[index].QuickSummaryReportFields;
            statDef.outStatisticName = "Total";

            queryTask = new QueryTask(dojo.configData.SearchSettings[index].QueryURL);
            queryLayer = new Query();
            queryLayer.outSpatialReference = this.map.spatialReference;
            queryLayer.returnGeometry = false;
            queryLayer.geometry = geometry;
            queryLayer.outStatistics = [statDef];
            queryLayer.groupByFieldsForStatistics = [dojo.configData.SearchSettings[index].QuickSummaryReportFields];
            queryLayer.outFields = ["*"];
            queryOnReportTask = queryTask.execute(queryLayer, lang.hitch(this, function (results) {
                deferred.resolve(results);
                return deferred.promise;
            }), function (err) {
                alert(err.message);
                deferred.resolve(err);
                self._hideLoadingIndicatorReports();
            });
            onMapFeaturArray.push(queryOnReportTask);
        },

        _fetchBufferQueryResults: function (featureArray, geometry, i, j) {
            var queryTask, queryLayer, deferredBuffer, obj, reportFieldValue, value;
            for (value in featureArray[i].features[j].attr.attributes) {
                if (featureArray[i].features[j].attr.attributes.hasOwnProperty(value)) {
                    if (!featureArray[i].features[j].attr.attributes[value]) {
                        featureArray[i].features[j].attr.attributes[value] = sharedNls.showNullValue;
                    }
                }
            }
            deferredBuffer = new Deferred();
            queryTask = new QueryTask(dojo.configData.SearchSettings[featureArray[i].layer].QueryURL);
            queryLayer = new Query();
            queryLayer.outSpatialReference = this.map.spatialReference;
            queryLayer.returnGeometry = true;
            queryLayer.geometry = geometry;
            reportFieldValue = string.substitute("${" + dojo.configData.SearchSettings[featureArray[i].layer].QuickSummaryReportFields + "}", featureArray[i].features[j].attr.attributes);
            queryLayer.where = dojo.configData.SearchSettings[featureArray[i].layer].QuickSummaryReportFields + " = " + "'" + reportFieldValue + "'";
            queryLayer.outFields = ["*"];
            queryTask.execute(queryLayer, lang.hitch(this, function (results) {
                var res;
                for (res in results.features[0].attributes) {
                    if (results.features[0].attributes.hasOwnProperty(res)) {
                        if (!results.features[0].attributes[res]) {
                            results.features[0].attributes[res] = sharedNls.showNullValue;
                        }
                    }
                }
                obj = {
                    name: i,
                    results: results,
                    value: string.substitute("${" + dojo.configData.SearchSettings[i].QuickSummaryReportFields + "}", results.features[0].attributes)
                };
                deferredBuffer.resolve(obj);
            }), function (err) {
                alert(err.message);
                deferredBuffer.resolve(err);
            });
            return deferredBuffer.promise;
        },

        _fetchBufferResults: function (featureArray, geometry) {
            var deferredListBuffer, onBufferFeaturArray = [], i, j;
            for (i = 0; i < featureArray.length; i++) {
                for (j = 0; j < featureArray[i].features.length; j++) {
                    onBufferFeaturArray.push(this._fetchBufferQueryResults(featureArray, geometry, i, j));
                }
            }
            deferredListBuffer = new DeferredList(onBufferFeaturArray);
            deferredListBuffer.then(lang.hitch(this, function (result) {
                this._createReport(result);
            }));
        },

        _createReport: function (result) {
            var i, j, divReportLayerPanel, divReportLayerSettingPanel, divFieldTypeContent, reportPanelHeight;
            this._hideLoadingIndicatorReports();
            for (i = 0; i < result.length; i++) {
                if (result[i][1].results) {
                    if (i !== 0) {
                        if ((result[i][1].name) !== (result[j][1].name)) {
                            divReportLayerPanel = domConstruct.create("div", { "class": "esriCTReportLayerPanel" }, this.reportScrollContent);
                            divReportLayerSettingPanel = domConstruct.create("div", { "class": "esriCTReportSettingPanel" }, divReportLayerPanel);
                            domConstruct.create("div", { "class": "divReportLayerTitle", "innerHTML": dojo.configData.SearchSettings[result[i][1].name].SearchDisplayTitle }, divReportLayerSettingPanel);
                            domConstruct.create("div", { "class": "esriCTsettingIcon" }, divReportLayerSettingPanel);
                            domConstruct.create("div", { "class": "esriCTReportTitle", "innerHTML": dojo.configData.SearchSettings[result[i][1].name].QuickSummaryReportFields }, divReportLayerPanel);
                        }
                    } else {
                        divReportLayerPanel = domConstruct.create("div", { "class": "esriCTReportLayerPanel" }, this.reportScrollContent);
                        divReportLayerSettingPanel = domConstruct.create("div", { "class": "esriCTReportSettingPanel" }, divReportLayerPanel);
                        domConstruct.create("div", { "class": "divReportLayerTitle", "innerHTML": dojo.configData.SearchSettings[result[i][1].name].SearchDisplayTitle }, divReportLayerSettingPanel);
                        domConstruct.create("div", { "class": "esriCTsettingIcon" }, divReportLayerSettingPanel);
                        domConstruct.create("div", { "class": "esriCTReportTitle", "innerHTML": dojo.configData.SearchSettings[result[i][1].name].QuickSummaryReportFields }, divReportLayerPanel);
                    }
                    divFieldTypeContent = domConstruct.create("div", { "class": "esriCTReportZoneName" }, divReportLayerPanel);
                    domConstruct.create("span", { "innerHTML": result[i][1].value }, divFieldTypeContent);
                    domConstruct.create("span", { "innerHTML": " (count - " + result[i][1].results.features.length + ")" }, divFieldTypeContent);
                    j = i;
                } else {
                    alert(sharedNls.errorMessages.invalidSearch);
                }
            }
            if (this.reportPanelScrollbar) {
                domClass.add(this.reportPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.reportPanelScrollbar.removeScrollBar();
            }
            reportPanelHeight = window.innerHeight - 140 + "px";
            domStyle.set(this.reportContent, "height", reportPanelHeight);
            this.reportPanelScrollbar = new ScrollBar({ domNode: this.reportContent });
            this.reportPanelScrollbar.setContent(this.reportScrollContent);
            this.reportPanelScrollbar.createScrollBar();
        },

        resizeAOIPanel: function () {
            var aoiPanelHeight;
            if (this.aoiPanelScrollbar) {
                domClass.add(this.aoiPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.aoiPanelScrollbar.removeScrollBar();
            }
            aoiPanelHeight = window.innerHeight - 100 + "px";
            domStyle.set(this.areaOfInterestContainer, "height", aoiPanelHeight);
            setTimeout(lang.hitch(this, function () {
                this.aoiPanelScrollbar = new ScrollBar({ domNode: this.areaOfInterestContainer });
                this.aoiPanelScrollbar.setContent(this.areaOfInterestContent);
                this.aoiPanelScrollbar.createScrollBar();
            }), 500);
        },

        resizeReportsPanel: function () {
            var reportPanelHeight;
            if (this.reportPanelScrollbar) {
                domClass.add(this.reportPanelScrollbar._scrollBarContent, "esriCTZeroHeight");
                this.reportPanelScrollbar.removeScrollBar();
            }
            reportPanelHeight = window.innerHeight - 140 + "px";
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
        }

    });
});