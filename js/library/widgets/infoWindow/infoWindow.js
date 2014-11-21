/*global define,dojo */
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
    "dojo/on",
    "../scrollBar/scrollBar",
    "dojo/dom",
    "dojo/dom-class",
    "esri/domUtils",
    "esri/InfoWindowBase",
    "dojo/text!./templates/infoWindow.html",
    "dijit/_WidgetBase",
    "dijit/_TemplatedMixin",
    "dojo/query",
    "dojo/i18n!application/js/library/nls/localizedStrings",
    "dijit/_WidgetsInTemplateMixin",
    "dojo/topic"
], function (declare, domConstruct, domStyle, lang, on, ScrollBar, dom, domClass, domUtils, InfoWindowBase, template, _WidgetBase, _TemplatedMixin, query, sharedNls, _WidgetsInTemplateMixin, topic) {
    return declare([InfoWindowBase, _WidgetBase, _TemplatedMixin, _WidgetsInTemplateMixin], {
        templateString: template,
        sharedNls: sharedNls,
        InfoShow: null,

        postCreate: function () {
            this.infoWindowContainer = domConstruct.create("div", {}, dom.byId("esriCTParentDivContainer"));
            this.infoWindowContainer.appendChild(this.domNode);
            this._anchor = domConstruct.create("div", { "class": "esriCTDivTriangle" }, this.domNode);
            domUtils.hide(this.domNode);

            this.own(on(this.divClose, "click", lang.hitch(this, function () {
                topic.publish("infoWindowVisibilityStatus", false);
                if (query(".map .logo-sm")) {
                    this.InfoShow = true;
                } else {
                    this.InfoShow = false;
                }
                domUtils.hide(this.domNode);
            })));
        },

        show: function (detailsTab, screenPoint) {
            this.InfoShow = false;
            if (this.divInfoDetailsScroll) {
                while (this.divInfoDetailsScroll.hasChildNodes()) {
                    this.divInfoDetailsScroll.removeChild(this.divInfoDetailsScroll.lastChild);
                }
            }
            this.divInfoDetailsScroll.appendChild(detailsTab);
            this.setLocation(screenPoint);
            if (dojo.window.getBox().w >= 640) {
                if (this.infoContainerScrollbar) {
                    domClass.add(this.infoContainerScrollbar._scrollBarContent, "esriCTZeroHeight");
                    this.infoContainerScrollbar.removeScrollBar();
                }
                this.infoContainerScrollbar = new ScrollBar({
                    domNode: this.divInfoScrollContent
                });
                this.infoContainerScrollbar.setContent(this.divInfoDetailsScroll);
                this.infoContainerScrollbar.createScrollBar();
            } else {
                this._closeInfowindow();
            }
        },

        resize: function (width, height) {
            if (dojo.window.getBox().w <= 640) {
                this.infoWindowWidth = 180;
                this.infoWindowHeight = 30;
                domStyle.set(this.domNode, {
                    width: 180 + "px",
                    height: 30 + "px"
                });
            } else {
                this.infoWindowWidth = width;
                this.infoWindowHeight = height;
                domStyle.set(this.domNode, {
                    width: width + "px",
                    height: height + "px"
                });
            }
        },

        setTitle: function (infoTitle) {
            if (infoTitle.length > 0) {
                this.headerPanel.innerHTML = "";
                this.headerPanel.innerHTML = infoTitle;
                this.headerPanel.title = infoTitle;
            } else {
                this.headerPanel.innerHTML = "";
            }
        },

        setLocation: function (location) {
            if (location.spatialReference) {
                location = this.map.toScreen(location);
            }
            domStyle.set(this.domNode, {
                left: (location.x - (this.infoWindowWidth / 2)) + "px",
                bottom: (location.y + 25) + "px"
            });
            if (!this.InfoShow) {
                domUtils.show(this.domNode);
            }
            this.isShowing = true;
        },

        hide: function () {
            domUtils.hide(this.domNode);
            this.isShowing = false;
            this.onHide();
        },

        _hideInfoContainer: function () {
            this.own(on(this.divClose, "click", lang.hitch(this, function () {
                domUtils.hide(this.domNode);
            })));
        }

    });
});
