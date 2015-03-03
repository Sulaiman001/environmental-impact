/*global define,dojo,console */
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
    "dojo/dom-style",
    "dojo/_base/lang",
    "dojo/_base/array",
    "dojo/query",
    "dojo/dom-attr",
    "dojo/on",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/text!./templates/legendsTemplate.html",
    "dojo/topic",
    "dojo/Deferred",
    "dojo/DeferredList",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "esri/request",
    "esri/tasks/query",
    "esri/geometry/Extent",
    "dojo/dom-geometry",
    "esri/tasks/QueryTask",
    "esri/tasks/BufferParameters",
    "esri/tasks/GeometryService",
    "esri/geometry/Point",
    "esri/SpatialReference",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleLineSymbol",
    "dojo/_base/Color",
    "esri/graphic",
    "esri/geometry/Polyline",
    "esri/geometry/Polygon"
], function (declare, domConstruct, domStyle, lang, array, query, domAttr, on, dom, domClass, template, topic, Deferred, DeferredList, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, esriRequest, Query, GeometryExtent, domGeom, QueryTask, BufferParameters, GeometryService, Point, SpatialReference, SimpleFillSymbol, SimpleLineSymbol, Color, Graphic, Polyline, Polygon) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        divLegendlist: null,
        layerObject: null,
        logoContainer: null,
        _layerCollection: {},
        rendererArray: [],
        isExtentBasedLegend: false,
        hostedLayersJSON: null,
        webmapUpdatedRenderer: null,
        newLeft: 0,
        legendListWidth: [],
        indexesForLayer: [],
        /**
        * create legends widget
        * @class
        * @name widgets/legends/legends
        */
        postCreate: function () {
            this._createLegendContainerUI();
            topic.publish("legendBoxCreated");
            var currentExtentLegend, legendDefaultExtent, LegendWidthChange;
            this.logoContainer = query(".esriControlsBR")[0];
            if (!this.logoContainer) {
                this.logoContainer = (query(".map .logo-sm") && query(".map .logo-sm")[0]) || (query(".map .logo-med") && query(".map .logo-med")[0]);
            }
            topic.subscribe("setLegendPositionUp", lang.hitch(this, function () {
                this._setLegendPositionUp();
            }));

            topic.subscribe("setLegendPositionDown", lang.hitch(this, function () {
                this._setLegendPositionDown();
            }));

            topic.subscribe("setLegendWidth", lang.hitch(this, function () {
                this._resetLegendContainer();
            }));

            if (window.location.toString().split("?extent=").length > 1) {

                this.shareLegendExtent = true;
                currentExtentLegend = this._getQueryString('extent');
                legendDefaultExtent = currentExtentLegend.split(',');
                legendDefaultExtent = new GeometryExtent({
                    "xmin": parseFloat(legendDefaultExtent[0]),
                    "ymin": parseFloat(legendDefaultExtent[1]),
                    "xmax": parseFloat(legendDefaultExtent[2]),
                    "ymax": parseFloat(legendDefaultExtent[3]),
                    "spatialReference": {
                        "wkid": this.map.spatialReference.wkid
                    }
                });
            }

            if (this.isExtentBasedLegend) {
                this.map.on("extent-change", lang.hitch(this, function (evt) {
                    this._updateLegend(evt.extent);
                }));
            }
            if (dojo.query('.esriCTdivLegendbox').length > 0 && dojo.query('.esriCTHeaderReportContainer').length > 0 && dojo.query('.esriCTReportsImgSelected').length > 0) {
                LegendWidthChange = document.body.clientWidth - parseInt(dojo.query('.esriCTHeaderReportContainer')[0].clientWidth, 10);
                domStyle.set(dojo.query('.esriCTdivLegendbox')[0], "width", (LegendWidthChange + 2) + 'px');
            }
        },

        _updateLegend: function (geometry) {
            var defQueryArray = [], queryResult, resultListArray = [], queryDefList, i;
            this.rendererArray = [];
            this.legendListWidth = [];
            domConstruct.empty(this.divlegendContainer);
            this._resetLegendContainer();
            this._addlegendListWidth(this.legendListWidth);
            domStyle.set(this.divRightArrow, "display", "none");
            domStyle.set(query(".esriCTLeftArrow")[0], "display", "none");
            domConstruct.create("span", {
                "innerHTML": sharedNls.messages.legendLoadingText,
                "class": "divlegendLoadingContainer"
            }, this.divlegendContainer);
            if (!geometry) {
                domConstruct.empty(this.divlegendContainer);
                domConstruct.create("span", {
                    "innerHTML": sharedNls.messages.noLegend,
                    "class": "divNoLegendContainer"
                }, this.divlegendContainer);
                domStyle.set(this.divRightArrow, "display", "none");
                return;
            }
            queryResult = this._fireQueryOnExtentChange(geometry);
            this._queryLegendOnMapExtent(this._layerCollection, defQueryArray, queryResult, false);
            this._queryLegendOnMapExtent(this.hostedLayersJSON, defQueryArray, queryResult, true);
            this._queryLegendOnMapExtent(this.webmapUpdatedRenderer, defQueryArray, queryResult, true);
            if (defQueryArray.length > 0) {
                queryDefList = new DeferredList(defQueryArray);
                queryDefList.then(lang.hitch(this, function (result) {
                    domConstruct.empty(this.divlegendContainer);
                    this.legendListWidth = [];
                    for (i = 0; i < result.length; i++) {
                        if (result[i][0] && result[i][1].count > 0) {
                            resultListArray.push(result[i][1]);
                            if (result[i][1].hasDrawingInfo) {
                                if (this.rendererArray[i].drawingInfo) {
                                    this._createLegendSymbol(this.rendererArray[i].drawingInfo, this.rendererArray[i].title);
                                } else if (this.rendererArray[i].layerDefinition) {
                                    this._createLegendSymbol(this.rendererArray[i].layerDefinition.drawingInfo, this.rendererArray[i].title);
                                } else {
                                    this._createLegendSymbol(this.rendererArray[i], this.rendererArray[i].title);
                                }
                            } else {
                                this._addLegendSymbol(this.rendererArray[i], this._layerCollection[this.rendererArray[i].layerUrl].layerName);
                            }
                        }
                    }
                    this._addlegendListWidth(this.legendListWidth);
                    if (resultListArray.length === 0) {
                        domConstruct.empty(this.divlegendContainer);
                        domConstruct.create("span", {
                            "innerHTML": sharedNls.messages.noLegend,
                            "class": "divNoLegendContainer"
                        }, this.divlegendContainer);
                    }
                }));
            } else {
                this.legendListWidth = [];
                domConstruct.empty(this.divlegendContainer);
                this._addlegendListWidth(this.legendListWidth);
                domConstruct.create("span", {
                    "innerHTML": sharedNls.messages.noLegend,
                    "class": "divNoLegendContainer"
                }, this.divlegendContainer);
            }
        },

        //query legend for current extent
        _queryLegendOnMapExtent: function (layerArray, defQueryArray, queryResult, hasDrawingInfo) {
            var layer, layerUrl, rendererObject, layerObject, index, i, fieldValue, currentTime = new Date();
            for (layer in layerArray) {
                if (layerArray.hasOwnProperty(layer)) {
                    layerUrl = layer;
                    if (layerArray[layer].featureLayerUrl) {
                        layerUrl = layerArray[layer].featureLayerUrl;
                    }
                    if (this._checkLayerVisibility(layerUrl)) {
                        layerObject = layerArray[layer];
                        if (!hasDrawingInfo) {
                            rendererObject = layerArray[layer].legend;
                            if (rendererObject && rendererObject.length) {
                                for (index = 0; index < rendererObject.length; index++) {
                                    rendererObject[index].layerUrl = layer;
                                    rendererObject[index].title = layerArray[layer].layerName;
                                    this.rendererArray.push(rendererObject[index]);

                                    if (layerObject.rendererType === "uniqueValue") {
                                        if (rendererObject[index].values) {
                                            if (layerObject.fieldType === "esriFieldTypeString") {
                                                fieldValue = "'" + rendererObject[index].values[0] + "'";
                                            } else {
                                                fieldValue = rendererObject[index].values[0];
                                            }
                                            queryResult.where = layerObject.fieldName + " = " + fieldValue + " AND " + currentTime.getTime() + "=" + currentTime.getTime();
                                        } else {
                                            queryResult.where = currentTime.getTime() + "=" + currentTime.getTime();
                                        }
                                    } else if (layerObject.rendererType === "classBreaks") {
                                        queryResult.where = rendererObject[index - 1] ? layerObject.fieldName + ">" + rendererObject[index - 1].values[0] + " AND " + layerObject.fieldName + "<=" + rendererObject[index].values[0] : layerObject.fieldName + "=" + rendererObject[index].values[0] + " AND " + currentTime.getTime().toString() + "=" + currentTime.getTime().toString();
                                    } else {
                                        queryResult.where = currentTime.getTime() + "=" + currentTime.getTime();
                                    }
                                    this._executeQueryTask(layer, defQueryArray, queryResult, hasDrawingInfo);
                                }
                            }
                        }
                        else {
                            if (layerObject.drawingInfo) {
                                rendererObject = layerObject.drawingInfo.renderer;
                            } else {
                                rendererObject = layerObject.layerDefinition.drawingInfo.renderer;
                            }

                            if (rendererObject.type === "uniqueValue") {
                                for (i = 0; i < rendererObject.uniqueValueInfos.length; i++) {
                                    this.rendererArray.push({ "renderer": rendererObject.uniqueValueInfos[i], "title": layerObject.title });
                                    if (layerObject.fieldType === "esriFieldTypeString") {
                                        fieldValue = "'" + rendererObject.uniqueValueInfos[i].value + "'";
                                    } else {
                                        fieldValue = rendererObject.uniqueValueInfos[i].value;
                                    }
                                    if (rendererObject.uniqueValueInfos[i].value) {
                                        queryResult.where = layerObject.fieldName + " = " + fieldValue + " AND " + currentTime.getTime() + "=" + currentTime.getTime();
                                    } else {
                                        queryResult.where = currentTime.getTime() + "=" + currentTime.getTime();
                                    }
                                    this._executeQueryTask(layer, defQueryArray, queryResult, hasDrawingInfo);
                                }
                            } else if (rendererObject.type === "classBreaks") {
                                for (i = 0; i < rendererObject.classBreakInfos.length; i++) {
                                    this.rendererArray.push({ "renderer": rendererObject.classBreakInfos[i], "title": layerObject.title });
                                    queryResult.where = layerObject.fieldName + ">=" + rendererObject.classBreakInfos[i].minValue + " AND " + layerObject.fieldName + "<=" + rendererObject.classBreakInfos[i].maxValue + " AND " + currentTime.getTime().toString() + "=" + currentTime.getTime().toString();
                                    this._executeQueryTask(layer, defQueryArray, queryResult, hasDrawingInfo);
                                }
                            } else {
                                this.rendererArray.push(layerObject);
                                queryResult.where = currentTime.getTime() + "=" + currentTime.getTime();
                                this._executeQueryTask(layer, defQueryArray, queryResult, hasDrawingInfo);
                            }
                        }
                    }
                }
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
            // if (this.isExtentBasedLegend) {
            layerUrlIndex = layerUrlIndex[layerUrlIndex.length - 1];
            for (layer in this.map._layers) {
                if (this.map._layers.hasOwnProperty(layer)) {
                    if (this.map._layers[layer].url === layerUrl) {
                        if (this.map._layers[layer].visibleAtMapScale || !this.isExtentBasedLegend) {
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
                                if (this.isExtentBasedLegend && this.map._layers[layer].visibleAtMapScale) {
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
        _getQueryString: function (key) {
            var extentValue = "", regex, qs;
            regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
            qs = regex.exec(window.location.href);
            if (qs && qs.length > 0) {
                extentValue = qs[1];
            }
            return extentValue;
        },

        _setLegendPositionUp: function () {
            domClass.remove(this.esriCTdivLegendbox, "esriCTLegendChangePositionDown");
            domClass.remove(this.logoContainer, "esriCTMapLogoPositionChange");
            domClass.add(this.logoContainer, "esriCTMapLogoURL");
            domClass.add(this.divlegendContainer, "esriCTLegendPositionChange");
            domClass.add(this.esriCTdivLegendbox, "esriCTLegendChangePositionUp");
        },

        _setLegendPositionDown: function () {
            domClass.remove(this.logoContainer, "esriCTMapLogoURL");
            domClass.remove(this.divlegendContainer, "esriCTLegendPositionChange");
            domClass.add(this.logoContainer, "esriCTMapLogoPositionChange");
            domClass.remove(this.esriCTdivLegendbox, "esriCTLegendChangePositionUp");
            domClass.add(this.esriCTdivLegendbox, "esriCTLegendChangePositionDown");
        },

        _resetLegendContainer: function () {
            this.newLeft = 0;
            domStyle.set(query(".divlegendContent")[0], "left", (this.newLeft) + "px");
            this._resetSlideControls();
        },

        _createLegendContainerUI: function () {
            var divlegendContainer, divLeftArrow, legendOuterContainer;
            legendOuterContainer = query('.esriCTdivLegendbox', dom.byId("esriCTParentDivContainer"));

            if (query('.legendbox')[0]) {
                domConstruct.empty(query('.legendbox')[0]);
            }
            if (legendOuterContainer[0]) {
                domConstruct.destroy(legendOuterContainer[0].parentElement);
            }
            dom.byId("esriCTParentDivContainer").appendChild(this.esriCTdivLegendbox);
            divlegendContainer = domConstruct.create("div", {
                "class": "divlegendContainer"
            }, this.divlegendList);
            this.divlegendContainer = domConstruct.create("div", {
                "class": "divlegendContent"
            }, divlegendContainer);
            divLeftArrow = domConstruct.create("div", {
                "class": "esriCTLeftArrow",
                "style": "display:none"
            }, this.legendbox);
            domStyle.set(divLeftArrow, "display", "none");
            on(divLeftArrow, "click", lang.hitch(this, function () {
                this._slideLeft();
            }));
            this.divRightArrow = domConstruct.create("div", {
                "class": "esriCTRightArrow",
                "id": "esriCTRightArrow",
                "style": "display:none"
            }, this.legendbox);
            on(this.divRightArrow, "click", lang.hitch(this, function () {
                this._slideRight();
            }));
        },

        /**
        * slide legend data to right
        * @memberOf widgets/legends/legends
        */
        _slideRight: function () {
            var difference = query(".divlegendContainer")[0].offsetWidth - query(".divlegendContent")[0].offsetWidth;
            if (this.newLeft > difference) {
                domStyle.set(query(".esriCTLeftArrow")[0], "display", "block");
                domStyle.set(query(".esriCTLeftArrow")[0], "cursor", "pointer");
                this.newLeft = this.newLeft - (100 + 9);
                domStyle.set(query(".divlegendContent")[0], "left", (this.newLeft) + "px");
                this._resetSlideControls();
            }
        },

        /**
        * slide legend data to left
        * @memberOf widgets/legends/legends
        */
        _slideLeft: function () {
            if (this.newLeft < 0) {
                if (this.newLeft > -(100 + 9)) {
                    this.newLeft = 0;
                } else {
                    this.newLeft = this.newLeft + (100 + 9);
                }
                if (this.newLeft >= -10) {
                    this.newLeft = 0;
                }
                domStyle.set(this.divlegendContainer, "left", (this.newLeft) + "px");
                this._resetSlideControls();
            }
        },

        /**
        * reset slider controls
        * @memberOf widgets/legends/legends
        */
        _resetSlideControls: function () {
            if (this.newLeft > query(".divlegendContainer")[0].offsetWidth - query(".divlegendContent")[0].offsetWidth) {
                domStyle.set(query(".esriCTRightArrow")[0], "display", "block");
                domStyle.set(query(".esriCTRightArrow")[0], "cursor", "pointer");
            } else {
                domStyle.set(query(".esriCTRightArrow")[0], "display", "none");
                domStyle.set(query(".esriCTRightArrow")[0], "cursor", "default");
            }
            if (this.newLeft === 0) {
                domStyle.set(query(".esriCTLeftArrow")[0], "display", "none");
                domStyle.set(query(".esriCTLeftArrow")[0], "cursor", "default");
            } else {
                domStyle.set(query(".esriCTLeftArrow")[0], "display", "block");
                domStyle.set(query(".esriCTLeftArrow")[0], "cursor", "pointer");
            }
        },

        /**
        * fires query for the renderer present in the current extent
        * @memberOf widgets/legends/legends
        */
        _fireQueryOnExtentChange: function (currentExtent) {
            var queryParams = new Query();
            queryParams.outFields = ["*"];
            if (this.isExtentBasedLegend) {
                queryParams.geometry = currentExtent;
                queryParams.spatialRelationship = "esriSpatialRelIntersects";
                queryParams.returnGeometry = false;
            }
            return queryParams;
        },

        /**
        * performs query task for the no of features present in the current extent
        * @memberOf widgets/legends/legends
        */
        _executeQueryTask: function (layer, defQueryArray, queryParams, hasDrawingInfo) {
            var defResult = [], queryTask, queryDeferred = new Deferred();
            queryTask = new QueryTask(layer);
            defResult.hasDrawingInfo = hasDrawingInfo;
            defResult.count = 0;
            if (!this.isExtentBasedLegend) {
                queryParams.where = "1=1";
            }
            queryTask.executeForCount(queryParams, lang.hitch(this, function (count) {
                defResult.count = count;
                queryDeferred.resolve(defResult);
            }), function (error) {
                queryDeferred.reject(defResult);
            });
            defQueryArray.push(queryDeferred);
        },

        /*
        * initiates the creation of legend
        * @memberOf widgets/legends/legends
        */
        startup: function (layerArray, updatedRendererArray) {
            var mapServerURL, index, hostedDefArray = [], defArray = [], params, layersRequest, deferredList, hostedDeferredList, hostedLayers, i, featureLayerUrl, layerIndex, legendCreated;
            this.mapServerArray = [];
            this.featureServerArray = [];
            this.hostedLayersJSON = null;
            this.legendListWidth = [];
            this.webmapUpdatedRenderer = updatedRendererArray;
            hostedLayers = this._filterHostedFeatureServices(layerArray);
            for (i = 0; i < hostedLayers.length; i++) {
                params = {
                    url: hostedLayers[i].url,
                    content: { f: "json" },
                    handleAs: "json",
                    callbackParamName: "callback"
                };
                layersRequest = esriRequest(params);
                this._getLayerDetail(layersRequest, hostedDefArray);
            }
            if (hostedDefArray.length > 0) {
                hostedDeferredList = new DeferredList(hostedDefArray);
                hostedDeferredList.then(lang.hitch(this, function (result) {
                    if (result.length === 0) {
                        this.hostedLayersJSON = null;
                    } else {
                        this.hostedLayersJSON = {};
                        if (this.webmapUpdatedRenderer === null && this._layerCollection === null) {
                            domConstruct.empty(this.divlegendContainer);
                        }
                    }
                    for (i = 0; i < result.length; i++) {
                        this.hostedLayersJSON[hostedLayers[i].url] = result[i][1];
                        this.hostedLayersJSON[hostedLayers[i].url].title = hostedLayers[i].title;
                    }
                    this._displayHostedLayerRenderer();
                    this._addlegendListWidth(this.legendListWidth);
                }));
            }
            for (index = 0; index < layerArray.length; index++) {
                if (layerArray[index].url.match("/FeatureServer")) {
                    featureLayerUrl = layerArray[index].url;
                    layerArray[index].url = layerArray[index].url.replace("/FeatureServer", "/MapServer");
                } else {
                    featureLayerUrl = null;
                }
                mapServerURL = layerArray[index].url.split("/");
                layerIndex = mapServerURL[mapServerURL.length - 1];
                if (isNaN(layerIndex) || layerIndex === "") {
                    if (layerIndex == "") {
                        mapServerURL.splice(mapServerURL.length - 1, 1);
                    }
                    mapServerURL = mapServerURL.join("/");
                    this.mapServerArray.push({ "url": mapServerURL, "featureLayerUrl": featureLayerUrl, "all": true });
                    //this.indexesForLayer.push("all");
                } else {
                    mapServerURL.pop();
                    mapServerURL = mapServerURL.join("/");
                    if (!this.indexesForLayer[mapServerURL]) {
                        this.indexesForLayer[mapServerURL] = [];
                    }
                    this.indexesForLayer[mapServerURL].push(layerIndex);
                    this.mapServerArray.push({ "url": mapServerURL, "featureLayerUrl": featureLayerUrl });
                }
            }

            this.mapServerArray = this._removeDuplicate(this.mapServerArray);

            for (index = 0; index < this.mapServerArray.length; index++) {
                params = {
                    url: this.mapServerArray[index].url + "/legend",
                    content: {
                        f: "json"
                    },
                    handleAs: "json",
                    callbackParamName: "callback"
                };
                layersRequest = esriRequest(params);
                this._getLayerDetail(layersRequest, defArray);
            }
            deferredList = new DeferredList(defArray);
            deferredList.then(lang.hitch(this, function (result) {
                this._layerCollection = {};
                legendCreated = [];
                for (index = 0; index < result.length; index++) {
                    if (result[index][1]) {
                        legendCreated.push(this._createLegendList(result[index][1], this.mapServerArray[index], layerArray));
                    }
                }
                if (!legendCreated.length) {
                    this._layerCollection = null;
                } else {
                    this._addFieldValue(this._layerCollection);
                }
            }));
            if (this.webmapUpdatedRenderer) {
                this._addFieldValue(this.webmapUpdatedRenderer);
                this._addlegendListWidth(this.legendListWidth);
            }
        },

        /*
        * display hosted layer renderers
        * @memberOf widgets/legends/legends
        */
        _displayHostedLayerRenderer: function () {
            var layer;
            for (layer in this.hostedLayersJSON) {
                if (this.hostedLayersJSON.hasOwnProperty(layer)) {
                    this._setFieldValue(this.hostedLayersJSON[layer].drawingInfo, this.hostedLayersJSON[layer]);
                    this._appendFieldType(this.hostedLayersJSON[layer], null);
                }
            }

            this._updateLegend(this.map.extent);
        },

        /*
        * create Legend symbols
        * @memberOf widgets/legends/legends
        */
        _createLegendSymbol: function (layerData, layerTitle) {
            var renderer, divLegendImage, divLegendLabel, image, rendererObject, i, legendWidth;
            if (layerData) {
                renderer = layerData.renderer;
                if (renderer.label) {
                    layerTitle = renderer.label;
                }
                if (renderer && renderer.symbol) {
                    this._createSymbol(renderer.symbol.type, renderer.symbol.url, renderer.symbol.color,
                        renderer.symbol.width, renderer.symbol.height, renderer.symbol.imageData, layerTitle);
                } else if (renderer) {
                    if (renderer.infos) {
                        rendererObject = renderer.info;
                    } else if (renderer.uniqueValueInfos) {
                        rendererObject = renderer.uniqueValueInfos;
                    } else if (renderer.classBreakInfos) {
                        rendererObject = renderer.classBreakInfos;
                    } else {
                        rendererObject = renderer;
                    }
                    if (rendererObject.label) {
                        layerTitle = rendererObject.label;
                    }
                    if (rendererObject.symbol) {
                        this._createSymbol(rendererObject.symbol.type, rendererObject.symbol.url, rendererObject.symbol.color,
                            rendererObject.symbol.width, rendererObject.symbol.height, rendererObject.symbol.imageData, layerTitle);
                    } else {
                        for (i = 0; i < rendererObject.length; i++) {
                            if (!rendererObject[i].label) {
                                rendererObject[i].label = layerTitle;
                            }
                            this._createSymbol(rendererObject[i].symbol.type, rendererObject[i].symbol.url, rendererObject[i].symbol.color,
                                rendererObject[i].symbol.width, rendererObject[i].symbol.height, rendererObject[i].symbol.imageData, rendererObject[i].label);
                        }
                    }
                } else if (renderer && renderer.defaultSymbol) {
                    this._createSymbol(renderer.defaultSymbol.type, renderer.defaultSymbol.url, renderer.defaultSymbol.color,
                        renderer.defaultSymbol.width, renderer.defaultSymbol.height, renderer.defaultSymbol.imageData, layerTitle);
                } else {
                    this.divLegendlist = domConstruct.create("div", {
                        "class": "divLegendlist"
                    }, this.divlegendContainer);
                    divLegendImage = dojo.create("div", {
                        "class": "legend"
                    }, null);
                    if (renderer.symbol.url) {
                        image = this._createImage(renderer.symbol.url, "", false, renderer.symbol.width, renderer.symbol.height);
                    }
                    domConstruct.place(image, divLegendImage);
                    this.divLegendlist.appendChild(divLegendImage);
                    divLegendLabel = dojo.create("div", {
                        "class": "legendlbl"
                    }, null);
                    this.divLegendlist.appendChild(divLegendLabel);
                    legendWidth = divLegendLabel.offsetWidth + renderer.symbol.width + 60;
                    this.legendListWidth.push(legendWidth);
                }
            }
        },

        /*
        *creates the symbol with or without label for displaying the legend
        * @memberOf widgets/legends/legends
        */
        _createSymbol: function (symbolType, url, color, width, height, imageData, label) {
            var bgColor, divLegendLabel, divLegendImage, divSymbol, image, legendWidth;
            this.divLegendlist = domConstruct.create("div", { "class": "divLegendlist" }, this.divlegendContainer);
            divLegendImage = domConstruct.create("div", { "class": "legend" }, null);
            height = height ? height < 5 ? 5 : height : 15;
            width = width ? width < 5 ? 5 : width : 15;
            if (symbolType === "picturemarkersymbol" && url) {
                image = this._createImage(url, "", false, width, height);
                divLegendImage.appendChild(image);
                this.divLegendlist.appendChild(divLegendImage);
            } else if (symbolType === "esriPMS" && url) {
                image = this._createImage("data:image/gif;base64," + imageData, "", false, width, height);
                divLegendImage.appendChild(image);
                this.divLegendlist.appendChild(divLegendImage);
            } else {
                divSymbol = document.createElement("div");
                if (color.r || color.r === 0) {
                    if (color.a || color.a === 0) {
                        bgColor = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + color.a + ')';
                    } else {
                        bgColor = 'rgb(' + color.r + ',' + color.g + ',' + color.b + ')';
                    }
                } else {
                    if (Color.fromArray(color).toHex()) {
                        bgColor = Color.fromArray(color).toHex();
                    } else {
                        bgColor = Color.fromArray([255, 0, 255]).toHex();
                    }
                    if (color.length > 3) {
                        divSymbol.style.opacity = color[3];
                    }
                }
                divSymbol.style.background = bgColor;
                divSymbol.style.height = height + "px";
                divSymbol.style.width = width + "px";
                divSymbol.style.marginTop = "8px";
                divLegendImage.appendChild(divSymbol);
                this.divLegendlist.appendChild(divLegendImage);
            }
            divLegendLabel = dojo.create("div", {
                "class": "legendlbl"
            }, null);
            domAttr.set(divLegendLabel, "innerHTML", label);
            this.divLegendlist.appendChild(divLegendLabel);
            legendWidth = divLegendLabel.offsetWidth + width + 60;
            this.legendListWidth.push(legendWidth);
        },

        /*
        * find hosted feature services
        * @memberOf widgets/legends/legends
        */
        _filterHostedFeatureServices: function (layerArray) {
            var hostedLayers = [], layerDetails, index;
            for (index = 0; index < layerArray.length; index++) {
                if (layerArray[index].url.match("/FeatureServer")) {
                    layerDetails = layerArray[index].url.split("/");
                    if (layerDetails[5] && layerDetails[5].toLowerCase && layerDetails[5].toLowerCase() === "rest") {
                        hostedLayers.push(layerArray[index]);
                        layerArray.splice(index, 1);
                        index--;
                    }
                }
            }
            return hostedLayers;
        },

        /*
        * get layer json data
        * @memberOf widgets/legends/legends
        */
        _getLayerDetail: function (layersRequest, defArray) {
            var deferred = new Deferred();
            layersRequest.then(function (response) {
                deferred.resolve(response);
            }, function (error) {
                deferred.reject();
            });
            defArray.push(deferred);
        },

        /**
        * log error message in console
        * @memberOf widgets/legends/legends
        */
        _displayError: function (error) {
            console.log("Error: ", error.message);
        },

        /*
        * add field values
        * @memberOf widgets/legends/legends
        */
        _addFieldValue: function (layerCollectionArray) {
            var defArray = [], layerTempArray = [], params, layer, layersRequest, deferredList, i;
            for (layer in layerCollectionArray) {
                if (layerCollectionArray.hasOwnProperty(layer)) {
                    layerTempArray.push(layer);
                    params = {
                        url: layer,
                        content: {
                            f: "json"
                        },
                        handleAs: "json",
                        callbackParamName: "callback"
                    };
                    layersRequest = esriRequest(params);
                    this._getLayerDetail(layersRequest, defArray);
                }
            }
            deferredList = new DeferredList(defArray);
            deferredList.then(lang.hitch(this, function (result) {
                for (i = 0; i < result.length; i++) {
                    if (result[i][0]) {
                        if (layerCollectionArray[layerTempArray[i]].layerDefinition && layerCollectionArray[layerTempArray[i]].layerDefinition.drawingInfo) {
                            this._setFieldValue(layerCollectionArray[layerTempArray[i]].layerDefinition.drawingInfo, layerCollectionArray[layerTempArray[i]]);
                            if (!layerCollectionArray[layerTempArray[i]].title) {
                                layerCollectionArray[layerTempArray[i]].title = layerCollectionArray[layerTempArray[i]].name;
                            }
                        } else {
                            this._setFieldValue(result[i][1].drawingInfo, layerCollectionArray[layerTempArray[i]]);
                        }
                        this._appendFieldType(layerCollectionArray[layerTempArray[i]], result[i][1]);

                    }
                }
                this._updateLegend(this.map.extent);

            }));
        },

        _appendFieldType: function (layerCollection, layerObject) {
            var i;
            if (!layerObject) {
                layerObject = layerCollection;
            }
            if (layerCollection.fieldName) {
                for (i = 0; i < layerObject.fields.length; i++) {
                    if (layerObject.fields && layerObject.fields[i].name === layerCollection.fieldName) {
                        layerCollection.fieldType = layerObject.fields[i].type;
                        break;
                    }
                }
            }
        },

        _setFieldValue: function (layerDrawingInfo, layerCollectionArray) {
            if (layerDrawingInfo && layerDrawingInfo.renderer && layerDrawingInfo.renderer.type === "uniqueValue") {
                layerCollectionArray.rendererType = "uniqueValue";
                layerCollectionArray.fieldName = layerDrawingInfo.renderer.field1 || layerDrawingInfo.renderer.field2 || layerDrawingInfo.renderer.field3;
            } else if (layerDrawingInfo && layerDrawingInfo.renderer && layerDrawingInfo.renderer.type === "classBreaks") {
                layerCollectionArray.rendererType = "classBreaks";
                layerCollectionArray.fieldName = layerDrawingInfo.renderer.field;
            }
        },
        /**
        * remove redundant data
        * @memberOf widgets/legends/legends
        */
        _removeDuplicate: function (mapServerArray) {
            var filterArray = [],
                fliteredArray = [];
            array.filter(mapServerArray, function (item) {
                if (array.indexOf(filterArray, item.url) === -1) {
                    fliteredArray.push(item);
                    filterArray.push(item.url);
                }
            });
            return fliteredArray;
        },


        /**
        * create legend list
        * @memberOf widgets/legends/legends
        */
        _createLegendList: function (layerList, mapServerUrl, layerArray) {
            var layerURL, i, j, isLegendCreated = false, layerUrl, layerName;
            if (layerList && layerList.layers && layerList.layers.length > 0) {
                for (i = 0; i < layerList.layers.length; i++) {
                    layerList.layers[i].featureLayerUrl = mapServerUrl.featureLayerUrl;
                    if (mapServerUrl.all || array.indexOf(this.indexesForLayer[mapServerUrl.url], layerList.layers[i].layerId) !== -1) {
                        isLegendCreated = true;
                        layerURL = mapServerUrl.url + '/' + layerList.layers[i].layerId;
                        this._layerCollection[layerURL] = layerList.layers[i];

                        if (this._layerCollection[layerURL].featureLayerUrl) {
                            layerUrl = this._layerCollection[layerURL].featureLayerUrl;
                        } else {
                            layerUrl = layerURL;
                        }

                        layerName = this._getLayerTitle(layerURL, layerArray);
                        if (layerName) {
                            this._layerCollection[layerURL].layerName = layerName;
                        }
                    }
                }
            }
            this._addlegendListWidth(this.legendListWidth);
            return isLegendCreated;
        },

        /**
        * get layer title from layerArray
        * @param {string} layerUrl
        * @param {array} layerArray
        * @memberOf widgets/legends/legends
        */
        _getLayerTitle: function (layerUrl, layerArray) {
            var i;
            for (i = 0; i < layerArray.length; i++) {
                if (layerArray[i].url === layerUrl) {
                    return layerArray[i].title;
                }
            }
        },
        /**
        * set legend container width
        * @memberOf widgets/legends/legends
        */
        _addlegendListWidth: function (legendListWidth) {
            var listWidth = legendListWidth,
                total = 0,
                j,
                boxWidth;
            for (j = 0; j < listWidth.length; j++) {
                total += listWidth[j];
            }
            if (total < query(".divlegendContainer")[0].offsetWidth) {
                domStyle.set(this.divlegendContainer, "width", "auto");
            } else {
                domStyle.set(this.divlegendContainer, "width", (total + 5) + "px");
            }
            if (query(".esriCTHeaderReportContainer")[0]) {
                boxWidth = this.legendbox.offsetWidth - query(".esriCTHeaderReportContainer")[0].offsetWidth + 50;
            } else {
                boxWidth = this.legendbox.offsetWidth + 50;
            }
            if (total <= 0 || this.divlegendContainer.offsetWidth < boxWidth) {
                domStyle.set(this.divRightArrow, "display", "none");
            } else {
                domStyle.set(this.divRightArrow, "display", "block");
            }
            this._resetSlideControls();
        },

        /**
        * add legend symbol in legend list
        * @memberOf widgets/legends/legends
        */
        _addLegendSymbol: function (legend, layerName) {
            var divLegendImage, image, divLegendLabel, legendWidth;
            if (legend) {
                this.divLegendlist = domConstruct.create("div", {
                    "class": "divLegendlist"
                }, this.divlegendContainer);
                divLegendImage = domConstruct.create("div", {
                    "class": "legend"
                }, null);
                image = this._createImage("data:image/gif;base64," + legend.imageData, "", false, legend.width, legend.height);
                domConstruct.place(image, divLegendImage);
                this.divLegendlist.appendChild(divLegendImage);
                if (legend.label) {
                    divLegendLabel = domConstruct.create("div", {
                        "class": "legendlbl",
                        "innerHTML": legend.label
                    }, null);
                } else {
                    divLegendLabel = domConstruct.create("div", {
                        "class": "legendlbl",
                        "innerHTML": layerName
                    }, null);
                }
                this.divLegendlist.appendChild(divLegendLabel);
                legendWidth = divLegendLabel.offsetWidth + legend.width + 60;
                this.legendListWidth.push(legendWidth);
            }
        },

        /*
        * displays the picture marker symbol
        * @memberOf widgets/legends/legends
        */
        _createImage: function (imageSrc, title, isCursorPointer, imageWidth, imageHeight) {
            var imgLocate, imageHeightWidth;
            imgLocate = domConstruct.create("img");
            imageHeightWidth = {
                width: imageWidth + 'px',
                height: imageHeight + 'px'
            };
            domAttr.set(imgLocate, "style", imageHeightWidth);
            if (isCursorPointer) {
                domStyle.set(imgLocate, "cursor", "pointer");
            }
            domAttr.set(imgLocate, "src", imageSrc);
            domAttr.set(imgLocate, "title", title);
            return imgLocate;
        }
    });
});
