/*global define */
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
define({
    showNullValue: "@fr@ N/A",
    buttons: {
        okButtonText: "@fr@ OK",
        link: "@fr@ Link",
        email: "Email",  // Shown next to icon for sharing the current map extents via email; works with shareViaEmail tooltip
        facebook: "Facebook",  // Shown next to icon for sharing the current map extents via a Facebook post; works with shareViaFacebook tooltip
        twitter: "Twitter",  // Shown next to icon for sharing the current map extents via a Twitter tweet; works with shareViaTwitter tooltip
        embedding: "@fr@ Embedded URL",
        go: "@fr@ Go",
        browse: "@fr@ Browse",
        upload: "@fr@ Upload",
        add: "@fr@ Add"
    },
    tooltips: {
        search: "Rechercher",
        reports: "@fr@ Reports",
        locate: "Emplacement actuel",
        share: "Partager",
        help: "Aide",
        clearEntry: "@fr@ Clear"
    },
    titles: {
        areaOfInterestTabText: "@fr@ Area of Interest",
        reportTabText: "Report",
        webpageDisplayText: "@fr@ Copy/paste HTML into your web page",
        pointToolText: "@fr@ Point",
        lineToolText: "@fr@ Line",
        rectangleToolText: "@fr@ Rectangle",
        polygonToolText: "@fr@ Polygon",
        selectFeatureText: "@fr@ Select features"
    },
    messages: {
        legendLoadingText: "@fr@ Loading...",
        sliderDisplayText: "@fr@ Show results within ${defaultDistance}",
        aoiOptionsText: "@fr@ Alternatively you can",
        uploadShapefileText: "@fr@ Upload a zipped shapefile to define your AOI",
        coordinatesText: "@fr@ Enter coordinates, bearing and distance",
        drawToolsText: "@fr@ Use the Drawing tools to define your AOI",
        bufferSliderText: "@fr@ Buffer distance (Optional for polygon AOIs)",
        radioBtnMiles: "@fr@ Miles",
        radioBtnFeet: "@fr@ Feet",
        radioBtnMeters: "@fr@ Meters",
        radioBtnKilometers: "@fr@ Kilometers",
        bearingContainerTitle: "@fr@ Bearing and Distance",
        bearingContainerText: "@fr@ Enter coordinates for start point, bearing and distance from start point",
        startPoint: "@fr@ Define start point",
        orText: "@fr@ OR",
        latitude: "@fr@ Latitude",
        longitude: "@fr@ Longitude",
        bearing: "@fr@ Bearing",
        bearingValue: "@fr@ (0-360)",
        distance: "@fr@ Distance (Miles)",
        reportPanelHeader: "@fr@ Summary Report for Area of Interest"
    },
    errorMessages: {
        invalidSearch: "Aucun résultat",
        falseConfigParams: "Valeurs clés de configuration requis sont null ou pas exactement correspondant à des attributs de la couche. Ce message peut apparaître plusieurs fois.",
        invalidLocation: "@fr@ Current location not found.",
        invalidProjection: "@fr@ Unable to plot current location on the map.",
        widgetNotLoaded: "@fr@ Unable to load widgets.",
        shareLoadingFailed: "@fr@ Unable to load share options.",
        shareFailed: "@fr@ Unable to share.",
        emptyInfoWindowTitle: "@fr@ No feature details",
        emptyInfoWindowContent: "@fr@ InfoWindow is disabled for the selected layer in webmap.",
        bufferSliderValue: "@fr@ Buffer slider should not be set to zero distance"
    }
});
