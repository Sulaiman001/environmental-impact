/*global define */
/*jslint browser:true,sloppy:true,nomen:true,unparam:true,plusplus:true */
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
define({
    root: {
        showNullValue: "N/A",
        buttons: {
            okButtonText: "OK",
            link: "Link",
            email: "Email",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
            facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
            twitter: "Twitter",  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
            embedding: "Embedded URL",
            go: "Go",
            browse: "Browse",
            upload: "Upload",
            add: "Add"
        },
        tooltips: {
            search: "Search",
            reports: "Reports",
            locate: "Locate",
            share: "Share",
            help: "Help",
            clearEntry: "Clear"
        },
        titles: {
            areaOfInterestTabText: "Area of Interest",
            reportTabText: "Report",
            webpageDisplayText: "Copy/paste HTML into your web page",
            pointToolText: "Point",
            lineToolText: "Line",
            rectangleToolText: "Rectangle",
            polygonToolText: "Polygon",
            selectFeatureText: "Select features"
        },
        messages: {
            legendLoadingText: "Loading...",
            sliderDisplayText: "Show results within ${defaultDistance}",
            aoiOptionsText: "Alternatively you can",
            uploadShapefileText: "Upload a zipped shapefile to define your AOI",
            coordinatesText: "Enter coordinates, bearing and distance",
            drawToolsText: "Use the Drawing tools to define your AOI",
            bufferSliderText: "Buffer distance (Optional for polygon AOIs)",
            radioBtnMiles: "Miles",
            radioBtnFeet: "Feet",
            radioBtnMeters: "Meters",
            radioBtnKilometers: "Kilometers",
            bearingContainerTitle: "Bearing and Distance",
            bearingContainerText: "Enter coordinates for start point, bearing and distance from start point",
            startPoint: "Define start point",
            orText: "OR",
            latitude: "Latitude",
            longitude: "Longitude",
            bearing: "Bearing",
            bearingValue: "(0-360)",
            distance: "Distance (Miles)",
            reportPanelHeader: "Summary Report for Area of Interest"
        },
        errorMessages: {
            invalidSearch: "No results found",
            falseConfigParams: "Required configuration key values are either null or not exactly matching with layer attributes. This message may appear multiple times.",
            invalidLocation: "Current location not found.",
            invalidProjection: "Unable to plot current location on the map.",
            widgetNotLoaded: "Unable to load widgets.",
            shareLoadingFailed: "Unable to load share options.",
            shareFailed: "Unable to share.",
            emptyInfoWindowTitle: "No feature details",
            emptyInfoWindowContent: "InfoWindow is disabled for the selected layer in webmap.",
            bufferSliderValue: "Buffer slider should not be set to zero distance"
        }
    },
    es: true,
    fr: true,
    it: true
});
