/*global define,dojo,dojoConfig,alert,esri */
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
    "esri/arcgis/utils",
    "dojo/dom",
    "dojo/dom-attr",
    "dojo/query",
    "dojo/dom-class",
    "dijit/_WidgetBase",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "esri/map",
    "esri/layers/ImageParameters",
    "esri/layers/FeatureLayer",
    "esri/layers/GraphicsLayer",
    "widgets/baseMapGallery/baseMapGallery",
    "widgets/legends/legends",
    "esri/geometry/Extent",
    "esri/dijit/HomeButton",
    "dojo/Deferred",
    "dojo/DeferredList",
    "dojo/topic",
    "dojo/on",
    "widgets/infoWindow/infoWindow",
    "dojo/text!../infoWindow/templates/infoWindow.html",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/geometry/webMercatorUtils",
    "dojo/query",
    "dojo/_base/array",
    "dojo/domReady!"
], function (declare, domConstruct, domStyle, lang, esriUtils, dom, domAttr, query, domClass, _WidgetBase, sharedNls, esriMap, ImageParameters, FeatureLayer, GraphicsLayer, BaseMapGallery, Legends, GeometryExtent, HomeButton, Deferred, DeferredList, topic, on, InfoWindow, template, ArcGISDynamicMapServiceLayer, webMercatorUtils, dojoQuery, array) {

    //========================================================================================================================//

    return declare([_WidgetBase], {

        map: null,
        templateString: template,
        tempGraphicsLayerId: "esriGraphicsLayerMapSettings",
        tempBufferLayer: "tempBufferLayer",
        tempShapeFileGraphicsLayer: "addShapeFileGraphicsLayer",
        sharedNls: sharedNls,
        infoWindowPanel: null,

        /**
        * initialize map object
        *
        * @class
        * @name widgets/mapSettings/mapSettings
        */
        postCreate: function () {
            var mapDeferred, layer;
            topic.publish("showProgressIndicator");
            topic.subscribe("setInfoWindowOnMap", lang.hitch(this, function (infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight, count) {
                this._onSetInfoWindowPosition(infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight, count);
            }));


            /**
            * load map
            * @param {string} dojo.configData.BaseMapLayers Basemap settings specified in configuration file
            */
            this.infoWindowPanel = new InfoWindow({ infoWindowWidth: dojo.configData.InfoPopupWidth, infoWindowHeight: dojo.configData.InfoPopupHeight });
            if (dojo.configData.WebMapId && lang.trim(dojo.configData.WebMapId).length !== 0) {
                mapDeferred = esriUtils.createMap(dojo.configData.WebMapId, "esriCTParentDivContainer", {
                    mapOptions: {
                        slider: true,
                        showAttribution: dojo.configData.ShowMapAttribution
                    },
                    ignorePopups: true
                });
                mapDeferred.then(lang.hitch(this, function (response) {
                    clearTimeout(this.stagedSearch);
                    this.map = response.map;
                    dojo.selectedBasemapIndex = 0;
                    if (response.itemInfo.itemData.baseMap.baseMapLayers && response.itemInfo.itemData.baseMap.baseMapLayers[0].id) {
                        if (response.itemInfo.itemData.baseMap.baseMapLayers[0].id !== "defaultBasemap") {
                            this.map.getLayer(response.itemInfo.itemData.baseMap.baseMapLayers[0].id).id = "defaultBasemap";
                            this.map._layers.defaultBasemap = this.map.getLayer(response.itemInfo.itemData.baseMap.baseMapLayers[0].id);
                            delete this.map._layers[response.itemInfo.itemData.baseMap.baseMapLayers[0].id];
                            this.map.layerIds[0] = "defaultBasemap";
                        }
                    }
                    this._fetchWebMapData(response);
                    topic.publish("setMap", this.map);
                    topic.publish("hideProgressIndicator");
                    this._mapOnLoad();
                    this._mapEvents();
                    this.stagedSearch = setTimeout(lang.hitch(this, function () {
                        this._addLayerLegendWebmap(response);
                    }), 3000);
                }), lang.hitch(this, function (error) {
                    alert(error.message);
                }));
            } else {
                this._generateLayerURL(dojo.configData.OperationalLayers);
                this.map = esriMap("esriCTParentDivContainer", {
                    showAttribution: dojo.configData.ShowMapAttribution
                });
                if (dojo.configData.BaseMapLayers[0].length > 1) {
                    array.forEach(dojo.configData.BaseMapLayers[0], lang.hitch(this, function (basemapLayer, index) {
                        layer = new esri.layers.ArcGISTiledMapServiceLayer(basemapLayer.MapURL, { id: "defaultBasemap" + index, visible: true });
                        this.map.addLayer(layer);
                    }));
                } else {
                    layer = new esri.layers.ArcGISTiledMapServiceLayer(dojo.configData.BaseMapLayers[0].MapURL, { id: "defaultBasemap", visible: true });
                    this.map.addLayer(layer);
                }
                this.map.on("load", lang.hitch(this, function () {
                    this._mapOnLoad();
                }));
                this._mapEvents();
            }

            on(window, "resize", lang.hitch(this, function () {
                topic.publish("resizeAOIPanel");
                topic.publish("resizeReportsPanel");
            }));

        },

        _fetchWebMapData: function (response) {
            var searchSettings, i, j, k, l, p, str, field, index, webMapDetails, operationalLayers, serviceTitle, operationalLayerId, lastIndex, layerInfo;
            searchSettings = dojo.configData.SearchSettings;
            webMapDetails = response.itemInfo.itemData;
            dojo.configData.OperationalLayers = [];
            operationalLayers = dojo.configData.OperationalLayers;
            serviceTitle = [];
            p = 0;
            for (i = 0; i < webMapDetails.operationalLayers.length; i++) {
                operationalLayerId = lang.trim(webMapDetails.operationalLayers[i].title);
                str = webMapDetails.operationalLayers[i].url.split('/');
                lastIndex = str[str.length - 1];
                if (isNaN(lastIndex) || lastIndex === "") {
                    if (lastIndex === "") {
                        serviceTitle[operationalLayerId] = webMapDetails.operationalLayers[i].url;
                    } else {
                        serviceTitle[operationalLayerId] = webMapDetails.operationalLayers[i].url + "/";
                    }
                } else {
                    serviceTitle[operationalLayerId] = webMapDetails.operationalLayers[i].url.substring(0, webMapDetails.operationalLayers[i].url.lastIndexOf("/") + 1);
                }
            }

            for (index = 0; index < searchSettings.length; index++) {
                if (searchSettings[index].Title && searchSettings[index].QueryLayerId && serviceTitle[searchSettings[index].Title]) {
                    searchSettings[index].QueryURL = serviceTitle[searchSettings[index].Title] + searchSettings[index].QueryLayerId;
                    for (j = 0; j < webMapDetails.operationalLayers.length; j++) {
                        if (webMapDetails.operationalLayers[j].title && serviceTitle[webMapDetails.operationalLayers[j].title] && (webMapDetails.operationalLayers[j].title === searchSettings[index].Title)) {
                            if (webMapDetails.operationalLayers[j].layers) {
                                //Fetching infopopup data in case the layers are added as dynamic layers in the webmap
                                for (k = 0; k < webMapDetails.operationalLayers[j].layers.length; k++) {
                                    layerInfo = webMapDetails.operationalLayers[j].layers[k];
                                    if (Number(searchSettings[index].QueryLayerId) === layerInfo.id) {
                                        if (webMapDetails.operationalLayers[j].layers[k].popupInfo) {
                                            operationalLayers[p] = {};
                                            operationalLayers[p].ServiceURL = webMapDetails.operationalLayers[j].url + "/" + webMapDetails.operationalLayers[j].layers[k].id;
                                            p++;
                                            if (layerInfo.popupInfo.title.split("{").length > 1) {
                                                searchSettings[index].InfoWindowHeaderField = lang.trim(layerInfo.popupInfo.title.split("{")[0]) + " ";
                                                for (l = 1; l < layerInfo.popupInfo.title.split("{").length; l++) {
                                                    searchSettings[index].InfoWindowHeaderField += "${" + lang.trim(layerInfo.popupInfo.title.split("{")[l]);
                                                }
                                            } else {
                                                if (lang.trim(layerInfo.popupInfo.title) !== "") {
                                                    searchSettings[index].InfoWindowHeaderField = lang.trim(layerInfo.popupInfo.title);
                                                } else {
                                                    searchSettings[index].InfoWindowHeaderField = sharedNls.showNullValue;
                                                }
                                            }
                                            searchSettings[index].InfoWindowData = [];
                                            for (field in layerInfo.popupInfo.fieldInfos) {
                                                if (layerInfo.popupInfo.fieldInfos.hasOwnProperty(field)) {
                                                    if (layerInfo.popupInfo.fieldInfos[field].visible) {
                                                        searchSettings[index].InfoWindowData.push({
                                                            "DisplayText": layerInfo.popupInfo.fieldInfos[field].label + ":",
                                                            "FieldName": "${" + layerInfo.popupInfo.fieldInfos[field].fieldName + "}"
                                                        });
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } else if (webMapDetails.operationalLayers[j].popupInfo) {
                                //Fetching infopopup data in case the layers are added as feature layers in the webmap
                                operationalLayers[p] = {};
                                operationalLayers[p].ServiceURL = webMapDetails.operationalLayers[j].url;
                                p++;
                                if (webMapDetails.operationalLayers[j].popupInfo.title.split("{").length > 1) {
                                    searchSettings[index].InfoWindowHeaderField = lang.trim(webMapDetails.operationalLayers[j].popupInfo.title.split("{")[0]);
                                    for (l = 1; l < webMapDetails.operationalLayers[j].popupInfo.title.split("{").length; l++) {
                                        searchSettings[index].InfoWindowHeaderField += " ${" + lang.trim(webMapDetails.operationalLayers[j].popupInfo.title.split("{")[l]);
                                    }
                                } else {
                                    if (lang.trim(webMapDetails.operationalLayers[j].popupInfo.title) !== "") {
                                        searchSettings[index].InfoWindowHeaderField = lang.trim(webMapDetails.operationalLayers[j].popupInfo.title);
                                    } else {
                                        searchSettings[index].InfoWindowHeaderField = sharedNls.showNullValue;
                                    }
                                }
                                searchSettings[index].InfoWindowData = [];
                                for (field in webMapDetails.operationalLayers[j].popupInfo.fieldInfos) {
                                    if (webMapDetails.operationalLayers[j].popupInfo.fieldInfos.hasOwnProperty(field)) {
                                        if (webMapDetails.operationalLayers[j].popupInfo.fieldInfos[field].visible) {
                                            searchSettings[index].InfoWindowData.push({
                                                "DisplayText": webMapDetails.operationalLayers[j].popupInfo.fieldInfos[field].label + ":",
                                                "FieldName": "${" + webMapDetails.operationalLayers[j].popupInfo.fieldInfos[field].fieldName + "}"
                                            });
                                        }
                                    }
                                }
                            }
                        }
                    }
                } else {
                    alert(sharedNls.appErrorMessage.webmapTitleError);
                }
            }
        },

        _mapEvents: function () {
            var intialLat, initiallong;
            this.map.on("extent-change", lang.hitch(this, function () {
                this._onSetMapTipPosition(dojo.selectedMapPoint, this.map, this.infoWindowPanel);
            }));
            this.map.on("click", lang.hitch(this, function (evt) {
                if (!dojo.activatedDrawTool && !dojo.initialCoordinates) {
                    this._showInfoWindowOnMap(evt.mapPoint);
                }
                if (dojo.initialCoordinates) {
                    var normalizedVal = webMercatorUtils.xyToLngLat(evt.mapPoint.x, evt.mapPoint.y);
                    intialLat = dojoQuery(".esriCTaddLatitudeValue");
                    intialLat[0].value = normalizedVal[0];
                    initiallong = dojoQuery(".esriCTaddLongitudeValue");
                    initiallong[0].value = normalizedVal[1];
                }
            }));
        },

        _mapOnLoad: function () {
            var home, extentPoints, mapDefaultExtent, i, j, x, index, graphicsLayer, extent, serviceTitle, operationalLayers, count, layerTitle, str, lastIndex, searchSettings;
            searchSettings = dojo.configData.SearchSettings;

            /**
            * set map extent to default extent specified in configuration file
            * @param {string} dojo.configData.DefaultExtent Default extent of map specified in configuration file
            */
            extentPoints = dojo.configData && dojo.configData.DefaultExtent && dojo.configData.DefaultExtent.split(",");
            extent = this._getQueryString('extent');
            if (extent === "") {
                if (!dojo.configData.WebMapId) {
                    mapDefaultExtent = new GeometryExtent({ "xmin": parseFloat(extentPoints[0]), "ymin": parseFloat(extentPoints[1]), "xmax": parseFloat(extentPoints[2]), "ymax": parseFloat(extentPoints[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                    this.map.setExtent(mapDefaultExtent);
                }
            } else {
                mapDefaultExtent = extent.split(',');
                mapDefaultExtent = new GeometryExtent({ "xmin": parseFloat(mapDefaultExtent[0]), "ymin": parseFloat(mapDefaultExtent[1]), "xmax": parseFloat(mapDefaultExtent[2]), "ymax": parseFloat(mapDefaultExtent[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid} });
                this.map.setExtent(mapDefaultExtent);
            }
            /**
            * load esri 'Home Button' widget
            */
            home = this._addHomeButton();
            home.extent = mapDefaultExtent;
            /* set position of home button widget after map is successfully loaded
            * @param {array} dojo.configData.OperationalLayers List of operational Layers specified in configuration file
            */
            domConstruct.place(home.domNode, query(".esriSimpleSliderIncrementButton")[0], "after");
            home.startup();

            if (dojo.configData.CustomLogoUrl && lang.trim(dojo.configData.CustomLogoUrl).length !== 0) {
                domConstruct.create("img", { "src": dojoConfig.baseURL + dojo.configData.CustomLogoUrl, "class": "esriCTMapLogo" }, dom.byId("esriCTParentDivContainer"));
            }
            if (!dojo.configData.WebMapId) {
                for (i in dojo.configData.OperationalLayers) {
                    if (dojo.configData.OperationalLayers.hasOwnProperty(i)) {
                        this._addOperationalLayerToMap(i, dojo.configData.OperationalLayers[i]);
                    }
                }
                serviceTitle = [];
                operationalLayers = dojo.configData.OperationalLayers;
                for (i = 0; i < operationalLayers.length; i++) {
                    if (operationalLayers[i].ServiceURL) {
                        str = operationalLayers[i].ServiceURL.split('/');
                        lastIndex = str[str.length - 1];
                        if (isNaN(lastIndex) || lastIndex === "") {
                            if (lastIndex === "") {
                                layerTitle = str[str.length - 3];
                                serviceTitle[layerTitle] = operationalLayers[i].ServiceURL;
                            } else {
                                layerTitle = str[str.length - 2];
                                serviceTitle[layerTitle] = operationalLayers[i].ServiceURL + "/";
                            }
                        } else {
                            layerTitle = str[str.length - 3];
                            serviceTitle[layerTitle] = operationalLayers[i].ServiceURL.substring(0, operationalLayers[i].ServiceURL.lastIndexOf("/") + 1);
                        }
                    } else {
                        operationalLayers.splice(i, 1);
                        i--;
                    }
                }
                if (dojo.configData.InfoWindowSettings.length === searchSettings.length) {
                    count = 0;
                    for (index = 0; index < searchSettings.length; index++) {
                        if (searchSettings[index].Title && searchSettings[index].QueryLayerId && serviceTitle[searchSettings[index].Title]) {
                            searchSettings[index].QueryURL = serviceTitle[searchSettings[index].Title] + searchSettings[index].QueryLayerId;
                            for (j = 0; j < dojo.configData.InfoWindowSettings.length; j++) {
                                if (dojo.configData.InfoWindowSettings[j].Title && dojo.configData.InfoWindowSettings[j].QueryLayerId && serviceTitle[dojo.configData.InfoWindowSettings[j].Title] && (dojo.configData.InfoWindowSettings[j].Title === searchSettings[index].Title) && (dojo.configData.InfoWindowSettings[j].QueryLayerId === searchSettings[index].QueryLayerId)) {
                                    count++;
                                    searchSettings[index].InfoWindowHeaderField = dojo.configData.InfoWindowSettings[j].InfoWindowHeaderField;
                                    searchSettings[index].InfoWindowData = dojo.configData.InfoWindowSettings[j].InfoWindowData;
                                }
                            }
                        } else {
                            alert(sharedNls.appErrorMessage.layerTitleError);
                        }
                    }
                    for (x = 0; x < searchSettings.length; x++) {
                        if (!searchSettings[x].QueryURL) {
                            searchSettings.splice(x, 1);
                            x--;
                        }
                    }
                    if (count !== dojo.configData.InfoWindowSettings.length) {
                        alert(sharedNls.appErrorMessage.titleNotMatching);
                    }
                } else {
                    alert(sharedNls.appErrorMessage.lengthDoNotMatch);
                }

                if (dojo.configData.BaseMapLayers.length > 1) {
                    this._showBasMapGallery();
                }
                setTimeout(lang.hitch(this, function () {
                    this._addLayerLegend();
                }), 2000);
            }

            graphicsLayer = new GraphicsLayer();
            graphicsLayer.id = this.tempGraphicsLayerId;
            graphicsLayer.spatialReference = this.map.extent.spatialReference;
            this.map.addLayer(graphicsLayer);

            graphicsLayer = new GraphicsLayer();
            graphicsLayer.id = this.tempBufferLayer;
            this.map.addLayer(graphicsLayer);

            graphicsLayer = new GraphicsLayer();
            graphicsLayer.id = this.tempShapeFileGraphicsLayer;
            graphicsLayer.spatialReference = this.map.extent.spatialReference;
            this.map.addLayer(graphicsLayer);
        },

        _onSetMapTipPosition: function (selectedPoint, map, infoWindow) {
            if (selectedPoint) {
                var screenPoint = map.toScreen(selectedPoint);
                screenPoint.y = map.height - screenPoint.y;
                infoWindow.setLocation(screenPoint);
            }
        },

        _onSetInfoWindowPosition: function (infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight) {
            this.infoWindowPanel.resize(infoPopupWidth, infoPopupHeight);
            this.infoWindowPanel.hide();
            this.infoWindowPanel.setTitle(infoTitle);
            this.infoWindowPanel.show(divInfoDetailsTab, screenPoint);
        },

        _showInfoWindowOnMap: function (mapPoint) {
            var index, deferredListResult,
                onMapFeaturArray = [],
                featureArray = [];

            this.counter = 0;
            for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                this._executeQueryTask(index, mapPoint, onMapFeaturArray);
            }
            deferredListResult = new DeferredList(onMapFeaturArray);
            deferredListResult.then(lang.hitch(this, function (result) {
                var j, i;

                if (result) {
                    for (j = 0; j < result.length; j++) {
                        if (result[j][0] === true) {
                            if (result[j][1].features.length > 0) {
                                for (i = 0; i < result[j][1].features.length; i++) {
                                    featureArray.push({
                                        attr: result[j][1].features[i],
                                        layerId: j,
                                        fields: result[j][1].fields
                                    });
                                }
                            }
                        }
                    }
                    this._fetchQueryResults(featureArray);
                }
            }), function (err) {
                alert(err.message);
            });
        },

        _executeQueryTask: function (index, mapPoint, onMapFeaturArray) {
            var queryTask, queryLayer, queryOnRouteTask;

            queryTask = new esri.tasks.QueryTask(dojo.configData.SearchSettings[index].QueryURL);
            queryLayer = new esri.tasks.Query();
            queryLayer.outSpatialReference = this.map.spatialReference;
            queryLayer.returnGeometry = true;
            queryLayer.maxAllowableOffset = 100;
            queryLayer.geometry = this._extentFromPoint(mapPoint);
            queryLayer.outFields = ["*"];
            queryOnRouteTask = queryTask.execute(queryLayer, lang.hitch(this, function (results) {
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

        _fetchQueryResults: function (featureArray) {
            var _this = this;

            if (featureArray.length > 0) {
                if (featureArray.length === 1) {
                    domClass.remove(query(".esriCTInfoWindowRightArrow")[0], "esriCTShowInfoRightArrow");
                    topic.publish("createInfoWindowContent", featureArray[0].attr.geometry, featureArray[0].attr.attributes, featureArray[0].fields, featureArray[0].layerId, null, null, false);
                } else {
                    this.count = 0;
                    domAttr.set(query(".esriCTdivInfoTotalFeatureCount")[0], "innerHTML", '/' + featureArray.length);
                    topic.publish("createInfoWindowContent", featureArray[0].attr.geometry, featureArray[0].attr.attributes, featureArray[0].fields, featureArray[0].layerId, featureArray, this.count, false);
                    topic.publish("hideProgressIndicator");
                    query(".esriCTInfoWindowRightArrow")[0].onclick = function () {
                        _this._nextInfoContent(featureArray);
                    };
                    query(".esriCTInfoWindowLeftArrow")[0].onclick = function () {
                        _this._previousInfoContent(featureArray);
                    };
                }
            } else {
                topic.publish("hideProgressIndicator");
            }
        },

        _nextInfoContent: function (featureArray) {
            if (this.count < featureArray.length) {
                this.count++;
            }
            if (featureArray[this.count]) {
                topic.publish("createInfoWindowContent", featureArray[0].attr.geometry, featureArray[this.count].attr.attributes, featureArray[this.count].fields, featureArray[this.count].layerId, featureArray, this.count, false);
            }
        },

        _previousInfoContent: function (featureArray) {
            if (this.count !== 0 && this.count < featureArray.length) {
                this.count--;
            }
            if (featureArray[this.count]) {
                topic.publish("createInfoWindowContent", featureArray[0].attr.geometry, featureArray[this.count].attr.attributes, featureArray[this.count].fields, featureArray[this.count].layerId, featureArray, this.count, false);
            }
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

        _generateLayerURL: function (operationalLayers) {
            var searchSettings, i, str, layerTitle, layerId, index;

            searchSettings = dojo.configData.SearchSettings;
            for (i = 0; i < operationalLayers.length; i++) {
                if (dojo.configData.WebMapId && lang.trim(dojo.configData.WebMapId).length !== 0) {
                    str = operationalLayers[i].url.split('/');
                    layerTitle = str[str.length - 3];
                    layerId = str[str.length - 1];
                    for (index = 0; index < searchSettings.length; index++) {
                        if (searchSettings[index].Title && searchSettings[index].QueryLayerId) {
                            if (layerTitle === searchSettings[index].Title && layerId === searchSettings[index].QueryLayerId) {
                                searchSettings[index].QueryURL = str.join("/");
                            }
                        }
                    }
                } else {
                    if (operationalLayers[i].ServiceURL) {
                        str = operationalLayers[i].ServiceURL.split('/');
                        layerTitle = str[str.length - 3];
                        layerId = str[str.length - 1];
                        for (index = 0; index < searchSettings.length; index++) {
                            if (searchSettings[index].Title && searchSettings[index].QueryLayerId) {
                                if (layerTitle === searchSettings[index].Title && layerId === searchSettings[index].QueryLayerId) {
                                    searchSettings[index].QueryURL = str.join("/");
                                }
                            }
                        }
                    }
                }
            }
        },

        /**
        * load esri 'Home Button' widget which sets map extent to default extent
        * @return {object} Home button widget
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addHomeButton: function () {
            var home = new HomeButton({
                map: this.map
            }, domConstruct.create("div", {}, null));
            return home;
        },

        _showBasMapGallery: function () {
            var basMapGallery = new BaseMapGallery({
                map: this.map
            }, domConstruct.create("div", {}, null));
            return basMapGallery;
        },

        /**
        * load and add operational layers depending on their LoadAsServiceType specified in configuration file
        * @param {int} index Layer order specified in configuration file
        * @param {object} layerInfo Layer settings specified in configuration file
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addOperationalLayerToMap: function (index, layerInfo) {
            if (layerInfo.LoadAsServiceType.toLowerCase() === "feature") {
                this._createFeatureServiceLayer(index, layerInfo, layerInfo.ServiceURL);
            } else if (layerInfo.LoadAsServiceType.toLowerCase() === "dynamic") {
                this._addDynamicLayerService(layerInfo);
            }
        },

        _addDynamicLayerService: function (layerInfo) {
            var str, lastIndex, layerTitle;

            clearTimeout(this.stagedSearch);
            str = layerInfo.ServiceURL.split('/');
            lastIndex = str[str.length - 1];
            if (isNaN(lastIndex) || lastIndex === "") {
                if (lastIndex === "") {
                    layerTitle = str[str.length - 3];
                } else {
                    layerTitle = str[str.length - 2];
                }
            } else {
                layerTitle = str[str.length - 3];
            }
            this.stagedSearch = setTimeout(lang.hitch(this, function () {
                this._addServiceLayers(layerTitle, layerInfo.ServiceURL);
            }), 500);
        },

        _addServiceLayers: function (layerId, layerURL) {
            var dynamicLayer, imageParams, lastIndex, dynamicLayerId;

            imageParams = new ImageParameters();
            lastIndex = layerURL.lastIndexOf('/');
            dynamicLayerId = layerURL.substr(lastIndex + 1);
            if (isNaN(dynamicLayerId) || dynamicLayerId === "") {
                if (isNaN(dynamicLayerId)) {
                    dynamicLayer = layerURL + "/";
                } else if (dynamicLayerId === "") {
                    dynamicLayer = layerURL;
                }
                if (layerURL.indexOf("/FeatureServer") >= 0) {
                    this._addHostedServices(dynamicLayer, layerId);
                } else {
                    this._createDynamicServiceLayer(dynamicLayer, imageParams, layerId);
                }

            } else {
                imageParams.layerIds = [dynamicLayerId];
                dynamicLayer = layerURL.substring(0, lastIndex + 1);
                if (layerURL.indexOf("/FeatureServer") >= 0) {
                    this._addHostedServices(dynamicLayer, layerId);
                } else {
                    this._createDynamicServiceLayer(dynamicLayer, imageParams, layerId);
                }
            }
        },

        _createFeatureServiceLayer: function (index, layerInfo, layerURL) {
            var layerMode = null, featureLayer;
            /**
            * set layerMode of the operational layer if it's type is feature
            */
            switch (layerInfo.layermode && layerInfo.layermode.toLowerCase()) {
            case "ondemand":
                layerMode = FeatureLayer.MODE_ONDEMAND;
                break;
            case "selection":
                layerMode = FeatureLayer.MODE_SELECTION;
                break;
            default:
                layerMode = FeatureLayer.MODE_SNAPSHOT;
                break;
            }

            /**
            * load operational layer if it's type is feature along with its layer mode
            */
            featureLayer = new FeatureLayer(layerURL, {
                id: index,
                mode: layerMode,
                outFields: ["*"],
                displayOnPan: false
            });
            this.map.addLayer(featureLayer);
        },

        //Add hosted services to the map

        _addHostedServices: function (layerURL, layerId) {
            var self = this, p, lyr;
            esri.request({
                url: layerURL + "?f=json",
                load: function (data) {
                    for (p = 0; p < data.layers.length; p++) {
                        lyr = layerURL + data.layers[p].id;
                        self._createFeatureServiceLayer(layerId + p, lyr, lyr);
                    }
                },
                error: function (err) {
                    alert(err.message);
                }
            });
        },

        _createDynamicServiceLayer: function (dynamicLayer, imageParams, layerId) {
            var dynamicMapService = new ArcGISDynamicMapServiceLayer(dynamicLayer, {
                imageParameters: imageParams,
                id: layerId,
                visible: true
            });
            this.map.addLayer(dynamicMapService);
        },

        _addLayerLegend: function () {
            var mapServerArray = [], i, legendObject;

            for (i in dojo.configData.OperationalLayers) {
                if (dojo.configData.OperationalLayers.hasOwnProperty(i)) {
                    if (dojo.configData.OperationalLayers[i].ServiceURL) {
                        mapServerArray.push(dojo.configData.OperationalLayers[i].ServiceURL);
                    }
                }
            }
            legendObject = this._addLegendBox();
            legendObject.startup(mapServerArray);
        },

        _addLegendBox: function () {
            this.legendObject = new Legends({
                map: this.map,
                isExtentBasedLegend: true
            }, domConstruct.create("div", {}, null));
            return this.legendObject;
        },

        _addLayerLegendWebmap: function (response) {
            var mapServerArray = [], i, j, legendObject, webMapDetails, layer;
            webMapDetails = response.itemInfo.itemData;
            for (j = 0; j < webMapDetails.operationalLayers.length; j++) {
                if (webMapDetails.operationalLayers[j].layerObject.layerInfos) {
                    for (i = 0; i < webMapDetails.operationalLayers[j].layerObject.layerInfos.length; i++) {
                        layer = webMapDetails.operationalLayers[j].url + "/" + webMapDetails.operationalLayers[j].layerObject.layerInfos[i].id;
                        mapServerArray.push(layer);
                    }
                } else {
                    mapServerArray.push(webMapDetails.operationalLayers[j].url);
                }
            }
            legendObject = this._addLegendBox();
            legendObject.startup(mapServerArray);
        },

        /**
        * return current map instance
        * @return {object} Current map instance
        * @memberOf widgets/mapSettings/mapSettings
        */
        getMapInstance: function () {
            return this.map;
        }
    });
});
