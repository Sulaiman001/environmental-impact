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
    "dojo/_base/array",
    "dojo/_base/Color",
    "dojo/_base/declare",
    "dojo/_base/lang",
    "dojo/dom",
    "dojo/dom-attr",
    "dojo/dom-class",
    "dojo/dom-construct",
    "dojo/dom-geometry",
    "dojo/dom-style",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dojo/on",
    "dojo/query",
    "dojo/string",
    "dojo/text!./templates/locatorTemplate.html",
    "dojo/topic",
    "dijit/_TemplatedMixin",
    "dijit/_WidgetBase",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/Deferred",
    "dojo/DeferredList",
    "esri/geometry",
    "esri/geometry/Point",
    "esri/geometry/webMercatorUtils",
    "esri/graphic",
    "esri/layers/GraphicsLayer",
    "esri/tasks/GeometryService",
    "esri/tasks/locator",
    "esri/tasks/query",
    "esri/tasks/QueryTask"
], function (Array, Color, declare, lang, dom, domAttr, domClass, domConstruct, domGeom, domStyle, sharedNls, on, query, string, template, topic, _TemplatedMixin, _WidgetBase, _WidgetsInTemplateMixin, Deferred, DeferredList, Geometry, Point, webMercatorUtils, Graphic, GraphicsLayer, GeometryService, Locator, Query, QueryTask) {
    //========================================================================================================================//

    return declare([_WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        lastSearchString: null,
        stagedSearch: null,
        preLoaded: true,
        isShowDefaultPushPin: true,
        selectedGraphic: null,
        graphicsLayerId: null,

        /**
        * display locator widget
        * @class
        * @name widgets/locator/locator
        * @method postCreate
        * @return
        */

        postCreate: function () {
            var graphicsLayer;
            /**
            * close locator widget if any other widget is opened
            * @param {string} widget Key of the newly opened widget
            */
            if (this.preLoaded) {
                topic.subscribe("toggleWidget", lang.hitch(this, function (widget) {
                    if (widget !== "locator") {
                        if (domGeom.getMarginBox(this.divAddressContainer).h > 0) {
                            domClass.replace(this.domNode, "esriCTHeaderSearch", "esriCTHeaderSearchSelected");
                            domClass.replace(this.divAddressContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
                            this.txtAddress.blur();
                        }
                    }
                }));
                this.parentDomNode = dom.byId("esriCTParentDivContainer");
                this.domNode = domConstruct.create("div", { "title": sharedNls.tooltips.search, "class": "esriCTHeaderIcons esriCTHeaderSearch" }, null);
                this.own(on(this.domNode, "click", lang.hitch(this, function () {
                    this._toggleTexBoxControls(false);
                    this.onLocateButtonClick();
                    /**
                    * minimize other open header panel widgets and show locator widget
                    */
                    topic.publish("toggleWidget", "locator");
                    this._showHideLocateContainer();
                })));
                this.locatorSettings = dojo.configData.LocatorSettings;
                this.defaultAddress = this.locatorSettings.LocatorDefaultAddress;
                domConstruct.place(this.divAddressContainer, this.parentDomNode);
            } else {
                domConstruct.place(this.divAddressContainer.children[0], this.parentDomNode);
            }

            if (!this.graphicsLayerId) {
                this.graphicsLayerId = "locatorGraphicsLayer";
                if (Array.indexOf(this.map.graphicsLayerIds, this.graphicsLayerId) !== -1) {
                    this.graphicsLayerId += this.map.graphicsLayerIds.length;
                }
                graphicsLayer = new GraphicsLayer();
                graphicsLayer.id = this.graphicsLayerId;
                this.map.addLayer(graphicsLayer);
            }
            this._setDefaultTextboxValue(this.txtAddress, "defaultAddress", this.defaultAddress);
            this.txtAddress.value = domAttr.get(this.txtAddress, "defaultAddress");
            this.lastSearchString = lang.trim(this.txtAddress.value);
            this._attachLocatorEvents();
            topic.subscribe("setDefaultTextboxValue", this._setDefaultTextboxValue);
            topic.subscribe("clearLocatorGraphicsLayer", this._clearGraphics);
        },

        /**
        * set default value of locator textbox as specified in configuration file
        * @memberOf widgets/locator/locator
        * @param {} node
        * @param {} attribute
        * @param {} value
        */
        _setDefaultTextboxValue: function (node, attribute, value) {
            domAttr.set(node, attribute, value);
        },

        /**
        * attach locator events
        * @memberOf widgets/locator/locator
        */
        _attachLocatorEvents: function () {
            domAttr.set(this.imgSearchLoader, "src", dojoConfig.baseURL + "/js/library/themes/images/loader.gif");
            this.own(on(this.divSearch, "click", lang.hitch(this, function (evt) {
                this._toggleTexBoxControls(true);
                this._locateAddress(true);
            })));
            this.own(on(this.txtAddress, "keyup", lang.hitch(this, function (evt) {
                this._submitAddress(evt);
            })));
            this.own(on(this.txtAddress, "paste", lang.hitch(this, function (evt) {
                this._submitAddress(evt, true);
            })));
            this.own(on(this.txtAddress, "cut", lang.hitch(this, function (evt) {
                this._submitAddress(evt, true);
            })));
            this.own(on(this.txtAddress, "dblclick", lang.hitch(this, function (evt) {
                this._clearDefaultText(evt);
            })));
            this.own(on(this.txtAddress, "blur", lang.hitch(this, function (evt) {
                this._replaceDefaultText(evt);
            })));
            this.own(on(this.txtAddress, "focus", lang.hitch(this, function () {
                domClass.add(this.txtAddress, "esriCTColorChange");
            })));
            this.own(on(this.close, "click", lang.hitch(this, function () {
                this._hideText();
            })));
        },

        /**
        * handler for locate button click
        * @memberOf widgets/locator/locator
        */
        onLocateButtonClick: function () {
            // executed when user clicks on the locate button
            return true;
        },

        /**
        * Description
        * @memberOf widgets/locator/locator
        */
        _hideText: function () {
            this.txtAddress.value = "";
            this.lastSearchString = lang.trim(this.txtAddress.value);
            domConstruct.empty(this.divAddressResults);
            domClass.remove(this.divAddressContainer, "esriCTAddressContentHeight");
            domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
        },

        /**
        * show/hide locator widget and set default search text
        * @memberOf widgets/locator/locator
        */
        _showHideLocateContainer: function () {
            this.txtAddress.blur();
            if (domGeom.getMarginBox(this.divAddressContainer).h > 1) {

                /**
                * when user clicks on locator icon in header panel, close the search panel if it is open
                */
                this._hideAddressContainer();
            } else {

                /**
                * when user clicks on locator icon in header panel, open the search panel if it is closed
                */
                domClass.replace(this.domNode, "esriCTHeaderSearchSelected", "esriCTHeaderSearch");
                domClass.replace(this.txtAddress, "esriCTBlurColorChange", "esriCTColorChange");
                domClass.replace(this.divAddressContainer, "esriCTShowContainerHeight", "esriCTHideContainerHeight");
                domStyle.set(this.txtAddress, "verticalAlign", "middle");
                this.txtAddress.value = domAttr.get(this.txtAddress, "defaultAddress");
                this.lastSearchString = lang.trim(this.txtAddress.value);
            }
        },

        /**
        * search address on every key press
        * @memberOf widgets/locator/locator
        * @param {object} evt Keyup event
        * @param {} locatorText
        */
        _submitAddress: function (evt, locatorText) {
            if (locatorText) {
                setTimeout(lang.hitch(this, function () {
                    this._locateAddress(true);
                }), 100);
                return;
            }
            if (evt) {
                /**
                * Enter key immediately starts search
                */
                if (evt.keyCode === dojo.keys.ENTER) {
                    this._toggleTexBoxControls(true);
                    this._locateAddress(true);
                    return;
                }
                /**
                * do not perform auto complete search if control &| alt key pressed, except for ctrl-v
                */
                if (evt.ctrlKey || evt.altKey || evt.keyCode === dojo.keys.UP_ARROW || evt.keyCode === dojo.keys.DOWN_ARROW ||
                        evt.keyCode === dojo.keys.LEFT_ARROW || evt.keyCode === dojo.keys.RIGHT_ARROW ||
                        evt.keyCode === dojo.keys.HOME || evt.keyCode === dojo.keys.END ||
                        evt.keyCode === dojo.keys.CTRL || evt.keyCode === dojo.keys.SHIFT) {
                    evt.cancelBubble = true;
                    if (evt.stopPropagation) {
                        evt.stopPropagation();
                    }
                    this._toggleTexBoxControls(false);
                    return;
                }

                /**
                * call locator service if search text is not empty
                */
                this._locateAddress(false);
            }
        },

        /**
        * perform search by address if search type is address search
        * @memberOf widgets/locator/locator
        */
        _locateAddress: function (launchImmediately) {
            var searchText = lang.trim(this.txtAddress.value);
            if (launchImmediately || this.lastSearchString !== searchText) {
                this._toggleTexBoxControls(true);
                this.lastSearchString = searchText;

                // Clear any staged search
                clearTimeout(this.stagedSearch);

                // Hide existing results
                domConstruct.empty(this.divAddressResults);
                /**
                * stage a new search, which will launch if no new searches show up
                * before the timeout
                */
                this.stagedSearch = setTimeout(lang.hitch(this, function () {
                    var thisSearchTime;

                    // Replace search type-in box' clear X with a busy cursor
                    this._toggleTexBoxControls(false);
                    // Launch a search after recording when the search began
                    this.lastSearchTime = thisSearchTime = (new Date()).getTime();
                    this._searchLocation(searchText, thisSearchTime);
                }), (launchImmediately ? 0 : 500));
            }
        },

        /**
        * call locator service and get search results
        * @memberOf widgets/locator/locator
        * @method _searchLocation
        */
        _searchLocation: function (searchText, thisSearchTime) {
            var nameArray = {}, locatorSettings, locator, searchFieldName, addressField, baseMapExtent,
                options, searchFields, addressFieldValues, s, deferredArray,
                locatorDef, deferred, resultLength, deferredListResult, index, resultAttributes, key, order;
            // Discard searches made obsolete by new typing from user
            if (thisSearchTime < this.lastSearchTime) {
                return;
            }
            if (searchText === "") {
                // Short-circuit and clear results if the search string is empty

                this._toggleTexBoxControls(true);
                this.mapPoint = null;
                this._locatorErrBack(true);

            } else {
                nameArray[this.locatorSettings.DisplayText] = [];
                domAttr.set(this.txtAddress, "defaultAddress", searchText);

                /**
                * call locator service specified in configuration file
                */
                locatorSettings = this.locatorSettings;
                locator = new Locator(locatorSettings.LocatorURL);
                searchFieldName = locatorSettings.LocatorParameters.SearchField;
                addressField = {};
                addressField[searchFieldName] = searchText;
                if (this.map.getLayer("defaultBasemap")) {
                    baseMapExtent = this.map.getLayer("defaultBasemap").fullExtent;
                } else {
                    baseMapExtent = this.map.getLayer("defaultBasemap0").fullExtent;
                }
                options = {};
                options.address = addressField;
                options.outFields = locatorSettings.LocatorOutFields;
                options[locatorSettings.LocatorParameters.SearchBoundaryField] = baseMapExtent;
                locator.outSpatialReference = this.map.spatialReference;
                searchFields = [];
                addressFieldValues = locatorSettings.FilterFieldValues;
                for (s in addressFieldValues) {
                    if (addressFieldValues.hasOwnProperty(s)) {
                        searchFields.push(addressFieldValues[s]);
                    }
                }
                // Discard searches made obsolete by new typing from user
                if (thisSearchTime < this.lastSearchTime) {
                    return;
                }

                /**
                * get results from locator service
                * @param {object} options Contains address, outFields and basemap extent for locator service
                * @param {object} candidates Contains results from locator service
                */
                deferredArray = [];
                for (index = 0; index < dojo.configSearchSettings.length; index++) {
                    this._layerSearchResults(searchText, deferredArray, dojo.configSearchSettings[index]);
                }
                locatorDef = locator.addressToLocations(options);
                locator.on("address-to-locations-complete", lang.hitch(this, function (candidates) {
                    deferred = new Deferred();
                    deferred.resolve(candidates);
                    return deferred.promise;
                }), function () {
                    this._locatorErrBack(true);
                });
                deferredArray.push(locatorDef);
                deferredListResult = new DeferredList(deferredArray);
                deferredListResult.then(lang.hitch(this, function (result) {
                    var num, results;
                    // Discard searches made obsolete by new typing from user
                    if (thisSearchTime < this.lastSearchTime) {
                        return;
                    }

                    dojo.lastSearchAddress = this.lastSearchString;
                    if (result) {
                        if (result.length > 0) {
                            for (num = 0; num < result.length; num++) {
                                if (result[num][0] === true) {
                                    if (dojo.configSearchSettings[num] && dojo.configSearchSettings[num].UnifiedSearch.toLowerCase() === "true") {
                                        key = dojo.configSearchSettings[num].SearchDisplayTitle;
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
                                                if (nameArray[key].length < this.locatorSettings.MaxResults) {
                                                    nameArray[key].push({
                                                        name: string.substitute(dojo.configSearchSettings[num].SearchDisplayFields, resultAttributes),
                                                        attributes: resultAttributes,
                                                        fields: result[num][1].fields,
                                                        layer: dojo.configSearchSettings[num],
                                                        geometry: result[num][1].features[order].geometry
                                                    });
                                                }
                                            }

                                        }
                                    } else {
                                        this._addressResult(result[num][1], nameArray, searchFields);
                                    }
                                    resultLength = result[num][1].length;
                                }
                            }
                            this._showLocatedAddress(searchText, nameArray, resultLength);
                        }
                    } else {
                        this.mapPoint = null;
                        this._locatorErrBack(true);
                    }
                }));
            }

        },

        /**
        * Description
        * @method widgets/locator/locator
        * @param {} deferredArray
        * @param {} layerobject
        */
        _layerSearchResults: function (searchText, deferredArray, layerobject) {
            var queryTask, queryLayer, deferred, currentTime;
            this._toggleTexBoxControls(true);
            if (layerobject.QueryURL) {
                currentTime = new Date();
                queryTask = new QueryTask(layerobject.QueryURL);
                queryLayer = new Query();
                queryLayer.where = string.substitute(layerobject.SearchExpression, [searchText.toUpperCase()]) + " AND " + currentTime.getTime().toString() + "=" + currentTime.getTime().toString();
                queryLayer.outSpatialReference = this.map.spatialReference;
                queryLayer.returnGeometry = layerobject.objectIDField ? false : true;
                queryLayer.outFields = ["*"];
                deferred = new Deferred();
                queryTask.execute(queryLayer, lang.hitch(this, function (featureSet) {
                    deferred.resolve(featureSet);
                }), function (err) {
                    alert(err.message);
                    deferred.reject();
                });
                deferredArray.push(deferred);
            }
        },

        /**
        * Description
        * @memberOf widgets/locator/locator
        * @param {} candidates
        * @param {} nameArray
        * @param {} searchFields
        * @param {} addressFieldName
        * @return
        */
        _addressResult: function (candidates, nameArray, searchFields) {
            var order, j;

            for (order = 0; order < candidates.length; order++) {
                if (candidates[order].attributes[this.locatorSettings.AddressMatchScore.Field] > this.locatorSettings.AddressMatchScore.Value) {
                    for (j in searchFields) {
                        if (searchFields.hasOwnProperty(j)) {
                            if (candidates[order].attributes[this.locatorSettings.FilterFieldName] === searchFields[j]) {
                                if (nameArray[this.locatorSettings.DisplayText].length < this.locatorSettings.MaxResults) {
                                    nameArray[this.locatorSettings.DisplayText].push({
                                        name: string.substitute(this.locatorSettings.DisplayField, candidates[order].attributes),
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
        * @memberOf widgets/locator/locator
        * @param {object} candidates contains results from locator service
        * @param {} resultLength
        */
        _showLocatedAddress: function (searchText, candidates, resultLength) {
            var addrListCount = 0, noResultCount = 0, candidatesCount = 0, addrList = [], candidateArray, divAddressCounty, candidate, listContainer, i, divAddressSearchCell;
            domConstruct.empty(this.divAddressResults);

            if (lang.trim(searchText) === "") {
                this.txtAddress.focus();
                domConstruct.empty(this.divAddressResults);
                this._toggleTexBoxControls(false);
                return;
            }

            /**
            * display all the located address in the address container
            * 'this.divAddressResults' div dom element contains located addresses, created in widget template
            */

            if (resultLength > 0) {
                domClass.add(this.divAddressContainer, "esriCTAddressContentHeight");
                this._toggleTexBoxControls(false);
                for (candidateArray in candidates) {
                    if (candidates.hasOwnProperty(candidateArray)) {
                        candidatesCount++;
                        if (candidates[candidateArray].length > 0) {
                            divAddressCounty = domConstruct.create("div", {
                                "class": "esriCTSearchGroupRow esriCTBottomBorder esriCTResultColor esriCTCursorPointer esriCTAddressCounty"
                            }, this.divAddressResults);
                            divAddressSearchCell = domConstruct.create("div", { "class": "esriCTSearchGroupCell" }, divAddressCounty);
                            candidate = candidateArray + " (" + candidates[candidateArray].length + ")";
                            domConstruct.create("span", { "innerHTML": "+", "class": "esriCTPlusMinus" }, divAddressSearchCell);
                            domConstruct.create("span", { "innerHTML": candidate, "class": "esriCTGroupList" }, divAddressSearchCell);
                            addrList.push(divAddressSearchCell);
                            this._toggleAddressList(addrList, addrListCount);
                            addrListCount++;
                            listContainer = domConstruct.create("div", { "class": "esriCTListContainer esriCTHideAddressList" }, this.divAddressResults);

                            for (i = 0; i < candidates[candidateArray].length; i++) {
                                this._displayValidLocations(candidates[candidateArray][i], i, candidates[candidateArray], listContainer);
                            }
                        } else {
                            noResultCount++;
                        }
                    }
                }
                if (noResultCount === candidatesCount) {
                    this.mapPoint = null;
                    this._locatorErrBack(true);
                }
            } else {
                this.mapPoint = null;
                this._locatorErrBack(true);
            }
        },

        /**
        * Description
        * @memberOf widgets/locator/locator
        * @param {} addressList
        * @param {} idx
        */
        _toggleAddressList: function (addressList, idx) {
            on(addressList[idx], "click", lang.hitch(this, function (evt) {
                var listContainer, listStatusSymbol;
                listContainer = query(".esriCTListContainer", this.divAddressResults)[idx];
                if (domClass.contains(listContainer, "esriCTShowAddressList")) {
                    domClass.toggle(listContainer, "esriCTShowAddressList");
                    listStatusSymbol = (domAttr.get(query(".esriCTPlusMinus", evt.currentTarget)[0], "innerHTML") === "+") ? "-" : "+";
                    domAttr.set(query(".esriCTPlusMinus", evt.currentTarget)[0], "innerHTML", listStatusSymbol);
                    return;
                }
                domClass.add(listContainer, "esriCTShowAddressList");
                domAttr.set(query(".esriCTPlusMinus", evt.currentTarget)[0], "innerHTML", "-");
            }));
        },

        /**
        * display valid result in search panel
        * @memberOf widgets/locator/locator
        * @param {object} candidate Contains valid result to be displayed in search panel
        * @param {} index
        * @param {} candidateArray
        * @param {} listContainer
        */
        _displayValidLocations: function (candidate, index, candidateArray, listContainer) {
            var _this = this, candidateAddress, divAddressRow, layer, infoIndex;
            divAddressRow = domConstruct.create("div", { "class": "esriCTCandidateList" }, listContainer);
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
                    domAttr.set(candidateAddress, "address", string.substitute(this.locatorSettings.DisplayField, candidate.attributes.attributes));
                }
            } catch (err) {
                alert(sharedNls.errorMessages.falseConfigParams);
            }

            /**
            * Description
            * @method onclick
            * @return
            */
            candidateAddress.onclick = function () {
                topic.publish("addressSelected");
                topic.publish("showProgressIndicator");
                _this.txtAddress.value = this.innerHTML;
                domAttr.set(_this.txtAddress, "defaultAddress", _this.txtAddress.value);
                _this._hideAddressContainer();
                if (_this.isShowDefaultPushPin) {
                    if (candidate.attributes.location) {
                        _this.mapPoint = new Point(Number(domAttr.get(this, "x")), Number(domAttr.get(this, "y")), _this.map.spatialReference);
                        _this._locateAddressOnMap(_this.mapPoint);
                        _this.candidateClicked(candidate);
                    } else {
                        if (candidateArray[domAttr.get(candidateAddress, "index", index)]) {
                            layer = candidateArray[domAttr.get(candidateAddress, "index", index)].layer;
                            for (infoIndex = 0; infoIndex < dojo.configSearchSettings.length; infoIndex++) {
                                if (dojo.configSearchSettings[infoIndex] && dojo.configSearchSettings[infoIndex].QueryURL === layer.QueryURL) {

                                    if (!candidate.geometry) {
                                        _this._getSelectedCandidateGeometry(layer, candidate);
                                    }
                                    else {
                                        _this._showFeatureResultsOnMap(candidate);
                                        topic.publish("hideProgressIndicator");
                                        _this.candidateClicked(candidate);
                                    }
                                }
                            }
                        }
                    }
                }

            };
        },

        _getSelectedCandidateGeometry: function (layerobject, candidate) {
            var queryTask, queryLayer, currentTime;
            if (layerobject.QueryURL) {
                currentTime = new Date();
                queryTask = new QueryTask(layerobject.QueryURL);
                queryLayer = new Query();
                queryLayer.where = layerobject.objectIDField + " =" + candidate.attributes[layerobject.objectIDField] + " AND " + currentTime.getTime().toString() + "=" + currentTime.getTime().toString();
                queryLayer.outSpatialReference = this.map.spatialReference;
                queryLayer.returnGeometry = true;
                queryTask.execute(queryLayer, lang.hitch(this, function (featureSet) {
                    this._showFeatureResultsOnMap(candidate);
                    candidate.geometry = featureSet.features[0].geometry;
                    this.candidateClicked(candidate);
                    topic.publish("hideProgressIndicator");
                }), function (err) {
                    alert(err.message);
                });
            }
        },

        /**
        * handler for candidate address click
        * @memberOf widgets/locator/locator
        */
        candidateClicked: function (candidate) {
            // selected address will be returned
            return candidate;
        },
        /**
        * Description
        * @method _showFeatureResultsOnMap
        * @param {} candidate
        * @return
        */
        _showFeatureResultsOnMap: function (candidate) {
            //this._toggleTexBoxControls(true);
            this.txtAddress.value = candidate.name;
        },

        _toggleTexBoxControls: function (isShow) {
            if (isShow) {
                domStyle.set(this.imgSearchLoader, "display", "block");
                domStyle.set(this.close, "display", "none");
            } else {
                domStyle.set(this.imgSearchLoader, "display", "none");
                domStyle.set(this.close, "display", "block");
            }
        },

        /**
        * Description
        * @memberOf widgets/locator/locator
        * @param {} mapPoint
        */
        _locateAddressOnMap: function (mapPoint) {
            var geoLocationPushpin, locatorMarkupSymbol;
            this._clearGraphics();
            this.map.setLevel(dojo.configData.ZoomLevel);
            this.map.centerAt(mapPoint);
            geoLocationPushpin = dojoConfig.baseURL + this.locatorSettings.DefaultLocatorSymbol;
            locatorMarkupSymbol = new esri.symbol.PictureMarkerSymbol(geoLocationPushpin, this.locatorSettings.MarkupSymbolSize.width, this.locatorSettings.MarkupSymbolSize.height);
            this.selectedGraphic = new esri.Graphic(mapPoint, locatorMarkupSymbol, {}, null);
            this.map.getLayer(this.graphicsLayerId).add(this.selectedGraphic);
            topic.publish("hideProgressIndicator");
            this.onGraphicAdd();
        },

        /**
        * clear graphics from map
        * @memberOf widgets/locator/locator
        */
        _clearGraphics: function () {
            if (this.map.getLayer(this.graphicsLayerId)) {
                this.map.getLayer(this.graphicsLayerId).clear();
            }
            this.selectedGraphic = null;
        },

        /**
        * handler for adding graphic on map
        * @memberOf widgets/locator/locator
        */
        onGraphicAdd: function () {
            return true;
        },

        /**
        * hide search panel
        * @memberOf widgets/locator/locator
        */
        _hideAddressContainer: function () {
            domClass.replace(this.domNode, "esriCTHeaderSearch", "esriCTHeaderSearchSelected");
            this.txtAddress.blur();
            domClass.replace(this.divAddressContainer, "esriCTHideContainerHeight", "esriCTShowContainerHeight");
        },

        /**
        * display error message if locator service fails or does not return any results
        * @memberOf widgets/locator/locator
        */
        _locatorErrBack: function (showMessage) {
            domConstruct.empty(this.divAddressResults);
            domClass.remove(this.divAddressContainer, "esriCTAddressContentHeight");
            domStyle.set(this.divAddressResults, "display", "block");
            domClass.add(this.divAddressContent, "esriCTAddressResultHeight");
            this._toggleTexBoxControls(false);
            if (showMessage) {
                domConstruct.create("div", { "class": "esriCTDivNoResultFound", "innerHTML": sharedNls.errorMessages.invalidSearch }, this.divAddressResults);
            }
        },

        /**
        * clear default value from search textbox
        * @memberOf widgets/locator/locator
        * @param {object} evt Dblclick event
        * @return
        */
        _clearDefaultText: function (evt) {
            var target = window.event ? window.event.srcElement : evt ? evt.target : null;
            if (!target) {
                return;
            }
            target.style.color = "#FFF";
            target.value = '';
            this.txtAddress.value = "";
            domAttr.set(this.txtAddress, "defaultAddress", this.txtAddress.value);
        },

        /**
        * set default value to search textbox
        * @memberOf widgets/locator/locator
        * @param {object} evt Blur event
        */
        _replaceDefaultText: function (evt) {
            var target = window.event ? window.event.srcElement : evt ? evt.target : null;
            if (!target) {
                return;
            }
            this._resetTargetValue(target, "defaultAddress");
        },

        /**
        * set default value to search textbox
        * @memberOf widgets/locator/locator
        * @param {object} target Textbox dom element
        * @param {string} title Default value
        */
        _resetTargetValue: function (target, title) {
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
            this.lastSearchString = lang.trim(this.txtAddress.value);
        }
    });
});
