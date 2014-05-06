/*global define,dojo,dojoConfig,alert,esri,locatorParams */
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
    "dojo/dom-attr",
    "dojo/_base/lang",
    "dojo/on",
    "dojo/dom-geometry",
    "dojo/dom",
    "dojo/dom-class",
    "dojo/query",
    "dojo/string",
    "esri/tasks/locator",
    "esri/tasks/query",
    "../scrollBar/scrollBar",
    "dojo/Deferred",
    "dojo/DeferredList",
    "esri/tasks/QueryTask",
    "esri/geometry",
    "dojo/cookie",
    "esri/geometry/Point",
    "dojo/text!./templates/locatorTemplate.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/i18n!application/nls/localizedStrings",
    "dojo/topic",
    "esri/symbols/SimpleLineSymbol",
    "esri/symbols/SimpleFillSymbol",
    "esri/symbols/SimpleMarkerSymbol",
    "dojo/_base/Color",
    "esri/graphic",
    "esri/geometry/webMercatorUtils",
    "dojo/query"
], function (declare, domConstruct, domStyle, domAttr, lang, on, domGeom, dom, domClass, query, string, Locator, Query, ScrollBar, Deferred, DeferredList, QueryTask, Geometry, cookie, Point, template, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin, sharedNls, appNls, topic, SimpleLineSymbol, SimpleFillSymbol, SimpleMarkerSymbol, Color, Graphic, webMercatorUtils, dojoQuery) {
    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        appNls: appNls,
        lastSearchString: null,
        stagedSearch: null,
        locatorScrollbar: null,
        locatorAOIScrollbar: null,
        locatorAOIBearingScrollbar: null,
        screenPoint: null,

        /**
        * display locator widget
        *
        * @class
        * @name widgets/locator/locator
        */
        postCreate: function () {

            /**
            * close locator widget if any other widget is opened
            * @param {string} widget Key of the newly opened widget
            */
            topic.subscribe("toggleWidget", lang.hitch(this, function (widget) {
                if (widget !== "locator") {
                    if (domGeom.getMarginBox(this.divAddressHolder).h > 0) {
                        domClass.replace(this.domNode, "esriCTHeaderSearch", "esriCTHeaderSearchSelected");
                        domClass.replace(this.divAddressHolder, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                        domClass.replace(this.divAddressHolder, "esriCTZeroHeight", "esriCTAddressContentHeight");
                        this.txtAddress.blur();
                    }
                }
            }));

            topic.subscribe("createInfoWindowContent", lang.hitch(this, function (mapPoint, attributes, fields, infoIndex, featureArray, count, zoomToFeature) {
                this._createInfoWindowContent(mapPoint, attributes, fields, infoIndex, featureArray, count, zoomToFeature);
            }));

            topic.subscribe("setDefaultTextboxValue", lang.hitch(this, function (node, attribute, value) {
                this._setDefaultTextboxValue(node, attribute, value);
            }));
            topic.subscribe("attachLocatorEvents", lang.hitch(this, function (locatorParams) {
                this._attachLocatorEvents(locatorParams);
            }));

            this.domNode = domConstruct.create("div", { "title": sharedNls.tooltips.search, "class": "esriCTHeaderIcons esriCTHeaderSearch" }, null);
            domConstruct.place(this.divAddressContainer, dom.byId("esriCTParentDivContainer"));
            this.own(on(this.domNode, "click", lang.hitch(this, function () {
                domStyle.set(this.imgSearchLoader, "display", "none");
                domStyle.set(this.close, "display", "block");

                /**
                * minimize other open header panel widgets and show locator widget
                */
                topic.publish("toggleWidget", "locator");
                topic.publish("setMaxLegendLength");
                this._showLocateContainer(locatorParams);
            })));
            domStyle.set(this.divAddressContainer, "display", "block");
            domAttr.set(this.divAddressContainer, "title", "");

            this._setDefaultTextboxValue(this.txtAddress, "defaultAddress", dojo.configData.LocatorSettings.LocatorDefaultAddress);
            var locatorParams = {
                divSearch: this.divSearch,
                close: this.close,
                imgSearchLoader: this.imgSearchLoader,
                textAddress: this.txtAddress,
                divResults: this.divAddressResults,
                divAddressContent: this.divAddressContent,
                divAddressScrollContent: this.divAddressScrollContent,
                isAOISearch: false,
                isAOIBearingSearch: false
            };
            this._attachLocatorEvents(locatorParams);
        },

        /**
        * set default value of locator textbox as specified in configuration file
        * @param {array} dojo.configData.LocatorSettings.Locators Locator settings specified in configuration file
        * @memberOf widgets/locator/locator
        */
        _setDefaultTextboxValue: function (node, attribute, value) {

            /**
            * txtAddress Textbox for search text
            * @member {textbox} txtAddress
            * @private
            * @memberOf widgets/locator/locator
            */
            domAttr.set(node, attribute, value);
        },

        /**
        * attach locator events
        * @memberOf widgets/locator/locator
        */
        _attachLocatorEvents: function (locatorParams) {
            domAttr.set(locatorParams.imgSearchLoader, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            this.own(on(locatorParams.divSearch, "click", lang.hitch(this, function (evt) {
                domStyle.set(locatorParams.imgSearchLoader, "display", "block");
                domStyle.set(locatorParams.close, "display", "none");
                this._locateAddress(locatorParams);
            })));
            this.own(on(locatorParams.textAddress, "keyup", lang.hitch(this, function (evt) {
                domStyle.set(locatorParams.close, "display", "block");
                this._submitAddress(evt, locatorParams);
            })));
            this.own(on(locatorParams.textAddress, "paste", lang.hitch(this, function (evt) {
                domStyle.set(locatorParams.close, "display", "block");
                this._submitAddress(evt, locatorParams, true);
            })));
            this.own(on(locatorParams.textAddress, "cut", lang.hitch(this, function (evt) {
                domStyle.set(locatorParams.close, "display", "block");
                this._submitAddress(evt, locatorParams, true);
            })));
            this.own(on(locatorParams.textAddress, "dblclick", lang.hitch(this, function (evt) {
                this._clearDefaultText(evt, locatorParams);
            })));
            this.own(on(locatorParams.textAddress, "blur", lang.hitch(this, function (evt) {
                this._replaceDefaultText(evt, locatorParams);
            })));
            this.own(on(locatorParams.textAddress, "focus", lang.hitch(this, function () {
                domStyle.set(locatorParams.close, "display", "block");
                domClass.add(locatorParams.textAddress, "esriCTColorChange");
            })));
            this.own(on(locatorParams.close, "click", lang.hitch(this, function () {
                this._hideText(locatorParams);
            })));
        },

        _hideText: function (locatorParams) {
            locatorParams.textAddress.value = "";
            this.lastSearchString = lang.trim(locatorParams.textAddress.value);
            domConstruct.empty(locatorParams.divResults, locatorParams.divAddressScrollContent);
            domAttr.set(locatorParams.textAddress, "defaultAddress", locatorParams.textAddress.value);
            domClass.remove(locatorParams.divAddressContent, "esriCTAddressContainerHeight");
            domClass.remove(locatorParams.divAddressContent, "esriCTAddressResultHeight");
            if (!locatorParams.isAOISearch) {
                if (this.locatorScrollbar) {
                    domClass.add(this.locatorScrollbar._scrollBarContent, "esriCTZeroHeight");
                    this.locatorScrollbar.removeScrollBar();
                }
            } else {
                if (this.locatorAOIScrollbar) {
                    domClass.add(this.locatorAOIScrollbar._scrollBarContent, "esriCTZeroHeight");
                    this.locatorAOIScrollbar.removeScrollBar();
                }
            }
        },

        /**
        * show/hide locator widget and set default search text
        * @memberOf widgets/locator/locator
        */
        _showLocateContainer: function (locatorParams) {
            this.txtAddress.blur();
            if (domGeom.getMarginBox(this.divAddressHolder).h > 0) {

                /**
                * when user clicks on locator icon in header panel, close the search panel if it is open
                */
                domClass.replace(this.domNode, "esriCTHeaderSearch", "esriCTHeaderSearchSelected");
                domClass.replace(this.divAddressHolder, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                domClass.replace(this.divAddressHolder, "esriCTZeroHeight", "esriCTAddressContentHeight");
                this.txtAddress.blur();
            } else {

                /**
                * when user clicks on locator icon in header panel, open the search panel if it is closed
                */
                domClass.replace(this.domNode, "esriCTHeaderSearchSelected", "esriCTHeaderSearch");
                domClass.replace(this.txtAddress, "esriCTBlurColorChange", "esriCTColorChange");
                domClass.replace(this.divAddressHolder, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                domClass.add(this.divAddressHolder, "esriCTAddressContentHeight");
                domStyle.set(this.txtAddress, "verticalAlign", "middle");
                this.txtAddress.value = domAttr.get(this.txtAddress, "defaultAddress");
                this.lastSearchString = lang.trim(this.txtAddress.value);
            }
            this._setHeightAddressResults(locatorParams);
        },

        /**
        * search address on every key press
        * @param {object} evt Keyup event
        * @memberOf widgets/locator/locator
        */
        _submitAddress: function (evt, locatorParams, locatorText) {
            if (locatorText) {
                setTimeout(lang.hitch(this, function () {
                    this._locateAddress(locatorParams);
                }), 100);
                return;
            }
            if (evt) {
                if (evt.keyCode === dojo.keys.ENTER) {
                    if (locatorParams.textAddress.value !== '') {
                        domStyle.set(locatorParams.imgSearchLoader, "display", "block");
                        domStyle.set(locatorParams.close, "display", "none");
                        this._locateAddress(locatorParams);
                        return;
                    }
                }

                /**
                * do not perform auto complete search if alphabets,
                * numbers,numpad keys,comma,ctl+v,ctrl +x,delete or
                * backspace is pressed
                */
                if ((!((evt.keyCode >= 46 && evt.keyCode < 58) || (evt.keyCode > 64 && evt.keyCode < 91) || (evt.keyCode > 95 && evt.keyCode < 106) || evt.keyCode === 8 || evt.keyCode === 110 || evt.keyCode === 188)) || (evt.keyCode === 86 && evt.ctrlKey) || (evt.keyCode === 88 && evt.ctrlKey)) {
                    evt.cancelBubble = true;
                    if (evt.stopPropagation) {
                        evt.stopPropagation();
                    }
                    domStyle.set(locatorParams.imgSearchLoader, "display", "none");
                    domStyle.set(locatorParams.close, "display", "block");
                    return;
                }

                /**
                * call locator service if search text is not empty
                */
                domStyle.set(locatorParams.imgSearchLoader, "display", "block");
                domStyle.set(locatorParams.close, "display", "none");
                if (domGeom.getMarginBox(locatorParams.divAddressContent).h > 0) {
                    if (lang.trim(locatorParams.textAddress.value) !== '') {
                        if (this.lastSearchString !== lang.trim(locatorParams.textAddress.value)) {
                            this.lastSearchString = lang.trim(locatorParams.textAddress.value);
                            domConstruct.empty(locatorParams.divResults);

                            /**
                            * clear any staged search
                            */
                            clearTimeout(this.stagedSearch);
                            if (lang.trim(locatorParams.textAddress.value).length > 0) {

                                /**
                                * stage a new search, which will launch if no new searches show up
                                * before the timeout
                                */
                                this.stagedSearch = setTimeout(lang.hitch(this, function () {
                                    this.stagedSearch = this._locateAddress(locatorParams);
                                }), 500);
                            }
                        } else {
                            domStyle.set(locatorParams.imgSearchLoader, "display", "none");
                            domStyle.set(locatorParams.close, "display", "block");
                        }
                    } else {
                        this.lastSearchString = lang.trim(locatorParams.textAddress.value);
                        domStyle.set(locatorParams.imgSearchLoader, "display", "none");
                        domStyle.set(locatorParams.close, "display", "block");
                        domConstruct.empty(locatorParams.divResults);
                    }
                }
            }
        },

        /**
        * perform search by addess if search type is address search
        * @memberOf widgets/locator/locator
        */
        _locateAddress: function (locatorParams) {
            domConstruct.empty(locatorParams.divResults);
            if (lang.trim(locatorParams.textAddress.value) === '') {
                domStyle.set(locatorParams.imgSearchLoader, "display", "none");
                domStyle.set(locatorParams.close, "display", "block");
                domConstruct.empty(locatorParams.divResults);
                this._locatorErrBack(locatorParams);
            } else {
                this._searchLocation(locatorParams);
            }
        },

        /**
        * call locator service and get search results
        * @memberOf widgets/locator/locator
        */
        _searchLocation: function (locatorParams) {
            var nameArray, locatorSettings, locator, searchFieldName, addressField, baseMapExtent,
                options, searchFields, addressFieldValues, addressFieldName, s, deferredArray,
                locatorDef, deferred, resultLength, deferredListResult, index, resultAttributes, key, order;

            nameArray = { Address: [] };
            domStyle.set(locatorParams.imgSearchLoader, "display", "block");
            domStyle.set(locatorParams.close, "display", "none");
            domAttr.set(locatorParams.textAddress, "defaultAddress", locatorParams.textAddress.value);
            this._setHeightAddressResults(locatorParams);

            /**
            * call locator service specified in configuration file
            */
            locatorSettings = dojo.configData.LocatorSettings;
            locator = new Locator(locatorSettings.LocatorURL);
            searchFieldName = locatorSettings.LocatorParameters.SearchField;
            addressField = {};
            addressField[searchFieldName] = lang.trim(locatorParams.textAddress.value);
            if (dojo.configData.WebMapId && lang.trim(dojo.configData.WebMapId).length !== 0) {
                baseMapExtent = this.map.getLayer(this.map.layerIds[0]).fullExtent;
            } else {
                baseMapExtent = this.map.getLayer("esriCTbasemap").fullExtent;
            }
            options = {};
            options.address = addressField;
            options.outFields = locatorSettings.LocatorOutFields;
            options[locatorSettings.LocatorParameters.SearchBoundaryField] = baseMapExtent;
            locator.outSpatialReference = this.map.spatialReference;
            searchFields = [];
            addressFieldValues = locatorSettings.FilterFieldValues;
            addressFieldName = locatorSettings.FilterFieldName;
            for (s in addressFieldValues) {
                if (addressFieldValues.hasOwnProperty(s)) {
                    searchFields.push(addressFieldValues[s]);
                }
            }

            /**
            * get results from locator service
            * @param {object} options Contains address, outFields and basemap extent for locator service
            * @param {object} candidates Contains results from locator service
            */
            deferredArray = [];
            for (index = 0; index < dojo.configData.SearchSettings.length; index++) {
                this._layerSearchResults(deferredArray, dojo.configData.SearchSettings[index], locatorParams);
            }
            locatorDef = locator.addressToLocations(options);
            locator.on("address-to-locations-complete", lang.hitch(this, function (candidates) {
                deferred = new Deferred();
                deferred.resolve(candidates);
                return deferred.promise;
            }), function () {
                domStyle.set(locatorParams.imgSearchLoader, "display", "none");
                domStyle.set(locatorParams.close, "display", "block");
                this._locatorErrBack(locatorParams);
            });
            deferredArray.push(locatorDef);
            deferredListResult = new DeferredList(deferredArray);
            deferredListResult.then(lang.hitch(this, function (result) {
                var num, results;

                if (result) {
                    if (result.length > 0) {
                        for (num = 0; num < result.length; num++) {
                            if (result[num][0] === true) {
                                if (dojo.configData.SearchSettings[num]) {
                                    key = dojo.configData.SearchSettings[num].SearchDisplayTitle;
                                    nameArray[key] = [];
                                    if (result[num][1].features) {
                                        for (order = 0; order < result[num][1].features.length; order++) {
                                            resultAttributes = result[num][1].features[order].attributes;
                                            for (results in resultAttributes) {
                                                if (resultAttributes.hasOwnProperty(results)) {
                                                    if (!resultAttributes[results]) {
                                                        resultAttributes[results] = sharedNls.showNullValue;
                                                    }
                                                }
                                            }
                                            if (nameArray[key].length < dojo.configData.LocatorSettings.MaxResults) {
                                                nameArray[key].push({
                                                    name: string.substitute(dojo.configData.SearchSettings[num].SearchDisplayFields, resultAttributes),
                                                    attributes: resultAttributes,
                                                    fields: result[num][1].fields,
                                                    layer: dojo.configData.SearchSettings[num],
                                                    geometry: result[num][1].features[order].geometry
                                                });
                                            }
                                        }

                                    }
                                } else {
                                    this._addressResult(result[num][1], nameArray, searchFields, addressFieldName);
                                }
                                resultLength = result[num][1].length;
                            }
                        }
                        this._showLocatedAddress(nameArray, resultLength, locatorParams);
                    }
                } else {
                    domStyle.set(locatorParams.imgSearchLoader, "display", "none");
                    domStyle.set(locatorParams.close, "display", "block");
                    this.mapPoint = null;
                    this._locatorErrBack(locatorParams);
                }
            }));
        },

        _layerSearchResults: function (deferredArray, layerobject, locatorParams) {
            var queryTask, queryLayer, queryTaskResult, deferred, currentTime;

            domStyle.set(this.imgSearchLoader, "display", "block");
            domStyle.set(this.close, "display", "none");
            if (layerobject.QueryURL) {
                currentTime = new Date();
                queryTask = new QueryTask(layerobject.QueryURL);
                queryLayer = new Query();
                queryLayer.where = string.substitute(layerobject.SearchExpression, [lang.trim(locatorParams.textAddress.value).toUpperCase()]) + " AND " + currentTime.getTime().toString() + "=" + currentTime.getTime().toString();
                queryLayer.outSpatialReference = this.map.spatialReference;
                queryLayer.returnGeometry = true;
                queryLayer.maxAllowableOffset = 100;
                queryLayer.outFields = ["*"];
                queryTaskResult = queryTask.execute(queryLayer, lang.hitch(this, function (featureSet) {
                    deferred = new Deferred();
                    deferred.resolve(featureSet);
                    return deferred.promise;
                }), function (err) {
                    alert(err.message);
                });
                deferredArray.push(queryTaskResult);
            }
        },

        _addressResult: function (candidates, nameArray, searchFields, addressFieldName) {
            var order, j;

            for (order = 0; order < candidates.length; order++) {
                if (candidates[order].attributes[dojo.configData.LocatorSettings.AddressMatchScore.Field] > dojo.configData.LocatorSettings.AddressMatchScore.Value) {
                    for (j in searchFields) {
                        if (searchFields.hasOwnProperty(j)) {
                            if (candidates[order].attributes[addressFieldName] === searchFields[j]) {
                                if (nameArray.Address.length < dojo.configData.LocatorSettings.MaxResults) {
                                    nameArray.Address.push({
                                        name: string.substitute(dojo.configData.LocatorSettings.DisplayField, candidates[order].attributes),
                                        attributes: candidates[order]
                                    });
                                }
                            }
                        }
                    }
                }
            }
        },

        /**
        * filter valid results from results returned by locator service
        * @param {object} candidates Contains results from locator service
        * @memberOf widgets/locator/locator
        */
        _showLocatedAddress: function (candidates, resultLength, locatorParams) {
            var addrListCount = 0, addrList = [],
                candidateArray, divAddressCounty, candidate, listContainer, i, divAddressSearchCell;

            domConstruct.empty(locatorParams.divResults);
            if (locatorParams.isAOISearch || locatorParams.isAOIBearingSearch) {
                domStyle.set(locatorParams.divAddressScrollContent, "display", "block");
            }
            if (lang.trim(locatorParams.textAddress.value) === "") {
                locatorParams.textAddress.focus();
                domConstruct.empty(locatorParams.divResults);
                if (!locatorParams.isAOISearch) {
                    this.locatorScrollbar = new ScrollBar({ domNode: locatorParams.divAddressScrollContent });
                    this.locatorScrollbar.setContent(locatorParams.divResults);
                    this.locatorScrollbar.createScrollBar();
                } else {
                    this.locatorAOIScrollbar = new ScrollBar({ domNode: locatorParams.divAddressScrollContent });
                    this.locatorAOIScrollbar.setContent(locatorParams.divResults);
                    this.locatorAOIScrollbar.createScrollBar();
                }
                domStyle.set(this.imgSearchLoader, "display", "none");
                domStyle.set(locatorParams.close, "display", "block");
                return;
            }

            /**
            * display all the located address in the address container
            * 'this.divAddressResults' div dom element contains located addresses, created in widget template
            */
            if (!locatorParams.isAOISearch && !locatorParams.isAOIBearingSearch) {
                if (this.locatorScrollbar) {
                    domClass.add(this.locatorScrollbar._scrollBarContent, "esriCTZeroHeight");
                    this.locatorScrollbar.removeScrollBar();
                }
                this.locatorScrollbar = new ScrollBar({ domNode: locatorParams.divAddressScrollContent });
                this.locatorScrollbar.setContent(locatorParams.divResults);
                this.locatorScrollbar.createScrollBar();
            } else if (!locatorParams.isAOISearch && locatorParams.isAOIBearingSearch) {
                if (this.locatorAOIBearingScrollbar) {
                    domClass.add(this.locatorAOIBearingScrollbar._scrollBarContent, "esriCTZeroHeight");
                    this.locatorAOIBearingScrollbar.removeScrollBar();
                }
                this.locatorAOIBearingScrollbar = new ScrollBar({ domNode: locatorParams.divAddressScrollContent });
                this.locatorAOIBearingScrollbar.setContent(locatorParams.divResults);
                this.locatorAOIBearingScrollbar.createScrollBar();

            } else {
                if (this.locatorAOIScrollbar) {
                    domClass.add(this.locatorAOIScrollbar._scrollBarContent, "esriCTZeroHeight");
                    this.locatorAOIScrollbar.removeScrollBar();
                }
                this.locatorAOIScrollbar = new ScrollBar({ domNode: locatorParams.divAddressScrollContent });
                this.locatorAOIScrollbar.setContent(locatorParams.divResults);
                this.locatorAOIScrollbar.createScrollBar();
            }
            if (resultLength > 0) {
                for (candidateArray in candidates) {
                    if (candidates.hasOwnProperty(candidateArray)) {
                        if (candidates[candidateArray].length > 0) {
                            divAddressCounty = domConstruct.create("div", { "class": "esriCTSearchGroupRow esriCTBottomBorder esriCTResultColor esriCTCursorPointer esriCTAddressCounty" }, locatorParams.divResults);
                            divAddressSearchCell = domConstruct.create("div", { "class": "esriCTSearchGroupCell" }, divAddressCounty);
                            candidate = candidateArray + " (" + candidates[candidateArray].length + ")";
                            domConstruct.create("span", { "innerHTML": "+", "class": "esriCTPlusMinus" }, divAddressSearchCell);
                            domConstruct.create("span", { "innerHTML": candidate, "class": "esriCTGroupList" }, divAddressSearchCell);
                            domStyle.set(locatorParams.imgSearchLoader, "display", "none");
                            domStyle.set(locatorParams.close, "display", "block");
                            addrList.push(divAddressSearchCell);
                            if (!locatorParams.isAOISearch && !locatorParams.isAOIBearingSearch) {
                                this._toggleAddressList(addrList, addrListCount, locatorParams);
                                addrListCount++;
                                listContainer = domConstruct.create("div", { "class": "listContainer esriCTHideAddressList" }, locatorParams.divResults);
                            } else if (!locatorParams.isAOISearch && locatorParams.isAOIBearingSearch) {
                                this._toggleAddressList(addrList, addrListCount, locatorParams);
                                addrListCount++;
                                listContainer = domConstruct.create("div", { "class": "listContainerBearingAOI esriCTHideAddressList" }, locatorParams.divResults);
                            } else {
                                this._toggleAddressList(addrList, addrListCount, locatorParams);
                                addrListCount++;
                                listContainer = domConstruct.create("div", { "class": "listContainerAOI esriCTHideAddressList" }, locatorParams.divResults);
                            }
                            for (i = 0; i < candidates[candidateArray].length; i++) {
                                this._displayValidLocations(candidates[candidateArray][i], i, candidates[candidateArray], listContainer, locatorParams);
                            }
                        }
                    }
                }

            } else {
                domStyle.set(locatorParams.imgSearchLoader, "display", "none");
                domStyle.set(locatorParams.close, "display", "block");
                this.mapPoint = null;
                this._locatorErrBack(locatorParams);
            }
        },

        _toggleAddressList: function (addressList, idx, locatorParams) {
            on(addressList[idx], "click", lang.hitch(this, function () {
                var listContainer, listStatusSymbol;
                if (!locatorParams.isAOISearch && !locatorParams.isAOIBearingSearch) {
                    listContainer = query(".listContainer")[idx];
                } else if (!locatorParams.isAOISearch && locatorParams.isAOIBearingSearch) {
                    listContainer = query(".listContainerBearingAOI")[idx];
                } else {
                    listContainer = query(".listContainerAOI")[idx];
                }
                if (domClass.contains(listContainer, "esriCTShowAddressList")) {
                    domClass.toggle(listContainer, "esriCTShowAddressList");
                    listStatusSymbol = (domAttr.get(query(".esriCTPlusMinus")[idx], "innerHTML") === "+") ? "-" : "+";
                    domAttr.set(query(".esriCTPlusMinus")[idx], "innerHTML", listStatusSymbol);
                    if (!locatorParams.isAOISearch && !locatorParams.isAOIBearingSearch) {
                        this.locatorScrollbar.resetScrollBar();
                    } else if (!locatorParams.isAOISearch && locatorParams.isAOIBearingSearch) {
                        this.locatorAOIBearingScrollbar.resetScrollBar();
                    } else {
                        this.locatorAOIScrollbar.resetScrollBar();
                    }
                    return;
                }
                domClass.add(listContainer, "esriCTShowAddressList");
                domAttr.set(query(".esriCTPlusMinus")[idx], "innerHTML", "-");
                if (!locatorParams.isAOISearch && !locatorParams.isAOIBearingSearch) {
                    this.locatorScrollbar.resetScrollBar();
                } else if (!locatorParams.isAOISearch && locatorParams.isAOIBearingSearch) {
                    this.locatorAOIBearingScrollbar.resetScrollBar();
                } else {
                    this.locatorAOIScrollbar.resetScrollBar();
                }
            }));
        },

        /**
        * display valid result in search panel
        * @param {object} candidate Contains valid result to be displayed in search panel
        * @return {Boolean} true if result is displayed successfully
        * @memberOf widgets/locator/locator
        */
        _displayValidLocations: function (candidate, index, candidateArray, listContainer, locatorParams) {
            var _this = this, candidateAddress, divAddressRow, normalizedVal, layer, infoIndex, intialLat, initiallong, highlightSymbol, highlightGraphic;
            domClass.remove(locatorParams.divAddressContent, "esriCTAddressResultHeight");
            domClass.add(locatorParams.divAddressContent, "esriCTAddressContainerHeight");
            divAddressRow = domConstruct.create("div", { "class": "esriCTrowTable" }, listContainer);
            candidateAddress = domConstruct.create("div", { "class": "esriCTContentBottomBorder esriCTCursorPointer" }, divAddressRow);
            domAttr.set(candidateAddress, "index", index);
            try {
                if (candidate.name) {
                    domAttr.set(candidateAddress, "innerHTML", candidate.name);
                } else {
                    domAttr.set(candidateAddress, "innerHTML", candidate);
                }
                if (candidate.attributes.location) {
                    domAttr.set(candidateAddress, "x", candidate.attributes.location.x);
                    domAttr.set(candidateAddress, "y", candidate.attributes.location.y);
                    domAttr.set(candidateAddress, "address", string.substitute(dojo.configData.LocatorSettings.DisplayField, candidate.attributes.attributes));
                }
            } catch (err) {
                alert(sharedNls.errorMessages.falseConfigParams);
            }
            candidateAddress.onclick = function () {

                topic.publish("showProgressIndicator");
                if (_this.map.infoWindow) {
                    _this.map.infoWindow.hide();
                }
                locatorParams.textAddress.value = this.innerHTML;
                domAttr.set(locatorParams.textAddress, "defaultAddress", locatorParams.textAddress.value);
                if (!locatorParams.isAOISearch && !locatorParams.isAOIBearingSearch) {
                    _this._hideAddressContainer();
                } else {
                    domStyle.set(locatorParams.divAddressScrollContent, "display", "none");
                }

                if (candidate.attributes.location) {
                    _this.mapPoint = new Point(domAttr.get(this, "x"), domAttr.get(this, "y"), _this.map.spatialReference);
                    _this._locateAddressOnMap(_this.mapPoint, locatorParams);
                    normalizedVal = webMercatorUtils.xyToLngLat(_this.mapPoint.x, _this.mapPoint.y);
                    if (locatorParams.isAOIBearingSearch) {
                        intialLat = dojoQuery(".esriCTaddLatitudeValue");
                        intialLat[0].value = normalizedVal[0];
                        intialLat[0].innerHTML = normalizedVal[0];
                        initiallong = dojoQuery(".esriCTaddLongitudeValue");
                        initiallong[0].value = normalizedVal[1];
                        initiallong[0].innerHTML = normalizedVal[1];
                    }

                } else {
                    if (!locatorParams.isAOISearch && !locatorParams.isAOIBearingSearch) {
                        if (candidateArray[domAttr.get(candidateAddress, "index", index)]) {
                            layer = candidateArray[domAttr.get(candidateAddress, "index", index)].layer.QueryURL;
                            for (infoIndex = 0; infoIndex < dojo.configData.SearchSettings.length; infoIndex++) {
                                if (dojo.configData.SearchSettings[infoIndex] && dojo.configData.SearchSettings[infoIndex].QueryURL === layer) {
                                    _this._showFeatureResultsOnMap(candidateArray, candidate, infoIndex, index);
                                }
                            }
                        }
                    } else {
                        if (candidate.geometry.type === "point") {
                            if (locatorParams.isAOIBearingSearch) {
                                normalizedVal = webMercatorUtils.xyToLngLat(candidate.geometry.x, candidate.geometry.y);
                                intialLat = dojoQuery(".esriCTaddLatitudeValue");
                                intialLat[0].value = normalizedVal[0];
                                intialLat[0].innerHTML = normalizedVal[0];
                                initiallong = dojoQuery(".esriCTaddLongitudeValue");
                                initiallong[0].value = normalizedVal[1];
                                initiallong[0].innerHTML = normalizedVal[1];
                                topic.publish("hideProgressIndicator");
                            } else {
                                _this.map.centerAt(candidate.geometry);
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
                                highlightGraphic = new Graphic(candidate.geometry, highlightSymbol);
                                _this.map.graphics.add(highlightGraphic);
                                topic.publish("hideProgressIndicator");
                                topic.publish("createBuffer", candidate.geometry, null);
                            }
                        } else {
                            _this.map.setExtent(candidate.geometry.getExtent());
                            _this.map.graphics.clear();
                            highlightSymbol = new SimpleFillSymbol(SimpleFillSymbol.STYLE_SOLID,
                                new SimpleLineSymbol(
                                    SimpleLineSymbol.STYLE_SOLID,
                                    new Color([
                                        parseInt(dojo.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[0], 10),
                                        parseInt(dojo.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[1], 10),
                                        parseInt(dojo.configData.HighlightFeaturesSymbology.LineSymbolColor.split(",")[2], 10),
                                        parseFloat(dojo.configData.HighlightFeaturesSymbology.LineSymbolTransparency.split(",")[0], 10)]),
                                    2
                                ),
                                new Color([
                                    parseInt(dojo.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[0], 10),
                                    parseInt(dojo.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[1], 10),
                                    parseInt(dojo.configData.HighlightFeaturesSymbology.FillSymbolColor.split(",")[2], 10),
                                    parseFloat(dojo.configData.HighlightFeaturesSymbology.FillSymbolTransparency.split(",")[0], 10)])
                                );
                            highlightGraphic = new Graphic(candidate.geometry, highlightSymbol);
                            _this.map.graphics.add(highlightGraphic);
                            topic.publish("hideProgressIndicator");
                            topic.publish("createBuffer", candidate.geometry, null);
                        }
                    }
                }
            };
        },

        _showFeatureResultsOnMap: function (candidateArray, candidate, infoIndex, index) {
            domStyle.set(this.imgSearchLoader, "display", "block");
            domStyle.set(this.close, "display", "none");
            this.txtAddress.value = candidate.name;
            this._createInfoWindowContent(candidateArray[index].geometry, candidateArray[index].attributes, candidateArray[index].fields, infoIndex, null, null, true);
        },

        _createInfoWindowContent: function (geometry, attributes, fields, infoIndex, featureArray, count, zoomToFeature) {
            var infoPopupFieldsCollection, infoPopupHeight, infoPopupWidth,
                divInfoDetailsTab, key, divInfoRow, i, fieldNames, link, divLink, j, infoTitle, mapPoint, utcMilliseconds;

            this.map.infoWindow.hide();
            mapPoint = this._getMapPoint(geometry);
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
            if (dojo.configData.SearchSettings[infoIndex].InfoWindowData) {
                infoPopupFieldsCollection = dojo.configData.SearchSettings[infoIndex].InfoWindowData;
                divInfoDetailsTab = domConstruct.create("div", { "class": "esriCTInfoDetailsTab" }, null);
                this.divInfoDetailsContainer = domConstruct.create("div", { "class": "esriCTInfoDetailsContainer" }, divInfoDetailsTab);
            } else {
                divInfoDetailsTab = domConstruct.create("div", { "class": "esriCTInfoDetailsTab" }, null);
                this.divInfoDetailsContainer = domConstruct.create("div", { "class": "esriCTInfoDetailsContainerError", "innerHTML": sharedNls.errorMessages.emptyInfoWindowContent }, divInfoDetailsTab);
            }
            infoPopupHeight = dojo.configData.InfoPopupHeight;
            infoPopupWidth = dojo.configData.InfoPopupWidth;
            if (infoPopupFieldsCollection) {
                for (key = 0; key < infoPopupFieldsCollection.length; key++) {
                    divInfoRow = domConstruct.create("div", { "className": "esriCTDisplayRow" }, this.divInfoDetailsContainer);
                    // Create the row's label
                    this.divInfoDisplayField = domConstruct.create("div", { "className": "esriCTDisplayField", "innerHTML": infoPopupFieldsCollection[key].DisplayText }, divInfoRow);
                    this.divInfoFieldValue = domConstruct.create("div", { "className": "esriCTValueField" }, divInfoRow);
                    for (i in attributes) {
                        if (attributes.hasOwnProperty(i)) {
                            if (!attributes[i]) {
                                attributes[i] = sharedNls.showNullValue;
                            }
                        }
                    }
                    for (j = 0; j < fields.length; j++) {
                        if (fields[j].type === "esriFieldTypeDate") {
                            if (attributes[fields[j].name]) {
                                if (Number(attributes[fields[j].name])) {
                                    utcMilliseconds = Number(attributes[fields[j].name]);
                                    attributes[fields[j].name] = dojo.date.locale.format(this.utcTimestampFromMs(utcMilliseconds), {
                                        datePattern: dojo.configData.DatePattern,
                                        selector: "date"
                                    });
                                }
                            }
                        }
                    }
                    fieldNames = string.substitute(infoPopupFieldsCollection[key].FieldName, attributes);
                    if (string.substitute(infoPopupFieldsCollection[key].FieldName, attributes).match("http:") || string.substitute(infoPopupFieldsCollection[key].FieldName, attributes).match("https:")) {
                        link = fieldNames;
                        divLink = domConstruct.create("div", { "class": "esriCTLink", "link": link, "innerHTML": sharedNls.buttons.link }, this.divInfoFieldValue);
                        on(divLink, "click", this._openDetailWindow);
                    } else {
                        this.divInfoFieldValue.innerHTML = fieldNames;
                    }
                }
                infoTitle = string.substitute(dojo.configData.SearchSettings[infoIndex].InfoWindowHeaderField, attributes);
                dojo.selectedMapPoint = mapPoint;
                this._setInfoWindowZoomLevel(mapPoint, infoTitle, divInfoDetailsTab, infoPopupWidth, infoPopupHeight, count, zoomToFeature);
            } else {
                infoTitle = sharedNls.errorMessages.emptyInfoWindowTitle;
                dojo.selectedMapPoint = mapPoint;
                this._setInfoWindowZoomLevel(mapPoint, infoTitle, divInfoDetailsTab, infoPopupWidth, infoPopupHeight, count, zoomToFeature);
                topic.publish("hideProgressIndicator");
            }
        },

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

        _setInfoWindowZoomLevel: function (mapPoint, infoTitle, divInfoDetailsTab, infoPopupWidth, infoPopupHeight, count, zoomToFeature) {
            var extentChanged, screenPoint, zoomDeferred;
            if (this.map.getLevel() !== dojo.configData.ZoomLevel && zoomToFeature) {
                zoomDeferred = this.map.setLevel(dojo.configData.ZoomLevel);
                this.map.infoWindow.hide();
                zoomDeferred.then(lang.hitch(this, function () {
                    extentChanged = this.map.setExtent(this._calculateCustomMapExtent(mapPoint));
                    extentChanged.then(lang.hitch(this, function () {
                        topic.publish("hideProgressIndicator");
                        screenPoint = this.map.toScreen(dojo.selectedMapPoint);
                        screenPoint.y = this.map.height - screenPoint.y;
                        topic.publish("setInfoWindowOnMap", infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight, count);
                    }));
                }));
            } else {
                extentChanged = this.map.setExtent(this._calculateCustomMapExtent(mapPoint));
                this.map.infoWindow.hide();
                extentChanged.then(lang.hitch(this, function () {
                    topic.publish("hideProgressIndicator");
                    screenPoint = this.map.toScreen(dojo.selectedMapPoint);
                    screenPoint.y = this.map.height - screenPoint.y;
                    topic.publish("setInfoWindowOnMap", infoTitle, divInfoDetailsTab, screenPoint, infoPopupWidth, infoPopupHeight, count);
                }));
            }
        },


        //Fetch the geometry type of the mapPoint
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

        _calculateCustomMapExtent: function (mapPoint) {
            var width, height, ratioHeight, totalYPoint, infoWindowHeight, xmin, ymin, xmax, ymax;

            width = this.map.extent.getWidth();
            height = this.map.extent.getHeight();
            ratioHeight = height / this.map.height;
            totalYPoint = dojo.configData.InfoPopupHeight + 30 + 61;
            infoWindowHeight = height - (ratioHeight * totalYPoint);
            xmin = mapPoint.x - (width / 2);
            ymin = mapPoint.y - infoWindowHeight;
            xmax = xmin + width;
            ymax = ymin + height;
            return new esri.geometry.Extent(xmin, ymin, xmax, ymax, this.map.spatialReference);
        },

        _locateAddressOnMap: function (mapPoint, locatorParams) {
            var geoLocationPushpin, locatorMarkupSymbol, graphic;
            this.map.setLevel(dojo.configData.ZoomLevel);
            this.map.centerAt(mapPoint);
            geoLocationPushpin = dojoConfig.baseURL + dojo.configData.LocatorSettings.DefaultLocatorSymbol;
            locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(geoLocationPushpin, dojo.configData.LocatorSettings.MarkupSymbolSize.width, dojo.configData.LocatorSettings.MarkupSymbolSize.height);
            graphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {}, null);
            if (!locatorParams.isAOIBearingSearch) {
                this.map.getLayer("esriGraphicsLayerMapSettings").clear();
                this.map.getLayer("esriGraphicsLayerMapSettings").add(graphic);
            }
            if (locatorParams.isAOISearch) {
                topic.publish("createBuffer", mapPoint, null);
            }
            topic.publish("hideProgressIndicator");
        },

        /**
        * hide search panel
        * @memberOf widgets/locator/locator
        */
        _hideAddressContainer: function () {
            domClass.replace(this.domNode, "esriCTHeaderSearch", "esriCTHeaderSearchSelected");
            this.txtAddress.blur();
            domClass.replace(this.divAddressHolder, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
            domClass.replace(this.divAddressHolder, "esriCTZeroHeight", "esriCTAddressContentHeight");
        },

        /**
        * set height of the search panel
        * @memberOf widgets/locator/locator
        */
        _setHeightAddressResults: function (locatorParams) {

            /**
            * divAddressContent Container for search results
            * @member {div} divAddressContent
            * @private
            * @memberOf widgets/locator/locator
            */
            var height = domGeom.getMarginBox(locatorParams.divAddressContent).h;
            if (height > 0) {

                /**
                * divAddressScrollContent Scrollbar container for search results
                * @member {div} divAddressScrollContent
                * @private
                * @memberOf widgets/locator/locator
                */
                domStyle.set(locatorParams.divAddressScrollContent, "height", (height - 120) + "px");
            }
        },

        /**
        * display error message if locator service fails or does not return any results
        * @memberOf widgets/locator/locator
        */
        _locatorErrBack: function (locatorParams) {
            var errorAddressCounty;

            domConstruct.empty(locatorParams.divResults);
            domStyle.set(locatorParams.imgSearchLoader, "display", "none");
            domStyle.set(locatorParams.close, "display", "block");
            domClass.remove(locatorParams.divAddressContent, "esriCTAddressContainerHeight");
            domClass.add(locatorParams.divAddressContent, "esriCTAddressResultHeight");
            errorAddressCounty = domConstruct.create("div", { "class": "esriCTBottomBorder esriCTCursorPointer esriCTAddressCounty" }, locatorParams.divResults);
            domAttr.set(errorAddressCounty, "innerHTML", sharedNls.errorMessages.invalidSearch);
        },

        /**
        * clear default value from search textbox
        * @param {object} evt Dblclick event
        * @memberOf widgets/locator/locator
        */
        _clearDefaultText: function (evt, locatorParams) {
            var target = window.event ? window.event.srcElement : evt ? evt.target : null;
            if (!target) {
                return;
            }
            target.style.color = "#FFF";
            target.value = '';
            locatorParams.textAddress.value = "";
            domAttr.set(locatorParams.textAddress, "defaultAddress", locatorParams.textAddress.value);
        },

        /**
        * set default value to search textbox
        * @param {object} evt Blur event
        * @memberOf widgets/locator/locator
        */
        _replaceDefaultText: function (evt, locatorParams) {
            var target = window.event ? window.event.srcElement : evt ? evt.target : null;
            if (!target) {
                return;
            }
            this._resetTargetValue(target, "defaultAddress", locatorParams);
        },

        /**
        * set default value to search textbox
        * @param {object} target Textbox dom element
        * @param {string} title Default value
        * @param {string} color Background color of search textbox
        * @memberOf widgets/locator/locator
        */
        _resetTargetValue: function (target, title, locatorParams) {
            if (target.value === '' && domAttr.get(target, title)) {
                target.value = target.title;
                if (target.title === "") {
                    target.value = domAttr.get(target, title);
                }
            }
            if (domClass.contains(target, "esriCTColorChange")) {
                domClass.remove(target, "esriCTColorChange");
            }
            domClass.add(target, "esriCTBlurColorChange");
            this.lastSearchString = lang.trim(locatorParams.textAddress.value);
        }
    });
});
