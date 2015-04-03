/*global define,dojo,dijit,dojoConfig,alert,esri,appGlobals */
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
    "dojo/date/locale",
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
    "dojo/promise/all",
    "dojo/topic",
    "dojo/on",
    "widgets/infoWindow/infoWindow",
    "dojo/text!../infoWindow/templates/infoWindow.html",
    "esri/layers/ArcGISDynamicMapServiceLayer",
    "esri/layers/ArcGISTiledMapServiceLayer",
    "esri/layers/OpenStreetMapLayer",
    "dojo/_base/array",
    "esri/graphic",
    "esri/symbols/SimpleMarkerSymbol",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "dojo/string",
    "dojo/_base/Color",
    "esri/request",
    "dojo/domReady!"
], function (declare, domConstruct, domStyle, lang, esriUtils, dom, domAttr, query, domClass, locale, _WidgetBase, sharedNls, esriMap, ImageParameters, FeatureLayer, GraphicsLayer, BaseMapGallery, Legends, GeometryExtent, HomeButton, Deferred, all, topic, on, InfoWindow, template, ArcGISDynamicMapServiceLayer, ArcGISTiledMapServiceLayer, OpenStreetMapLayer, array, Graphic, SimpleMarkerSymbol, SimpleLineSymbol, SimpleFillSymbol, string, Color, esriRequest) {
    //========================================================================================================================//

    return declare([_WidgetBase], {
        map: null,
        templateString: template,
        tempGraphicsLayerId: "esriGraphicsLayerMapSettings",
        tempBufferLayer: "tempBufferLayer",
        sharedNls: sharedNls,
        infoWindowPanel: null,
        operationalLayers: [],
        selectedMapPoint: null,
        operationLayersCount: 0,
        _setExtent: false,
        _mapLoaded: false,
        _widgetsInitialized: false,
        _legendPanelLoaded: false,
        _operationLayersLoaded: false,

        /**
        * initialize map object
        *
        * @class
        * @name widgets/mapSettings/mapSettings
        */
        postCreate: function () {
            var mapDeferred, layer, i;
            appGlobals.operationLayerSettings = [];
            appGlobals.configSearchSettings = [];
            topic.publish("showProgressIndicator");
            topic.subscribe("setInfoWindowOnMap", lang.hitch(this, function (infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight, count) {
                this._onSetInfoWindowPosition(infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight, count);
            }));

            /**
            * load map
            * @param {string} appGlobals.configData.BaseMapLayers Basemap settings specified in configuration file
            */
            this.infoWindowPanel = new InfoWindow({ infoWindowWidth: appGlobals.configData.InfoPopupWidth, infoWindowHeight: appGlobals.configData.InfoPopupHeight });
            if (appGlobals.configData.WebMapId && lang.trim(appGlobals.configData.WebMapId).length !== 0) {
                mapDeferred = esriUtils.createMap(appGlobals.configData.WebMapId, "esriCTParentDivContainer", {
                    mapOptions: {
                        slider: true,
                        showAttribution: true
                    },
                    ignorePopups: true
                });
                mapDeferred.then(lang.hitch(this, function (response) {
                    topic.subscribe("getWebMapResponse", lang.hitch(this, function () {
                        topic.publish("webMapResponse", response);
                    }));
                    clearTimeout(this.stagedAddLyer);
                    this.map = response.map;
                    appGlobals.selectedBasemapIndex = null;
                    if (response.itemInfo.itemData.baseMap.baseMapLayers) {
                        this._setBasemapLayerId(response.itemInfo.itemData.baseMap.baseMapLayers);
                    }
                    topic.publish("filterRedundantBasemap", response.itemInfo);
                    this._fetchWebMapData(response);
                    topic.publish("setMap", this.map);
                    topic.publish("hideProgressIndicator");
                    this._mapLoaded = true;
                    this._dependeciesLoadedEventHandler();
                    this._mapOnLoad();
                    this._mapEvents();
                    if (appGlobals.configData.ShowLegend) {
                        setTimeout(lang.hitch(this, function () {
                            this._createWebmapLegendLayerList(response.itemInfo.itemData.operationalLayers);
                        }), 5000);
                    }
                }), lang.hitch(this, function (error) {
                    domStyle.set(dom.byId("esriCTParentDivContainer"), "display", "none");
                    alert(error.message);
                }));
            } else {
                this._generateLayerURL(appGlobals.configData.OperationalLayers);
                this.map = esriMap("esriCTParentDivContainer", {
                    showAttribution: true
                });

                this.map.on("load", lang.hitch(this, function () {
                    this._mapOnLoad();
                    this._mapLoaded = true;
                    this._dependeciesLoadedEventHandler();
                }));
                appGlobals.selectedBasemapIndex = 0;
                if (!appGlobals.configData.BaseMapLayers[0].length) {
                    if (appGlobals.configData.BaseMapLayers[0].layerType === "OpenStreetMap") {
                        layer = new OpenStreetMapLayer({ id: "defaultBasemap", visible: true });
                    } else {
                        layer = new ArcGISTiledMapServiceLayer(appGlobals.configData.BaseMapLayers[0].MapURL, { id: "defaultBasemap", visible: true });
                    }
                    this.map.addLayer(layer, 0);
                } else {
                    for (i = 0; i < appGlobals.configData.BaseMapLayers[0].length; i++) {
                        layer = new ArcGISTiledMapServiceLayer(appGlobals.configData.BaseMapLayers[0][i].MapURL, { id: "defaultBasemap" + i, visible: true });
                        this.map.addLayer(layer, i);
                    }
                }
                this._mapEvents();
            }
            on(window, "resize", lang.hitch(this, function () {
                topic.publish("mapResized", 1000);
            }));

            topic.subscribe("legendBoxCreated", lang.hitch(this, function (evt) {
                this._legendPanelLoaded = true;
                this._dependeciesLoadedEventHandler();
            }));

            topic.subscribe("widgetInitialized", lang.hitch(this, function (evt) {
                this._widgetsInitialized = true;
                this._dependeciesLoadedEventHandler();
                this.setLocatorInstance();
            }));

            topic.subscribe("displayInfoWindow", lang.hitch(this, function (evt) {
                this._setExtent = true;
                this._displayInfoWindow(evt);
            }));

            topic.subscribe("showInfoWindowOnMap", lang.hitch(this, function (mapPoint, featureID) {
                this._setExtent = true;
                this._executeQueryForObjectID(mapPoint, featureID);
            }));

            topic.subscribe("sharedLocatorFeature", lang.hitch(this, this._addLocatorFeature));

            window.onkeydown = function (e) {
                if ((e.keyCode === 9 || e.which === 9) && appGlobals.isSplashScreenOn) {
                    return false;
                }
            };
        },

        /**
        * check if application is fully loaded with map, all widgets, operation layers and legendPanel
        * @memberOf widgets/mapSettings/mapSettings
        */
        _dependeciesLoadedEventHandler: function () {
            if (this._mapLoaded && this._widgetsInitialized && this._operationLayersLoaded && this._legendPanelLoaded) {
                topic.publish("modulesLoaded");
            }
        },

        /**
        * create a unified search locator instance and handle the address search events
        * @memberOf widgets/mapSettings/mapSettings
        */
        setLocatorInstance: function () {
            var i, infoIndex, locatorInstance;
            locatorInstance = dijit.byId("locator");
            appGlobals.locatorSelectFeature = false;
            //address is selected from the address list
            locatorInstance.candidateClicked = lang.hitch(this, function (graphic) {
                if (graphic.geometry) {
                    //when query result is selected
                    if (graphic.geometry.type === "point") {
                        //for point geometry, create and display an infoPopup
                        topic.publish("infoWindowData", graphic);
                        topic.publish("infoWindowVisibilityStatus", true);
                        topic.publish("shareLocatorAddress", [graphic.geometry], false, graphic.name);
                        for (i = 0; i < appGlobals.operationLayerSettings.length; i++) {
                            if (parseInt(graphic.layer.QueryLayerId, 10) === parseInt(appGlobals.operationLayerSettings[i].layerID, 10) && graphic.layer.Title === appGlobals.operationLayerSettings[i].layerTitle) {
                                infoIndex = i;
                                break;
                            }
                        }
                        //set the width of infowindow title
                        domClass.add(query(".esriCTHeaderPanelContent")[0], "esriCTSingleFeatureHeader");
                        this._createInfoWindowContent(null, graphic.geometry, graphic.attributes, infoIndex, null, null, false);
                    } else {
                        //for polygon geometry, highlight the feature
                        this.map.setExtent(graphic.geometry.getExtent());
                        this._addLocatorFeature(graphic.geometry, graphic.name);
                    }
                    topic.publish("resetAOITab");
                } else {
                    //when address result is selected
                    topic.publish("shareLocatorAddress", [locatorInstance.mapPoint], false, graphic.name);
                }
            });
            locatorInstance.onGraphicAdd = lang.hitch(this, function () {
                // when graphic is added by locator tab, show clearGraphics Icon and reset the AOI tab
                topic.publish("showClearGraphicsIcon");
                topic.publish("resetAOITab");
            });
            topic.subscribe("toggleWidget", lang.hitch(this, function (widget) {
                //if address search textBox is blank, set the default address search value in the textbox
                if (widget === "locator" && locatorInstance.lastSearchString === "") {
                    topic.publish("setDefaultTextboxValue", locatorInstance.txtAddress, "defaultAddress", appGlobals.configData.LocatorSettings.LocatorDefaultAddress);
                }
            }));
        },

        /**
        * highlight the polygon feature on map in case of locator query result selection
        * @param {object} geometry - geometry of feature
        * @param {object} addr - selected query result
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addLocatorFeature: function (geometry, addr) {
            var highlightGraphic, highlightSymbol;
            if (geometry.type === "polyline") {
                highlightSymbol = new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID, new Color([
                        parseInt(appGlobals.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[0], 10),
                        parseInt(appGlobals.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[1], 10),
                        parseInt(appGlobals.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[2], 10),
                        parseFloat(appGlobals.configData.HighlightFeaturesSymbology.LineSymbolTransparency.split(",")[0], 10)
                ]), 2);
            } else if (geometry.type === "polygon") {
                highlightSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID, new SimpleLineSymbol(SimpleLineSymbol.STYLE_SOLID,
                    new Color([
                        parseInt(appGlobals.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[0], 10),
                        parseInt(appGlobals.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[1], 10),
                        parseInt(appGlobals.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[2], 10),
                        parseFloat(appGlobals.configData.HighlightFeaturesSymbology.LineSymbolTransparency.split(",")[0], 10)
                    ]), 2),
                new Color([
                    parseInt(appGlobals.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[0], 10),
                    parseInt(appGlobals.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[1], 10),
                    parseInt(appGlobals.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[2], 10),
                    parseFloat(appGlobals.configData.HighlightFeaturesSymbology.FillSymbolTransparency.split(",")[0], 10)
                ]));
            }
            highlightGraphic = new Graphic(geometry, highlightSymbol);
            this.map.getLayer("esriGraphicsLayerMapSettings").add(highlightGraphic);
            topic.publish("shareLocatorAddress", [geometry], false, addr);
            topic.publish("showClearGraphicsIcon");
            appGlobals.locatorSelectFeature = true;
        },

        /**
        * create list of all the available operational layers in case of webmap
        * @param {array} layers operational layers collection of webmap
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createWebmapLegendLayerList: function (layers) {
            var i, webMapLayers = [], webmapLayerList = {}, hasLayers = false;
            for (i = 0; i < layers.length; i++) {
                if (layers[i].visibility) {
                    if (layers[i].layerDefinition && layers[i].layerDefinition.drawingInfo) {
                        webmapLayerList[layers[i].url] = layers[i];
                        hasLayers = true;
                    } else {
                        webMapLayers.push(layers[i]);
                    }
                }
            }
            this._addLayerLegendWebmap(webMapLayers, webmapLayerList, hasLayers);
        },

        /**
        * set default id for basemaps
        * @memberOf widgets/mapSettings/mapSettings
        */
        _setBasemapLayerId: function (baseMapLayers) {
            var i = 0, defaultId = "defaultBasemap";
            if (baseMapLayers.length === 1) {
                this._setBasemapId(baseMapLayers[0], defaultId);
            } else {
                for (i = 0; i < baseMapLayers.length; i++) {
                    this._setBasemapId(baseMapLayers[i], defaultId + i);
                }
            }
        },

        /**
        * set default id for each basemap of webmap
        * @memberOf widgets/mapSettings/mapSettings
        */
        _setBasemapId: function (basmap, defaultId) {
            var layerIndex;
            this.map.getLayer(basmap.id).id = defaultId;
            this.map._layers[defaultId] = this.map.getLayer(basmap.id);
            layerIndex = array.indexOf(this.map.layerIds, basmap.id);
            if (basmap.id !== defaultId) {
                delete this.map._layers[basmap.id];
            }
            this.map.layerIds[layerIndex] = defaultId;
        },

        /**
        * webmap operational layers are collected in an array
        * for each layer available on webmap, popup info and searchSettings are set
        * @param {object} response response of webmap loading
        * @memberOf widgets/mapSettings/mapSettings
        */
        _fetchWebMapData: function (response) {
            var i, j, k, webMapDetails, layerInfo, fieldInfos, layerURL, defArr;
            webMapDetails = response.itemInfo.itemData;
            for (i = 0; i < webMapDetails.operationalLayers.length; i++) {
                if (webMapDetails.operationalLayers[i].visibility && webMapDetails.operationalLayers[i].url) {
                    //create operation layers array
                    this._createWebmapOperationLayer(webMapDetails.operationalLayers[i]);
                    //set infowWindowData for each operation layer
                    if (webMapDetails.operationalLayers[i].layers) {
                        defArr = [];
                        //Fetching info popup data in case the layers are added as dynamic layers in the webmap
                        for (j = 0; j < webMapDetails.operationalLayers[i].layers.length; j++) {
                            layerInfo = webMapDetails.operationalLayers[i].layers[j];
                            //check the operation layer before creating the infoWindow data
                            for (k = 0; k < appGlobals.operationLayerSettings.length; k++) {
                                if (webMapDetails.operationalLayers[i].title === appGlobals.operationLayerSettings[k].layerTitle && appGlobals.operationLayerSettings[k].layerID === layerInfo.id) {
                                    //set infoWindow content to operation layer
                                    if (layerInfo.popupInfo) {
                                        appGlobals.operationLayerSettings[k].infoWindowData = {};
                                        appGlobals.operationLayerSettings[k].webmapFieldInfo = layerInfo.popupInfo.fieldInfos;
                                    }
                                    layerURL = webMapDetails.operationalLayers[i].url + "/" + webMapDetails.operationalLayers[i].layers[j].id;
                                    defArr.push(this._loadFeatureLayer(layerURL, webMapDetails.operationalLayers[i].layers[j], k));
                                    break;
                                }
                            }
                            if (appGlobals.operationLayerSettings[k] && appGlobals.operationLayerSettings[k].infoWindowData) {
                                fieldInfos = this._getLayerFieldsInfo(appGlobals.operationLayerSettings[k].layerURL);
                                this._createWebMapInfoWindowData(layerInfo, appGlobals.operationLayerSettings[k].infoWindowData, fieldInfos);
                            }
                        }
                        this._setOperationalLayerDetails(defArr);
                    } else if (webMapDetails.operationalLayers[i].popupInfo) {
                        //Fetching info popup data in case the layers are added as feature layers in the webmap
                        layerInfo = webMapDetails.operationalLayers[i];
                        //check the operation layer before creating the infoWindow data
                        for (k = 0; k < appGlobals.operationLayerSettings.length; k++) {
                            if (appGlobals.operationLayerSettings[k].layerURL === webMapDetails.operationalLayers[i].url) {
                                //set infoWindow content to operation layer
                                appGlobals.operationLayerSettings[k].infoWindowData = {};
                                appGlobals.operationLayerSettings[k].webmapFieldInfo = layerInfo.popupInfo.fieldInfos;
                                appGlobals.operationLayerSettings[k].layerDetails = layerInfo;
                                break;
                            }
                        }
                        if (appGlobals.operationLayerSettings[k] && appGlobals.operationLayerSettings[k].infoWindowData) {
                            fieldInfos = this._getLayerFieldsInfo(appGlobals.operationLayerSettings[k].layerURL);
                            this._createWebMapInfoWindowData(layerInfo, appGlobals.operationLayerSettings[k].infoWindowData, fieldInfos);
                        }
                    }
                }
            }
            this._createSearchSettings();
        },

        _setOperationalLayerDetails: function (defArr) {
            var p, q;
            all(defArr).then(lang.hitch(this, function (results) {
                for (p = 0; p < results.length; p++) {
                    for (q = 0; q < appGlobals.operationLayerSettings.length; q++) {
                        if (results[p]) {
                            if (appGlobals.operationLayerSettings[q].layerURL === results[p].url) {
                                appGlobals.operationLayerSettings[q].layerDetails = results[p];
                            }
                        }
                    }
                }
            }));
        },

        _loadFeatureLayer: function (layerURL, layerObject, k) {
            var fLayer, param = {}, def = new Deferred();
            fLayer = new FeatureLayer(layerURL);
            on(fLayer, "load", lang.hitch(this, function (evt) {
                param = layerObject;
                param.index = k;
                param.url = layerURL;
                param.layerObject = evt.layer;
                def.resolve(param);
            }));
            return def;
        },

        /**
        * set an url, layer id, layer title and Searchsettings for each webmap operationlayer and populate the layer object in an array
        * @param {object} layer webmap operational layer
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createWebmapOperationLayer: function (layer) {
            var url, urlArray, lastIndex, i, j, operationLayer, searchSettings = appGlobals.configData.SearchSettings;
            urlArray = layer.url.split('/');
            lastIndex = urlArray[urlArray.length - 1];
            //create a temp service url
            if (isNaN(lastIndex) || lastIndex === "") {
                if (lastIndex === "") {
                    url = layer.url;
                } else {
                    url = layer.url + "/";
                }
            } else {
                url = layer.url.substring(0, layer.url.lastIndexOf("/") + 1);
            }
            //create an object of operation layer
            if (layer.layerObject.layerInfos) {
                //layer is added as dynamic layer in the webmap
                for (i = 0; i < layer.layerObject.layerInfos.length; i++) {
                    operationLayer = {};
                    //check the operation layer default visibility
                    if (array.indexOf(layer.layerObject.visibleLayers, layer.layerObject.layerInfos[i].id) !== -1) {
                        //set the operation layer title
                        operationLayer.layerTitle = lang.trim(layer.title);
                        //set the operation layer ID
                        operationLayer.layerID = layer.layerObject.layerInfos[i].id;
                        //set the operation layer service URL
                        if (isNaN(lastIndex) || lastIndex === "") {
                            operationLayer.layerURL = url + layer.layerObject.layerInfos[i].id;
                        } else {
                            operationLayer.layerURL = url;
                        }
                        //  operationLayer.formatted = false;
                        //set searchSetting for operation layer if available
                        for (j = 0; j < searchSettings.length; j++) {
                            if (lang.trim(layer.title) === searchSettings[j].Title && layer.layerObject.layerInfos[i].id === parseInt((searchSettings[j].QueryLayerId), 10)) {
                                searchSettings[j].QueryURL = operationLayer.layerURL;
                                break;
                            }
                        }
                        appGlobals.operationLayerSettings.push(operationLayer);
                    }
                }
            } else {
                //layer is added as feature layer in webmap
                operationLayer = {};
                //set the operation layer title
                operationLayer.layerTitle = lang.trim(layer.title);
                //set the operation layer ID
                operationLayer.layerID = layer.layerObject.layerId;
                //set the operation layer service URL
                operationLayer.layerURL = layer.url;
                //  operationLayer.formatted = false;
                //set searchSetting for operation layer if available
                for (j = 0; j < searchSettings.length; j++) {
                    if (lang.trim(layer.title) === searchSettings[j].Title && layer.layerObject.layerId === parseInt((searchSettings[j].QueryLayerId), 10)) {
                        searchSettings[j].QueryURL = operationLayer.layerURL;
                        break;
                    }
                }
                appGlobals.operationLayerSettings.push(operationLayer);
            }
        },

        /**
        * set infoWindow header and fields in infoWindow content in case of webmap
        * @param {object} layerInfo webmap operational layerInfo
        * @param {object} infoWindowData popupInfo object of a layer
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createWebMapInfoWindowData: function (layerInfo, infoWindowData, fieldInfos) {
            var infoWindowHeaderField, field, typeField = {};
            //set infowWindow header field with title and attribute
            if (layerInfo.popupInfo) {
                if (lang.trim(layerInfo.popupInfo.title) !== "") {
                    infoWindowHeaderField = lang.trim(layerInfo.popupInfo.title);
                } else {
                    infoWindowHeaderField = sharedNls.showNullValue;
                }
            }
            infoWindowData.infoWindowHeader = infoWindowHeaderField;
            //set the infowWindow header typeIdField if available
            typeField.typeIdField = fieldInfos.typeIdField || "";
            typeField.types = fieldInfos.types || "";
            infoWindowData.typeFieldSettings = typeField;
            //populate infoWindow fieldname and display text
            infoWindowData.infoWindowfields = [];
            if (layerInfo.popupInfo && !layerInfo.popupInfo.description) {
                for (field in layerInfo.popupInfo.fieldInfos) {
                    if (layerInfo.popupInfo.fieldInfos.hasOwnProperty(field)) {
                        if (layerInfo.popupInfo.fieldInfos[field].visible) {
                            infoWindowData.infoWindowfields.push({
                                "DisplayText": layerInfo.popupInfo.fieldInfos[field].label + ":",
                                "FieldName": "${" + layerInfo.popupInfo.fieldInfos[field].fieldName + "}"
                            });
                        }
                    }
                }
            }
        },

        /**
        * create infoWindow fields and set values for display
        * @param {object} anchorPoint - selected mapPoint
        * @param {object} geometry - selected graphic layer geometry
        * @param {object} attributes - attributes of a selected graphics layer
        * @param {int} infoIndex - Layer order specified in operationLayerSettings collection
        * @param {array} featureArray - feature query results collection
        * @param {int} count - index of the feature of a featureArray
        * @param {boolean} zoomToFeature - value specifying whether to zoom on the selected graphics or not
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createInfoWindowContent: function (anchorPoint, geometry, attributes, infoIndex, featureArray, count, zoomToFeature) {
            try {
                var infoPopupFieldsCollection, infoPopupHeight, infoPopupWidth, divInfoDetailsTab, divInfoRow, infoTitle, mapPoint, descriptionValue, formattedAttr;
                this.map.infoWindow.hide();
                mapPoint = anchorPoint || this._getMapPoint(geometry);
                if (featureArray) {
                    if (featureArray.length > 1 && count !== featureArray.length - 1) {
                        domClass.add(query(".esriCTInfoWindowRightArrow")[0], "esriCTShowInfoRightArrow");
                        domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", count);
                    } else {
                        domClass.remove(query(".esriCTInfoWindowRightArrow")[0], "esriCTShowInfoRightArrow");
                        domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", "");
                    }
                    if (count > 0 && count < featureArray.length) {
                        domClass.add(query(".esriCTInfoWindowLeftArrow")[0], "esriCTShowInfoLeftArrow");
                        domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", count + 1);
                    } else {
                        domClass.remove(query(".esriCTInfoWindowLeftArrow")[0], "esriCTShowInfoLeftArrow");
                        domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", count + 1);
                    }
                } else {
                    domClass.remove(query(".esriCTInfoWindowRightArrow")[0], "esriCTShowInfoRightArrow");
                    domClass.remove(query(".esriCTInfoWindowLeftArrow")[0], "esriCTShowInfoLeftArrow");
                    domAttr.set(query(".esriCTdivInfoFeatureCount")[0], "innerHTML", "");
                    domAttr.set(query(".esriCTdivInfoTotalFeatureCount")[0], "innerHTML", "");
                }
                infoPopupHeight = appGlobals.configData.InfoPopupHeight;
                infoPopupWidth = appGlobals.configData.InfoPopupWidth;
                divInfoDetailsTab = domConstruct.create("div", {
                    "class": "esriCTInfoDetailsTab"
                }, null);
                if (appGlobals.operationLayerSettings[infoIndex].infoWindowData) {
                    formattedAttr = lang.clone(attributes);
                    //infoWindow is configured, create the display structure
                    this.divInfoDetailsContainer = domConstruct.create("div", {
                        "class": "esriCTInfoDetailsContainer"
                    }, divInfoDetailsTab);
                    //check the configured popup type
                    if (appGlobals.operationLayerSettings[infoIndex].layerDetails && appGlobals.operationLayerSettings[infoIndex].layerDetails.popupInfo && appGlobals.operationLayerSettings[infoIndex].layerDetails.popupInfo.description) {
                        //custom popup is configured
                        descriptionValue = this._getDescription(formattedAttr, appGlobals.operationLayerSettings[infoIndex].layerDetails);
                        //create a div with pop up info description and add it to details div
                        divInfoRow = domConstruct.create("div", { "class": "esriCTDisplayRow" }, this.divInfoDetailsContainer);
                        domConstruct.create("div", {
                            "innerHTML": descriptionValue,
                            "class": "esriCTDisplayFieldCustomPopUp"
                        }, divInfoRow);
                    } else {
                        infoPopupFieldsCollection = appGlobals.operationLayerSettings[infoIndex].infoWindowData.infoWindowfields;
                        if (infoPopupFieldsCollection) {
                            //set the date, domain coded values if available
                            this._populatePopupFieldValues(appGlobals.operationLayerSettings[infoIndex].infoWindowData, formattedAttr, appGlobals.operationLayerSettings[infoIndex].layerDetails);
                            //create and set the display of popup
                            this._createPopupDisplay(infoPopupFieldsCollection, formattedAttr);
                        } else {
                            // no fields available
                            this.divInfoDetailsContainer = domConstruct.create("div", {
                                "class": "esriCTInfoDetailsContainerError",
                                "innerHTML": "No fields Available"
                            }, divInfoDetailsTab);
                        }
                    }
                    //set the header of infoWindow
                    if (appGlobals.operationLayerSettings[infoIndex].infoWindowData && appGlobals.operationLayerSettings[infoIndex].infoWindowData.infoWindowHeader) {
                        try {
                            if (!(appGlobals.configData.WebMapId && lang.trim(appGlobals.configData.WebMapId).length !== 0)) {
                                infoTitle = string.substitute(appGlobals.operationLayerSettings[infoIndex].infoWindowData.infoWindowHeader, attributes);
                            } else {
                                infoTitle = this.getInfoPopupTitle(formattedAttr, appGlobals.operationLayerSettings[infoIndex], true);
                            }
                        } catch (ex) {
                            infoTitle = sharedNls.errorMessages.noHeaderField;
                        }
                    } else {
                        infoTitle = sharedNls.errorMessages.noHeaderField;
                    }
                    //Create Attachments if layer has attachments and showAttachments is set to true in pop-up configuration.
                    if (appGlobals.operationLayerSettings[infoIndex].layerDetails.hasAttachments) {
                        this._showAttachments(appGlobals.operationLayerSettings[infoIndex].layerDetails, attributes[appGlobals.operationLayerSettings[infoIndex].layerDetails.objectIdField], this.divInfoDetailsContainer);
                    } else if (appGlobals.operationLayerSettings[infoIndex].layerDetails.layerObject && appGlobals.operationLayerSettings[infoIndex].layerDetails.layerObject.hasAttachments) {
                        this._showAttachments(appGlobals.operationLayerSettings[infoIndex].layerDetails.layerObject, attributes[appGlobals.operationLayerSettings[infoIndex].layerDetails.layerObject.objectIdField], this.divInfoDetailsContainer);
                    }
                } else {
                    //infoWindow is not configured
                    this.divInfoDetailsContainer = domConstruct.create("div", {
                        "class": "esriCTInfoDetailsContainerError",
                        "innerHTML": sharedNls.errorMessages.emptyInfoWindowContent
                    }, divInfoDetailsTab);
                    infoTitle = sharedNls.errorMessages.emptyInfoWindowTitle;
                }
                this.selectedMapPoint = mapPoint;
                this._setInfoWindowZoomLevel(mapPoint, infoTitle, divInfoDetailsTab, infoPopupWidth, infoPopupHeight, count, zoomToFeature);
                topic.publish("hideProgressIndicator");
            } catch (err) {
                alert(err.message);
            }
        },


        /**
       * populate the attribute values with required display format for date and coded values
       * @param{array} infoPopupFieldsCollection collection of fields configured for a popup
       * @param{object} attributes - attributes of a popup
       * @memberOf widgets/mapSettings/mapSettings
       */
        _populatePopupFieldValues: function (infoPopupData, attributes, layerObject) {
            var i, j, k, l, attribute, domain, infoPopupFieldsCollection = infoPopupData.infoWindowfields, fieldInfo, fieldValue, popupInfoValue, domainValue;
            for (i = 0; i < infoPopupFieldsCollection.length; i++) {
                for (attribute in attributes) {
                    if (attributes.hasOwnProperty(attribute)) {
                        if (infoPopupFieldsCollection[i].FieldName && infoPopupFieldsCollection[i].FieldName !== "" && infoPopupFieldsCollection[i].FieldName.split("${")[1].split("}")[0] === attribute) {
                            if (attributes[attribute] === null || attributes[attribute] === "" || attributes[attribute] === " ") {
                                //set the blank or null value
                                attributes[attribute] = sharedNls.showNullValue;
                            } else if (infoPopupFieldsCollection[i].format && infoPopupFieldsCollection[i].format !== "") {
                                if (infoPopupFieldsCollection[i].format.digitSeparator || infoPopupFieldsCollection[i].format.places) {
                                    //format the number
                                    attributes[attribute] = this._numberFormatCorverter(infoPopupFieldsCollection[i], Number(attributes[attribute]));
                                } else {
                                    //format the date
                                    attributes[attribute] = this._setDateFormat(infoPopupFieldsCollection[i], Number(attributes[attribute]));
                                }
                            } else if (infoPopupFieldsCollection[i].domain && infoPopupFieldsCollection[i].domain !== "") {
                                //set the coded values
                                if (infoPopupFieldsCollection[i].domain.codedValues) {
                                    for (j = 0; j < infoPopupFieldsCollection[i].domain.codedValues.length; j++) {
                                        if (attributes[attribute] === infoPopupFieldsCollection[i].domain.codedValues[j].code) {
                                            attributes[attribute] = infoPopupFieldsCollection[i].domain.codedValues[j].name;
                                            break;
                                        }
                                    }
                                }
                            } else if (layerObject.popupInfo) {
                                fieldInfo = this._isDateField(attribute, layerObject.layerObject);
                                popupInfoValue = this._getPopupInfo(attribute, layerObject.popupInfo);
                                if (fieldInfo && attributes[lang.trim(attribute)] !== sharedNls.showNullValue) {
                                    //set date format
                                    fieldValue = this._setDateFormat(popupInfoValue, attributes[lang.trim(attribute)]);
                                    if (popupInfoValue.format) {
                                        // Check whether format for digit separator is available
                                        fieldValue = this._numberFormatCorverter(popupInfoValue, fieldValue);
                                    }
                                    attributes[attribute] = fieldValue;
                                } else {
                                    fieldInfo = this._hasDomainCodedValue(attribute, attributes, layerObject.layerObject);
                                    if (fieldInfo) {
                                        if (fieldInfo.isTypeIdField) {
                                            attributes[attribute] = fieldInfo.name;
                                        } else {
                                            domainValue = this._domainCodedValues(fieldInfo, attributes[lang.trim(attribute)]);
                                            attributes[attribute] = domainValue.domainCodedValue;
                                        }
                                    } else if (attributes[attribute] || attributes[attribute] === 0) {
                                        // Check if the field is valid field or not, if it is valid then substitute its value.
                                        if (popupInfoValue.format) {
                                            // Check whether format for digit separator is available
                                            attributes[attribute] = this._numberFormatCorverter(popupInfoValue, Number(attributes[attribute]));
                                        }
                                    }
                                }
                            }
                            break;
                        }
                    }
                }
            }
            //set the typeIdField value if available
            if (infoPopupData.typeFieldSettings) {
                for (attribute in attributes) {
                    if (attributes.hasOwnProperty(attribute)) {
                        if (infoPopupData.typeFieldSettings.typeIdField && attributes[infoPopupData.typeFieldSettings.typeIdField]) {
                            for (k = 0; k < infoPopupData.typeFieldSettings.types.length; k++) {
                                if (attributes[infoPopupData.typeFieldSettings.typeIdField] === infoPopupData.typeFieldSettings.types[k].id) {
                                    attributes[infoPopupData.typeFieldSettings.typeIdField] = infoPopupData.typeFieldSettings.types[k].name;
                                    if (infoPopupData.typeFieldSettings.types[k].domains) {
                                        for (domain in infoPopupData.typeFieldSettings.types[k].domains) {
                                            if (infoPopupData.typeFieldSettings.types[k].domains.hasOwnProperty(domain)) {
                                                if (attributes[domain]) {
                                                    if (infoPopupData.typeFieldSettings.types[k].domains[domain].codedValues) {
                                                        for (l = 0; l < infoPopupData.typeFieldSettings.types[k].domains[domain].codedValues.length; l++) {
                                                            if (attributes[domain] === infoPopupData.typeFieldSettings.types[k].domains[domain].codedValues[l].code) {
                                                                attributes[domain] = infoPopupData.typeFieldSettings.types[k].domains[domain].codedValues[l].name;
                                                                break;
                                                            }
                                                        }
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        },

        /**
        * create the display of infoWindow fields and populate the values
        * @param{array} infoPopupFieldsCollection - collection of fields configured for a popup
        * @param{object} attributes - attributes of a popup
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createPopupDisplay: function (infoPopupFieldsCollection, attributes) {
            var key, link, divLink, divInfoRow, fieldNames;
            for (key = 0; key < infoPopupFieldsCollection.length; key++) {
                if (infoPopupFieldsCollection[key].FieldName && infoPopupFieldsCollection[key].FieldName !== "" && attributes[infoPopupFieldsCollection[key].FieldName.split("${")[1].split("}")[0]]) {
                    divInfoRow = domConstruct.create("div", {
                        "className": "esriCTDisplayRow"
                    }, this.divInfoDetailsContainer);
                    // Create the row's label
                    this.divInfoDisplayField = domConstruct.create("div", {
                        "className": "esriCTDisplayField",
                        "innerHTML": infoPopupFieldsCollection[key].DisplayText
                    }, divInfoRow);
                    this.divInfoFieldValue = domConstruct.create("div", {
                        "className": "esriCTValueField"
                    }, divInfoRow);
                    fieldNames = string.substitute(infoPopupFieldsCollection[key].FieldName, attributes);
                    if (string.substitute(infoPopupFieldsCollection[key].FieldName, attributes).match("http:") || string.substitute(infoPopupFieldsCollection[key].FieldName, attributes).match("https:")) {
                        link = fieldNames;
                        divLink = domConstruct.create("div", {
                            "class": "esriCTLink",
                            "link": link,
                            "innerHTML": sharedNls.buttons.link
                        }, this.divInfoFieldValue);
                        on(divLink, "click", this._openDetailWindow);
                    } else {
                        this.divInfoFieldValue.innerHTML = fieldNames;
                    }
                }
            }
        },

        getInfoPopupTitle: function (featureSet, operationalLayer, isSetDateFormat) {
            var i, j, titleField, fieldValue, domainValue, popupTitle, titleArray, headerValue, headerFieldArray, fieldInfo, popupInfoValue;
            headerValue = null;
            // split info popup header fields
            popupTitle = operationalLayer.infoWindowData.infoWindowHeader.split("{");
            headerFieldArray = [];
            // if header contains more than 1 fields
            if (popupTitle.length > 1) {
                // get strings from header
                titleField = lang.trim(popupTitle[0]);
                for (i = 0; i < popupTitle.length; i++) {
                    // insert remaining fields in an array
                    titleArray = popupTitle[i].split("}");
                    if (i === 0) {
                        if (featureSet.hasOwnProperty(titleArray[0])) {
                            fieldValue = featureSet[titleArray[0]];
                            // concatenate string and first field from the header and insert in an array
                            headerFieldArray.push(fieldValue);
                        } else {
                            headerFieldArray.push(titleField);
                        }
                    } else {
                        for (j = 0; j < titleArray.length; j++) {
                            if (j === 0) {
                                if (featureSet.hasOwnProperty(titleArray[j])) {
                                    //check for date type field in popup title
                                    fieldInfo = this._isDateField(titleArray[j], operationalLayer.layerDetails.layerObject);
                                    popupInfoValue = this._getPopupInfo(titleArray[j], operationalLayer.layerDetails.popupInfo);
                                    fieldValue = featureSet[lang.trim(titleArray[j])];
                                    if (fieldValue !== null && lang.trim(String(fieldValue)) !== "" && fieldValue !== sharedNls.showNullValue) {
                                        if (fieldInfo && isSetDateFormat) {
                                            //set date format
                                            fieldValue = this._setDateFormat(popupInfoValue, fieldValue);
                                        } else {
                                            fieldInfo = this._hasDomainCodedValue(titleArray[j], featureSet, operationalLayer.layerDetails.layerObject);
                                            if (fieldInfo) {
                                                if (fieldInfo.isTypeIdField) {
                                                    fieldValue = fieldInfo.name;
                                                } else {
                                                    domainValue = this._domainCodedValues(fieldInfo, fieldValue);
                                                    fieldValue = domainValue.domainCodedValue;
                                                }
                                            }
                                        }
                                    } else {
                                        fieldValue = sharedNls.showNullValue;
                                    }
                                    if (popupInfoValue.format) {
                                        // Check whether format for digit separator is available
                                        fieldValue = this._numberFormatCorverter(popupInfoValue, fieldValue);
                                    }
                                    headerFieldArray.push(fieldValue);
                                }
                            } else {
                                headerFieldArray.push(titleArray[j]);
                            }
                        }
                    }
                }

                // form a string from the headerFieldArray array, to display in header
                for (j = 0; j < headerFieldArray.length; j++) {
                    if (headerValue) {
                        headerValue = headerValue + headerFieldArray[j];
                    } else {
                        headerValue = headerFieldArray[j];
                    }
                }
            } else {
                // if popup title is not empty, display popup field headerValue else display a configurable text
                if (lang.trim(operationalLayer.layerDetails.popupInfo.title) !== "") {
                    headerValue = operationalLayer.layerDetails.popupInfo.title;
                }
            }
            if (headerValue === null) {
                headerValue = sharedNls.showNullValue;
            }
            return headerValue;
        },

        /**
        * Show attached images in the issue details
        * @param{array} operationalLayer
        * @param{object} parentDiv
        * @param{string} objectID
        * @memberOf widgets/mapSettings/mapSettings
        */
        _showAttachments: function (operationalLayer, objectID, divInfoDetailsContainer) {
            var i, divInfoRow, attchmentNode;
            // Query attachments in layer
            operationalLayer.queryAttachmentInfos(objectID, lang.hitch(this, function (infos) {
                // If attachments found
                if (infos.length > 0) {
                    domConstruct.create("div", {
                        "innerHTML": sharedNls.titles.attchementText,
                        "class": "esriCTDisplayField"
                    }, divInfoDetailsContainer);
                }
                for (i = 0; i < infos.length; i++) {
                    //create a div with pop up info description and add it to details div
                    divInfoRow = domConstruct.create("div", { "class": "esriCTDisplayRow" }, divInfoDetailsContainer);
                    attchmentNode = domConstruct.create("div", {
                        "innerHTML": infos[i].name,
                        "class": "esriCTLink"
                    }, divInfoRow);
                    domClass.add(attchmentNode, "esriCTAttchmentInfo");
                    domAttr.set(attchmentNode, "imgPath", infos[i].url);
                    on(attchmentNode, "click", lang.hitch(this, this._openAttachment));
                }
            }), function (err) {
                alert(err.message);
            });
        },

        /**
        * Show attachments in new window when user clicks on the attachment thumbnail
        * @param{object} evt
        * @memberOf widgets/mapSettings/mapSettings
        */
        _openAttachment: function (evt) {
            var node = evt.currentTarget || evt.srcElement, imgUrl;
            imgUrl = domAttr.get(node, "imgPath");
            window.open(imgUrl);
        },



        /**
        * Get description from layer pop up info
        * @param{array} featureSet
        * @param{object} operationalLayer - operational layer data
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getDescription: function (featureSet, operationalLayerDetails) {
            var descriptionValue, i, field, splittedArrayForClosingBraces, popupInfoValue, fieldValue, fieldInfo, domainValue;
            // Assuming Fields will be configure within the curly braces'{}'
            // check if Custom Configuration has any fields Configured in it.
            if (operationalLayerDetails.popupInfo.description.split("{").length > 0) {
                // Add the data before 1st instance on curly '{' braces
                descriptionValue = operationalLayerDetails.popupInfo.description.split("{")[0];
                // Loop through the possible number of configured fields
                for (i = 1; i < operationalLayerDetails.popupInfo.description.split("{").length; i++) {
                    // check if string is having closing curly braces '}'. i.e. it has some field
                    if (operationalLayerDetails.popupInfo.description.split("{")[i].indexOf("}") !== -1) {
                        splittedArrayForClosingBraces = operationalLayerDetails.popupInfo.description.split("{")[i].split("}");
                        field = string.substitute(splittedArrayForClosingBraces[0]);
                        popupInfoValue = this._getPopupInfo(field, operationalLayerDetails.popupInfo);

                        fieldInfo = this._isDateField(field, operationalLayerDetails.layerObject);
                        if (fieldInfo && featureSet[lang.trim(field)] !== sharedNls.showNullValue) {
                            //set date format
                            fieldValue = this._setDateFormat(popupInfoValue, featureSet[lang.trim(field)]);
                            if (popupInfoValue.format) {
                                // Check whether format for digit separator is available
                                fieldValue = this._numberFormatCorverter(popupInfoValue, fieldValue);
                            }
                            descriptionValue += fieldValue;
                        } else {
                            fieldInfo = this._hasDomainCodedValue(field, featureSet, operationalLayerDetails.layerObject);
                            if (fieldInfo) {
                                if (fieldInfo.isTypeIdField) {
                                    descriptionValue += fieldInfo.name;
                                } else {
                                    domainValue = this._domainCodedValues(fieldInfo, featureSet[lang.trim(field)]);
                                    descriptionValue += domainValue.domainCodedValue;
                                }
                            } else if (featureSet[field] || featureSet[field] === 0) {
                                // Check if the field is valid field or not, if it is valid then substitute its value.
                                fieldValue = featureSet[field];
                                if (popupInfoValue.format) {
                                    // Check whether format for digit separator is available
                                    fieldValue = this._numberFormatCorverter(popupInfoValue, fieldValue);
                                }
                                descriptionValue += fieldValue;
                            } else if (field === "") {
                                // if field is empty means only curly braces are configured in pop-up
                                descriptionValue += "{}";
                            }
                        }
                        splittedArrayForClosingBraces.shift();
                        // If splittedArrayForClosingBraces length is more than 1, then there are more closing braces in the string, so join the array with }
                        if (splittedArrayForClosingBraces.length > 1) {
                            descriptionValue += splittedArrayForClosingBraces.join("}");
                        } else {
                            descriptionValue += splittedArrayForClosingBraces.join("");
                        }
                    } else {
                        // If there is no closing bracket then add the rest of the string prefixed with '{' as we have split it with '{'
                        descriptionValue += "{" + operationalLayerDetails.popupInfo.description.split("{")[i];
                    }
                }
            } else {
                // No '{' braces means no field has been configured only Custom description is present in pop-up
                descriptionValue = operationalLayerDetails.popupInfo.description;
            }
            return descriptionValue;
        },

        /**
        * Check if field has domain coded values
        * @param{string} fieldName
        * @param{object} feature
        * @param{object} layerObject
        * @memberOf widgets/mapSettings/mapSettings
        */
        _hasDomainCodedValue: function (fieldName, feature, layerObject) {
            var i, j, fieldInfo;
            for (i = 0; i < layerObject.fields.length; i++) {
                if (layerObject.fields[i].name === fieldName) {
                    if (layerObject.fields[i].domain && layerObject.fields[i].domain.codedValues) {
                        fieldInfo = layerObject.fields[i];
                    } else if (layerObject.typeIdField) {
                        // get types from layer object, if typeIdField is available
                        for (j = 0; j < layerObject.types.length; j++) {
                            if (String(layerObject.types[j].id) === String(feature[layerObject.typeIdField])) {
                                fieldInfo = layerObject.types[j];
                                break;
                            }
                        }
                        // if types info is found for current value of typeIdField then break the outer loop
                        if (fieldInfo) {
                            break;
                        }
                    }
                }
            }
            // get domain values from layer types object according to the value of typeIdfield
            if (fieldInfo && fieldInfo.domains) {
                if (layerObject.typeIdField && layerObject.typeIdField !== fieldName) {
                    fieldInfo.isTypeIdField = false;
                    if (fieldInfo.domains.hasOwnProperty(fieldName)) {
                        fieldInfo.domain = {};
                        fieldInfo.domain = fieldInfo.domains[fieldName];
                    } else {
                        fieldInfo = null;
                    }
                } else {
                    // Set isTypeIdField to true if current field is typeIdField
                    fieldInfo.isTypeIdField = true;
                }
            }
            return fieldInfo;
        },

        /**
        * fetch domain coded value
        * @param{object} operationalLayerDetails
        * @param{string} fieldValue
        * @memberOf widgets/mapSettings/mapSettings
        */
        _domainCodedValues: function (operationalLayerDetails, fieldValue) {
            var k, codedValues, domainValueObj;
            domainValueObj = { domainCodedValue: sharedNls.showNullValue };
            codedValues = operationalLayerDetails.domain.codedValues;
            if (codedValues) {
                // Loop for codedValue
                for (k = 0; k < codedValues.length; k++) {
                    // Check if the value is string or number
                    if (isNaN(codedValues[k].code)) {
                        // Check if the fieldValue and codedValue is equal
                        if (codedValues[k].code === fieldValue) {
                            fieldValue = codedValues[k].name;
                        }
                    } else if (codedValues[k].code === parseInt(fieldValue, 10)) {
                        fieldValue = codedValues[k].name;
                    }
                }
            }
            domainValueObj.domainCodedValue = fieldValue;
            return domainValueObj;
        },

        /**
        * Format number value based on the format received from info popup
        * @param{object} popupInfoValue
        * @param{string} fieldValue
        * @memberOf widgets/mapSettings/mapSettings
        */
        _numberFormatCorverter: function (popupInfoValue, fieldValue) {
            if (popupInfoValue.format && popupInfoValue.format.places !== null && popupInfoValue.format.places !== "" && !isNaN(parseFloat(fieldValue))) {
                // Check if digit separator is available
                if (popupInfoValue.format.digitSeparator) {
                    fieldValue = parseFloat(fieldValue).toFixed(popupInfoValue.format.places);
                    fieldValue = this._convertNumberToThousandSeperator(fieldValue);
                } else if (popupInfoValue.format.places) {
                    fieldValue = fieldValue.toFixed(popupInfoValue.format.places);
                }
            }
            return fieldValue;
        },

        /**
        * This function is used to convert number to thousand separator
        * @memberOf widgets/mapSettings/mapSettings
        */
        _convertNumberToThousandSeperator: function (number) {
            return number.replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1,");
        },

        /**
        * check if field type is date
        * @param{object} layerObj - layer data
        * @param{string} fieldName - current field
        * @memberOf widgets/mapSettings/mapSettings
        */
        _isDateField: function (fieldName, layerObj) {
            var i, isDateField = null;
            for (i = 0; i < layerObj.fields.length; i++) {
                if (layerObj.fields[i].name === fieldName && layerObj.fields[i].type === "esriFieldTypeDate") {
                    isDateField = layerObj.fields[i];
                    break;
                }
            }
            return isDateField;
        },
        /**
        * Format date value based on the format received from info popup
        * @param{object} dateFieldInfo
        * @param{string} dataFieldValue
        * @memberOf widgets/mapSettings/mapSettings
        */
        _setDateFormat: function (dateFieldInfo, dateFieldValue) {
            var dateObj = new Date(dateFieldValue), popupDateFormat;
            if (dateFieldInfo.format && dateFieldInfo.format.dateFormat) {
                popupDateFormat = this._getDateFormat(dateFieldInfo.format.dateFormat);
                dateFieldValue = locale.format(this.utcTimestampFromMs(dateFieldValue), {
                    datePattern: popupDateFormat,
                    selector: "date"
                });
            } else {
                dateFieldValue = dateObj.toLocaleDateString();
            }
            return dateFieldValue;
        },

        /**
        * This function is used to convert ArcGIS date format constants to readable date formats
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getDateFormat: function (type) {
            var dateFormat;
            switch (type) {
                case "shortDate":
                    dateFormat = "MM/dd/yyyy";
                    break;
                case "shortDateLE":
                    dateFormat = "dd/MM/yyyy";
                    break;
                case "longMonthDayYear":
                    dateFormat = "MMMM dd, yyyy";
                    break;
                case "dayShortMonthYear":
                    dateFormat = "dd MMM yyyy";
                    break;
                case "longDate":
                    dateFormat = "EEEE, MMMM dd, yyyy";
                    break;
                case "shortDateLongTime":
                    dateFormat = "MM/dd/yyyy hh:mm:ss a";
                    break;
                case "shortDateLELongTime":
                    dateFormat = "dd/MM/yyyy hh:mm:ss a";
                    break;
                case "shortDateShortTime":
                    dateFormat = "MM/dd/yyyy hh:mm a";
                    break;
                case "shortDateLEShortTime":
                    dateFormat = "dd/MM/yyyy hh:mm a";
                    break;
                case "shortDateShortTime24":
                    dateFormat = "MM/dd/yyyy HH:mm";
                    break;
                case "shortDateLEShortTime24":
                    dateFormat = "dd/MM/yyyy HH:mm";
                    break;
                case "longMonthYear":
                    dateFormat = "MMMM yyyy";
                    break;
                case "shortMonthYear":
                    dateFormat = "MMM yyyy";
                    break;
                case "year":
                    dateFormat = "yyyy";
                    break;
                default:
                    dateFormat = "MMMM dd, yyyy";
            }
            return dateFormat;
        },

        /**
        * Fetch field from popup info
        * @param{string} fieldName - current field
        * @param{object} popupInfo - operational layer popupInfo object
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getPopupInfo: function (fieldName, popupInfo) {
            var i, fieldInfo;
            for (i = 0; i < popupInfo.fieldInfos.length; i++) {
                if (popupInfo.fieldInfos[i].fieldName === fieldName) {
                    fieldInfo = popupInfo.fieldInfos[i];
                    break;
                }
            }
            return fieldInfo;
        },
        /**
        * create searchSettings collection for layers available on map
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createSearchSettings: function () {
            var i, j, k, deferredArray = [];
            for (i = 0; i < appGlobals.configData.SearchSettings.length; i++) {
                if (appGlobals.configData.SearchSettings[i].QueryURL) {
                    deferredArray.push(this._getLayerInfo(appGlobals.configData.SearchSettings[i], appGlobals.configData.SearchSettings[i].QueryURL + "?f=json"));
                }
            }
            all(deferredArray).then(lang.hitch(this, function (result) {
                for (j = 0; j < result.length; j++) {
                    if (result[j]) {
                        for (k = 0; k < appGlobals.configData.SearchSettings.length; k++) {
                            if (appGlobals.configData.SearchSettings[k].QueryURL && result[j].QueryURL === appGlobals.configData.SearchSettings[k].QueryURL) {
                                this._validateStatisticField(appGlobals.configData.SearchSettings[k]);
                                this._removeDuplicateFields(appGlobals.configData.SearchSettings[k]);
                                appGlobals.configSearchSettings.push(appGlobals.configData.SearchSettings[k]);
                                break;
                            }
                        }
                    }
                }
                this._operationLayersLoaded = true;
                this._dependeciesLoadedEventHandler();
            }));
        },

        /**
        * set objectIDField in searchsettings of a layer
        * @param {object} settingsObject searchSettings object of a layer
        * @param {object} url layer url
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getLayerInfo: function (settingsObject, url) {
            var i, deferred, requestHandle = esriRequest({
                "url": url
            });
            deferred = new Deferred();
            requestHandle.then(lang.hitch(this, function (response) {
                //set objectIDField in searchSetting of a layer
                if (!response.objectIdField) {
                    for (i = 0; i < response.fields.length; i++) {
                        if (response.fields[i].type === "esriFieldTypeOID") {
                            settingsObject.objectIDField = response.fields[0].name;
                            break;
                        }
                    }
                } else {
                    settingsObject.objectIDField = response.objectIdField;
                }
                deferred.resolve(settingsObject);
            }), lang.hitch(this, function (error) {
                alert(sharedNls.errorMessages.getLayerInfoError + settingsObject.Title);
                deferred.resolve();
            }));
            return deferred;
        },

        /**
        * validate if the statistic field value and unit value are configured correctly
        * @param {object} searchSetting searchSettings object of a layer
        * @memberOf widgets/mapSettings/mapSettings
        */
        _validateStatisticField: function (searchSetting) {
            if (searchSetting.SummaryStatisticField && searchSetting.SummaryStatisticField !== "") {
                if (!this._validateStatisticFieldUnit(searchSetting.SummaryStatisticFieldUnits)) {
                    alert(sharedNls.errorMessages.incorrectStatisticFieldUnit + searchSetting.SearchDisplayTitle);
                }
            }
        },

        /**
        * remove duplicate fields from the settings
        * @param {object} searchSetting searchSettings object of a layer
        * @memberOf widgets/mapSettings/mapSettings
        */
        _removeDuplicateFields: function (searchSetting) {
            var detailSummaryReportFields = [], quickSummaryReportFields = [];
            array.forEach(searchSetting.DetailSummaryReportFields, lang.hitch(this, function (field) {
                if (array.indexOf(detailSummaryReportFields, field) < 0) {
                    detailSummaryReportFields.push(field);
                }
            }));
            array.forEach(searchSetting.QuickSummaryReportFields, lang.hitch(this, function (field) {
                if (array.indexOf(quickSummaryReportFields, field) < 0) {
                    quickSummaryReportFields.push(field);
                }
            }));
            searchSetting.DetailSummaryReportFields = detailSummaryReportFields;
            searchSetting.QuickSummaryReportFields = quickSummaryReportFields;
        },

        /**
        * validate if the statistic field unit value is configured correctly
        * @param {object} searchSetting searchSettings object of a layer
        * @memberOf widgets/mapSettings/mapSettings
        */
        _validateStatisticFieldUnit: function (unit) {
            var isValid = false;
            switch (unit) {
            //area units
            case "SQUARE_FEET":
                isValid = true;
                break;
            case "SQUARE_KILOMETERS":
                isValid = true;
                break;
            case "SQUARE_METERS":
                isValid = true;
                break;
            case "SQUARE_MILES":
                isValid = true;
                break;
            case "SQUARE_YARDS":
                isValid = true;
                break;
            case "HECTARES":
                isValid = true;
                break;
            case "ACRES":
                isValid = true;
                break;
            case "ARES":
                isValid = true;
                break;
            //length units
            case "YARDS":
                isValid = true;
                break;
            case "FEET":
                isValid = true;
                break;
            case "KILOMETERS":
                isValid = true;
                break;
            case "METERS":
                isValid = true;
                break;
            case "MILES":
                isValid = true;
                break;
            case "NAUTICAL_MILES":
                isValid = true;
                break;
            default:
                break;
            }
            return isValid;
        },

        /**
        * map events
        * @memberOf widgets/mapSettings/mapSettings
        */
        _mapEvents: function () {
            this.map.on("extent-change", lang.hitch(this, function () {
                this._onSetMapTipPosition(this.selectedMapPoint, this.map, this.infoWindowPanel);
            }));
            this.map.on("click", lang.hitch(this, function (evt) {
                this._displayInfoWindow(evt);
            }));
            this.map.on("resize", lang.hitch(this, function (evt) {
                topic.publish("mapResized", 1000);
            }));
        },

        /**
        * display infoWindow on map
        * @memberOf widgets/mapSettings/mapSettings
        */
        _displayInfoWindow: function (evt) {
            try {
                if (!appGlobals.activatedDrawTool && !appGlobals.locateInitialCoordinates && !appGlobals.selectFeatureEnabled) {
                    this._showInfoWindowOnMap(evt.mapPoint);
                }
            } catch (err) {
                alert(err.message);
            }
        },

        /**
        * on map load, default extent of map is set, basemap gallery is created and operational graphical layers are added on map
        * @memberOf widgets/mapSettings/mapSettings
        */
        _mapOnLoad: function () {
            var home, extentPoints, mapDefaultExtent, i, imgCustomLogo, imgSource, graphicsLayer, extent;
            //this.operationalLayers = [];
            /**
            * set map extent to default extent specified in configuration file
            * @param {string} appGlobals.configData.DefaultExtent Default extent of map specified in configuration file
            */
            extentPoints = appGlobals.configData && appGlobals.configData.DefaultExtent && appGlobals.configData.DefaultExtent.split(",");
            extent = this._getQueryString('extent');
            if (extent === "") {
                if (!(appGlobals.configData.WebMapId && lang.trim(appGlobals.configData.WebMapId).length !== 0)) {
                    mapDefaultExtent = new GeometryExtent({ "xmin": parseFloat(extentPoints[0]), "ymin": parseFloat(extentPoints[1]), "xmax": parseFloat(extentPoints[2]), "ymax": parseFloat(extentPoints[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid } });
                    this.map.setExtent(mapDefaultExtent);
                }
            } else {
                mapDefaultExtent = extent.split(',');
                mapDefaultExtent = new GeometryExtent({ "xmin": parseFloat(mapDefaultExtent[0]), "ymin": parseFloat(mapDefaultExtent[1]), "xmax": parseFloat(mapDefaultExtent[2]), "ymax": parseFloat(mapDefaultExtent[3]), "spatialReference": { "wkid": this.map.spatialReference.wkid } });
                this.map.setExtent(mapDefaultExtent);
            }
            /**
            * load esri 'Home Button' widget
            */
            home = this._addHomeButton();
            home.extent = mapDefaultExtent;
            /* set position of home button widget after map is successfully loaded
            * @param {array} appGlobals.configData.OperationalLayers List of operational Layers specified in configuration file
            */
            domConstruct.place(home.domNode, query(".esriSimpleSliderIncrementButton")[0], "after");
            home.startup();
            if (appGlobals.configData.CustomLogoUrl && lang.trim(appGlobals.configData.CustomLogoUrl).length !== 0) {
                if (appGlobals.configData.CustomLogoUrl.match("http:") || appGlobals.configData.CustomLogoUrl.match("https:")) {
                    imgSource = appGlobals.configData.CustomLogoUrl;
                } else {
                    imgSource = dojoConfig.baseURL + appGlobals.configData.CustomLogoUrl;
                }
                imgCustomLogo = domConstruct.create("img", { "src": imgSource, "class": "esriCTCustomMapLogo" }, dom.byId("esriCTParentDivContainer"));
                if (appGlobals.configData.ShowLegend) {
                    domClass.add(imgCustomLogo, "esriCTCustomMapLogoBottom");
                } else {
                    domClass.add(imgCustomLogo, "esriCTCustomMapLogoNoLegend");
                }
            }
            if (!(appGlobals.configData.WebMapId && lang.trim(appGlobals.configData.WebMapId).length !== 0)) {
                for (i in appGlobals.configData.OperationalLayers) {
                    if (appGlobals.configData.OperationalLayers.hasOwnProperty(i)) {
                        this._addOperationalLayerToMap(i, appGlobals.configData.OperationalLayers[i]);
                    }
                }
                if (appGlobals.configData.OperationalLayers.length === 0) {
                    if (appGlobals.configData.ShowLegend) {
                        this._addLayerLegend([]);
                    }
                }
            }

            if (appGlobals.configData.BaseMapLayers.length > 1) {
                this._showBaseMapGallery();
            }
            graphicsLayer = new GraphicsLayer();
            graphicsLayer.id = this.tempGraphicsLayerId;
            graphicsLayer.spatialReference = this.map.extent.spatialReference;
            this.map.addLayer(graphicsLayer);
            graphicsLayer = new GraphicsLayer();
            graphicsLayer.id = "analysisShapeGraphicsLayer";
            graphicsLayer.spatialReference = this.map.extent.spatialReference;
            this.map.addLayer(graphicsLayer);
            graphicsLayer = new GraphicsLayer();
            graphicsLayer.id = this.tempBufferLayer;
            this.map.addLayer(graphicsLayer);
            graphicsLayer.on("graphic-add", lang.hitch(this, function () {
                topic.publish("showClearGraphicsIcon");
            }));
        },

        /**
        * when map extent is changed, infoWindow is adjusted as per new point location on map
        * @param {object} selectedPoint new map point
        * @param {object} map map object
        * @param {object} infoWindow infoWindow to be adjusted
        * @memberOf widgets/mapSettings/mapSettings
        */
        _onSetMapTipPosition: function (selectedPoint, map, infoWindow) {
            if (selectedPoint) {
                var screenPoint = map.toScreen(selectedPoint);
                screenPoint.y = map.height - screenPoint.y;
                infoWindow.setLocation(screenPoint);
            }
        },

        /**
        * infowWindow panel show hide and resize activities on extent change
        * @param {object} infoTitle infoWindow title
        * @param {object} divInfoDetailsTab infoWindow details
        * @param {object} screenPoint new map point
        * @param {object} infoPopupWidth width of infoWindow
        * @param {object} infoPopupHeight height of infoWindow
        * @memberOf widgets/mapSettings/mapSettings
        */
        _onSetInfoWindowPosition: function (infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight) {
            this.infoWindowPanel.resize(infoPopupWidth, infoPopupHeight);
            this.infoWindowPanel.hide();
            this.infoWindowPanel.setTitle(infoTitle);
            this.infoWindowPanel.show(divInfoDetailsTab, screenPoint);
            if (this._setExtent) {
                this._setExtent = false;
                topic.publish("setMapExtent");
            }
        },

        /**
        * for the selected map point, available layer queries are made and query result is collected
        * @param {object} mapPoint selected map point for infowWindow display
        * @memberOf widgets/mapSettings/mapSettings
        */
        _showInfoWindowOnMap: function (mapPoint) {
            var index, onMapFeaturArray = [], featureArray = [];
            this.counter = 0;
            for (index = 0; index < appGlobals.operationLayerSettings.length; index++) {
                if (appGlobals.operationLayerSettings[index].infoWindowData) {
                    this._executeQueryTask(index, mapPoint, onMapFeaturArray);
                }
            }
            all(onMapFeaturArray).then(lang.hitch(this, function (result) {
                var j, i;
                if (result) {
                    for (j = 0; j < result.length; j++) {
                        if (result[j]) {
                            if (result[j].features.length > 0) {
                                for (i = 0; i < result[j].features.length; i++) {
                                    featureArray.push({
                                        attr: result[j].features[i],
                                        layerId: result[j].layerIndex,
                                        fields: result[j].fields
                                    });
                                }
                            }
                        }
                    }
                    this._fetchQueryResults(mapPoint, featureArray);
                }
            }), function (err) {
                alert(err.message);
            });
        },

        /**
        * query an operational layer for features
        * @param {index} index index of operationLayerSettings array
        * @param {object} addr selected query result
        * @param {array} onMapFeaturArray collection of query deferred objects
        * @memberOf widgets/mapSettings/mapSettings
        */
        _executeQueryTask: function (index, mapPoint, onMapFeaturArray) {
            var queryTask, queryParams, layerIndex = index, isLayerVisible, currentTime = new Date().getTime() + index.toString(),
                deferred = new Deferred();
            queryTask = new esri.tasks.QueryTask(appGlobals.operationLayerSettings[index].layerURL);
            queryParams = new esri.tasks.Query();
            queryParams.outSpatialReference = this.map.spatialReference;
            queryParams.returnGeometry = false;
            queryParams.geometry = this._extentFromPoint(mapPoint);
            queryParams.outFields = ["*"];
            isLayerVisible = this._checkLayerVisibility(appGlobals.operationLayerSettings[index].layerURL);
            if (isLayerVisible) {
                queryParams.where = currentTime + "=" + currentTime;
            } else {
                queryParams.where = "1=2";
            }
            queryTask.execute(queryParams, lang.hitch(this, function (results) {
                results.layerIndex = layerIndex;
                deferred.resolve(results);
            }), function (err) {
                deferred.resolve();
            });
            onMapFeaturArray.push(deferred);
        },

        /**
        * query an operational layer for features where objectID is available
        * @param {object} mapPoint selected map point for infowWindow display
        * @param {array} featureIDArray collection of objectIDs
        * @memberOf widgets/mapSettings/mapSettings
        */
        _executeQueryForObjectID: function (mapPoint, featureIDArray) {
            var i, j, queryTask, objID, queryParams, layerIndex, queryLayerID, queryLayerTitle, layerInfoArray, featureArray = [], isLayerVisible, currentTime = new Date().getTime() + featureIDArray[1].toString(),
                deferred = new Deferred();
            layerInfoArray = featureIDArray[1].split("_");
            queryLayerID = Number(layerInfoArray[layerInfoArray.length - 1]);
            queryLayerTitle = layerInfoArray.slice(0, layerInfoArray.length - 1).join("_");
            for (i = 0; i < appGlobals.operationLayerSettings.length; i++) {
                if (Number(appGlobals.operationLayerSettings[i].layerID) === queryLayerID && appGlobals.operationLayerSettings[i].layerTitle === queryLayerTitle) {
                    queryTask = new esri.tasks.QueryTask(appGlobals.operationLayerSettings[i].layerURL);
                    for (j = 0; j < appGlobals.configSearchSettings.length; j++) {
                        if (appGlobals.configSearchSettings[j].QueryURL === appGlobals.operationLayerSettings[i].layerURL) {
                            objID = appGlobals.configSearchSettings[j].objectIDField;
                            break;
                        }
                    }
                    layerIndex = i;
                    isLayerVisible = this._checkLayerVisibility(appGlobals.operationLayerSettings[i].layerURL);
                    break;
                }
            }
            queryParams = new esri.tasks.Query();
            queryParams.outSpatialReference = this.map.spatialReference;
            queryParams.returnGeometry = false;
            queryParams.geometry = mapPoint;
            queryParams.outFields = ["*"];
            if (isLayerVisible) {
                queryParams.where = objID + "=" + featureIDArray[0];
            } else {
                queryParams.where = currentTime + "=" + currentTime;
            }
            queryTask.execute(queryParams, lang.hitch(this, function (result) {
                result.layerIndex = layerIndex;
                featureArray.push({
                    attr: result.features[0],
                    layerId: result.layerIndex,
                    fields: result.fields
                });
                this._fetchQueryResults(mapPoint, featureArray);
            }), function (err) {
                deferred.resolve();
            });
        },

        /**
        * checks if an operational layer is visible on current map extent
        * @param {object} operational layerUrl
        * @memberOf widgets/mapSettings/mapSettings
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
                                    } else if (this.map._layers[layer].layerInfos) {
                                        if (this.map.__LOD.scale < this.map._layers[layer].layerInfos[parseInt(layerUrlIndex, 10)].minScale) {
                                            returnVal = true;
                                            break;
                                        }
                                    } else {
                                        returnVal = true;
                                        break;
                                    }
                                } else {
                                    returnVal = false;
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
        * get extent geometry from selected point
        * @param {object} point selected mapPoint
        * @memberOf widgets/mapSettings/mapSettings
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
        * set infoWindow creation as per the results available in featureQuery results collection
        * @param {object} mapPoint selected mapPoint
        * @param {array} featureArray feature query results collection
        * @memberOf widgets/mapSettings/mapSettings
        */
        _fetchQueryResults: function (mapPoint, featureArray) {
            var _this = this;

            if (featureArray.length > 0) {
                topic.publish("infoWindowData", mapPoint);
                topic.publish("infoWindowVisibilityStatus", true);
                if (featureArray.length === 1) {
                    domClass.remove(query(".esriCTInfoWindowRightArrow")[0], "esriCTShowInfoRightArrow");
                    domClass.add(query(".esriCTHeaderPanelContent")[0], "esriCTSingleFeatureHeader");
                    this._createInfoWindowContent(mapPoint, featureArray[0].attr.geometry, featureArray[0].attr.attributes, featureArray[0].layerId, null, null, false);
                } else {
                    this.count = 0;
                    domAttr.set(query(".esriCTdivInfoTotalFeatureCount")[0], "innerHTML", '/' + featureArray.length);
                    domClass.remove(query(".esriCTHeaderPanelContent")[0], "esriCTSingleFeatureHeader");
                    this._createInfoWindowContent(mapPoint, featureArray[0].attr.geometry, featureArray[0].attr.attributes, featureArray[0].layerId, featureArray, this.count, false);
                    topic.publish("hideProgressIndicator");
                    query(".esriCTInfoWindowRightArrow")[0].onclick = function () {
                        _this._nextInfoContent(mapPoint, featureArray);
                    };
                    query(".esriCTInfoWindowLeftArrow")[0].onclick = function () {
                        _this._previousInfoContent(mapPoint, featureArray);
                    };
                }
            } else {
                topic.publish("hideProgressIndicator");
            }
        },

        /**
        * set infoWindow creation of next page in multipage infoWindow
        * @param {object} mapPoint selected mapPoint
        * @param {array} featureArray feature query results collection
        * @memberOf widgets/mapSettings/mapSettings
        */
        _nextInfoContent: function (mapPoint, featureArray) {
            if (this.count < featureArray.length) {
                this.count++;
            }
            if (featureArray[this.count]) {
                this._createInfoWindowContent(mapPoint, featureArray[0].attr.geometry, featureArray[this.count].attr.attributes, featureArray[this.count].layerId, featureArray, this.count, false);
            }
        },

        /**
        * set infoWindow creation of previous page in multipage infoWindow
        * @param {object} mapPoint selected mapPoint
        * @param {array} featureArray feature query results collection
        * @memberOf widgets/mapSettings/mapSettings
        */
        _previousInfoContent: function (mapPoint, featureArray) {
            if (this.count !== 0 && this.count < featureArray.length) {
                this.count--;
            }
            if (featureArray[this.count]) {
                this._createInfoWindowContent(mapPoint, featureArray[0].attr.geometry, featureArray[this.count].attr.attributes, featureArray[this.count].layerId, featureArray, this.count, false);
            }
        },

        /**
        * checks the url for the specific keyWord, in this case checking for map extent
        * @param {string} a key value from the url used for separation
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getQueryString: function (key) {
            var extentValue = "", regex, qs;
            regex = new RegExp("[\\?&]" + key + "=([^&#]*)");
            qs = regex.exec(window.location.href);
            if (qs && qs.length > 0) {
                extentValue = qs[1];
            }
            return extentValue;
        },

        /**
        * push the operationLayer URL in respective layer's searchSettings
        * @param {array} operationLayers collection given in configuration file
        * @memberOf widgets/mapSettings/mapSettings
        */
        _generateLayerURL: function (operationalLayers) {
            var searchSettings, i, str, layerTitle, layerId, index;
            searchSettings = appGlobals.configData.SearchSettings;
            for (i = 0; i < operationalLayers.length; i++) {
                if (appGlobals.configData.WebMapId && lang.trim(appGlobals.configData.WebMapId).length !== 0) {
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

        /**
        * create and display basemap gallery
        * @return {object} basemapSwitcher widget
        * @memberOf widgets/mapSettings/mapSettings
        */
        _showBaseMapGallery: function () {
            var basMapGallery = new BaseMapGallery({
                map: this.map
            }, domConstruct.create("div", {}, null));
            return basMapGallery;
        },

        /**
        * operational layers depending on their LoadAsServiceType specified in configuration file
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

        /**
        * get the layerTitle of a dynamic service and add service on map
        * @param {object} layerInfo Layer settings specified in configuration file
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addDynamicLayerService: function (layerInfo) {
            var str, lastIndex, layerTitle;
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
            this.stagedAddLyer = setTimeout(lang.hitch(this, function () {
                this._addServiceLayers(layerTitle, layerInfo.ServiceURL);
            }), 500);
        },

        /**
        * check if the operational layer is of dynamic service or hosted service type
        * @param {object} layerTitle operation layer title
        * @param {object} layerURL operation layer URL
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addServiceLayers: function (layerTitle, layerURL) {
            var dynamicLayer, imageParams, lastIndex, dynamicLayerId;
            imageParams = new ImageParameters();
            imageParams.format = "png32";
            lastIndex = layerURL.lastIndexOf('/');
            dynamicLayerId = layerURL.substr(lastIndex + 1);
            if (isNaN(dynamicLayerId) || dynamicLayerId === "") {
                if (isNaN(dynamicLayerId)) {
                    dynamicLayer = layerURL + "/";
                } else if (dynamicLayerId === "") {
                    dynamicLayer = layerURL;
                }
                if (layerURL.indexOf("/FeatureServer") >= 0) {
                    this._addHostedServices(dynamicLayer, layerTitle);
                } else {
                    this._createDynamicServiceLayer(dynamicLayer, imageParams, layerTitle);
                }
            } else {
                imageParams.layerIds = [dynamicLayerId];
                dynamicLayer = layerURL.substring(0, lastIndex + 1);
                if (layerURL.indexOf("/FeatureServer") >= 0) {
                    this._addHostedServices(dynamicLayer, layerTitle);
                } else {
                    this._createDynamicServiceLayer(dynamicLayer, imageParams, layerTitle, dynamicLayerId);
                }
            }
        },

        /**
        * load feature service layer on map
        * @param {int} index Layer order specified in configuration file
        * @param {object} layerInfo Layer settings specified in configuration file
        * @param {object} layerURL operation layer URL
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createFeatureServiceLayer: function (index, layerInfo, layerURL) {
            var featureLayer = new FeatureLayer(layerURL, {
                id: index,
                mode: FeatureLayer.MODE_ONDEMAND,
                outFields: ["*"]
            });
            this.map.addLayer(featureLayer);
            featureLayer.on("load", lang.hitch(this, function (evt) {
                this._createOperationLayer(evt.layer);
            }));
        },

        /**
        * load hosted services layer to the map
        * @param {object} layerURL operation layer URL
        * @param {object} layerId operation layer ID
        * @memberOf widgets/mapSettings/mapSettings
        */
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

        /**
        * load dynamic service layer to the map
        * @param {object} dynamicLayer operation layer to be added on map
        * @param {object} imageParams operation layer image parameters
        * @param {object} layerURL operation layer URL
        * @param {object} layerId operation layer ID
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createDynamicServiceLayer: function (dynamicLayer, imageParams, layerTitle, layerId) {
            layerId = layerId || "";
            var dynamicMapService = new ArcGISDynamicMapServiceLayer(dynamicLayer, {
                imageParameters: imageParams,
                id: layerId !== "" ? layerTitle + '_' + layerId : layerTitle,
                visible: true
            });
            this.map.addLayer(dynamicMapService);
            dynamicMapService.on("load", lang.hitch(this, function (evt) {
                var idArray = evt.layer.id.split('_');
                if (idArray && idArray.length > 0 && !isNaN(parseInt(idArray[1], 10))) {
                    evt.layer.setVisibleLayers([parseInt(idArray[1], 10)]);
                }
                this._createOperationLayer(evt.layer);
            }));
        },

        /**
        * set an url, layer title and layer id for each operational layer
        * @param {object} layer webmap operational layer
        * @memberOf widgets/mapSettings/mapSettings
        */
        _createOperationLayer: function (layer) {
            var urlArray, lastIndex, tempUrl, url, i, title;
            this.operationLayersCount++;
            this.operationalLayers.push(layer);
            urlArray = layer.url.split('/');
            lastIndex = urlArray[urlArray.length - 1];
            //create a temp service url
            if (isNaN(lastIndex) || lastIndex === "") {
                if (lastIndex === "") {
                    tempUrl = layer.url;
                    title = urlArray[urlArray.length - 3];
                } else {
                    tempUrl = layer.url + "/";
                    title = urlArray[urlArray.length - 2];
                }
            } else {
                //layer is added as feature service
                tempUrl = layer.url;
                title = urlArray[urlArray.length - 3];
            }
            if (layer.visibleLayers) {
                //layer is added as a dynamic
                for (i = 0; i < layer.visibleLayers.length; i++) {
                    url = tempUrl + parseInt(layer.visibleLayers[i], 10);
                    this._populateOperationLayerFields(url, title, layer.visibleLayers[i], layer);
                }
            } else {
                //layer is added as feature service
                this._populateOperationLayerFields(tempUrl, title, urlArray[urlArray.length - 1], layer);
            }
            if (this.operationLayersCount === appGlobals.configData.OperationalLayers.length) {
                this._createSearchSettings();
                if (appGlobals.configData.ShowLegend) {
                    this._addLayerLegend(this.operationalLayers);
                }
            }
        },

        /**
        * populate searchSettings and infoWindow data if available in the operational layer object
        * @param {object} url operation layer URL
        * @param {object} title operation layer title
        * @param {object} layerIndex operation layer server index
        * @param {object} layer object
        * @memberOf widgets/mapSettings/mapSettings
        */
        _populateOperationLayerFields: function (url, title, layerIndex, layer) {
            var i, j, operationLayer = {}, searchSettings, infoWindowSettings, typeField, fieldInfos, field;
            searchSettings = appGlobals.configData.SearchSettings;
            infoWindowSettings = appGlobals.configData.InfoWindowSettings;
            //set the operation layer title
            operationLayer.layerTitle = title;
            //set the operation layer ID
            operationLayer.layerID = layerIndex;
            //set the operation layer service URL
            operationLayer.layerURL = url;
            //set the layer object
            operationLayer.layerDetails = layer;
            fieldInfos = this._getLayerFieldsInfo(operationLayer.layerURL);
            //set infoWindowData for operation layer if available
            for (j = 0; j < infoWindowSettings.length; j++) {
                if (title === infoWindowSettings[j].Title && parseInt(layerIndex, 10) === parseInt((infoWindowSettings[j].QueryLayerId), 10)) {
                    //set the typeIdField and types in case of domain coded values
                    typeField = {};
                    typeField.typeIdField = fieldInfos.typeIdField || "";
                    typeField.types = fieldInfos.types || "";
                    for (i = 0; i < fieldInfos.fields.length; i++) {
                        //set the date format and domain if available
                        for (field in infoWindowSettings[j].InfoWindowData) {
                            if (infoWindowSettings[j].InfoWindowData.hasOwnProperty(field) && infoWindowSettings[j].InfoWindowData[field].FieldName && infoWindowSettings[j].InfoWindowData[field].FieldName !== "") {
                                if (fieldInfos.fields[i].name === infoWindowSettings[j].InfoWindowData[field].FieldName.split("${")[1].split("}")[0]) {
                                    infoWindowSettings[j].InfoWindowData[field].format = (fieldInfos.fields[i].type === "esriFieldTypeDate") ? {} : "";
                                    infoWindowSettings[j].InfoWindowData[field].domain = fieldInfos.fields[i].domain || "";
                                    break;
                                }
                            }
                        }
                    }
                    operationLayer.infoWindowData = {
                        "infoWindowHeader": infoWindowSettings[j].InfoWindowHeaderField,
                        "infoWindowfields": infoWindowSettings[j].InfoWindowData,
                        "typeFieldSettings": typeField
                    };
                    break;
                }
            }
            //set layer url in searchSetting if available
            for (j = 0; j < searchSettings.length; j++) {
                if (title === searchSettings[j].Title && parseInt(layerIndex, 10) === parseInt((searchSettings[j].QueryLayerId), 10)) {
                    searchSettings[j].QueryURL = operationLayer.layerURL;
                    break;
                }
            }
            appGlobals.operationLayerSettings.push(operationLayer);
        },

        /**
        * create the list of all available operational layer URLs to display the legends panel
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addLayerLegend: function (operationalLayers) {
            var mapServerArray = [], i, legendObject;
            for (i = 0; i < operationalLayers.length; i++) {
                mapServerArray.push({ "url": operationalLayers[i].url, "title": operationalLayers[i].name });
            }
            legendObject = this._addLegendBox();
            legendObject.startup(mapServerArray);
        },

        /**
        * create legend object
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addLegendBox: function () {
            this.legendObject = new Legends({
                map: this.map,
                isExtentBasedLegend: false
            }, domConstruct.create("div", {}, null));
            return this.legendObject;
        },

        /**
        * create the list of all available operational layer URLs to display the legends panel for Webmap
        * @param {array} webMapLayers collection of webmap operational layers object
        * @param {object} webmapLayerList operation layer URLs list
        * @memberOf widgets/mapSettings/mapSettings
        */
        _addLayerLegendWebmap: function (webMapLayers, webmapLayerList, hasLayers) {
            var mapServerArray = [], i, j, legendObject, layer;
            for (j = 0; j < webMapLayers.length; j++) {
                if (webMapLayers[j].layerObject) {
                    if (webMapLayers[j].resourceInfo && webMapLayers[j].resourceInfo.layers) {
                        for (i = 0; i < webMapLayers[j].resourceInfo.layers.length; i++) {
                            layer = webMapLayers[j].url + "/" + webMapLayers[j].resourceInfo.layers[i].id;
                            if (webMapLayers[j].resourceInfo.layers[i].layerDefinition && webMapLayers[j].resourceInfo.layers[i].layerDefinition.drawingInfo) {
                                hasLayers = true;
                                webmapLayerList[layer] = webMapLayers[j].resourceInfo.layers[i];
                            } else {
                                mapServerArray.push({ "url": layer, "title": webMapLayers[j].resourceInfo.layers[i].name });
                            }
                        }
                    } else if (webMapLayers[j].layerObject.layerInfos) {
                        for (i = 0; i < webMapLayers[j].layerObject.layerInfos.length; i++) {
                            layer = webMapLayers[j].url + "/" + webMapLayers[j].layerObject.layerInfos[i].id;
                            mapServerArray.push({ "url": layer, "title": webMapLayers[j].layerObject.layerInfos[i].name });
                        }
                    } else {
                        mapServerArray.push({ "url": webMapLayers[j].url, "title": webMapLayers[j].title });
                    }
                } else {
                    mapServerArray.push({ "url": webMapLayers[j].url, "title": webMapLayers[j].title });
                }
            }
            if (!hasLayers) {
                webmapLayerList = null;
            }
            legendObject = this._addLegendBox();
            legendObject.startup(mapServerArray, webmapLayerList);
            topic.publish("setMaxLegendLength");
        },

        /**
        * set infoWindow fields values of an operational layer
        * @param {object} queryURL operation layer URL
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getLayerFieldsInfo: function (queryURL) {
            var layerId, lastIndex, layerIndex, layerURLwithSlash, layerURL, layerFieldsInfo = {};
            layerFieldsInfo.isLayerAvailable = false;
            layerFieldsInfo.types = null;
            layerFieldsInfo.typeIdField = null;
            layerFieldsInfo.fields = null;
            lastIndex = queryURL.lastIndexOf('/');
            layerIndex = queryURL.substr(lastIndex + 1);
            layerURLwithSlash = queryURL.substring(0, lastIndex + 1);
            layerURL = queryURL.substring(0, lastIndex);
            for (layerId in this.map._layers) {
                if (this.map._layers.hasOwnProperty(layerId)) {
                    if (this.map._layers[layerId].url) {
                        if (queryURL === this.map._layers[layerId].url) {
                            layerFieldsInfo.isLayerAvailable = true;
                            layerFieldsInfo.fields = this.map._layers[layerId].fields || null;
                            layerFieldsInfo.typeIdField = this.map._layers[layerId].typeIdField || null;
                            layerFieldsInfo.types = this.map._layers[layerId].types || null;
                            break;
                        } else if ((layerURL === this.map._layers[layerId].url || layerURLwithSlash === this.map._layers[layerId].url) && array.indexOf(this.map._layers[layerId].visibleLayers, parseInt(layerIndex, 10)) > -1) {
                            layerFieldsInfo.isLayerAvailable = true;
                            layerFieldsInfo.fields = this.map._layers[layerId].layerInfos;
                            break;
                        }
                    }
                }
            }
            return layerFieldsInfo;
        },

        /**
        * open the URL displayed in infoWindow
        * @memberOf widgets/mapSettings/mapSettings
        */
        _openDetailWindow: function () {
            var link = domAttr.get(this, "link");
            window.open(link);
        },

        utcTimestampFromMs: function (utcMilliseconds) { // returns Date
            return this.localToUtc(new Date(utcMilliseconds));
        },

        localToUtc: function (localTimestamp) { // returns Date
            return new Date(localTimestamp.getTime() + (localTimestamp.getTimezoneOffset() * 60000));
        },

        /**
        * change the map extent as per the selected infoWindow mapPoint and set infoWindow position
        * @param {object} mapPoint selected mapPoint
        * @param {object} infoTitle title of an infoWindow
        * @param {div} divInfoDetailsTab div element of infoWindow
        * @param {object} infoPopupWidth width of an infoWindow given in configuration file
        * @param {int} infoPopupHeight height of an infoWindow given in configuration file
        * @param {int} count index of the feature of a featureArray
        * @param {boolean} zoomToFeature value specifying whether or not to zoom the map on the selected graphics
        * @memberOf widgets/mapSettings/mapSettings
        */
        _setInfoWindowZoomLevel: function (mapPoint, infoTitle, divInfoDetailsTab, infoPopupWidth, infoPopupHeight, count, zoomToFeature) {
            var extentChanged, screenPoint, zoomDeferred;
            if (this.map.getLevel() !== appGlobals.configData.ZoomLevel && zoomToFeature) {
                zoomDeferred = this.map.setLevel(appGlobals.configData.ZoomLevel);
                this.map.infoWindow.hide();
                zoomDeferred.then(lang.hitch(this, function () {
                    extentChanged = this.map.setExtent(this._calculateCustomMapExtent(mapPoint));
                    extentChanged.then(lang.hitch(this, function () {
                        topic.publish("hideProgressIndicator");
                        screenPoint = this.map.toScreen(this.selectedMapPoint);
                        screenPoint.y = this.map.height - screenPoint.y;
                        this._onSetInfoWindowPosition(infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight, count);
                    }));
                }));
            } else {
                extentChanged = this.map.setExtent(this._calculateCustomMapExtent(mapPoint));
                this.map.infoWindow.hide();
                extentChanged.then(lang.hitch(this, function () {
                    topic.publish("hideProgressIndicator");
                    screenPoint = this.map.toScreen(this.selectedMapPoint);
                    screenPoint.y = this.map.height - screenPoint.y;
                    this._onSetInfoWindowPosition(infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight, count);
                }));
            }
        },

        /**
        * get the map extent from given point
        * @param {object} mapPoint selected mapPoint
        * @memberOf widgets/mapSettings/mapSettings
        */
        _calculateCustomMapExtent: function (mapPoint) {
            var width, height, ratioHeight, totalYPoint, infoWindowHeight, xmin, ymin, xmax, ymax;
            width = this.map.extent.getWidth();
            height = this.map.extent.getHeight();
            ratioHeight = height / this.map.height;
            totalYPoint = appGlobals.configData.InfoPopupHeight + 30 + 61;
            infoWindowHeight = height - (ratioHeight * totalYPoint);
            xmin = mapPoint.x - (width / 2);
            ymin = mapPoint.y - infoWindowHeight;
            xmax = xmin + width;
            ymax = ymin + height;
            return new esri.geometry.Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
        },

        /**
        * get the mapPoint from different types of selected geometry
        * @param {object} geometry selected geometry
        * @memberOf widgets/mapSettings/mapSettings
        */
        _getMapPoint: function (geometry) {
            var selectedMapPoint, mapPoint, rings, points;
            if (geometry.type === "point") {
                selectedMapPoint = geometry;
            } else if (geometry.type === "polyline") {
                selectedMapPoint = geometry.getPoint(0, 0);
            } else if (geometry.type === "polygon") {
                mapPoint = geometry.getExtent().getCenter();
                if (!geometry.contains(mapPoint)) {
                    //if the center of the polygon does not lie within the polygon
                    rings = Math.floor(geometry.rings.length / 2);
                    points = Math.floor(geometry.rings[rings].length / 2);
                    selectedMapPoint = geometry.getPoint(rings, points);
                } else {
                    //if the center of the polygon lies within the polygon
                    selectedMapPoint = geometry.getExtent().getCenter();
                }
            }
            return selectedMapPoint;
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