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
    "esri/tasks/QueryTask"
], function (declare, domConstruct, domStyle, lang, array, query, domAttr, on, dom, domClass, template, topic, Deferred, DeferredList, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, esriRequest, Query, GeometryExtent, domGeom, QueryTask) {

    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        divLegendList: null,
        layerObject: null,
        logoContainer: null,
        _layerCollection: {},
        _rendererArray: [],
        isExtentBasedLegend: true,
        hostedLayersJSON: null,
        webmapUpdatedRenderer: null,
        // legendListWidth: [],
        newLeft: 0,
        total: 0,
        /**
        * create legends widget
        * @class
        * @name widgets/legends/legends
        */
        postCreate: function () {
            this._createLegendContainerUI();
            var currentExtentLegend, legendDefaultExtent, layerUrl;
            this.logoContainer = query(".esriControlsBR")[0];
            if (!this.logoContainer) {
                this.logoContainer = (query(".map .logo-sm") && query(".map .logo-sm")[0])
                    || (query(".map .logo-med") && query(".map .logo-med")[0]);
            }
            topic.subscribe("setLegendPositionUp", lang.hitch(this, function () {
                this._setLegendPositionUp();
            }));

            topic.subscribe("setLegendPositionDown", lang.hitch(this, function () {
                this._setLegendPositionDown();
            }));

            if (window.location.toString().split("?extent=").length > 1) {
                this.shareLegendExtent = true;
                currentExtentLegend = this._getQueryString('extent');
                legendDefaultExtent = currentExtentLegend.split(',');
                legendDefaultExtent = new GeometryExtent({ "xmin": parseFloat(legendDefaultExtent[0]), "ymin": parseFloat(legendDefaultExtent[1]), "xmax": parseFloat(legendDefaultExtent[2]), "ymax": parseFloat(legendDefaultExtent[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
            }
            if (this.isExtentBasedLegend) {
                this.map.on("extent-change", lang.hitch(this, function (evt) {
                    var defQueryArray = [],
                        queryResult,
                        layerObject,
                        rendererObject,
                        index,
                        resultListArray = [],
                        queryDefList,
                        i,
                        layer,
                        currentTime;
                    currentTime = new Date();
                    domConstruct.empty(this.divlegendContainer);
                    this._resetLegendContainer();
                    this._rendererArray.length = 0;
                    for (layer in this._layerCollection) {
                        if (this._layerCollection.hasOwnProperty(layer)) {
                            layerUrl = layer;
                            if (this._layerCollection[layer].featureLayerUrl) {
                                layerUrl = this._layerCollection[layer].featureLayerUrl;
                            }
                            if (this._checkLayerVisibility(layerUrl)) {
                                layerObject = this._layerCollection[layer];
                                rendererObject = this._layerCollection[layer].legend;
                                if (rendererObject.length) {
                                    for (index = 0; index < rendererObject.length; index++) {
                                        rendererObject[index].layerUrl = layer;
                                        this._rendererArray.push(rendererObject[index]);
                                        if (this.shareLegendExtent) {
                                            queryResult = this._fireQueryOnExtentChange(legendDefaultExtent);
                                        } else {
                                            queryResult = this._fireQueryOnExtentChange(evt.extent);
                                        }
                                        if (layerObject.rendererType === "uniqueValue") {
                                            if (rendererObject[index].values) {
                                                queryResult.where = layerObject.fieldName + " = " + "'" + rendererObject[index].values[0] + "'" + " AND " + currentTime.getTime() + "=" + currentTime.getTime();
                                            } else {
                                                queryResult.where = currentTime.getTime() + "=" + currentTime.getTime();
                                            }
                                        } else if (layerObject.rendererType === "classBreaks") {
                                            queryResult.where = rendererObject[index - 1] ? layerObject.fieldName + ">" + rendererObject[index - 1].values[0] + " AND " + layerObject.fieldName + "<=" + rendererObject[index].values[0] : layerObject.fieldName + "=" + rendererObject[index].values[0];
                                        } else {
                                            queryResult.where = currentTime.getTime() + "=" + currentTime.getTime();
                                        }
                                        this._executeQueryTask(layer, defQueryArray, queryResult);
                                    }
                                }
                            }
                        }
                    }
                    resultListArray = [];
                    this.legendListWidth = [];


                    domStyle.set(query(".esriCTRightArrow")[0], "display", "none");
                    domStyle.set(query(".esriCTLeftArrow")[0], "display", "none");

                    domConstruct.create("span", { "innerHTML": sharedNls.titles.loadingText, "class": "divlegendLoadingContainer" }, this.divlegendContainer);
                    if (defQueryArray.length > 0) {
                        queryDefList = new DeferredList(defQueryArray);
                        queryDefList.then(lang.hitch(this, function (result) {
                            domConstruct.empty(this.divlegendContainer);
                            for (i = 0; i < result.length; i++) {
                                if (result[i][0] && result[i][1] > 0) {
                                    resultListArray.push(result[i][1]);
                                    this._addLegendSymbol(this._rendererArray[i], this._layerCollection[this._rendererArray[i].layerUrl].layerName);

                                }
                            }
                            this._addlegendListWidth(this.legendListWidth);
                            if (this.webmapUpdatedRenderer || this.hostedLayersJSON) {
                                this._displayWebmapRenderer();
                                this._displayHostedLayerRenderer();
                            } else if (resultListArray.length === 0) {
                                domConstruct.create("span", { innerHTML: sharedNls.messages.noLegend, "class": "divNoLegendContainer" }, this.divlegendContainer);
                            }

                        }));
                    } else {
                        domConstruct.empty(this.divlegendContainer);
                        if (this.webmapUpdatedRenderer || this.hostedLayersJSON) {
                            this._displayWebmapRenderer();
                            this._displayHostedLayerRenderer();
                        } else {
                            domConstruct.create("span", { "innerHTML": sharedNls.messages.noLegend, "class": "divNoLegendContainer" }, this.divlegendContainer);
                        }
                    }
                }));
            }
        },

        _checkLayerVisibility: function (layerUrl) {
            var layer, layerUrlIndex = layerUrl.split('/'), returnVal = false;
            layerUrlIndex = layerUrlIndex[layerUrlIndex.length - 1];
            for (layer in this.map._layers) {
                if (this.map._layers.hasOwnProperty(layer)) {
                    if (this.map._layers[layer].url === layerUrl) {
                        if (this.map._layers[layer].visibleAtMapScale) {
                            returnVal = true;
                            break;
                        }
                    } else if (this.map._layers[layer].visibleLayers && (this.map._layers[layer].url + "/" + layerUrlIndex === layerUrl)) {
                        if (this.map._layers[layer].visibleAtMapScale) {
                            returnVal = true;
                            break;
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
            divlegendContainer = domConstruct.create("div", { "class": "divlegendContainer" }, this.divlegendList);
            this.divlegendContainer = domConstruct.create("div", { "class": "divlegendContent" }, divlegendContainer);
            divLeftArrow = domConstruct.create("div", { "class": "esriCTLeftArrow" }, this.legendbox);
            domStyle.set(divLeftArrow, "display", "none");
            on(divLeftArrow, "click", lang.hitch(this, function () {
                this._slideLeft();
            }));
            this.divRightArrow = domConstruct.create("div", { "class": "esriCTRightArrow" }, this.legendbox);
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
                this.newLeft = this.newLeft - (200 + 9);
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
                if (this.newLeft > -(200 + 9)) {
                    this.newLeft = 0;
                } else {
                    this.newLeft = this.newLeft + (200 + 9);
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
            queryParams.geometry = currentExtent;
            queryParams.spatialRelationship = "esriSpatialRelContains";
            queryParams.returnGeometry = false;
            return queryParams;
        },

        /**
        * performs query task for the no of features present in the current extent
        * @memberOf widgets/legends/legends
        */
        _executeQueryTask: function (layer, defQueryArray, queryParams) {
            var queryTask = new QueryTask(layer);
            defQueryArray.push(queryTask.executeForCount(queryParams, function (count) {
                var queryDeferred = new Deferred();
                queryDeferred.resolve(count);
                return queryDeferred.promise;
            }, function (error) {
                console.log(error);
            }));
        },

        /*
        * initiates the creation of legend
        * @memberOf widgets/legends/legends
        */
        startup: function (layerArray, updatedRendererArray) {
            var mapServerURL, featureLayerUrl, index, hostedDefArray = [], defArray = [], params, layersRequest, deferredList, hostedDeferredList, hostedLayers, i;
            this.mapServerArray = [];
            this.featureServerArray = [];
            this.legendListWidth = [];
            this.webmapUpdatedRenderer = updatedRendererArray;
            hostedLayers = this._filterHostedFeatureServices(layerArray);
            for (i = 0; i < hostedLayers.length; i++) {
                params = {
                    url: hostedLayers[i],
                    content: { f: "json" },
                    handleAs: "json",
                    callbackParamName: "callback"
                };
                layersRequest = esriRequest(params);
                hostedDefArray.push(layersRequest.then(this._getLayerDetail, this._displayError));
            }
            if (hostedDefArray.length > 0) {
                hostedDeferredList = new DeferredList(hostedDefArray);
                hostedDeferredList.then(lang.hitch(this, function (result) {
                    this.hostedLayersJSON = {};
                    for (i = 0; i < result.length; i++) {
                        this.hostedLayersJSON[hostedLayers[i]] = result[i][1];
                    }
                    if (result.length === 0) {
                        this.hostedLayersJSON = null;
                    }
                    this._displayHostedLayerRenderer();
                }));
            }
            for (index = 0; index < layerArray.length; index++) {
                if (layerArray[index].match("/FeatureServer")) {
                    featureLayerUrl = layerArray[index];
                    layerArray[index] = layerArray[index].replace("/FeatureServer", "/MapServer");

                } else {
                    featureLayerUrl = null;
                }
                mapServerURL = layerArray[index].split("/");
                mapServerURL.pop();
                mapServerURL = mapServerURL.join("/");
                this.mapServerArray.push({ "url": mapServerURL, "featureLayerUrl": featureLayerUrl });
            }

            this.mapServerArray = this._removeDuplicate(this.mapServerArray);

            for (index = 0; index < this.mapServerArray.length; index++) {
                params = {
                    url: this.mapServerArray[index].url + "/legend",
                    content: { f: "json" },
                    handleAs: "json",
                    callbackParamName: "callback"
                };
                layersRequest = esriRequest(params);
                defArray.push(layersRequest.then(this._getLayerDetail, this._displayError));
            }
            deferredList = new DeferredList(defArray);
            deferredList.then(lang.hitch(this, function (result) {
                domConstruct.empty(this.divlegendContainer);
                for (index = 0; index < result.length; index++) {
                    this._createLegendList(result[index][1], this.mapServerArray[index]);
                }
            }));
            this._displayWebmapRenderer();
        },

        /*
        * display webmap generated renderers
        * @memberOf widgets/legends/legends
        */
        _displayWebmapRenderer: function () {
            var layer;
            for (layer in this.webmapUpdatedRenderer) {
                if (this.webmapUpdatedRenderer.hasOwnProperty(layer)) {
                    this._createLegendSymbol(this.webmapUpdatedRenderer[layer].layerDefinition.drawingInfo, this.webmapUpdatedRenderer[layer].title);
                }
            }
            this._addlegendListWidth(this.legendListWidth);
        },

        /*
        * display hosted layer renderers
        * @memberOf widgets/legends/legends
        */
        _displayHostedLayerRenderer: function () {
            var layer;
            for (layer in this.hostedLayersJSON) {
                if (this.hostedLayersJSON.hasOwnProperty(layer)) {
                    this._createLegendSymbol(this.hostedLayersJSON[layer].drawingInfo, this.hostedLayersJSON[layer].name);
                }
            }
            this._addlegendListWidth(this.legendListWidth);
        },

        /*
        * create Legend symbols
        * @memberOf widgets/legends/legends
        */
        _createLegendSymbol: function (layerData, layerTitle) {
            var renderer, divLegendImage, divLegendLabel, image, rendererObject, i;
            if (layerData) {
                renderer = layerData.renderer;
                if (renderer.label) {
                    layerTitle = renderer.label;
                }
                if (renderer && renderer.symbol) {
                    this._createSymbol(renderer.symbol.type, renderer.symbol.url, renderer.symbol.color,
                        renderer.symbol.width, renderer.symbol.height, renderer.symbol.imageData, layerTitle);
                } else if (renderer && renderer.defaultSymbol) {
                    this._createSymbol(renderer.defaultSymbol.type, renderer.defaultSymbol.url, renderer.defaultSymbol.color,
                        renderer.defaultSymbol.width, renderer.defaultSymbol.height, renderer.defaultSymbol.imageData, layerTitle);
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
                } else {
                    this.divLegendlist = domConstruct.create("div", { "class": "divLegendlist" }, this.divlegendContainer);
                    divLegendImage = dojo.create("div", { "class": "legend" }, null);
                    if (renderer.symbol.url) {
                        image = this._createImage(renderer.symbol.url, "", false, renderer.symbol.width, renderer.symbol.height);
                    }
                    domConstruct.place(image, divLegendImage);
                    this.divLegendlist.appendChild(divLegendImage);
                    divLegendLabel = dojo.create("div", { "class": "legendlbl" }, null);
                    this.divLegendlist.appendChild(divLegendLabel);
                }
            }
        },

        /*
        *creates the symbol with or without label for displaying the legend
        * @memberOf widgets/legends/legends
        */
        _createSymbol: function (symbolType, url, color, width, height, imageData, label) {
            var bgColor, divLegendLabel, divLegendImage, divSymbol, image;
            this.divLegendlist = domConstruct.create("div", { "class": "divLegendlist" }, this.divlegendContainer);
            divLegendImage = domConstruct.create("div", { "class": "legend" }, null);
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
                if (color.a) {
                    bgColor = 'rgba(' + color.r + ',' + color.g + ',' + color.b + ',' + color.a + ')';
                    divSymbol.style.background = bgColor;
                } else {
                    if (color.fromArray(color).toHex()) {
                        divSymbol.style.backgroundColor = color.fromArray(color).toHex();
                    } else {
                        divSymbol.style.backgroundColor = color.fromArray([255, 0, 255, 5]).toHex();
                    }
                }
                divSymbol.style.height = height ? height < 5 ? "5px" : height + "px" : "15px";
                divSymbol.style.width = width ? width < 5 ? "5px" : width + "px" : "15px";
                divSymbol.style.marginTop = "8px";
                divLegendImage.appendChild(divSymbol);
                this.divLegendlist.appendChild(divLegendImage);
            }
            divLegendLabel = dojo.create("div", { "class": "legendlbl" }, null);
            domAttr.set(divLegendLabel, "innerHTML", label);
            this.divLegendlist.appendChild(divLegendLabel);
            this.legendListWidth.push(this.divLegendlist.offsetWidth + width);
        },

        /*
        * find hosted feature services
        * @memberOf widgets/legends/legends
        */
        _filterHostedFeatureServices: function (layerArray) {
            var hostedLayers = [], layerDetails, index;
            for (index = 0; index < layerArray.length; index++) {
                if (layerArray[index].match("/FeatureServer")) {
                    layerDetails = layerArray[index].split("/");
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
        _getLayerDetail: function (response) {
            var deferred = new Deferred();
            deferred.resolve(response);
            return deferred.promise;
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
        _addFieldValue: function () {
            var defArray = [], layerTempArray = [], params, layersRequest, deferredList, layerObject, i, layer;
            for (layer in this._layerCollection) {
                if (this._layerCollection.hasOwnProperty(layer)) {
                    if (this._layerCollection[layer].legend && this._layerCollection[layer].legend.length > 1) {
                        layerTempArray.push(layer);
                        params = {
                            url: layer,
                            content: { f: "json" },
                            handleAs: "json",
                            callbackParamName: "callback"
                        };
                        layersRequest = esriRequest(params);
                        defArray.push(layersRequest.then(this._getLayerDetail, this._displayError));
                    }
                }
            }
            deferredList = new DeferredList(defArray);
            deferredList.then(lang.hitch(this, function (result) {
                for (i = 0; i < result.length; i++) {
                    if (result[i][0]) {
                        layerObject = result[i][1];
                        if (layerObject.drawingInfo && layerObject.drawingInfo.renderer && layerObject.drawingInfo.renderer.type === "uniqueValue") {
                            this._layerCollection[layerTempArray[i]].rendererType = "uniqueValue";
                            this._layerCollection[layerTempArray[i]].fieldName = layerObject.drawingInfo.renderer.field1 || layerObject.drawingInfo.renderer.field2 || layerObject.drawingInfo.renderer.field3;
                            this._appendFieldType(this._layerCollection[layerTempArray[i]], layerObject);
                        } else if (layerObject.drawingInfo && layerObject.drawingInfo.renderer && layerObject.drawingInfo.renderer.type === "classBreaks") {
                            this._layerCollection[layerTempArray[i]].rendererType = "classBreaks";
                            this._layerCollection[layerTempArray[i]].fieldName = layerObject.drawingInfo.renderer.field;
                            this._appendFieldType(this._layerCollection[layerTempArray[i]], layerObject);
                        }
                    }
                }
            }));
        },

        _appendFieldType: function (layerCollection, layerObject) {
            var i;
            for (i = 0; i < layerObject.fields.length; i++) {
                if (layerObject.fields[i].name === layerCollection.fieldName) {
                    layerCollection.fieldType = layerObject.fields[i].type;
                    break;
                }
            }
        },

        /**
        * remove redundant data
        * @memberOf widgets/legends/legends
        */
        _removeDuplicate: function (mapServerArray) {
            var filterArray = [], fliteredArray = [];
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
        _createLegendList: function (layerList, mapServerUrl) {
            var layerURL, i, j;
            if (layerList) {
                for (i = 0; i < layerList.layers.length; i++) {
                    layerList.layers[i].featureLayerUrl = mapServerUrl.featureLayerUrl;
                    layerURL = mapServerUrl.url + '/' + layerList.layers[i].layerId;
                    this._layerCollection[layerURL] = layerList.layers[i];
                    for (j = 0; j < layerList.layers[i].legend.length; j++) {
                        this._addLegendSymbol(layerList.layers[i].legend[j], layerList.layers[i].layerName);
                    }
                }
            }
            this._addlegendListWidth(this.legendListWidth);
            this._addFieldValue();

        },

        /**
        * set legend container width
        * @memberOf widgets/legends/legends
        */
        _addlegendListWidth: function (legendListWidth) {
            var listWidth = legendListWidth, total = 0, j, boxWidth;
            for (j = 0; j < listWidth.length; j++) {
                total += listWidth[j] + 20;
            }
            domStyle.set(this.divlegendContainer, "width", (total + 5) + "px");
            if (query(".esriCTHeaderReportContainer")[0]) {
                boxWidth = this.legendbox.offsetWidth - query(".esriCTHeaderReportContainer")[0].offsetWidth + 200;
            } else {
                boxWidth = this.legendbox.offsetWidth;
            }
            if (total <= 0 || this.divlegendContainer.offsetWidth < boxWidth) {
                domStyle.set(this.divRightArrow, "display", "none");
            } else {
                domStyle.set(this.divRightArrow, "display", "block");
            }
        },

        /**
        * add legend symbol in legend list
        * @memberOf widgets/legends/legends
        */
        _addLegendSymbol: function (legend, layerName) {
            var divLegendImage, image, divLegendLabel;
            if (legend) {
                this.divLegendlist = domConstruct.create("div", { "class": "divLegendlist" }, this.divlegendContainer);
                divLegendImage = domConstruct.create("div", { "class": "legend" }, null);
                image = this._createImage("data:image/gif;base64," + legend.imageData, "", false, legend.width, legend.height);
                domConstruct.place(image, divLegendImage);
                this.divLegendlist.appendChild(divLegendImage);
                if (legend.label) {
                    divLegendLabel = domConstruct.create("div", { "class": "legendlbl", "innerHTML": legend.label }, null);
                } else {
                    divLegendLabel = domConstruct.create("div", { "class": "legendlbl", "innerHTML": layerName }, null);
                }
                this.divLegendlist.appendChild(divLegendLabel);
                this.legendListWidth.push(this.divLegendlist.offsetWidth + legend.width);
            }
        },

        /*
        * displays the picture marker symbol
        * @memberOf widgets/legends/legends
        */
        _createImage: function (imageSrc, title, isCursorPointer, imageWidth, imageHeight) {
            var imgLocate, imageHeightWidth;
            imgLocate = domConstruct.create("img");
            imageHeightWidth = { width: imageWidth + 'px', height: imageHeight + 'px' };
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
